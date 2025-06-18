import {
    ActivityIndicator,
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

import FilterCard from './Components/Filtros/FilterCard';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LavagemInterface } from './Components/lavagemTypes';
import ModernHeader from '../../../assets/components/ModernHeader';
import RNFS from 'react-native-fs';
import RelatorioContent from './Components/RelatorioContent';
import Share from 'react-native-share';
import { Timestamp } from 'firebase/firestore';
import XLSX from 'xlsx';
import { customTheme } from '../../../theme/theme';
import { db } from '../../../../firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { showGlobalToast } from '../../../helpers/GlobalApi';

const RelatorioLavagens = ({ navigation }: { navigation: any }) => {
    const [dataInicio, setDataInicio] = useState<Date>(new Date());
    const [dataFim, setDataFim] = useState<Date>(new Date());
    const [lavagens, setLavagens] = useState<LavagemInterface[]>([]);
    const [loading, setLoading] = useState(false);
    const [placasFiltradas, setPlacasFiltradas] = useState<string[]>([]);
    const [placasDisponiveis, setPlacasDisponiveis] = useState<Array<{
        placa: string;
        tipo: 'veiculo' | 'equipamento';
        numeroEquipamento?: string;
    }>>([]);
    const [firstTimeSearch, setFirstTimeSearch] = useState(true);

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

    const formatarData = (data: Date) => {
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        return `${dia}/${mes}/${ano}`;
    };

    const formatarHorario = (hora: string) => {
        if (!hora) return '';
        const parts = hora.split(':');
        if (parts.length >= 2) {
            return `${parts[0]}:${parts[1]}`;
        }
        return hora;
    };

    const normalizarLavagem = (doc: any): LavagemInterface => {
        const isFormatoAntigo = 'placaVeiculo' in doc;

        console.log(`Normalizando documento ${doc.id}:`, {
            data: doc.data,
            hora: doc.hora,
            createdAt: doc.createdAt,
            placaVeiculo: doc.placaVeiculo,
            veiculo: doc.veiculo
        });

        const veiculo = isFormatoAntigo
            ? {
                placa: doc.placaVeiculo || '',
                tipo: doc.placaVeiculo?.includes('COMPACTADORA') || doc.placaVeiculo?.includes('EQUIPAMENTO')
                    ? 'equipamento'
                    : 'veiculo',
                numeroEquipamento: doc.placaVeiculo?.includes('COMPACTADORA') || doc.placaVeiculo?.includes('EQUIPAMENTO')
                    ? doc.placaVeiculo.split('-')[1]
                    : null
            }
            : doc.veiculo || {
                placa: '',
                tipo: 'veiculo',
                numeroEquipamento: null
            };

        const dataField = doc.data instanceof Timestamp
            ? doc.data
            : typeof doc.data === 'string' && doc.data.match(/^\d{2}\/\d{2}\/\d{4}$/)
                ? doc.data
                : '';

        const createdAtField = doc.createdAt instanceof Timestamp
            ? doc.createdAt
            : typeof doc.createdAt === 'string' && doc.createdAt.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/)
                ? doc.createdAt
                : null;

        const produtos = doc.produtos?.map((prod: any) => ({
            nome: prod.produto || prod.nome || 'Produto não especificado',
            quantidade: parseInt(prod.quantidade) || 1
        })) || [];

        const fotos = doc.fotos?.map((foto: any) => ({
            url: foto.url || '',
            timestamp: foto.timestamp || 0,
            path: foto.path || ''
        })) || [];

        const normalized = {
            id: doc.id,
            responsavel: doc.responsavel || '',
            data: dataField,
            hora: doc.hora || '',
            veiculo,
            tipoLavagem: doc.tipoLavagem || '',
            produtos,
            fotos,
            observacoes: doc.observacoes || '',
            status: doc.status || 'concluido',
            createdAt: createdAtField,
            createdBy: doc.createdBy || null,
            agendamentoId: doc.agendamentoId || null
        };

        console.log(`Documento ${doc.id} normalizado:`, {
            data: normalized.data,
            hora: normalized.hora,
            createdAt: normalized.createdAt
        });

        return normalized;
    };

    const buscarLavagensPorIntervalo = async () => {
        try {
            setFirstTimeSearch(false);
            setLoading(true);

            console.log('Buscando lavagens com intervalo:', {
                dataInicio: formatarData(dataInicio),
                dataFim: formatarData(dataFim),
                dataInicioRaw: dataInicio,
                dataFimRaw: dataFim
            });

            // Converter dataInicio e dataFim para Timestamp
            const inicioTimestamp = Timestamp.fromDate(new Date(dataInicio.setHours(0, 0, 0, 0)));
            const fimTimestamp = Timestamp.fromDate(new Date(dataFim.setHours(23, 59, 59, 999)));

            if (dataInicio > dataFim) {
                Alert.alert(
                    'Erro',
                    'A data de início deve ser anterior ou igual à data final.'
                );
                console.log('Erro: dataInicio > dataFim');
                return;
            }

            // Buscar lavagens no formato novo (data como Timestamp)
            const queryNovos = query(
                collection(db(), 'registroLavagens'),
                where('data', '>=', inicioTimestamp),
                where('data', '<=', fimTimestamp),
                orderBy('data', 'desc')
            );

            // Buscar lavagens no formato antigo (data como string DD/MM/YYYY)
            const queryAntigos = query(
                collection(db(), 'registroLavagens'),
                where('data', '>=', formatarData(dataInicio)),
                where('data', '<=', formatarData(dataFim)),
                orderBy('data', 'desc')
            );

            console.log('Executando consultas:', {
                queryNovos: 'registroLavagens com data >= inicioTimestamp e <= fimTimestamp',
                queryAntigos: `registroLavagens com data >= ${formatarData(dataInicio)} e <= ${formatarData(dataFim)}`
            });

            const [snapshotNovos, snapshotAntigos] = await Promise.all([
                getDocs(queryNovos),
                getDocs(queryAntigos)
            ]);

            const dadosNovos = snapshotNovos.docs.map(doc => {
                const data = normalizarLavagem({ id: doc.id, ...doc.data() });
                console.log(`Documento novo ${doc.id}:`, {
                    data: data.data,
                    hora: data.hora,
                    createdAt: data.createdAt
                });
                return data;
            });

            const dadosAntigos = snapshotAntigos.docs.map(doc => {
                const data = normalizarLavagem({ id: doc.id, ...doc.data() });
                console.log(`Documento antigo ${doc.id}:`, {
                    data: data.data,
                    hora: data.hora,
                    createdAt: data.createdAt
                });
                return data;
            });

            let todosDados = [...dadosNovos, ...dadosAntigos];

            console.log('Dados combinados antes da ordenação:', todosDados.map(d => ({
                id: d.id,
                data: d.data instanceof Timestamp ? d.data.toDate().toISOString() : d.data,
                hora: d.hora,
                createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt
            })));

            // Filtrar novamente para garantir que apenas datas dentro do intervalo sejam incluídas
            todosDados = todosDados.filter(lavagem => {
                let lavagemDate: Date;
                if (typeof lavagem.data === 'string' && lavagem.data.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                    const [dia, mes, ano] = lavagem.data.split('/').map(Number);
                    lavagemDate = new Date(ano, mes - 1, dia);
                    if (lavagem.hora && lavagem.hora.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
                        const [hours, minutes, seconds = 0] = lavagem.hora.split(':').map(Number);
                        lavagemDate.setHours(hours, minutes, seconds);
                    }
                } else if (lavagem.data instanceof Timestamp) {
                    lavagemDate = lavagem.data.toDate();
                } else {
                    console.warn(`Data inválida no documento ${lavagem.id}:`, lavagem.data);
                    return false;
                }

                const isWithinInterval = lavagemDate >= new Date(dataInicio.setHours(0, 0, 0, 0)) &&
                    lavagemDate <= new Date(dataFim.setHours(23, 59, 59, 999));
                if (!isWithinInterval) {
                    console.log(`Documento ${lavagem.id} fora do intervalo:`, {
                        lavagemDate: lavagemDate.toISOString(),
                        dataInicio: dataInicio.toISOString(),
                        dataFim: dataFim.toISOString()
                    });
                }
                return isWithinInterval;
            });

            // Ordenar do mais recente para o mais antigo
            todosDados = todosDados.sort((a, b) => {
                let dataA: Date = new Date(0);
                let dataB: Date = new Date(0);

                if (typeof a.data === 'string' && a.data.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                    const [dia, mes, ano] = a.data.split('/').map(Number);
                    dataA = new Date(ano, mes - 1, dia);
                    if (a.hora && a.hora.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
                        const [hours, minutes, seconds = 0] = a.hora.split(':').map(Number);
                        dataA.setHours(hours, minutes, seconds);
                    }
                } else if (a.data instanceof Timestamp) {
                    dataA = a.data.toDate();
                }

                if (typeof b.data === 'string' && b.data.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                    const [dia, mes, ano] = b.data.split('/').map(Number);
                    dataB = new Date(ano, mes - 1, dia);
                    if (b.hora && b.hora.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
                        const [hours, minutes, seconds = 0] = b.hora.split(':').map(Number);
                        dataB.setHours(hours, minutes, seconds);
                    }
                } else if (b.data instanceof Timestamp) {
                    dataB = b.data.toDate();
                }

                return dataB.getTime() - dataA.getTime();
            });

            // console.log('Dados após ordenação:', todosDados.map(d => ({
            //     id: d.id,
            //     data: d.data instanceof Timestamp ? d.data.toDate().toISOString() : d.data,
            //     hora: d.hora,
            //     createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt
            // })));

            // Aplicar filtro de placas se houver placas selecionadas
            if (placasFiltradas.length > 0) {
                todosDados = todosDados.filter(lavagem =>
                    placasFiltradas.includes(lavagem.veiculo.placa.toUpperCase())
                );
                console.log('Dados após filtro de placas:', todosDados.map(d => ({
                    id: d.id,
                    placa: d.veiculo.placa,
                    data: d.data instanceof Timestamp ? d.data.toDate().toISOString() : d.data
                })));
            }

            setLavagens(todosDados);

        } catch (error) {
            console.error('Erro ao buscar lavagens:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível gerar o relatório', 4000);
        } finally {
            setLoading(false);
        }
    };

    const formatarDataParaNomeArquivo = (data: string) => {
        const partes = data.split('/');
        return `${partes[0]}-${partes[1]}-${partes[2]}`;
    };

    const gerarRelatorioExcel = async () => {
        if (lavagens.length === 0) {
            showGlobalToast('error', 'Erro', 'Não há dados para gerar o relatório', 4000);
            return;
        }

        try {
            setLoading(true);

            // Criar dados para a planilha
            const data = lavagens.map(lavagem => {
                const dataFormatada = typeof lavagem.data === 'string'
                    ? lavagem.data
                    : format(lavagem.data.toDate(), 'dd/MM/yyyy', { locale: ptBR });
                const horaFormatada = formatarHorario(lavagem.hora);
                const produtos = lavagem.produtos.map(p => `${p.nome} (${p.quantidade})`).join(', ');
                return {
                    'Data': dataFormatada,
                    'Hora': horaFormatada,
                    'Placa': lavagem.veiculo.placa,
                    'Tipo Veículo': lavagem.veiculo.tipo,
                    'Número Equipamento': lavagem.veiculo.numeroEquipamento || '',
                    'Tipo Lavagem': lavagem.tipoLavagem,
                    'Responsável': lavagem.responsavel,
                    'Produtos': produtos,
                    'Observações': lavagem.observacoes || ''
                };
            });

            // Criar planilha
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Relatório Lavagens');

            // Gerar buffer do arquivo Excel
            const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

            // Criar nome do arquivo
            const dataInicioFormatada = formatarDataParaNomeArquivo(formatarData(dataInicio));
            const dataFimFormatada = formatarDataParaNomeArquivo(formatarData(dataFim));
            const fileName = `relatorio_lavagens_${dataInicioFormatada}_ate_${dataFimFormatada}.xlsx`;
            const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

            // Salvar arquivo
            await RNFS.writeFile(filePath, wbout, 'base64');

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
            //console.error('Erro ao gerar relatório:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível gerar o relatório', 4000);
        } finally {
            setLoading(false);
        }
    };

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

            {
                loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={customTheme.colors.primary} />
                        <Text style={{ marginTop: 16, fontSize: 18, fontWeight: '500', color: customTheme.colors.onSurface }}>
                            Carregando lavagens...
                        </Text>
                    </View>
                ) : (
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

                                {!firstTimeSearch && (
                                    <Text style={styles.emptyStateTitle}>
                                        Nenhum registro encontrado
                                    </Text>
                                )}

                                <Text style={styles.emptyStateSubtitle}>
                                    Utilize os filtros acima para gerar um relatório
                                </Text>
                                <Text style={styles.emptyStateDescription}>
                                    Selecione um intervalo de datas e, se desejar, filtre por placas específicas
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                )
            }

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
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

export default RelatorioLavagens;