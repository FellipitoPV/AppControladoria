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
import NotificationService from '../../service/NotificationService';

interface DraftConfirmationModalProps {
    visible: boolean;
    lastSavedDate: string;
    onCancel: () => void;
    onConfirm: () => void;
}

const DraftConfirmationModal: React.FC<DraftConfirmationModalProps> = ({
    visible,
    lastSavedDate,
    onCancel,
    onConfirm
}) => {
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
            NotificationService.cancelAllNotifications();
        }, 150);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);

        // Formatar a data (dia/mês/ano)
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        // Formatar a hora (apenas horas e minutos)
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${day}/${month}/${year} às ${hours}:${minutes}`;
    };

    const formattedDate = formatDate(lastSavedDate);

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
                                    name="file-document-edit"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <Text variant="titleLarge">Rascunho encontrado</Text>
                            </View>

                        </View>

                        {/* Conteúdo */}
                        <View style={styles.contentContainer}>
                            <Text style={styles.messageText}>
                                Existe um formulário não finalizado que foi salvo em:
                            </Text>

                            <View style={styles.draftInfoContainer}>
                                <Icon
                                    name="calendar-clock"
                                    size={20}
                                    color={customTheme.colors.onSurfaceVariant}
                                />
                                <Text style={styles.draftDateText}>
                                    {formattedDate}
                                </Text>
                            </View>

                            <Text style={styles.questionText}>
                                Deseja continuar de onde parou?
                            </Text>
                        </View>

                        {/* Botões de Ação */}
                        <View style={styles.actionButtonsContainer}>
                            <Button
                                mode="outlined"
                                onPress={handleDismiss}
                                style={styles.actionButton}
                            >
                                Não, começar novo
                            </Button>
                            <Button
                                mode="contained"
                                onPress={onConfirm}
                                style={styles.actionButton}
                            >
                                Sim, carregar
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
    draftInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 10,
        gap: 10,
    },
    draftDateText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    questionText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
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

export default DraftConfirmationModal;