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
    Divider
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RegistroLavagem } from './lavagemTypes';
import ModernHeader from '../../../../assets/components/ModernHeader';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import { customTheme } from '../../../../theme/theme';
import FilterCard from './FilterCard';
import RelatorioContent from './RelatorioContent';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

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
            const querySnapshot = await firestore()
                .collection('veiculos')
                .get();

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

            const queryNovos = firestore()
                .collection('lavagens')
                .where('data', '>=', inicioFormatado)
                .where('data', '<=', fimFormatado)
                .orderBy('data', 'desc');

            const queryAntigos = firestore()
                .collection('registroLavagens')
                .where('data', '>=', inicioFormatado)
                .where('data', '<=', fimFormatado)
                .orderBy('data', 'desc');

            const [snapshotNovos, snapshotAntigos] = await Promise.all([
                queryNovos.get(),
                queryAntigos.get()
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

    const verificarConectividade = async () => {
        try {
            showGlobalToast('info', 'Aguarde', 'Verificando conexão com o servidor...', 2000);

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
                setLoading(false); // Importante desativar o loading aqui
                setIsConnectionModalVisible(true);
                return;
            }

            console.log("Dados sendo enviados:", {
                dataInicio: formatarData(dataInicio),
                dataFim: formatarData(dataFim),
                lavagens
            });

            // Resto do seu código continua igual...
            const response = await fetch('http://192.168.1.222:3000/gerar-relatorio-lavagem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    dataInicio: formatarData(dataInicio),
                    dataFim: formatarData(dataFim),
                    lavagens
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Erro do servidor:', errorText);
                throw new Error(`Erro na resposta do servidor: ${errorText}`);
            }

            // Criar nome do arquivo com timestamp
            const timestamp = Date.now();
            const fileName = `relatorio_lavagens_${timestamp}.xlsx`;
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

                    // Limpar arquivo após compartilhar
                    await RNFS.unlink(filePath);

                    showGlobalToast('success', 'Sucesso', 'Relatório gerado com sucesso!', 4000);
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
                        Conexão não estabelecida
                    </Text>

                    <Text style={styles.modalText}>
                        Para gerar relatórios, é necessário estar conectado ao servidor da Ecologika (http://192.168.1.222:3000).
                        Este serviço está disponível apenas quando você está conectado à rede interna da Ecologika com o servidor ativado.
                    </Text>

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
                {lavagens.length > 0 && (
                    <RelatorioContent
                        lavagens={lavagens}
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
        fontSize: 16,
        textAlign: 'center',
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