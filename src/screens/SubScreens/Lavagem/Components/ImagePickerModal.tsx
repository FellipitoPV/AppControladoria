import { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../../theme/theme';

interface ImagePickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectCamera: () => void;
    onSelectGallery: () => void;
    onRemovePhoto: () => void;
    hasPhoto: boolean;
}

export default function ImagePickerModal({
    visible,
    onClose,
    onSelectCamera,
    onSelectGallery,
    onRemovePhoto,
    hasPhoto
}: ImagePickerModalProps) {
    // Referência para animação
    const slideAnim = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        if (visible) {
            // Quando a modal se torna visível, deslize para cima
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                speed: 12,
                bounciness: 2,
                overshootClamping: true
            }).start();
        } else {
            // Quando a modal se fecha, animamos de volta para baixo
            slideAnim.setValue(300);
        }
    }, [visible]);

    const closeImagePicker = () => {
        Animated.spring(slideAnim, {
            toValue: 500,
            bounciness: 2,
            speed: 20,
            useNativeDriver: true
        }).start();

        // Definir um timeout para a duração da animação
        setTimeout(() => {
            onClose();
        }, 150);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={closeImagePicker}
        >
            <View style={styles.imagePickerModalOverlay}>
                <TouchableOpacity
                    style={styles.imagePickerBackdrop}
                    activeOpacity={1}
                    onPress={closeImagePicker}
                />

                <Animated.View
                    style={[
                        styles.imagePickerModalContainer,
                        {
                            transform: [{
                                translateY: slideAnim
                            }]
                        }
                    ]}
                >
                    <View style={styles.imagePickerHeader}>
                        <Text style={styles.imagePickerTitle}>Selecionar imagem</Text>
                        <TouchableOpacity
                            onPress={closeImagePicker}
                            style={styles.closeButton}
                        >
                            <Icon name="close" size={24} color={customTheme.colors.onSurface} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.imagePickerOptions}>
                        <TouchableOpacity
                            style={styles.imagePickerOption}
                            onPress={() => {
                                closeImagePicker();
                                onSelectCamera();
                            }}
                        >
                            <View style={styles.imageOptionIconContainer}>
                                <Icon name="camera" size={28} color={customTheme.colors.primary} />
                            </View>
                            <Text style={styles.imageOptionTitle}>Tirar Foto</Text>
                            <Text style={styles.imageOptionSubtitle}>Usar a câmera do dispositivo</Text>
                        </TouchableOpacity>

                        <View style={styles.optionDivider} />

                        <TouchableOpacity
                            style={styles.imagePickerOption}
                            onPress={() => {
                                closeImagePicker();
                                onSelectGallery();
                            }}
                        >
                            <View style={styles.imageOptionIconContainer}>
                                <Icon name="image" size={28} color={customTheme.colors.secondary} />
                            </View>
                            <Text style={styles.imageOptionTitle}>Escolher da Galeria</Text>
                            <Text style={styles.imageOptionSubtitle}>Selecionar uma imagem existente</Text>
                        </TouchableOpacity>
                    </View>

                    {hasPhoto && (
                        <TouchableOpacity
                            style={styles.removePhotoButton}
                            onPress={() => {
                                onRemovePhoto();
                                closeImagePicker();
                            }}
                        >
                            <Icon name="trash-can-outline" size={20} color={customTheme.colors.error} />
                            <Text style={styles.removePhotoText}>Remover foto atual</Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    imagePickerModalOverlay: {
        flex: 1,
        justifyContent: 'flex-end', // Mantém o conteúdo no final da tela
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Overlay escuro
    },
    imagePickerBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    imagePickerModalContainer: {
        backgroundColor: customTheme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24, // Espaço extra para iPhones com notch
        // Sombra para dar efeito de elevação
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        // Garantindo que a modal tenha uma posição fixa
        width: '100%',
    },
    imagePickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outlineVariant || customTheme.colors.outline,
    },
    imagePickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
    closeButton: {
        padding: 8,
        marginRight: -8,
    },
    imagePickerOptions: {
        paddingVertical: 16,
    },
    imagePickerOption: {
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    imageOptionIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        marginBottom: 12,
    },
    imageOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginBottom: 4,
    },
    imageOptionSubtitle: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    optionDivider: {
        height: 1,
        backgroundColor: customTheme.colors.outlineVariant || customTheme.colors.outline,
        marginHorizontal: 24,
        opacity: 0.6,
    },
    removePhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        marginHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: customTheme.colors.errorContainer,
    },
    removePhotoText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
        color: customTheme.colors.error,
    }
});