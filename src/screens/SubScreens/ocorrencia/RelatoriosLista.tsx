import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Linking
} from 'react-native';
import {
    Text,
    Card,
    Surface,
    Button,
    Divider,
} from 'react-native-paper';
import { customTheme } from '../../../theme/theme';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import ModernHeader from '../../../assets/components/ModernHeader';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';

interface DateFilterValue {
    startDate: string;
    endDate: string;
}

interface RelatorioOcorrencia {
    id: string;
    numeroRO: string; // alterado de num para numeroRO
    classificacao?: string; // tornando opcional já que não vi no documento
    cliente: string;
    data: string; // alterado de dataOm para data
    resp?: string; // tornando opcional já que não vi no documento
    obs?: string;
    pdfUrl: string;
    storagePath: string;
    createdAt: FirebaseFirestoreTypes.Timestamp;
}

const RelatorioOcorrenciaList: React.FC = () => {
    const navigation = useNavigation<NavigationProp<ParamListBase>>();

    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [relatorios, setRelatorios] = useState<RelatorioOcorrencia[]>([]);
    const [displayedRelatorios, setDisplayedRelatorios] = useState<RelatorioOcorrencia[]>([]);
    const [dateFilter, setDateFilter] = useState<DateFilterValue | null>(null);
    const [isDescending, setIsDescending] = useState(true);
    const [selectedRelatorio, setSelectedRelatorio] = useState<RelatorioOcorrencia | null>(null);
    const [detalhesModalVisible, setDetalhesModalVisible] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMoreData, setHasMoreData] = useState(true);
    const ITEMS_PER_PAGE = 15;

    // Buscar relatórios
    const fetchRelatorios = async () => {
        try {
            setLoading(true);
            console.log('Iniciando busca com filtros:', dateFilter);

            let queryRef: FirebaseFirestoreTypes.Query = firestore()
                .collection('relatoriosOcorrencia')
                .orderBy('data', isDescending ? 'desc' : 'asc');

            const snapshot = await queryRef.get();
            console.log('Número de documentos encontrados:', snapshot.size);

            if (snapshot.empty) {
                console.log('Nenhum documento encontrado');
                setRelatorios([]);
                setDisplayedRelatorios([]);
                setHasMoreData(false);
                return;
            }

            let dados = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data
                } as RelatorioOcorrencia;
            });

            // Aplicar filtro de data localmente
            if (dateFilter) {
                dados = dados.filter(doc => {
                    // Converter as strings de data para objetos Date para comparação
                    const [docDay, docMonth, docYear] = doc.data.split('/').map(Number);
                    const docDate = new Date(docYear, docMonth - 1, docDay);

                    const [startDay, startMonth, startYear] = dateFilter.startDate.split('/').map(Number);
                    const startDate = new Date(startYear, startMonth - 1, startDay);

                    const [endDay, endMonth, endYear] = dateFilter.endDate.split('/').map(Number);
                    const endDate = new Date(endYear, endMonth - 1, endDay);

                    // Ajustar endDate para incluir o final do dia
                    endDate.setHours(23, 59, 59, 999);

                    return docDate >= startDate && docDate <= endDate;
                });
            }

            console.log('Dados após filtro:', dados);

            // Ordenar os dados
            dados = dados.sort((a, b) => {
                const [dayA, monthA, yearA] = a.data.split('/').map(Number);
                const [dayB, monthB, yearB] = b.data.split('/').map(Number);

                const dateA = new Date(yearA, monthA - 1, dayA);
                const dateB = new Date(yearB, monthB - 1, dayB);

                return isDescending ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
            });

            setRelatorios(dados);
            setDisplayedRelatorios(dados.slice(0, ITEMS_PER_PAGE));
            setHasMoreData(dados.length > ITEMS_PER_PAGE);
            setCurrentPage(0);

        } catch (error) {
            console.error('Erro ao buscar relatórios:', error);
        } finally {
            setLoading(false);
        }
    };

    // E este para reagir às mudanças de filtro
    useEffect(() => {
        if (dateFilter !== undefined) {
            fetchRelatorios();
        }
    }, [dateFilter, isDescending]);

    // Carregar mais
    const loadMore = () => {
        const nextPage = currentPage + 1;
        const startIndex = nextPage * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const newItems = relatorios.slice(startIndex, endIndex);

        if (newItems.length > 0) {
            setDisplayedRelatorios(prev => [...prev, ...newItems]);
            setCurrentPage(nextPage);
            setHasMoreData(endIndex < relatorios.length);
        } else {
            setHasMoreData(false);
        }
    };

    // Compartilhar PDF
    const handleShare = async (pdfUrl: string) => {
        try {
            setDownloading(true);

            // Criar pasta temporária se não existir
            const tempDir = `${RNFS.CachesDirectoryPath}/temp_pdfs`;
            await RNFS.mkdir(tempDir);

            // Nome do arquivo temporário
            const localFile = `${tempDir}/relatorio_${Date.now()}.pdf`;

            // Baixar o arquivo
            await RNFS.downloadFile({
                fromUrl: pdfUrl,
                toFile: localFile,
            }).promise;

            // Compartilhar
            await Share.open({
                url: Platform.OS === 'ios' ? localFile : `file://${localFile}`,
                type: 'application/pdf',
            });

            // Limpar arquivo temporário
            await RNFS.unlink(localFile);

        } catch (error) {
            console.log('Erro ao compartilhar:', error);
        } finally {
            setDownloading(false);
        }
    };

    // Atualizar a lista
    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchRelatorios().then(() => setRefreshing(false));
    }, []);

    // Botão "Carregar mais"
    const LoadMoreButton = () => {
        if (!hasMoreData && dateFilter) {
            return (
                <View style={styles.loadMoreContainer}>
                    <Text style={styles.endMessage}>
                        Estes são todos os relatórios entre {dateFilter.startDate} e {dateFilter.endDate}
                    </Text>
                </View>
            );
        }

        if (!hasMoreData) {
            return (
                <View style={styles.loadMoreContainer}>
                    <Text style={styles.endMessage}>
                        Não há mais relatórios para carregar
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.loadMoreContainer}>
                <Button
                    mode="outlined"
                    onPress={loadMore}
                    style={styles.loadMoreButton}
                >
                    Carregar mais
                </Button>
            </View>
        );
    };

    const handleViewPDF = (pdfUrl: string) => {
        // Aqui você pode usar a biblioteca que preferir para visualizar PDFs
        // Por exemplo, o react-native-pdf ou react-native-blob-util
        // Por enquanto, vamos apenas abrir no navegador como exemplo
        Linking.openURL(pdfUrl);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={customTheme.colors.primary} />
            </View>
        );
    }

    return (
        <Surface style={styles.container}>

            {/* Header */}
            <ModernHeader
                title="Relatórios de Ocorrência"
                iconName="description"
                onBackPress={() => navigation?.goBack()}
            />

            {/* Filtros */}
            {/* <DateFilter onFilterChange={setDateFilter} /> */}

            {/* Ordenação */}
            <Surface style={styles.orderToggleContainer}>
                <TouchableOpacity
                    style={styles.orderButton}
                    onPress={() => setIsDescending(!isDescending)}
                    disabled={loading}
                >
                    <View style={styles.orderButtonContent}>
                        <MaterialIcons
                            name="sort"
                            size={20}
                            color={customTheme.colors.primary}
                        />
                        <Text style={styles.orderText}>
                            {isDescending ? "Mais recentes primeiro" : "Mais antigos primeiro"}
                        </Text>
                    </View>
                </TouchableOpacity>
            </Surface>

            {/* Lista de Relatórios */}
            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                }
            >
                {displayedRelatorios.map((relatorio) => (
                    <Card
                        key={relatorio.id}
                        style={styles.card}
                        onPress={() => {
                            setSelectedRelatorio(relatorio);
                            setDetalhesModalVisible(true);
                        }}
                    >
                        <Card.Content>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardHeaderLeft}>
                                    <Text style={styles.numeroRelatorio}>
                                        RO-{relatorio.numeroRO}
                                    </Text>
                                    <Text style={styles.classificacao}>
                                        {relatorio.classificacao}
                                    </Text>
                                </View>
                                <View style={styles.cardHeaderRight}>
                                    <Text style={styles.data}>{relatorio.data}</Text>
                                </View>
                            </View>

                            <Divider style={styles.divider} />

                            <View style={styles.cardBody}>
                                <View style={styles.clienteRow}>
                                    <MaterialIcons
                                        name="business"
                                        size={20}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text style={styles.clienteText}>
                                        {relatorio.cliente.replace(/\s*\([^)]*\)/, '')}
                                    </Text>
                                </View>

                                <View style={styles.responsavelRow}>
                                    <MaterialIcons
                                        name="person"
                                        size={20}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text style={styles.responsavelText}>
                                        {relatorio.resp}
                                    </Text>
                                </View>
                            </View>
                        </Card.Content>
                    </Card>
                ))}

                <LoadMoreButton />
            </ScrollView>

            {/* Modal de Detalhes */}
            <Modal
                visible={detalhesModalVisible}
                transparent={true}
                onRequestClose={() => setDetalhesModalVisible(false)}
                animationType="slide"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <MaterialIcons
                                name="description"
                                size={24}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.modalTitle}>
                                Detalhes do Relatório
                            </Text>
                            <TouchableOpacity
                                onPress={() => setDetalhesModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <MaterialIcons
                                    name="close"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                            </TouchableOpacity>
                        </View>

                        {selectedRelatorio && (
                            <ScrollView style={styles.modalBody}>
                                <View style={styles.detailsSection}>
                                    <Text style={styles.sectionTitle}>
                                        RO-{selectedRelatorio.numeroRO}
                                    </Text>

                                    <View style={styles.detailRow}>
                                        <MaterialIcons
                                            name="category"
                                            size={20}
                                            color={customTheme.colors.primary}
                                        />
                                        <Text style={styles.detailText}>
                                            {selectedRelatorio.classificacao}
                                        </Text>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <MaterialIcons
                                            name="business"
                                            size={20}
                                            color={customTheme.colors.primary}
                                        />
                                        <Text style={styles.detailText}>
                                            {selectedRelatorio.cliente}
                                        </Text>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <MaterialIcons
                                            name="person"
                                            size={20}
                                            color={customTheme.colors.primary}
                                        />
                                        <Text style={styles.detailText}>
                                            {selectedRelatorio.resp}
                                        </Text>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <MaterialIcons
                                            name="event"
                                            size={20}
                                            color={customTheme.colors.primary}
                                        />
                                        <Text style={styles.detailText}>
                                            {selectedRelatorio.data}
                                        </Text>
                                    </View>

                                    {selectedRelatorio.obs && (
                                        <View style={styles.observacoesSection}>
                                            <Text style={styles.observacoesTitle}>
                                                Observações
                                            </Text>
                                            <Text style={styles.observacoesText}>
                                                {selectedRelatorio.obs}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Substitua o Button existente por essa View de botões */}
                                <View style={styles.pdfActionsContainer}>
                                    <TouchableOpacity
                                        style={styles.shareIconButton}
                                        onPress={() => handleShare(selectedRelatorio.pdfUrl)}
                                        disabled={downloading}
                                    >
                                        <MaterialIcons
                                            name="share"
                                            size={24}
                                            color={downloading ? customTheme.colors.onSurfaceDisabled : customTheme.colors.onPrimary}
                                        />
                                        {downloading && (
                                            <ActivityIndicator
                                                size="small"
                                                color={customTheme.colors.onPrimary}
                                                style={styles.shareLoading}
                                            />
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.viewPdfButton}
                                        onPress={() => handleViewPDF(selectedRelatorio.pdfUrl)}
                                    >
                                        <MaterialIcons
                                            name="picture-as-pdf"
                                            size={24}
                                            color={customTheme.colors.onPrimary}
                                        />
                                        <Text style={styles.viewPdfText}>
                                            Visualizar PDF
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </Surface>
    );
};

const styles = StyleSheet.create({
    pdfActionsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    shareIconButton: {
        backgroundColor: customTheme.colors.primary,
        height: 48,
        width: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    shareLoading: {
        position: 'absolute',
    },
    viewPdfButton: {
        flex: 1,
        backgroundColor: customTheme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 48,
        borderRadius: 8,
        elevation: 2,
    },
    viewPdfText: {
        color: customTheme.colors.onPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    orderToggleContainer: {
        margin: 8,
        borderRadius: 8,
        elevation: 1,
    },
    orderButton: {
        padding: 12,
    },
    orderButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    orderText: {
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    card: {
        margin: 8,
        elevation: 2,
        borderRadius: 12,
        backgroundColor: customTheme.colors.surface,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    cardHeaderLeft: {
        flex: 1,
    },
    cardHeaderRight: {
        alignItems: 'flex-end',
    },
    numeroRelatorio: {
        fontSize: 16,
        fontWeight: 'bold',
        color: customTheme.colors.primary,
    },
    classificacao: {
        fontSize: 14,
        color: customTheme.colors.secondary,
        marginTop: 2,
    },
    data: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    divider: {
        marginVertical: 8,
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    cardBody: {
        gap: 8,
    },
    clienteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    clienteText: {
        flex: 1,
        fontSize: 15,
        color: customTheme.colors.onSurface,
    },
    responsavelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    responsavelText: {
        flex: 1,
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadMoreContainer: {
        padding: 16,
        alignItems: 'center',
    },
    loadMoreButton: {
        width: '50%',
        borderRadius: 8,
    },
    endMessage: {
        textAlign: 'center',
        color: customTheme.colors.onSurfaceVariant,
        fontSize: 14,
        fontStyle: 'italic',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: customTheme.colors.surface,
        width: '90%',
        maxHeight: '80%',
        borderRadius: 20,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.surfaceVariant,
    },
    modalTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.primary,
        marginLeft: 12,
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        padding: 16,
    },
    detailsSection: {
        gap: 12,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: customTheme.colors.primary,
        marginBottom: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 8,
    },
    detailText: {
        flex: 1,
        fontSize: 15,
        color: customTheme.colors.onSurface,
    },
    observacoesSection: {
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    observacoesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.primary,
        marginBottom: 8,
    },
    observacoesText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        lineHeight: 20,
    },
});

export default RelatorioOcorrenciaList;