import {
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Button,
    Card,
    Divider,
    Surface,
    Text
} from 'react-native-paper';
import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

import DateTimePicker from '@react-native-community/datetimepicker';
import FilterCard from './Components/Filtros/FilterCard';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../../assets/components/ModernHeader';
import { PLACAS_VEICULOS } from './Components/lavagemTypes';
import RNFS from 'react-native-fs';
import RelatorioContent from './Components/RelatorioContent';
import Share from 'react-native-share';
import { customTheme } from '../../../theme/theme';
import { db } from '../../../../firebase';
import { showGlobalToast } from '../../../helpers/GlobalApi';

interface Lavagem {
    id: string;
    responsavel: string;
    data: string;
    hora: string;
    veiculo: {
        placa: string;
        tipo: string;
        numeroEquipamento?: string;
    };
    tipoLavagem: string;
    produtos: Array<{
        nome: string;
        quantidade: number;
    }>;
    createdAt: number;
}

export default function RelatorioLavagens({ navigation }: { navigation: any }) {
    const [dataInicio, setDataInicio] = useState<Date>(new Date());
    const [dataFim, setDataFim] = useState<Date>(new Date());
    const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
    const [showDatePickerFim, setShowDatePickerFim] = useState(false);
    const [lavagens, setLavagens] = useState<Lavagem[]>([]);
    const [loading, setLoading] = useState(false);
    const [placasFiltradas, setPlacasFiltradas] = useState<string[]>([]);

    const [isConnectionModalVisible, setIsConnectionModalVisible] = useState(false);

    const [placasDisponiveis, setPlacasDisponiveis] = useState<Array<{
        placa: string;
        tipo: 'veiculo' | 'equipamento';
        numeroEquipamento?: string;
    }>>([]);

    useEffect(() => {
        carregarPlacasDisponiveis();
    }, []);

    const carregarPlacasDisponiveis = async () => {
        try {
            const querySnapshot = await getDocs(collection(db(), 'veiculos'));
    
            const placas = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    placa: data.placa,
                    tipo: data.tipo || 'veiculo',
                    numeroEquipamento: data.numeroEquipamento
                };
            });
    
            setPlacasDisponiveis(placas);
        } catch (error) {
            console.error('Erro ao carregar placas:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível carregar as placas disponíveis', 4000);
        }
    };
    
    const buscarLavagensPorIntervalo = async () => {
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
    
            const queryNovos = query(
                collection(db(), 'lavagens'),
                where('data', '>=', inicioFormatado),
                where('data', '<=', fimFormatado),
                orderBy('data', 'desc')
            );
    
            const queryAntigos = query(
                collection(db(), 'registroLavagens'),
                where('data', '>=', inicioFormatado),
                where('data', '<=', fimFormatado),
                orderBy('data', 'desc')
            );
    
            const [snapshotNovos, snapshotAntigos] = await Promise.all([
                getDocs(queryNovos),
                getDocs(queryAntigos)
            ]);
    
            const dadosNovos = snapshotNovos.docs.map(doc => normalizarLavagem({
                id: doc.id,
                ...doc.data()
            }));
    
            const dadosAntigos = snapshotAntigos.docs.map(doc => normalizarLavagem({
                id: doc.id,
                ...doc.data()
            }));
    
            let todosDados = [...dadosNovos, ...dadosAntigos].sort((a, b) => {
                const dataA = new Date(a.data.split('/').reverse().join('-') + ' ' + a.hora);
                const dataB = new Date(b.data.split('/').reverse().join('-') + ' ' + b.hora);
                return dataB.getTime() - dataA.getTime();
            });
    
            // Aplicar filtro de placas se houver placas selecionadas
            if (placasFiltradas.length > 0) {
                todosDados = todosDados.filter(lavagem =>
                    placasFiltradas.includes(lavagem.veiculo.placa.toUpperCase())
                );
            }
    
            setLavagens(todosDados);
    
        } catch (error) {
            console.error('Erro ao buscar lavagens:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível gerar o relatório', 4000);
        } finally {
            setLoading(false);
        }
    };

    // Converte as datas para o formato pt-BR
    const formatarData = (data: Date) => {
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        return `${dia}/${mes}/${ano}`;
    };

    const normalizarLavagem = (doc: any): Lavagem => {
        // Função de normalização similar à do histórico de lavagens
        const isFormatoAntigo = 'placaVeiculo' in doc;

        const veiculo = isFormatoAntigo
            ? {
                placa: doc.placaVeiculo,
                tipo: doc.placaVeiculo.includes('COMPACTADORA') || doc.placaVeiculo.includes('EQUIPAMENTO')
                    ? 'equipamento'
                    : 'veiculo',
                numeroEquipamento: doc.placaVeiculo.includes('COMPACTADORA') || doc.placaVeiculo.includes('EQUIPAMENTO')
                    ? doc.placaVeiculo.split('-')[1]
                    : null
            }
            : doc.veiculo || {
                placa: '',
                tipo: 'veiculo',
                numeroEquipamento: null
            };

        const createdAtTime = isFormatoAntigo
            ? new Date(doc.createdAt).getTime()
            : doc.createdAt?.toDate?.()?.getTime() || Date.now();

        const produtos = doc.produtos?.map((prod: any) => ({
            nome: prod.produto || prod.nome || 'Produto não especificado',
            quantidade: parseInt(prod.quantidade) || 1
        })) || [];

        return {
            id: doc.id,
            responsavel: doc.responsavel || '',
            data: doc.data || '',
            hora: doc.hora || '',
            veiculo: veiculo,
            tipoLavagem: doc.tipoLavagem || '',
            produtos: produtos,
            createdAt: createdAtTime
        };
    };

    

    const verificarConectividade = async () => {
        try {
            showGlobalToast('info', 'Aguarde', 'Verificando conexão com o servidor...', 10000);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // timeout de 5 segundos

            const response = await fetch('http://192.168.1.222:3000/ping', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                return true;
            } else {
                throw new Error('Servidor respondeu com erro');
            }

        } catch (error) {
            console.error('Erro ao verificar conectividade:', error);
            // Não mostrar toast aqui, pois vamos mostrar o modal
            return false;
        }
    };

    const formatarDataParaNomeArquivo = (data: string) => {
        // Assumindo que formatarData retorna no formato dd/mm/yyyy
        const partes = data.split('/');
        return `${partes[0]}-${partes[1]}-${partes[2]}`;
    };

    // Função para formatar o horário (remove os segundos)
    const formatarHorario = (hora: string) => {
        // Se o horário incluir segundos (HH:mm:ss), remove os segundos
        if (hora.split(':').length === 3) {
            return hora.split(':').slice(0, 2).join(':');
        }
        return hora; // Retorna o horário original se já estiver no formato HH:mm
    };

    const gerarRelatorioExcel = async () => {
        if (lavagens.length === 0) {
            showGlobalToast('error', 'Erro', 'Não há dados para gerar o relatório', 4000);
            return;
        }

        try {
            setLoading(true);

            // Verificar conectividade primeiro
            const conectado = await verificarConectividade();
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
            const lavagensFormatadas = lavagens.map(lavagem => ({
                ...lavagem,
                hora: formatarHorario(lavagem.hora)
            }));

            const response = await fetch('http://192.168.1.222:3000/gerar-relatorio-lavagem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    dataInicio: formatarData(dataInicio),
                    dataFim: formatarData(dataFim),
                    lavagens: lavagensFormatadas
                })
            });

            console.log(formatarData(dataInicio))
            console.log(formatarData(dataFim))

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

            // Criar nome do arquivo com timestamp
            const fileName = `relatorio_lavagens_${dataInicioFormatada}_ate_${dataFimFormatada}.xlsx`;
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
                title="Relatório de Lavagens"
                iconName="chart-bar-stacked"
                onBackPress={() => navigation.goBack()}
            />

            <FilterCard
                dataInicio={dataInicio}
                dataFim={dataFim}
                setDataInicio={setDataInicio}
                setDataFim={setDataFim}
                loading={loading}
                onGerarRelatorio={buscarLavagensPorIntervalo}
                placasFiltradas={placasFiltradas}
                setPlacasFiltradas={setPlacasFiltradas}
            />

            <ScrollView
                style={styles.scrollViewContainer}
                contentContainerStyle={styles.scrollViewContent}
            >
                {lavagens.length > 0 ? (
                    <RelatorioContent
                        lavagens={lavagens}
                        onGerarExcel={gerarRelatorioExcel}
                        loading={loading}
                    />
                ) : (
                    <View style={styles.emptyStateContainer}>
                        <Icon
                            name="filter-variant"
                            size={64}
                            color={customTheme.colors.onSurfaceVariant}
                        />
                        <Text style={styles.emptyStateTitle}>
                            Nenhum registro encontrado
                        </Text>
                        <Text style={styles.emptyStateSubtitle}>
                            Utilize os filtros acima para gerar um relatório
                        </Text>
                        <Text style={styles.emptyStateDescription}>
                            Selecione um intervalo de datas e, se desejar, filtre por placas específicas
                        </Text>
                    </View>
                )}
            </ScrollView>

            <ConnectionErrorModal />

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: 40,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginTop: 16,
        textAlign: 'center',
    },
    emptyStateSubtitle: {
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 8,
        textAlign: 'center',
    },
    emptyStateDescription: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
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