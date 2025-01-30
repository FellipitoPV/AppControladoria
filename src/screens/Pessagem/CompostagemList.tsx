import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Modal,
    TouchableOpacity,
    Dimensions,
    Image,
    ActivityIndicator
} from 'react-native';
import {
    Text,
    Card,
    Divider,
    Surface,
    Button
} from 'react-native-paper';
import { customTheme } from '../../theme/theme';
import { Compostagem } from '../../helpers/Types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateFilter from '../../assets/components/DateFilter';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface DateFilterValue {
    startDate: string;
    endDate: string;
}

let isLoading = false;

const CompostagemList: React.FC = () => {
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedCompostagem, setSelectedCompostagem] = useState<Compostagem | null>(null);
    const [detalhesModalVisible, setDetalhesModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({});
    const [lastVisible, setLastVisible] = useState<any>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);


    const [compostagens, setCompostagens] = useState<Compostagem[]>([]); // Todos os dados
    const [displayedCompostagens, setDisplayedCompostagens] = useState<Compostagem[]>([]); // Dados paginados
    const [dateFilter, setDateFilter] = useState<DateFilterValue | null>(null);
    const [isDescending, setIsDescending] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [hasMoreData, setHasMoreData] = useState<boolean>(true);
    const ITEMS_PER_PAGE = 15;

    useEffect(() => {
        setLastVisible(null);
        setCompostagens([]);
        setHasMoreData(true);
        fetchCompostagens();
    }, [dateFilter, isDescending]); // Adiciona isDescending como dependência

    // Modificar a função fetchCompostagens para suportar paginação
    const fetchCompostagens = async () => {
        try {
            let query: FirebaseFirestoreTypes.Query = firestore()
                .collection('compostagens');

            if (dateFilter) {
                query = query
                    .where('data', '>=', dateFilter.startDate)
                    .where('data', '<=', dateFilter.endDate);
            }

            const snapshot = await query.get();

            if (snapshot.empty) {
                setCompostagens([]);
                setDisplayedCompostagens([]);
                setHasMoreData(false);
                setLoading(false);
                return;
            }

            // Busca todos os dados e ordena
            let dados = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Compostagem))
                .filter(compostagem => {
                    return !('isMedicaoRotina' in compostagem) || compostagem.isMedicaoRotina === false;
                })
                .sort((a, b) => {
                    // Combina data e hora para ordenação
                    const timestampA = `${a.data}T${a.hora}`;
                    const timestampB = `${b.data}T${b.hora}`;
                    return isDescending ?
                        timestampB.localeCompare(timestampA) :
                        timestampA.localeCompare(timestampB);
                });

            setCompostagens(dados);

            // Configura a primeira página
            setDisplayedCompostagens(dados.slice(0, ITEMS_PER_PAGE));
            setHasMoreData(dados.length > ITEMS_PER_PAGE);
            setCurrentPage(0);
            setLoading(false);
        } catch (error) {
            console.error('Erro ao buscar compostagens:', error);
            setLoading(false);
        }
    };

    // Função para carregar mais dados
    const loadMore = () => {
        const nextPage = currentPage + 1;
        const startIndex = nextPage * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const newItems = compostagens.slice(startIndex, endIndex);

        if (newItems.length > 0) {
            setDisplayedCompostagens(prev => [...prev, ...newItems]);
            setCurrentPage(nextPage);
            setHasMoreData(endIndex < compostagens.length);
        } else {
            setHasMoreData(false);
        }
    };

    // Modificar o handleRefresh para resetar a paginação
    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        setLastVisible(null);
        fetchCompostagens().then(() => setRefreshing(false));
    }, []);

    useEffect(() => {
        fetchCompostagens();
    }, []);

    // Botão "Carregar mais"
    const LoadMoreButton = () => {
        if (!hasMoreData && dateFilter) {
            return (
                <View style={styles.loadMoreContainer}>
                    <Text style={styles.endMessage}>
                        Estes são todos os registros entre {formatDate(dateFilter.startDate)} e {formatDate(dateFilter.endDate)}
                    </Text>
                </View>
            );
        }

        if (!hasMoreData) {
            return (
                <View style={styles.loadMoreContainer}>
                    <Text style={styles.endMessage}>
                        Não há mais registros para carregar
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
                    <Text style={{ fontWeight: 'bold' }}>Carregar mais</Text>
                </Button>
            </View>
        );
    };

    // Função helper melhorada
    const getDisplayValue = (value: string | number | undefined | null, suffix: string = '', isCard: boolean = false) => {
        if (value === null || value === undefined || String(value).trim() === '') {
            return (
                <Text
                    style={[
                        isCard ? styles.cardTempValue : styles.metricValue,
                        styles.notRegistered,
                        isCard && styles.cardNotRegistered
                    ]}
                >
                    N/R
                </Text>
            );
        }

        return (
            <Text style={isCard ? styles.cardTempValue : styles.metricValue}>
                {String(value).trim()}{suffix}
            </Text>
        );
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '';

        // Quebra a string da data em suas partes
        const [year, month, day] = dateStr.split('-');

        // Retorna a data no formato dd/mm/aaaa
        return `${day}/${month}/${year}`;
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
            <View style={styles.header}>
                <Icon
                    name="clipboard-list"
                    size={32}
                    color={customTheme.colors.primary}
                />
                <Text variant="headlineMedium" style={styles.headerTitle}>
                    Medições Completas
                </Text>
            </View>

            <DateFilter
                onFilterChange={(filter: DateFilterValue | null) => {
                    setDateFilter(filter);
                }}
            />

            <Surface style={styles.orderToggleContainer}>
                <TouchableOpacity
                    style={styles.orderButton}
                    onPress={async () => {
                        if (!loading) {  // Só executa se não estiver carregando
                            setLoading(true);
                            setIsDescending(!isDescending);
                            await fetchCompostagens();
                            setLoading(false);
                        }
                    }}
                    disabled={loading}  // Desabilita o botão durante o loading
                >
                    {loading ? (
                        // Mostra o loading
                        <View style={styles.orderButtonContent}>
                            <ActivityIndicator size="small" color={customTheme.colors.primary} />
                            <Text style={styles.orderText}>Carregando...</Text>
                        </View>
                    ) : (
                        // Mostra o conteúdo normal
                        <View style={styles.orderButtonContent}>
                            <Icon
                                name={isDescending ? "sort-calendar-descending" : "sort-calendar-ascending"}
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.orderText}>
                                {isDescending ? "Decrescente" : "Crescente"}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Surface>

            {/* Agora a ScrollView não precisa mais do loading condicional */}
            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                }
            >
                {displayedCompostagens.map((item) => (
                    <Card
                        key={item.id}
                        style={styles.card}
                        onPress={() => {
                            setSelectedCompostagem(item);
                            setDetalhesModalVisible(true);
                        }}
                    >
                        <Card.Content>
                            <View style={styles.cardGrid}>
                                {/* Coluna da Esquerda - Info básica */}
                                <View style={styles.leftColumn}>
                                    <View style={styles.responsavelContainer}>
                                        <Icon name="account" size={20} color={customTheme.colors.primary} />
                                        <Text style={styles.responsavel}>
                                            {item.responsavel || 'Não registrado'}
                                        </Text>
                                    </View>
                                    <View style={styles.dataContainer}>
                                        <Icon name="calendar" size={16} color={customTheme.colors.onSurfaceVariant} />
                                        <Text style={styles.data}>
                                            {item.data && item.hora ?
                                                `${formatDate(item.data)} às ${item.hora}` :
                                                'Não registrado'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Coluna da Direita - Leira */}
                                <View style={styles.leiraContainer}>
                                    <View style={styles.leiraContent}>
                                        <Icon
                                            name="silo"
                                            size={24}
                                            color={customTheme.colors.primary}
                                            style={styles.leiraIcon}
                                        />
                                        <View style={styles.leiraTextContainer}>
                                            <Text style={styles.leiraLabel}>Leira</Text>
                                            {item.leira && item.leira.trim() !== '' ? (
                                                <Text style={styles.leiraNumber}>{item.leira}</Text>
                                            ) : (
                                                <Text style={[styles.leiraNumber, styles.notRegistered]}>N/R</Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <Divider style={styles.divider} />

                            <View style={styles.cardTemperaturas}>
                                <View style={styles.cardTempColumn}>
                                    <Text style={styles.cardTempLabel}>Amb</Text>
                                    {getDisplayValue(item.tempAmb, '°C', true)}
                                </View>
                                <View style={styles.cardTempDivider} />
                                <View style={styles.cardTempColumn}>
                                    <Text style={styles.cardTempLabel}>Base</Text>
                                    {getDisplayValue(item.tempBase, '°C', true)}
                                </View>
                                <View style={styles.cardTempDivider} />
                                <View style={styles.cardTempColumn}>
                                    <Text style={styles.cardTempLabel}>Meio</Text>
                                    {getDisplayValue(item.tempMeio, '°C', true)}
                                </View>
                                <View style={styles.cardTempDivider} />
                                <View style={styles.cardTempColumn}>
                                    <Text style={styles.cardTempLabel}>Topo</Text>
                                    {getDisplayValue(item.tempTopo, '°C', true)}
                                </View>
                            </View>

                            {item.photoUrls && item.photoUrls.length > 0 && (
                                <View style={styles.cardThumbContainer}>
                                    <Image
                                        source={{ uri: item.photoUrls[0] }}
                                        style={styles.cardThumbnail}
                                        resizeMode="cover"
                                    />
                                </View>
                            )}
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
                            <Icon name="clipboard-text" size={24} color={customTheme.colors.primary} />
                            <Text style={styles.modalTitle}>Detalhes da Medição</Text>
                            <TouchableOpacity
                                onPress={() => setDetalhesModalVisible(false)}
                                style={styles.closeModalButton}
                            >
                                <Icon name="close" size={24} color={customTheme.colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScrollView}>
                            {selectedCompostagem && (
                                <>
                                    {/* Cabeçalho com Responsável, Data e Leira */}
                                    <View style={styles.modalHeaderInfo}>
                                        <View style={styles.modalHeaderRow}>
                                            <View style={styles.modalHeaderLeft}>
                                                <View style={styles.modalInfoRow}>
                                                    <Icon name="account" size={20} color={customTheme.colors.primary} />
                                                    <Text style={styles.modalInfoText}>
                                                        {selectedCompostagem.responsavel || 'Não registrado'}
                                                    </Text>
                                                </View>
                                                <View style={styles.modalInfoRow}>
                                                    <Icon name="calendar-clock" size={20} color={customTheme.colors.primary} />
                                                    <Text style={styles.modalInfoText}>
                                                        {selectedCompostagem.data ?
                                                            `${formatDate(selectedCompostagem.data)} às ${selectedCompostagem.hora}` :
                                                            'Não registrado'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.modalLeiraContainer}>
                                                <View style={styles.modalLeiraContent}>
                                                    <Icon
                                                        name="silo"
                                                        size={24}
                                                        color={customTheme.colors.primary}
                                                        style={styles.modalLeiraIcon}
                                                    />
                                                    <View style={styles.modalLeiraTextContainer}>
                                                        <Text style={styles.modalLeiraLabel}>Leira</Text>
                                                        {selectedCompostagem.leira && selectedCompostagem.leira.trim() !== '' ? (
                                                            <Text style={styles.modalLeiraNumber}>{selectedCompostagem.leira}</Text>
                                                        ) : (
                                                            <Text style={[styles.modalLeiraNumber, styles.modalNotRegistered]}>N/R</Text>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    <Divider style={styles.divider} />

                                    {/* Seção de Temperaturas */}
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <Icon name="thermometer" size={20} color={customTheme.colors.primary} />
                                            <Text style={styles.sectionTitle}>Temperaturas</Text>
                                        </View>
                                        <View style={styles.metricsGrid}>
                                            <View style={styles.metricItem}>
                                                <Icon name="thermometer-low" size={18} color={customTheme.colors.secondary} />
                                                <Text style={styles.metricLabel}>Ambiente</Text>
                                                {getDisplayValue(selectedCompostagem.tempAmb, '°C')}
                                            </View>
                                            <View style={styles.metricItem}>
                                                <Icon name="thermometer-low" size={18} color={customTheme.colors.secondary} />
                                                <Text style={styles.metricLabel}>Base</Text>
                                                {getDisplayValue(selectedCompostagem.tempBase, '°C')}
                                            </View>
                                            <View style={styles.metricItem}>
                                                <Icon name="thermometer" size={18} color={customTheme.colors.secondary} />
                                                <Text style={styles.metricLabel}>Meio</Text>
                                                {getDisplayValue(selectedCompostagem.tempMeio, '°C')}
                                            </View>
                                            <View style={styles.metricItem}>
                                                <Icon name="thermometer-high" size={18} color={customTheme.colors.secondary} />
                                                <Text style={styles.metricLabel}>Topo</Text>
                                                {getDisplayValue(selectedCompostagem.tempTopo, '°C')}
                                            </View>
                                        </View>
                                    </View>

                                    {/* Seção de Umidade */}
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <Icon name="water-percent" size={20} color={customTheme.colors.primary} />
                                            <Text style={styles.sectionTitle}>Umidade</Text>
                                        </View>
                                        <View style={styles.metricsRow}>
                                            <View style={styles.metricItemWide}>
                                                <Icon name="weather-cloudy" size={18} color={customTheme.colors.secondary} />
                                                <View>
                                                    <Text style={styles.metricLabel}>Ambiente</Text>
                                                    {getDisplayValue(selectedCompostagem.umidadeAmb, '%')}
                                                </View>
                                            </View>
                                            <View style={styles.metricItemWide}>
                                                <Icon name="waves" size={18} color={customTheme.colors.secondary} />
                                                <View>
                                                    <Text style={styles.metricLabel}>Leira</Text>
                                                    {getDisplayValue(selectedCompostagem.umidadeLeira, '%')}
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Seção de Análise */}
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <Icon name="flask" size={20} color={customTheme.colors.primary} />
                                            <Text style={styles.sectionTitle}>Análise</Text>
                                        </View>
                                        <View style={styles.metricsRow}>
                                            <View style={styles.metricItemWide}>
                                                <Icon name="flask-outline" size={18} color={customTheme.colors.secondary} />
                                                <View>
                                                    <Text style={styles.metricLabel}>pH</Text>
                                                    {getDisplayValue(selectedCompostagem.ph)}
                                                </View>
                                            </View>
                                            <View style={styles.metricItemWide}>
                                                <Icon name="air-filter" size={18} color={customTheme.colors.secondary} />
                                                <View>
                                                    <Text style={styles.metricLabel}>Odor</Text>
                                                    {getDisplayValue(selectedCompostagem.odor)}
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Observações (se houver) */}
                                    {selectedCompostagem.observacao && selectedCompostagem.observacao.trim() !== '' && (
                                        <View style={[styles.section, { marginBottom: 35 }]}>
                                            <View style={styles.sectionHeader}>
                                                <Icon name="note-text" size={20} color={customTheme.colors.primary} />
                                                <Text style={styles.sectionTitle}>Observações</Text>
                                            </View>
                                            <Text style={styles.observationText}>
                                                {selectedCompostagem.observacao}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Fotos (se houver) */}
                                    {selectedCompostagem.photoUrls && selectedCompostagem.photoUrls.length > 0 && (
                                        <View style={styles.section}>
                                            <View style={styles.sectionHeader}>
                                                <Icon name="image-multiple" size={20} color={customTheme.colors.primary} />
                                                <Text style={styles.sectionTitle}>Fotos</Text>
                                            </View>
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                style={styles.photosScroll}
                                            >
                                                {selectedCompostagem.photoUrls.map((url, index) => (
                                                    <TouchableOpacity
                                                        key={index}
                                                        onPress={() => setSelectedImage(url)}
                                                        style={styles.photoCard}
                                                    >
                                                        <Image
                                                            source={{ uri: url }}
                                                            style={styles.photoThumbnail}
                                                            resizeMode="cover"
                                                        />
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal de Visualização de Imagem */}
            <Modal
                visible={!!selectedImage}
                transparent={true}
                onRequestClose={() => setSelectedImage(null)}
                animationType="fade"
            >
                <View style={styles.imageViewerContainer}>
                    <TouchableOpacity
                        style={styles.closeImageButton}
                        onPress={() => setSelectedImage(null)}
                    >
                        <Icon name="close" size={24} color="white" />
                    </TouchableOpacity>

                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.fullScreenImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
        </Surface>
    );
};

const styles = StyleSheet.create({
    orderToggleContainer: {
        marginHorizontal: 8,
        marginBottom: 8,
        borderRadius: 8,
        elevation: 1,
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    orderButton: {
        padding: 8,
        opacity: isLoading ? 0.7 : 1, // Reduz a opacidade quando estiver carregando
    },
    orderButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    orderText: {
        fontSize: 14,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingContent: {
        padding: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0)',
        elevation: 5,
    },
    orderToggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    orderToggleText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    endMessage: {
        textAlign: 'center',
        color: customTheme.colors.onSurfaceVariant,
        fontSize: 14,
        paddingVertical: 8,
        fontStyle: 'italic'
    },
    loadMoreContainer: {
        padding: 16,
        alignItems: 'center',
    },
    loadMoreButton: {
        width: '50%',
        borderRadius: 8,
        color: customTheme.colors.secondary,
        backgroundColor: customTheme.colors.primary,
    },
    modalHeaderInfo: {
        marginBottom: 16,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    modalHeaderLeft: {
        flex: 1,
        marginRight: 16,
    },
    modalInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalInfoText: {
        marginLeft: 8,
        fontSize: 15,
        color: customTheme.colors.onSurface,
    },
    modalLeiraContainer: {
        backgroundColor: customTheme.colors.primaryContainer,
        padding: 8,
        borderRadius: 12,
        minWidth: 100,
        elevation: 2,
    },
    modalLeiraContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    modalLeiraIcon: {
        marginRight: 4,
    },
    modalLeiraTextContainer: {
        alignItems: 'center',
    },
    modalLeiraLabel: {
        fontSize: 12,
        color: customTheme.colors.primary,
        fontWeight: '500',
        marginBottom: 2,
    },
    modalLeiraNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: customTheme.colors.primary,
    },
    modalNotRegistered: {
        fontSize: 16,
        fontWeight: 'bold',
        fontStyle: 'italic',
        color: customTheme.colors.error,
    },
    cardGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    leftColumn: {
        flex: 1,
        marginRight: 16,
    },
    leiraContainer: {
        backgroundColor: customTheme.colors.primaryContainer,
        padding: 8,
        borderRadius: 12,
        minWidth: 100,
        elevation: 2,
    },
    leiraContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    leiraIcon: {
        marginRight: 4,
    },
    leiraTextContainer: {
        alignItems: 'center',
    },
    leiraLabel: {
        fontSize: 12,
        color: customTheme.colors.primary,
        fontWeight: '500',
        marginBottom: 2,
    },
    leiraNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: customTheme.colors.primary,
    },
    notRegistered: {
        fontSize: 16,
        fontWeight: 'bold',
        fontStyle: 'italic',
        color: customTheme.colors.error,
    },
    cardNotRegistered: {
        fontSize: 12,
        color: customTheme.colors.error,
    },
    card: {
        margin: 8,
        elevation: 2,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
    },
    cardHeader: {
        marginBottom: 8,
    },
    responsavelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    responsavel: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginLeft: 8,
    },
    dataContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    data: {
        fontSize: 13,
        color: customTheme.colors.onSurfaceVariant,
        marginLeft: 6,
    },
    divider: {
        marginVertical: 8,
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    cardTemperaturas: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    cardTempColumn: {
        flex: 1,
        alignItems: 'center',
    },
    cardTempLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 2,
    },
    cardTempValue: {
        fontSize: 14,
        fontWeight: '600',
        color: customTheme.colors.primary,
    },
    cardTempDivider: {
        width: 1,
        height: '100%',
        backgroundColor: customTheme.colors.surfaceVariant,
        marginHorizontal: 4,
    },
    cardThumbContainer: {
        marginTop: 8,
        borderRadius: 8,
        overflow: 'hidden',
        height: 120, // Altura reduzida
    },
    cardThumbnail: {
        width: '100%',
        height: '100%',
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    closeModalButton: {
        padding: 4,
    },
    modalScrollView: {
        padding: 15,
    },
    headerInfo: {
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoText: {
        marginLeft: 8,
        fontSize: 15,
        color: customTheme.colors.onSurface,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.primary,
        marginLeft: 8,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    metricItem: {
        flex: 1,
        minWidth: '48%',
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        gap: 4,
    },
    metricItemWide: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    metricLabel: {
        fontSize: 13,
        color: customTheme.colors.onSurfaceVariant,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.secondary,
    },
    observationText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 12,
        lineHeight: 20,
    },
    photosScroll: {
        flexGrow: 0,
    },
    photoCard: {
        marginRight: 8,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
    },
    photoThumbnail: {
        width: 100,
        height: 100,
    },
    detalheSection: {
        marginBottom: 24,
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 16,
        borderRadius: 12,
    },
    detalheLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: customTheme.colors.primary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detalheValue: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        lineHeight: 24,
    },
    fotosContainer: {
        marginTop: 12,
        marginBottom: 8,
    },
    fotoContainer: {
        width: 140,
        height: 140,
        marginRight: 12,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 3,
        backgroundColor: customTheme.colors.surface,
    },
    foto: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        margin: 20,
        marginTop: 8,
        borderRadius: 12,
        elevation: 2,
    },
    closeButtonLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onPrimary,
        paddingVertical: 4,
    },
    dataBadge: {
        backgroundColor: customTheme.colors.primaryContainer,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    dataBadgeText: {
        color: customTheme.colors.onPrimaryContainer,
        fontSize: 14,
        marginLeft: 4,
    },
    temperaturaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
    },
    temperaturaItem: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: customTheme.colors.surface,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    temperaturaValue: {
        fontSize: 20,
        fontWeight: '600',
        color: customTheme.colors.primary,
        marginTop: 4,
    },
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        paddingVertical: 16,
        paddingHorizontal: 20,
        elevation: 4,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outline,
    },
    headerTitle: {
        color: customTheme.colors.onSurface,
        fontWeight: '600',
        marginLeft: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    temperaturas: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    temperaturaLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    thumbContainer: {
        marginTop: 12,
        borderRadius: 8,
        overflow: 'hidden',
    },
    thumbnail: {
        width: '100%',
        height: 200,
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    imageViewerContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeImageButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 1,
        padding: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
    },
    fullScreenImage: {
        width: '100%',
        height: '100%',
    },
    loadingImageContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    hiddenImage: {
        opacity: 0,
    },
});

export default CompostagemList;