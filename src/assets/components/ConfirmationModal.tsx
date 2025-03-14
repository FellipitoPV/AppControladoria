import React, { useRef, useEffect } from 'react';
import {
    View,
    TouchableOpacity,
    Modal,
    Animated,
    Dimensions,
    StyleSheet,
} from 'react-native';
import { Surface, Button, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../theme/theme';

interface ConfirmationModalProps {
    visible: boolean;
    title?: string;
    message?: string;
    itemToDelete?: string;
    onCancel: () => void;
    onConfirm: () => void;
    loading?: boolean;
    confirmText?: string;
    iconName?: string;
    colorScheme?: 'primary' | 'error'; // Novo parâmetro
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    visible,
    title = 'Confirmar',
    message = 'Tem certeza que deseja continuar?',
    itemToDelete,
    onCancel,
    onConfirm,
    loading = false,
    confirmText = 'Confirmar',
    iconName = 'help-circle',
    colorScheme = 'error' // Default para manter compatibilidade
}) => {

    // Animação de slide
    const screenHeight = Dimensions.get('screen').height;
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;

    // Cores baseadas no esquema selecionado
    const getColors = () => {
        return {
            main: colorScheme === 'primary' ? customTheme.colors.primary : customTheme.colors.error,
            container: colorScheme === 'primary' ? customTheme.colors.primaryContainer : customTheme.colors.errorContainer,
            onContainer: colorScheme === 'primary' ? customTheme.colors.onPrimaryContainer : customTheme.colors.onErrorContainer
        };
    };

    const colors = getColors();

    useEffect(() => {
        if (visible) {
            // Animar entrada
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            }).start();
        } else {
            // Animar saída
            Animated.timing(slideAnim, {
                toValue: screenHeight,
                duration: 300,
                useNativeDriver: true
            }).start();
        }
    }, [visible]);

    const handleDismiss = () => {
        Animated.spring(slideAnim, {
            toValue: 500,
            bounciness: 2,
            speed: 20,
            useNativeDriver: true
        }).start();

        // Definir um timeout um pouco menor que a duração esperada da animação
        setTimeout(() => {
            onCancel();
        }, 150); // 300ms é geralmente suficiente para a animação com esses parâmetros
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleDismiss}
        >
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
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderContent}>
                                <Icon
                                    name={iconName}
                                    size={24}
                                    color={colors.main}
                                />
                                <Text variant="titleLarge">{title}</Text>
                            </View>

                            <TouchableOpacity
                                onPress={handleDismiss}
                                style={styles.closeButton}
                            >
                                <Icon
                                    name="close"
                                    size={24}
                                    color={colors.main}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Conteúdo */}
                        <View style={styles.contentContainer}>
                            <Text style={styles.messageText}>
                                {message}
                            </Text>

                            {itemToDelete && (
                                <View style={styles.itemToDeleteContainer}>
                                    <Icon
                                        name="file-document"
                                        size={20}
                                        color={customTheme.colors.onSurfaceVariant}
                                    />
                                    <Text style={styles.itemToDeleteText}>
                                        {itemToDelete}
                                    </Text>
                                </View>
                            )}

                            {colorScheme === 'error' && (
                                <Text style={[styles.warningText, { color: colors.main }]}>
                                    Esta ação não pode ser desfeita.
                                </Text>
                            )}
                        </View>

                        {/* Botões de Ação */}
                        <View style={styles.actionButtonsContainer}>
                            <Button
                                mode="outlined"
                                onPress={handleDismiss}
                                style={styles.actionButton}
                            >
                                Cancelar
                            </Button>
                            <Button
                                mode="contained"
                                onPress={onConfirm}
                                loading={loading}
                                buttonColor={colors.container}
                                textColor={colors.main}
                                style={styles.actionButton}
                            >
                                {confirmText}
                            </Button>
                        </View>
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
    },
    modalContent: {
        backgroundColor: customTheme.colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
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
    closeButton: {
        padding: 8,
    },
    contentContainer: {
        marginBottom: 20,
        gap: 16,
    },
    messageText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        textAlign: 'center',
    },
    itemToDeleteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 10,
        gap: 10,
    },
    itemToDeleteText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    warningText: {
        fontSize: 14,
        color: customTheme.colors.error,
        textAlign: 'center',
        fontWeight: '500',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    actionButton: {
        flex: 1,
    }
});

export default ConfirmationModal;