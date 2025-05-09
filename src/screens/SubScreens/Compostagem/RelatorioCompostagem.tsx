import * as XLSX from 'xlsx';

import {
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View
} from 'react-native';
import {
    Button,
    Surface,
    Text
} from 'react-native-paper';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { showGlobalToast, verificarConectividadeAPI } from '../../../helpers/GlobalApi';
import { useEffect, useState } from 'react';

import { Compostagem } from '../../../helpers/Types';
import FilterCardCompost from './components/FilterCardCompost';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../../assets/components/ModernHeader';
import RNFS from 'react-native-fs';
import RelatorioCompostagemContent from './components/RelatorioCompostagemContent';
import Share from 'react-native-share';
import { customTheme } from '../../../theme/theme';
import dayjs from 'dayjs';
import { db } from '../../../../firebase';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

export default function RelatorioCompostagem({ navigation }: { navigation: any }) {
    const [dataInicio, setDataInicio] = useState<Date>(new Date());
    const [dataFim, setDataFim] = useState<Date>(new Date());
    const [compostagens, setCompostagens] = useState<Compostagem[]>([]);
    const [loading, setLoading] = useState(false);
    const [leirasFiltradas, setLeirasFiltradas] = useState<string[]>([]);
    const [showRotina, setShowRotina] = useState<boolean>(false);
    const [isConnectionModalVisible, setIsConnectionModalVisible] = useState(false);
    const [leirasDisponiveis, setLeirasDisponiveis] = useState<string[]>([]);

    useEffect(() => {
        carregarLeirasDisponiveis();
    }, []);

    const carregarLeirasDisponiveis = async () => {
        try {
            const querySnapshot = await getDocs(collection(db(), 'compostagens'));
            const leiras = querySnapshot.docs
                .map(doc => doc.data().leira)
                .filter((leira, index, self) =>
                    leira && self.indexOf(leira) === index
                )
                .sort();
            setLeirasDisponiveis(leiras);
        } catch (error) {
            console.error('Erro ao carregar leiras:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível carregar as leiras disponíveis', 4000);
        }
    };

    const buscarCompostagensPorIntervalo = async () => {
        try {
            setLoading(true);
            console.log('Iniciando busca de compostagens...');

            const inicio = dayjs(dataInicio).startOf('day');
            const fim = dayjs(dataFim).endOf('day');
            console.log(`Intervalo de busca: ${inicio.format('YYYY-MM-DD')} a ${fim.format('YYYY-MM-DD')}`);

            if (inicio.isAfter(fim)) {
                Alert.alert(
                    'Erro',
                    'A data de início deve ser anterior ou igual à data final.'
                );
                setLoading(false);
                console.log('Erro: Data de início posterior à data final');
                return;
            }

            const compostagemQuery = query(
                collection(db(), 'compostagens'),
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(compostagemQuery);
            console.log(`Total de documentos encontrados: ${snapshot.docs.length}`);

            let dados = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Compostagem)).filter(compostagem => {
                const isRotinaMatch = showRotina ? compostagem.isMedicaoRotina === true : !compostagem.isMedicaoRotina;
                console.log(`Compostagem ID: ${compostagem.id}, isMedicaoRotina: ${compostagem.isMedicaoRotina}, Filtro rotina: ${showRotina}, Passou: ${isRotinaMatch}`);
                return isRotinaMatch;
            });
            console.log(`Após filtro de tipo de medição: ${dados.length} compostagens`);

            // Filtrar por intervalo de datas usando timestamp
            dados = dados.filter(compostagem => {
                const compostagemDate = dayjs(compostagem.timestamp);
                const isInRange = compostagemDate.isBetween(inicio, fim, null, '[]');
                console.log(`Compostagem ID: ${compostagem.id}, Timestamp: ${compostagem.timestamp}, Data: ${compostagemDate.format('YYYY-MM-DD HH:mm')}, Está no intervalo: ${isInRange}`);
                return isInRange;
            });
            console.log(`Após filtro de datas: ${dados.length} compostagens`);

            // Aplicar filtro de leiras se houver leiras selecionadas
            if (leirasFiltradas.length > 0) {
                dados = dados.filter(compostagem => {
                    const isLeiraMatch = leirasFiltradas.includes(compostagem.leira);
                    console.log(`Compostagem ID: ${compostagem.id}, Leira: ${compostagem.leira}, Leiras filtradas: ${leirasFiltradas}, Passou: ${isLeiraMatch}`);
                    return isLeiraMatch;
                });
                console.log(`Após filtro de leiras: ${dados.length} compostagens`);
            }

            setCompostagens(dados);
            console.log(`Compostagens finais definidas: ${dados.length}`);

        } catch (error) {
            console.error('Erro ao buscar compostagens:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível gerar o relatório', 4000);
        } finally {
            setLoading(false);
            console.log('Busca de compostagens finalizada');
        }
    };

    const formatarData = (data: Date) => {
        return dayjs(data).format('DD/MM/YYYY');
    };

    const toggleTipoMedicao = () => {
        setShowRotina(!showRotina);
    };

    const formatarDataParaNomeArquivo = (data: string) => {
        const partes = data.split('/');
        return `${partes[0]}-${partes[1]}-${partes[2]}`;
    };

    const gerarRelatorioExcel = async () => {
        if (compostagens.length === 0) {
            showGlobalToast('error', 'Erro', 'Não há dados para gerar o relatório', 4000);
            return;
        }

        try {
            setLoading(true);

            // Formatando os dados para o Excel
            const compostagensFormatadas = compostagens.map(compostagem => ({
                ID: compostagem.id,
                Data: dayjs(compostagem.timestamp).format('DD/MM/YYYY'),
                Hora: dayjs(compostagem.timestamp).format('HH:mm'),
                Leira: compostagem.leira,
                Responsável: compostagem.responsavel,
                'Temperatura Ambiente (°C)': compostagem.tempAmb,
                'Temperatura Base (°C)': compostagem.tempBase,
                'Temperatura Meio (°C)': compostagem.tempMeio,
                'Temperatura Topo (°C)': compostagem.tempTopo,
                'Umidade Ambiente (%)': compostagem.umidadeAmb,
                'Umidade Leira (%)': compostagem.umidadeLeira,
                pH: compostagem.ph,
                Odor: compostagem.odor || 'N/A',
                Observação: compostagem.observacao,
                'Tipo de Medição': compostagem.isMedicaoRotina ? 'Rotina' : 'Completa',
                'Fotos (URIs)': compostagem.photoUris.join('; '),
                'Fotos (URLs)': compostagem.photoUrls?.join('; ') || 'N/A'
            }));

            // Criando a planilha
            const ws = XLSX.utils.json_to_sheet(compostagensFormatadas);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Relatório Compostagem');

            // Gerando o arquivo Excel como buffer
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

            // Definindo o nome do arquivo
            const dataInicioFormatada = formatarDataParaNomeArquivo(formatarData(dataInicio));
            const dataFimFormatada = formatarDataParaNomeArquivo(formatarData(dataFim));
            const tipoRelatorio = showRotina ? 'rotina' : 'completo';
            const fileName = `relatorio_compostagem_${tipoRelatorio}_${dataInicioFormatada}_ate_${dataFimFormatada}.xlsx`;
            const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

            // Escrevendo o arquivo no sistema de arquivos
            await RNFS.writeFile(filePath, wbout, 'base64');

            // Compartilhando o arquivo
            await Share.open({
                url: `file://${filePath}`,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                filename: fileName
            });

            showGlobalToast('success', 'Sucesso', 'Relatório gerado com sucesso!', 4000);

            // Removendo o arquivo temporário
            await RNFS.unlink(filePath);

        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível gerar o relatório', 4000);
        } finally {
            setLoading(false);
        }
    };

    const ConnectionErrorModal = () => (
        <Modal
            visible={isConnectionModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setIsConnectionModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <Surface style={styles.modalContent}>
                    <View style={styles.modalIconContainer}>
                        <Icon
                            name="server-network-off"
                            size={60}
                            color={customTheme.colors.error}
                        />
                    </View>

                    <Text style={styles.modalTitle}>
                        Conexão com o servidor não estabelecida
                    </Text>

                    <View style={styles.modalTextContainer}>
                        <Text style={styles.modalText}>
                            O recurso de geração de relatórios requer duas condições:
                        </Text>

                        <View style={styles.bulletPointContainer}>
                            <Text style={styles.bulletPoint}>•</Text>
                            <Text style={styles.bulletPointText}>
                                Estar conectado à rede local da Ecologika
                            </Text>
                        </View>

                        <View style={styles.bulletPointContainer}>
                            <Text style={styles.bulletPoint}>•</Text>
                            <Text style={styles.bulletPointText}>
                                O servidor de relatórios estar em funcionamento
                            </Text>
                        </View>

                        <Text style={[styles.modalText, { marginTop: 10 }]}>
                            Caso você já esteja conectado à rede local da Ecologika, então isso significa que o servidor está fora do ar ou desligado.
                        </Text>
                    </View>

                    <Button
                        mode="contained"
                        onPress={() => setIsConnectionModalVisible(false)}
                        style={styles.modalButton}
                    >
                        Entendi
                    </Button>
                </Surface>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <ModernHeader
                title={`Relatório de Compostagem ${showRotina ? '(Rotina)' : '(Completo)'}`}
                iconName="chart-bar-stacked"
                onBackPress={() => navigation.goBack()}
                rightAction={toggleTipoMedicao}
                rightIcon={showRotina ? "clipboard-list" : "clipboard-outline"}
            />

            <FilterCardCompost
                dataInicio={dataInicio}
                dataFim={dataFim}
                setDataInicio={setDataInicio}
                setDataFim={setDataFim}
                loading={loading}
                onGerarRelatorio={buscarCompostagensPorIntervalo}
                leirasDisponiveis={leirasDisponiveis}
                leirasFiltradas={leirasFiltradas}
                setLeirasFiltradas={setLeirasFiltradas}
            />

            <ScrollView
                style={styles.scrollViewContainer}
                contentContainerStyle={styles.scrollViewContent}
            >
                {compostagens.length > 0 && (
                    <RelatorioCompostagemContent
                        compostagens={compostagens}
                        onGerarExcel={gerarRelatorioExcel}
                        loading={loading}
                    />
                )}
            </ScrollView>

            <ConnectionErrorModal />

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    modalTextContainer: {
        marginBottom: 5,
    },
    bulletPointContainer: {
        flexDirection: 'row',
        marginLeft: 10,
        marginTop: 8,
        alignItems: 'flex-start',
    },
    bulletPoint: {
        fontSize: 16,
        marginRight: 8,
        color: customTheme.colors.error,
        lineHeight: 22,
    },
    bulletPointText: {
        fontSize: 15,
        lineHeight: 22,
        flex: 1,
        color: customTheme.colors.onSurface,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '90%',
        maxWidth: 400,
        elevation: 5,
    },
    modalIconContainer: {
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
        color: customTheme.colors.error,
    },
    modalText: {
        fontSize: 15,
        textAlign: 'justify',
        marginBottom: 20,
        lineHeight: 22,
        color: customTheme.colors.onSurface,
    },
    modalButton: {
        marginTop: 10,
    },
    safeArea: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    scrollViewContainer: {
        flex: 1,
    },
    scrollViewContent: {
        flexGrow: 1,
    },
});