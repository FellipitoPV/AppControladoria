import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Card, Text } from 'react-native-paper';
import React, { useCallback, useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db, dbStorage } from '../../../../firebase';
import { deleteObject, ref } from 'firebase/storage';

import { Compostagem } from '../../../helpers/Types';
import FullScreenImage from '../../../assets/components/FullScreenImage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../../assets/components/ModernHeader';
import { customTheme } from '../../../theme/theme';
import dayjs from 'dayjs';
import { showGlobalToast } from '../../../helpers/GlobalApi';

interface DateFilterValue {
    startDate: string;
    endDate: string;
}

const CompostagemHistory: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedCompostagem, setSelectedCompostagem] = useState<Compostagem | null>(null);
    const [detalhesModalVisible, setDetalhesModalVisible] = useState(false);
    const [lastVisible, setLastVisible] = useState<any>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [selectedImage, setSelectedImage] = useState<{ uri: string; id: string } | null>(null);

    const [compostagens, setCompostagens] = useState<Compostagem[]>([]);
    const [displayedCompostagens, setDisplayedCompostagens] = useState<Compostagem[]>([]);
    const [dateFilter, setDateFilter] = useState<DateFilterValue | null>(null);
    const [isDescending, setIsDescending] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [hasMoreData, setHasMoreData] = useState<boolean>(true);
    const ITEMS_PER_PAGE = 15;

    const [showRotina, setShowRotina] = useState(false);

    useEffect(() => {
        setLastVisible(null);
        setCompostagens([]);
        setHasMoreData(true);
        fetchCompostagens();
    }, [dateFilter, isDescending, showRotina]);

    const fetchCompostagens = async () => {
        try {
            let compostagemQuery = query(collection(db(), 'compostagens'));

            if (dateFilter) {
                compostagemQuery = query(
                    compostagemQuery,
                    where('data', '>=', dateFilter.startDate),
                    where('data', '<=', dateFilter.endDate)
                );
            }

            const snapshot = await getDocs(compostagemQuery);

            if (snapshot.empty) {
                setCompostagens([]);
                setDisplayedCompostagens([]);
                setHasMoreData(false);
                setLoading(false);
                return;
            }

            let dados = snapshot.docs
                .map(doc => {
                    const data = doc.data() as Compostagem;
                    let timestamp: string;

                    if (data.createdAt) {
                        timestamp = data.createdAt;
                    } else {
                        const dateStr = data.data || '1970-01-01';
                        const timeStr = data.hora || '00:00';
                        timestamp = `${dateStr}T${timeStr}:00.000Z`;
                    }

                    return {
                        id: doc.id,
                        ...data,
                        timestamp,
                    } as Compostagem & { timestamp: string };
                })
                .filter(compostagem => {
                    return showRotina
                        ? compostagem.isMedicaoRotina === true
                        : compostagem.isMedicaoRotina === false || compostagem.isMedicaoRotina === undefined;
                })
                .sort((a, b) => {
                    return isDescending
                        ? b.timestamp.localeCompare(a.timestamp)
                        : a.timestamp.localeCompare(b.timestamp);
                });

            setCompostagens(dados);
            setDisplayedCompostagens(dados.slice(0, ITEMS_PER_PAGE));
            setHasMoreData(dados.length > ITEMS_PER_PAGE);
            setCurrentPage(0);
            setLoading(false);
        } catch (error) {
            console.error('Erro ao buscar compostagens:', error);
            setLoading(false);
        }
    };

    const handleDelete = async (compostagem: Compostagem) => {
        try {
            Alert.alert(
                "Confirmar exclusão",
                "Tem certeza que deseja excluir este registro de compostagem?",
                [
                    {
                        text: "Cancelar",
                        style: "cancel"
                    },
                    {
                        text: "Sim, excluir",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                if (compostagem.photoUrls && compostagem.photoUrls.length > 0) {
                                    for (const photoUrl of compostagem.photoUrls) {
                                        try {
                                            const photoRef = ref(dbStorage(), photoUrl.replace(/^https?:\/\/[^\/]+\/[^\/]+\/[^\/]+\//, ''));
                                            await deleteObject(photoRef);
                                            console.log('Foto deletada com sucesso:', photoUrl);
                                        } catch (photoError) {
                                            console.error('Erro ao deletar foto:', photoError);
                                        }
                                    }
                                }

                                if (!compostagem.id) {
                                    throw new Error('Compostagem ID is undefined');
                                }
                                const compostagemDoc = await getDoc(doc(db(), 'compostagens', compostagem.id));

                                if (compostagemDoc.exists()) {
                                    await deleteDoc(doc(db(), 'compostagens', compostagem.id));
                                    setCompostagens(prevCompostagens =>
                                        prevCompostagens.filter(item => item.id !== compostagem.id)
                                    );
                                    setDisplayedCompostagens(prevDisplayed =>
                                        prevDisplayed.filter(item => item.id !== compostagem.id)
                                    );
                                    handleRefresh();
                                    showGlobalToast(
                                        'success',
                                        'Exclusão Concluída',
                                        'Registro de compostagem e suas imagens foram excluídos com sucesso',
                                        3000
                                    );
                                } else {
                                    throw new Error('Compostagem não encontrada');
                                }
                            } catch (deleteError) {
                                console.error('Erro ao excluir compostagem:', deleteError);
                                Alert.alert(
                                    "Erro",
                                    "Não foi possível excluir o registro de compostagem completamente. Algumas imagens podem não ter sido removidas."
                                );
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Erro no processo de exclusão:', error);
            Alert.alert("Erro", "Ocorreu um problema inesperado.");
        }
    };

    const toggleTipoVisualizacao = async () => {
        setLoading(true);
        try {
            showGlobalToast(
                'info',
                `Alterando visualização`,
                `Mostrando medições ${!showRotina ? 'de rotina' : 'completas'}`,
                2000
            );
            setShowRotina(!showRotina);
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error('Erro ao alternar visualização:', error);
            showGlobalToast(
                'error',
                'Erro',
                'Não foi possível alternar o modo de visualização',
                3000
            );
        } finally {
            setLoading(false);
        }
    };

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

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        setLastVisible(null);
        fetchCompostagens().then(() => setRefreshing(false));
    }, []);

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <ModernHeader
                    title={showRotina ? "Medições de Rotina" : "Medições Completas"}
                    iconName={showRotina ? "clipboard-outline" : "clipboard-list"}
                    onBackPress={() => navigation.goBack()}
                    rightAction={toggleTipoVisualizacao}
                    rightIcon={showRotina ? "clipboard-list" : "clipboard-outline"}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customTheme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ModernHeader
                title={showRotina ? "Medições de Rotina" : "Medições Completas"}
                iconName={showRotina ? "clipboard-outline" : "clipboard-list"}
                onBackPress={() => navigation.goBack()}
                rightAction={toggleTipoVisualizacao}
                rightIcon={showRotina ? "clipboard-list" : "clipboard-outline"}
            />
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customTheme.colors.primary} />
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[customTheme.colors.primary]}
                        />
                    }
                >
                    <View style={styles.container}>
                        {displayedCompostagens.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => {
                                    setSelectedCompostagem(item);
                                    setDetalhesModalVisible(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <Card style={styles.card}>
                                    <View style={[styles.cardGradient, { backgroundColor: customTheme.colors.primaryContainer }]} />
                                    <Card.Content style={styles.cardContent}>
                                        <View style={styles.headerRow}>
                                            <Text style={styles.responsavelText} numberOfLines={1}>
                                                {item.responsavel || 'Não informado'}
                                            </Text>
                                            <View style={styles.headerRight}>
                                                <Text style={styles.dataHora}>
                                                    {`${formatDate(item.data)} às ${item.hora || dayjs(item.timestamp).format('HH:mm')}`}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.leiraRow}>
                                            <Icon name="silo" size={16} color={customTheme.colors.primary} />
                                            <Text style={styles.leiraText} numberOfLines={1}>
                                                {`Leira ${item.leira || 'Não informada'}`}
                                            </Text>
                                        </View>
                                        <View style={styles.temperaturasGrid}>
                                            <View style={styles.tempItem}>
                                                <Text style={styles.tempLabel}>Ambiente</Text>
                                                <Text style={styles.tempValue}>{item.tempAmb ? `${item.tempAmb}°C` : 'N/R'}</Text>
                                            </View>
                                            <View style={styles.tempDivider} />
                                            <View style={styles.tempItem}>
                                                <Text style={styles.tempLabel}>Base</Text>
                                                <Text style={styles.tempValue}>{item.tempBase ? `${item.tempBase}°C` : 'N/R'}</Text>
                                            </View>
                                            <View style={styles.tempDivider} />
                                            <View style={styles.tempItem}>
                                                <Text style={styles.tempLabel}>Meio</Text>
                                                <Text style={styles.tempValue}>{item.tempMeio ? `${item.tempMeio}°C` : 'N/R'}</Text>
                                            </View>
                                            <View style={styles.tempDivider} />
                                            <View style={styles.tempItem}>
                                                <Text style={styles.tempLabel}>Topo</Text>
                                                <Text style={styles.tempValue}>{item.tempTopo ? `${item.tempTopo}°C` : 'N/R'}</Text>
                                            </View>
                                        </View>
                                        {item.photoUrls && item.photoUrls.length > 0 && (
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                style={styles.fotosRow}
                                            >
                                                {item.photoUrls.map((url, index) => (
                                                    <TouchableOpacity
                                                        key={index}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedImage({ uri: url, id: `photo-${index}` });
                                                        }}
                                                    >
                                                        <Image
                                                            source={{ uri: url }}
                                                            style={styles.miniThumbnail}
                                                            resizeMode="cover"
                                                        />
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        )}
                                        <View style={styles.actionButtons}>
                                            <TouchableOpacity
                                                onPress={() => handleDelete(item)}
                                                style={styles.actionButton}
                                            >
                                                <Icon name="delete" size={20} color={customTheme.colors.error} />
                                            </TouchableOpacity>
                                        </View>
                                    </Card.Content>
                                </Card>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {hasMoreData && (
                        <View style={styles.loadMoreWrapper}>
                            <TouchableOpacity
                                style={styles.loadMoreButton}
                                onPress={loadMore}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore ? (
                                    <ActivityIndicator size="small" color={customTheme.colors.primary} />
                                ) : (
                                    <>
                                        <Text style={styles.loadMoreText}>
                                            Carregar mais ({compostagens.length - displayedCompostagens.length} restantes)
                                        </Text>
                                        <Icon
                                            name="chevron-down"
                                            size={20}
                                            color={customTheme.colors.primary}
                                        />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            )}
            <Modal
                visible={detalhesModalVisible}
                transparent={true}
                onRequestClose={() => setDetalhesModalVisible(false)}
                animationType="slide"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderContent}>
                                <Icon name="clipboard-text" size={24} color={customTheme.colors.primary} />
                                <Text style={styles.modalTitle}>Detalhes da Medição</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setDetalhesModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <Icon name="close" size={24} color={customTheme.colors.error} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalScroll}>
                            {selectedCompostagem && (
                                <>
                                    <View style={styles.infoSection}>
                                        <View style={styles.infoField}>
                                            <Icon name="account" size={20} color={customTheme.colors.primary} />
                                            <View style={styles.infoContent}>
                                                <Text style={styles.infoLabel}>Responsável</Text>
                                                <Text style={styles.infoValue}>
                                                    {selectedCompostagem.responsavel || 'Não informado'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.infoField}>
                                            <Icon name="calendar" size={20} color={customTheme.colors.primary} />
                                            <View style={styles.infoContent}>
                                                <Text style={styles.infoLabel}>Data e Hora</Text>
                                                <Text style={styles.infoValue}>
                                                    {`${formatDate(selectedCompostagem.data)} às ${selectedCompostagem.hora || dayjs(selectedCompostagem.timestamp).format('HH:mm')}`}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.infoField}>
                                            <Icon name="silo" size={20} color={customTheme.colors.primary} />
                                            <View style={styles.infoContent}>
                                                <Text style={styles.infoLabel}>Leira</Text>
                                                <Text style={styles.infoValue}>
                                                    {selectedCompostagem.leira || 'Não informada'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <Icon name="thermometer" size={20} color={customTheme.colors.primary} />
                                            <Text style={styles.sectionTitle}>Temperaturas</Text>
                                        </View>
                                        <View style={styles.metricsGrid}>
                                            <View style={styles.metricItem}>
                                                <Text style={styles.metricLabel}>Ambiente</Text>
                                                <Text style={styles.metricValue}>
                                                    {selectedCompostagem.tempAmb ? `${selectedCompostagem.tempAmb}°C` : 'N/R'}
                                                </Text>
                                            </View>
                                            <View style={styles.metricItem}>
                                                <Text style={styles.metricLabel}>Base</Text>
                                                <Text style={styles.metricValue}>
                                                    {selectedCompostagem.tempBase ? `${selectedCompostagem.tempBase}°C` : 'N/R'}
                                                </Text>
                                            </View>
                                            <View style={styles.metricItem}>
                                                <Text style={styles.metricLabel}>Meio</Text>
                                                <Text style={styles.metricValue}>
                                                    {selectedCompostagem.tempMeio ? `${selectedCompostagem.tempMeio}°C` : 'N/R'}
                                                </Text>
                                            </View>
                                            <View style={styles.metricItem}>
                                                <Text style={styles.metricLabel}>Topo</Text>
                                                <Text style={styles.metricValue}>
                                                    {selectedCompostagem.tempTopo ? `${selectedCompostagem.tempTopo}°C` : 'N/R'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
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
                                                    <Text style={styles.metricValue}>
                                                        {selectedCompostagem.umidadeAmb ? `${selectedCompostagem.umidadeAmb}%` : 'N/R'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.metricItemWide}>
                                                <Icon name="waves" size={18} color={customTheme.colors.secondary} />
                                                <View>
                                                    <Text style={styles.metricLabel}>Leira</Text>
                                                    <Text style={styles.metricValue}>
                                                        {selectedCompostagem.umidadeLeira ? `${selectedCompostagem.umidadeLeira}%` : 'N/R'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
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
                                                    <Text style={styles.metricValue}>
                                                        {selectedCompostagem.ph || 'N/R'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.metricItemWide}>
                                                <Icon name="air-filter" size={18} color={customTheme.colors.secondary} />
                                                <View>
                                                    <Text style={styles.metricLabel}>Odor</Text>
                                                    <Text style={styles.metricValue}>
                                                        {selectedCompostagem.odor || 'N/R'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                    {selectedCompostagem.observacao && (
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
                                    {selectedCompostagem.photoUrls && selectedCompostagem.photoUrls.length > 0 && (
                                        <View style={styles.section}>
                                            <View style={styles.sectionHeader}>
                                                <Icon name="image-multiple" size={20} color={customTheme.colors.primary} />
                                                <Text style={styles.sectionTitle}>Fotos</Text>
                                            </View>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                                                {selectedCompostagem.photoUrls.map((url, index) => (
                                                    <TouchableOpacity
                                                        key={index}
                                                        onPress={() => setSelectedImage({ uri: url, id: `photo-${index}` })}
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
            <FullScreenImage
                visible={!!selectedImage}
                photo={selectedImage}
                onClose={() => setSelectedImage(null)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 4,
    },
    loadMoreWrapper: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    loadMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        backgroundColor: customTheme.colors.primaryContainer,
        borderRadius: 8,
        gap: 8,
    },
    loadMoreText: {
        color: customTheme.colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: customTheme.colors.surface,
        width: '90%',
        maxHeight: '80%',
        borderRadius: 28,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outlineVariant,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
    closeButton: {
        padding: 4,
    },
    modalScroll: {
        padding: 20,
    },
    infoSection: {
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 12,
        padding: 16,
        gap: 12,
        marginBottom: 20,
    },
    infoField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    infoValue: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.primary,
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
        marginBottom: 15,
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
    card: {
        marginBottom: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    cardGradient: {
        height: 4,
        width: '100%',
    },
    cardContent: {
        padding: 12,
        gap: 8,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    responsavelText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: customTheme.colors.onSurface,
        flex: 1,
        marginRight: 12,
    },
    dataHora: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    leiraRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    leiraText: {
        fontSize: 13,
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    temperaturasGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 8,
        borderRadius: 8,
    },
    tempItem: {
        flex: 1,
        alignItems: 'center',
    },
    tempLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 2,
    },
    tempValue: {
        fontSize: 14,
        fontWeight: '600',
        color: customTheme.colors.secondary,
    },
    tempDivider: {
        width: 1,
        height: '100%',
        backgroundColor: customTheme.colors.outlineVariant,
        marginHorizontal: 4,
    },
    fotosRow: {
        marginTop: 4,
    },
    miniThumbnail: {
        width: 40,
        height: 40,
        borderRadius: 4,
        marginRight: 4,
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    container: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default CompostagemHistory;