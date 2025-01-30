import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Modal,
    TouchableOpacity,
    Image,
    ActivityIndicator
} from 'react-native';
import {
    Text,
    Card,
    Divider,
    Surface,
} from 'react-native-paper';
import firestore from '@react-native-firebase/firestore';
import { customTheme } from '../../theme/theme';
import { Compostagem } from '../../helpers/Types';
import DateFilter from '../../assets/components/DateFilter';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface DateFilterValue {
    startDate: string;
    endDate: string;
}

const CompostagemRotinaList: React.FC = () => {
    const [compostagens, setCompostagens] = useState<Compostagem[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedCompostagem, setSelectedCompostagem] = useState<Compostagem | null>(null);
    const [detalhesModalVisible, setDetalhesModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const [dateFilter, setDateFilter] = useState<DateFilterValue | null>(null);
    const [isDescending, setIsDescending] = useState<boolean>(true);

    useEffect(() => {
        fetchCompostagens();
    }, [dateFilter, isDescending]);


    const fetchCompostagens = async () => {
        try {
            let query = firestore()
                .collection('compostagens')
                .where('isMedicaoRotina', '==', true);

            if (dateFilter) {
                query = query
                    .where('data', '>=', dateFilter.startDate)
                    .where('data', '<=', dateFilter.endDate);
            }

            const snapshot = await query.get();

            const dados = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Compostagem))
                .sort((a, b) => {
                    // Combina data e hora em um único timestamp para comparação
                    const timestampA = `${a.data}T${a.hora}`;
                    const timestampB = `${b.data}T${b.hora}`;

                    // Retorna a comparação baseada na ordem selecionada
                    return isDescending ?
                        timestampB.localeCompare(timestampA) :
                        timestampA.localeCompare(timestampB);
                });

            setCompostagens(dados);
            setLoading(false);
        } catch (error) {
            console.error('Erro ao buscar compostagens:', error);
            setLoading(false);
        }
    };

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchCompostagens().then(() => setRefreshing(false));
    }, []);

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
                    name="clipboard-pulse"
                    size={32}
                    color={customTheme.colors.primary}
                />
                <Text variant="headlineMedium" style={styles.headerTitle}>
                    Medições de Rotina
                </Text>
            </View>

            {/* Adicione o filtro de data */}
            <DateFilter
                onFilterChange={(filter) => {
                    setDateFilter(filter);
                    fetchCompostagens();
                }}
            />

            {/* Adicione o botão de ordenação */}
            <Surface style={styles.orderToggleContainer}>
                <TouchableOpacity
                    style={styles.orderButton}
                    onPress={() => {
                        setIsDescending(!isDescending);
                        fetchCompostagens();
                    }}
                >
                    <Icon
                        name={isDescending ? "sort-calendar-descending" : "sort-calendar-ascending"}
                        size={20}
                        color={customTheme.colors.primary}
                    />
                    <Text style={styles.orderText}>
                        {isDescending ? "Decrescente" : "Crescente"}
                    </Text>
                </TouchableOpacity>
            </Surface>

            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                }
            >
                {compostagens.map((item) => (
                    <Card
                        key={item.id}
                        style={styles.card}
                        onPress={() => {
                            setSelectedCompostagem(item);
                            setDetalhesModalVisible(true);
                        }}
                    >
                        <Card.Content>
                            {/* Grid Header */}
                            <View style={styles.cardGrid}>
                                {/* Coluna da Esquerda */}
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
                                            name="silo" // ou "database" ou "archive" como alternativas
                                            size={24}
                                            color={customTheme.colors.primary}
                                            style={styles.leiraIcon}
                                        />
                                        <View style={styles.leiraTextContainer}>
                                            <Text style={styles.leiraLabel}>Leira</Text>
                                            <Text style={styles.leiraNumber}>{item.leira}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <Divider style={styles.divider} />

                            {/* Preview da Observação */}
                            {item.observacao && (
                                <View style={styles.observacaoPreview}>
                                    <Icon name="note-text" size={18} color={customTheme.colors.secondary} />
                                    <Text style={styles.observacaoText} numberOfLines={2}>
                                        {item.observacao}
                                    </Text>
                                </View>
                            )}

                            {/* Thumbnail da primeira foto (se houver) */}
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
                            <Text style={styles.modalTitle}>Detalhes da Medição de Rotina</Text>
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
                                    {/* Informações Básicas */}
                                    <View style={styles.headerInfo}>
                                        <View style={styles.infoRow}>
                                            <Icon name="account" size={20} color={customTheme.colors.primary} />
                                            <Text style={styles.infoText}>
                                                {selectedCompostagem.responsavel || 'Não registrado'}
                                            </Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Icon name="calendar-clock" size={20} color={customTheme.colors.primary} />
                                            <Text style={styles.modalInfoText}>
                                                {selectedCompostagem.data ?
                                                    `${formatDate(selectedCompostagem.data)} às ${selectedCompostagem.hora}` :
                                                    'Não registrado'}
                                            </Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Icon name="archive" size={20} color={customTheme.colors.primary} />
                                            <Text style={styles.infoText}>
                                                Leira {selectedCompostagem.leira}
                                            </Text>
                                        </View>
                                    </View>

                                    <Divider style={styles.divider} />

                                    {/* Observações */}
                                    {selectedCompostagem.observacao && (
                                        <View style={styles.section}>
                                            <View style={styles.sectionHeader}>
                                                <Icon name="note-text" size={20} color={customTheme.colors.primary} />
                                                <Text style={styles.sectionTitle}>Observações</Text>
                                            </View>
                                            <Text style={styles.observationText}>
                                                {selectedCompostagem.observacao}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Fotos */}
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
    modalInfoText: {
        marginLeft: 8,
        fontSize: 15,
        color: customTheme.colors.onSurface,
    },
    orderToggleContainer: {
        marginHorizontal: 8,
        marginBottom: 8,
        borderRadius: 8,
        elevation: 1,
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    orderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        gap: 8,
    },
    orderText: {
        fontSize: 14,
        color: customTheme.colors.primary,
        fontWeight: '500',
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
        fontWeight: 'bold',
        marginBottom: 2,
    },
    leiraNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: customTheme.colors.primary,
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
    observacaoPreview: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 8,
        paddingHorizontal: 8,
    },
    observacaoText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
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
    card: {
        margin: 8,
        elevation: 2,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
    },
    cardHeader: {
        marginBottom: 8,
    },
    leiraInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 8,
        borderRadius: 8,
    },
    leiraText: {
        marginLeft: 8,
        fontSize: 14,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    cardThumbContainer: {
        marginTop: 12,
        borderRadius: 8,
        overflow: 'hidden',
        height: 120,
    },
    cardThumbnail: {
        width: '100%',
        height: '100%',
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    // ... (Restante dos estilos do modal e visualizador de imagem permanecem os mesmos)
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
    }
});

export default CompostagemRotinaList;