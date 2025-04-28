import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { Chip, Divider, Surface, Text } from 'react-native-paper';
import React, { useEffect, useRef, useState } from 'react';
import { getTipoLavagemDetails, getTipoVeiculoColor, getTipoVeiculoIcon, getTipoVeiculoLabel } from './utils/lavagemUtils';

import FullScreenImage from '../../../../assets/components/FullScreenImage';
import { LavagemInterface } from './lavagemTypes';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../../theme/theme';

interface Photo {
    uri: string;
    id: string;
    url?: string;
    path?: string;
    timestamp?: number;
}

interface DetalheLavagemModalProps {
    visible: boolean;
    onClose: () => void;
    lavagem: LavagemInterface;
    onEdit?: () => void;
}

const DetalheLavagemModal: React.FC<DetalheLavagemModalProps> = ({
    visible,
    onClose,
    lavagem,
    onEdit
}) => {
    const [loadingPhotos, setLoadingPhotos] = useState<{ [key: string]: boolean }>({});

    const [isEditLoading, setIsEditLoading] = useState(false);

    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);

    // Animação de slide
    const screenHeight = Dimensions.get('screen').height;
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;

    useEffect(() => {
        if (visible) {
            // Animar entrada
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            }).start();
        }
    }, [visible, screenHeight]);

    const handleDismiss = () => {
        Animated.spring(slideAnim, {
            toValue: 1200,
            bounciness: 0,
            speed: 10,
            useNativeDriver: true,
            overshootClamping: true
        }).start();

        setTimeout(() => {
            onClose()
        }, 0);
    };

    const handleOpenPhoto = (photo: any) => {
        const photoObj = {
            uri: photo.url,
            id: photo.timestamp?.toString() || Date.now().toString()
        };
        setSelectedPhoto(photoObj);
        setIsPhotoModalVisible(true);
    };

    const handleClosePhoto = () => {
        setIsPhotoModalVisible(false);
        setSelectedPhoto(null);
    };

    // Cabeçalho de seção
    const SectionHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
        <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
                name={icon}
                size={24}
                color={customTheme.colors.primary}
            />
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );

    if (!lavagem) {
        return null;
    }

    const tipoLavagemInfo = getTipoLavagemDetails(lavagem.tipoLavagem);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleDismiss}
        >
            <FullScreenImage
                visible={isPhotoModalVisible}
                photo={selectedPhoto}
                onClose={handleClosePhoto}
            />
            <View style={styles.modalOverlay}>
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{
                                translateY: slideAnim
                            }]
                        }
                    ]}
                >
                    <Surface style={styles.modalContent}>
                        <ScrollView>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <View style={styles.modalHeaderContent}>
                                    <MaterialCommunityIcons
                                        name="car-wash"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text variant="titleLarge">Detalhes da Lavagem</Text>
                                </View>

                                <View style={styles.headerActions}>
                                    {onEdit && (
                                        <TouchableOpacity
                                            onPress={async () => {
                                                setIsEditLoading(true);
                                                try {
                                                    await new Promise(resolve => setTimeout(resolve, 300));
                                                    onEdit();
                                                } catch (error) {
                                                    console.error('Error navigating to edit form:', error);
                                                } finally {
                                                    setIsEditLoading(false);
                                                }
                                            }}
                                            style={styles.editButton}
                                            activeOpacity={0.7}
                                            disabled={isEditLoading}
                                        >
                                            {isEditLoading ? (
                                                <ActivityIndicator
                                                    size="small"
                                                    color={customTheme.colors.primary}
                                                />
                                            ) : (
                                                <MaterialCommunityIcons
                                                    name="pencil"
                                                    size={24}
                                                    color={customTheme.colors.primary}
                                                />
                                            )}
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        onPress={handleDismiss}
                                        style={styles.closeButton}
                                        activeOpacity={0.7}
                                    >
                                        <MaterialCommunityIcons
                                            name="close"
                                            size={24}
                                            color={customTheme.colors.error}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Conteúdo formatado como Card de informações */}
                            {/* Conteúdo formatado como Card de informações */}
                            <View style={styles.contentWrapper}>
                                {/* Chip de tipo de lavagem */}
                                <View style={styles.tipoLavagemChipContainer}>
                                    <Chip
                                        icon={() => (
                                            <MaterialCommunityIcons
                                                name={tipoLavagemInfo.icon}
                                                size={20}
                                                color={tipoLavagemInfo.text}
                                            />
                                        )}
                                        style={[
                                            styles.tipoLavagemChip,
                                            { backgroundColor: tipoLavagemInfo.bg }
                                        ]}
                                        textStyle={{ color: tipoLavagemInfo.text }}
                                    >
                                        {tipoLavagemInfo.label}
                                    </Chip>

                                    <Chip
                                        style={[
                                            styles.statusChip,
                                            {
                                                backgroundColor: lavagem.status === 'concluido'
                                                    ? customTheme.colors.primaryContainer
                                                    : customTheme.colors.errorContainer
                                            }
                                        ]}
                                        textStyle={{
                                            color: lavagem.status === 'concluido'
                                                ? customTheme.colors.primary
                                                : customTheme.colors.error
                                        }}
                                    >
                                        {lavagem.status === 'concluido' ? 'Concluído' : 'Pendente'}
                                    </Chip>
                                </View>

                                {/* Informações Básicas */}
                                <View style={styles.sectionContainer}>
                                    <SectionHeader
                                        icon={getTipoVeiculoIcon(lavagem.veiculo.tipo)}
                                        title={
                                            lavagem.veiculo.tipo === 'equipamento' ? 'Equipamento' :
                                                lavagem.veiculo.tipo === 'outros' ? 'Outro Item' : 'Veículo'
                                        }
                                    />

                                    <View style={styles.veiculoCardContainer}>
                                        <MaterialCommunityIcons
                                            name={getTipoVeiculoIcon(lavagem.veiculo.tipo)}
                                            size={40}
                                            color={getTipoVeiculoColor(lavagem.veiculo.tipo)}
                                            style={styles.veiculoCardIcon}
                                        />

                                        <View style={styles.veiculoCardContent}>
                                            <Text style={styles.veiculoPlaca}>
                                                {lavagem.veiculo.placa}
                                            </Text>

                                            <Text style={styles.veiculoTipo}>
                                                {getTipoVeiculoLabel(lavagem.veiculo.tipo)}
                                            </Text>

                                            {lavagem.veiculo.numeroEquipamento && (
                                                <Chip style={styles.numeroEquipamentoChip}>
                                                    Nº {lavagem.veiculo.numeroEquipamento}
                                                </Chip>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                {/* Produtos utilizados */}
                                {lavagem.produtos && lavagem.produtos.length > 0 &&
                                    lavagem.produtos.some(p => p.nome && p.quantidade) && (
                                        <View style={styles.sectionContainer}>
                                            <SectionHeader
                                                icon="bottle-tonic-plus"
                                                title="Produtos Utilizados"
                                            />

                                            <View style={styles.produtosGrid}>
                                                {lavagem.produtos
                                                    .filter(produto => produto.nome && !isNaN(produto.quantidade))
                                                    .map((produto, index) => (
                                                        <View key={`prod-${index}`} style={styles.produtoCard}>
                                                            <MaterialCommunityIcons
                                                                name="bottle-tonic"
                                                                size={24}
                                                                color={customTheme.colors.primary}
                                                                style={styles.produtoIcon}
                                                            />

                                                            <View style={styles.produtoInfo}>
                                                                <Text style={styles.produtoNome}>{produto.nome}</Text>
                                                                <Text style={styles.produtoQuantidade}>
                                                                    Quantidade: {produto.quantidade}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                            </View>
                                        </View>
                                    )}

                                {/* Fotos */}
                                {lavagem.fotos && lavagem.fotos.length > 0 && (
                                    <View style={styles.sectionContainer}>
                                        <SectionHeader icon="image-multiple" title="Registro Fotográfico" />

                                        <FlatList
                                            data={lavagem.fotos}
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            keyExtractor={(item) => item.path || item.timestamp?.toString() || ''}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    style={styles.photoItem}
                                                    onPress={() => handleOpenPhoto(item)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Image
                                                        source={{ uri: item.url }}
                                                        style={styles.photoThumbnail}
                                                        resizeMode="cover"
                                                        onLoadStart={() => setLoadingPhotos(prevState => ({
                                                            ...prevState,
                                                            [item.path || item.timestamp?.toString() || '']: true
                                                        }))}
                                                        onLoadEnd={() => setLoadingPhotos(prevState => ({
                                                            ...prevState,
                                                            [item.path || item.timestamp?.toString() || '']: false
                                                        }))}
                                                    />

                                                    {loadingPhotos[item.path || item.timestamp?.toString() || ''] && (
                                                        <View style={styles.loadingOverlay}>
                                                            <ActivityIndicator
                                                                size="large"
                                                                color={customTheme.colors.primary}
                                                            />
                                                        </View>
                                                    )}

                                                    <View style={styles.photoOverlay}>
                                                        <MaterialCommunityIcons
                                                            name="magnify-plus"
                                                            size={24}
                                                            color="#FFFFFF"
                                                        />
                                                    </View>
                                                </TouchableOpacity>
                                            )}
                                            contentContainerStyle={styles.photosContainer}
                                        />
                                    </View>
                                )}

                                {/* Observações */}
                                {lavagem.observacoes && (
                                    <View style={styles.sectionContainer}>
                                        <SectionHeader icon="comment-text" title="Observações" />

                                        <View style={styles.observacoesContainer}>
                                            <Text style={styles.observacoesText}>
                                                {lavagem.observacoes}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Informações do sistema */}
                                <View style={styles.sectionContainer}>
                                    <View style={styles.sysInfoContainer}>
                                        <Text style={styles.sysInfoTitle}>Informações do Sistema</Text>
                                        <Divider style={styles.divider} />

                                        <View style={styles.sysInfoItem}>
                                            <Text style={styles.sysInfoLabel}>ID:</Text>
                                            <Text style={styles.sysInfoValue}>{lavagem.id}</Text>
                                        </View>

                                        {lavagem.createdAt && (
                                            <View style={styles.sysInfoItem}>
                                                <Text style={styles.sysInfoLabel}>Criado em:</Text>
                                                <Text style={styles.sysInfoValue}>
                                                    {typeof lavagem.createdAt === 'object' && 'toDate' in lavagem.createdAt
                                                        ? lavagem.createdAt.toDate().toLocaleString('pt-BR')
                                                        : new Date(lavagem.createdAt).toLocaleString('pt-BR')}
                                                </Text>
                                            </View>
                                        )}

                                        {lavagem.createdBy && (
                                            <View style={styles.sysInfoItem}>
                                                <Text style={styles.sysInfoLabel}>Criado por:</Text>
                                                <Text style={styles.sysInfoValue}>{lavagem.createdBy}</Text>
                                            </View>
                                        )}

                                        {lavagem.agendamentoId && (
                                            <View style={styles.sysInfoItem}>
                                                <Text style={styles.sysInfoLabel}>ID do Agendamento:</Text>
                                                <Text style={styles.sysInfoValue}>{lavagem.agendamentoId}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>

                        </ScrollView>
                    </Surface>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        width: '100%',
        maxHeight: '92%',
    },
    modalContent: {
        backgroundColor: customTheme.colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '100%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editButton: {
        padding: 8,
        marginRight: 8,
    },
    closeButton: {
        padding: 8,
    },
    contentWrapper: {
        paddingBottom: 20,
    },

    // Chip de tipo de lavagem
    tipoLavagemChipContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    tipoLavagemChip: {
        height: 36,
    },
    statusChip: {
        height: 36,
    },

    // Seções
    sectionContainer: {
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: customTheme.colors.primary,
    },

    // Veículo
    veiculoCardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
        padding: 16,
        gap: 16,
    },
    veiculoCardIcon: {
        backgroundColor: customTheme.colors.primaryContainer,
        padding: 10,
        borderRadius: 8,
    },
    veiculoCardContent: {
        flex: 1,
    },
    veiculoPlaca: {
        fontSize: 18,
        fontWeight: 'bold',
        color: customTheme.colors.onSurface,
    },
    veiculoTipo: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 4,
    },
    numeroEquipamentoChip: {
        marginTop: 8,
        alignSelf: 'flex-start',
        backgroundColor: customTheme.colors.secondaryContainer,
    },

    // Produtos
    produtosGrid: {
        gap: 12,
    },
    produtoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        padding: 12,
        gap: 12,
    },
    produtoIcon: {
        backgroundColor: customTheme.colors.primaryContainer,
        padding: 8,
        borderRadius: 8,
    },
    produtoInfo: {
        flex: 1,
    },
    produtoNome: {
        fontSize: 16,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    produtoQuantidade: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 2,
    },

    // Fotos
    photosContainer: {
        paddingVertical: 8,
        gap: 12,
    },
    photoItem: {
        width: 160,
        height: 160,
        marginRight: 12,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    photoThumbnail: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    photoOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.7,
    },

    // Observações
    observacoesContainer: {
        backgroundColor: customTheme.colors.surface,
        padding: 16,
        borderRadius: 8,
    },
    observacoesText: {
        fontSize: 15,
        lineHeight: 22,
        color: customTheme.colors.onSurface,
    },

    // Informações do sistema
    sysInfoContainer: {
        padding: 16,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
    },
    sysInfoTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
        marginBottom: 8,
    },
    divider: {
        backgroundColor: customTheme.colors.outline,
        marginBottom: 12,
    },
    sysInfoItem: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    sysInfoLabel: {
        fontSize: 13,
        color: customTheme.colors.onSurfaceVariant,
        width: 100,
    },
    sysInfoValue: {
        fontSize: 13,
        color: customTheme.colors.onSurface,
        flex: 1,
    },
});

export default DetalheLavagemModal;
