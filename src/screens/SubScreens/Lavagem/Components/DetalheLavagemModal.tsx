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
import { getVeiculoInfo, getTipoLavagemDetails } from './utils/lavagemUtils';

import FullScreenImage from '../../../../assets/components/FullScreenImage';
import { LavagemInterface } from './lavagemTypes';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../../theme/theme';
import { useUser } from '../../../../contexts/userContext';

interface Photo {
    uri: string;
    id: string;
    url?: string;
    path?: string;
    timestamp?: number;
}

// ── Subcomponentes de módulo (FORA do componente pai para evitar remount) ─────

const PhotoSection: React.FC<{
    title: string;
    icon: string;
    accentColor: string;
    fotos: Array<{ url: string; path?: string; timestamp?: number }>;
    onOpenPhoto: (fotos: any[], index: number) => void;
}> = ({ title, icon, accentColor, fotos, onOpenPhoto }) => (
    <View style={[styles.sectionContainer, { borderLeftWidth: 3, borderLeftColor: accentColor }]}>
        <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name={icon} size={24} color={accentColor} />
            <Text style={[styles.sectionTitle, { color: accentColor }]}>{title}</Text>
        </View>
        <FlatList
            data={fotos}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, idx) => item.path || item.timestamp?.toString() || String(idx)}
            renderItem={({ item, index }) => (
                <TouchableOpacity
                    style={styles.photoItem}
                    onPress={() => onOpenPhoto(fotos, index)}
                    activeOpacity={0.8}
                >
                    <Image
                        source={{ uri: item.url }}
                        style={styles.photoThumbnail}
                        resizeMode="cover"
                    />
                    <View style={styles.photoOverlay}>
                        <MaterialCommunityIcons name="magnify-plus" size={18} color="#FFF" />
                    </View>
                </TouchableOpacity>
            )}
            contentContainerStyle={styles.photosContainer}
        />
    </View>
);

const ChecklistSection: React.FC<{
    checklist: Array<{ id: string; label: string; checked: boolean }>;
}> = ({ checklist }) => {
    const total = checklist.length;
    const done = checklist.filter(i => i.checked).length;
    return (
        <View style={[styles.sectionContainer, { borderLeftWidth: 3, borderLeftColor: '#43A047' }]}>
            <View style={styles.checklistHeaderRow}>
                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="clipboard-check" size={24} color="#43A047" />
                    <Text style={[styles.sectionTitle, { color: '#43A047' }]}>Checklist</Text>
                </View>
                <View style={styles.checklistBadge}>
                    <Text style={styles.checklistBadgeText}>{done}/{total}</Text>
                </View>
            </View>
            {checklist.map(item => (
                <View key={item.id} style={styles.checklistItem}>
                    <MaterialCommunityIcons
                        name={item.checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                        size={20}
                        color={item.checked ? '#43A047' : customTheme.colors.onSurfaceVariant}
                    />
                    <Text style={[
                        styles.checklistItemLabel,
                        item.checked && styles.checklistItemLabelChecked
                    ]}>
                        {item.label}
                    </Text>
                </View>
            ))}
        </View>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

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
    const { userInfo } = useUser();
    const isAdmin = userInfo?.cargo === 'Administrador';
    const [isEditLoading, setIsEditLoading] = useState(false);

    const [viewerPhotos, setViewerPhotos] = useState<Photo[]>([]);
    const [viewerIndex, setViewerIndex] = useState(0);
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

    const handleOpenPhoto = (fotos: any[], index: number) => {
        const photoObjs: Photo[] = fotos.map(f => ({
            uri: f.url,
            id: f.timestamp?.toString() || f.path || String(Math.random()),
        }));
        setViewerPhotos(photoObjs);
        setViewerIndex(index);
        setIsPhotoModalVisible(true);
    };

    const handleClosePhoto = () => {
        setIsPhotoModalVisible(false);
        setViewerPhotos([]);
    };

    const SectionHeader: React.FC<{ icon: string; title: string; color?: string }> = ({
        icon, title, color = customTheme.colors.primary
    }) => (
        <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name={icon} size={24} color={color} />
            <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
        </View>
    );

    if (!lavagem) {
        return null;
    }

    const tipoLavagemInfo = getTipoLavagemDetails(lavagem.tipoLavagem);
    const veiculoInfo = getVeiculoInfo(lavagem.veiculo?.tipo);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleDismiss}
        >
            <FullScreenImage
                visible={isPhotoModalVisible}
                photos={viewerPhotos}
                initialIndex={viewerIndex}
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
                                        icon={veiculoInfo.icon}
                                        title={veiculoInfo.label}
                                    />

                                    <View style={styles.veiculoCardContainer}>
                                        <MaterialCommunityIcons
                                            name={veiculoInfo.icon}
                                            size={40}
                                            color={veiculoInfo.color}
                                            style={styles.veiculoCardIcon}
                                        />

                                        <View style={styles.veiculoCardContent}>
                                            <Text style={styles.veiculoPlaca}>
                                                {lavagem.veiculo.placa}
                                            </Text>

                                            <Text style={styles.veiculoTipo}>
                                                {veiculoInfo.label}
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

                                {/* Fotos Antes (formato novo) */}
                                {lavagem.fotosAntes && lavagem.fotosAntes.length > 0 && (
                                    <PhotoSection
                                        title="Fotos Antes"
                                        icon="camera-plus"
                                        accentColor="#FF9800"
                                        fotos={lavagem.fotosAntes}
                                        onOpenPhoto={handleOpenPhoto}
                                    />
                                )}

                                {/* Checklist */}
                                {lavagem.checklist && lavagem.checklist.length > 0 && (
                                    <ChecklistSection checklist={lavagem.checklist} />
                                )}

                                {/* Fotos Depois (formato novo) */}
                                {lavagem.fotosDepois && lavagem.fotosDepois.length > 0 && (
                                    <PhotoSection
                                        title="Fotos Depois"
                                        icon="camera-enhance"
                                        accentColor="#2196F3"
                                        fotos={lavagem.fotosDepois}
                                        onOpenPhoto={handleOpenPhoto}
                                    />
                                )}

                                {/* Fotos legado (registros antigos) */}
                                {!lavagem.fotosAntes?.length && !lavagem.fotosDepois?.length &&
                                    lavagem.fotos && lavagem.fotos.length > 0 && (
                                        <PhotoSection
                                            title="Registro Fotográfico"
                                            icon="image-multiple"
                                            accentColor={customTheme.colors.primary}
                                            fotos={lavagem.fotos}
                                            onOpenPhoto={handleOpenPhoto}
                                        />
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

                                {/* Informações do sistema — apenas admins */}
                                {isAdmin && <View style={styles.sectionContainer}>
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
                                                    {new Date(lavagem.createdAt as string).toLocaleString('pt-BR')}
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
                                </View>}
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
        width: 96,
        height: 96,
        marginRight: 10,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    photoThumbnail: {
        width: '100%',
        height: '100%',
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

    // Checklist
    checklistHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    checklistBadge: {
        backgroundColor: '#43A04720',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    checklistBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#43A047',
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.surfaceVariant,
    },
    checklistItemLabel: {
        flex: 1,
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    checklistItemLabelChecked: {
        color: customTheme.colors.onSurfaceVariant,
        textDecorationLine: 'line-through',
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
