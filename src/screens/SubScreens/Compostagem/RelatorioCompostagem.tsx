import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
    Modal
} from 'react-native';
import {
    Text,
    Button,
    Surface,
    Card,
    Divider,
    Chip
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import ModernHeader from '../../../assets/components/ModernHeader';
import { showGlobalToast, verificarConectividadeAPI } from '../../../helpers/GlobalApi';
import { customTheme } from '../../../theme/theme';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

// Componente para exibir o conteúdo do relatório
import FilterCardCompost from './components/FilterCardCompost';
import RelatorioCompostagemContent from './components/RelatorioCompostagemContent';

interface Compostagem {
    id: string;
    responsavel: string;
    data: string;
    hora: string;
    leira: string;
    tempAmb: number;
    tempBase: number;
    tempMeio: number;
    tempTopo: number;
    umidadeAmb: number;
    umidadeLeira: number;
    ph: string;
    odor: string;
    observacao?: string;
    isMedicaoRotina: boolean;
    photoUrls?: string[];
    createdAt: number;
}

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
            const querySnapshot = await firestore()
                .collection('compostagens')
                .get();

            // Obtenha todas as leiras únicas
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

    // Converte as datas para o formato pt-BR
    const formatarData = (data: Date) => {
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        return `${dia}/${mes}/${ano}`;
    };

    // Função para buscar as compostagens no intervalo de datas
    const buscarCompostagensPorIntervalo = async () => {
        try {
            setLoading(true);

            const inicioFormatado = formatarData(dataInicio);
            const fimFormatado = formatarData(dataFim);

            if (dataInicio > dataFim) {
                Alert.alert(
                    'Erro',
                    'A data de início deve ser anterior ou igual à data final.'
                );
                return;
            }

            const query = firestore()
                .collection('compostagens')
                .where('data', '>=', inicioFormatado)
                .where('data', '<=', fimFormatado)
                .orderBy('data', 'desc');

            const snapshot = await query.get();

            let dados = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Compostagem))
            .filter(compostagem => {
                // Filtro por tipo de medição
                if (showRotina) {
                    return compostagem.isMedicaoRotina === true;
                } else {
                    return !compostagem.isMedicaoRotina;
                }
            });

            // Aplicar filtro de leiras se houver leiras selecionadas
            if (leirasFiltradas.length > 0) {
                dados = dados.filter(compostagem =>
                    leirasFiltradas.includes(compostagem.leira)
                );
            }

            // Ordenar por data e hora
            dados.sort((a, b) => {
                const dataA = new Date(a.data.split('/').reverse().join('-') + ' ' + a.hora);
                const dataB = new Date(b.data.split('/').reverse().join('-') + ' ' + b.hora);
                return dataB.getTime() - dataA.getTime();
            });

            setCompostagens(dados);

        } catch (error) {
            console.error('Erro ao buscar compostagens:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível gerar o relatório', 4000);
        } finally {
            setLoading(false);
        }
    };

    // Alternar entre medições de rotina e completas
    const toggleTipoMedicao = () => {
        setShowRotina(!showRotina);
    };

    const formatarDataParaNomeArquivo = (data: string) => {
        const partes = data.split('/');
        return `${partes[0]}-${partes[1]}-${partes[2]}`;
    };

    // Função para formatar o horário (remove os segundos)
    const formatarHorario = (hora: string) => {
        if (hora.split(':').length === 3) {
            return hora.split(':').slice(0, 2).join(':');
        }
        return hora;
    };

    // Gerar relatório em Excel
    const gerarRelatorioExcel = async () => {
        if (compostagens.length === 0) {
            showGlobalToast('error', 'Erro', 'Não há dados para gerar o relatório', 4000);
            return;
        }

        try {
            setLoading(true);

            // Verificar conectividade primeiro
            const conectado = await verificarConectividadeAPI();
            if (!conectado) {
                setLoading(false);
                setIsConnectionModalVisible(true);
                return;
            }

            showGlobalToast('info',
                'Gerando Relatório',
                'O servidor está processando seu relatório...',
                10000);

            // Formata os horários antes de enviar
            const compostagensFormatadas = compostagens.map(compostagem => ({
                ...compostagem,
                hora: formatarHorario(compostagem.hora)
            }));

            const response = await fetch('http://192.168.1.222:3000/gerar-relatorio-compostagem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    dataInicio: formatarData(dataInicio),
                    dataFim: formatarData(dataFim),
                    compostagens: compostagensFormatadas,
                    tipoMedicao: showRotina ? 'rotina' : 'completa'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Erro do servidor:', errorText);
                throw new Error(`Erro na resposta do servidor: ${errorText}`);
            }

            showGlobalToast('success',
                'Relatório Gerado com Sucesso!',
                '',
                5000);

            const dataInicioFormatada = formatarDataParaNomeArquivo(formatarData(dataInicio));
            const dataFimFormatada = formatarDataParaNomeArquivo(formatarData(dataFim));
            const tipoRelatorio = showRotina ? 'rotina' : 'completo';

            // Criar nome do arquivo com timestamp
            const fileName = `relatorio_compostagem_${tipoRelatorio}_${dataInicioFormatada}_ate_${dataFimFormatada}.xlsx`;
            const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

            // Converter resposta para base64
            const data = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(data);

            reader.onload = async () => {
                try {
                    // Remover cabeçalho do base64 data URL
                    const base64Data = reader.result?.toString().split(',')[1];

                    if (!base64Data) {
                        throw new Error('Erro ao processar arquivo');
                    }

                    // Salvar arquivo
                    await RNFS.writeFile(filePath, base64Data, 'base64');

                    // Compartilhar arquivo
                    await Share.open({
                        url: `file://${filePath}`,
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        filename: fileName
                    });

                    showGlobalToast('success', 'Sucesso', 'Relatório gerado com sucesso!', 4000);

                    // Limpar arquivo após compartilhar
                    await RNFS.unlink(filePath);

                } catch (error) {
                    console.warn(error);
                }
            };

            reader.onerror = () => {
                showGlobalToast('error', 'Erro', 'Erro ao processar o arquivo', 4000);
            };

        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível gerar o relatório', 4000);
        } finally {
            setLoading(false);
        }
    };

    // Modal de erro de conexão
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