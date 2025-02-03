import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Dimensions
} from 'react-native';
import {
    Text,
    Button,
    TextInput,
    Surface,
    Portal
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useUser } from '../../contexts/userContext';
import { showGlobalToast } from '../../helpers/GlobalApi';
import { customTheme } from '../../theme/theme';
import database from '@react-native-firebase/database';

// Interface para o tipo de Feedback
interface Feedback {
    userId: string;
    userName: string;
    type: 'improvement' | 'bug' | 'feature';
    description: string;
    app: string;
    timestamp: any;
    isRead: boolean;
}

export const FeedbackFloatingButton: React.FC = () => {
    const { userInfo } = useUser();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [feedbackType, setFeedbackType] = useState<'improvement' | 'bug' | 'feature'>('improvement');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Tipos de feedback com ícones e cores
    const feedbackTypes = [
        {
            value: 'improvement',
            label: 'Melhoria',
            icon: 'lightbulb',
            color: customTheme.colors.warning
        },
        {
            value: 'bug',
            label: 'Problema',
            icon: 'bug-report',
            color: customTheme.colors.error
        },
        {
            value: 'feature',
            label: 'Nova Funcionalidade',
            icon: 'add-circle',
            color: customTheme.colors.primary
        }
    ];

    // No componente de Feedback
    const handleSubmitFeedback = async () => {
        // Validações
        if (!description.trim()) {
            showGlobalToast('error', 'Erro', 'Por favor, descreva seu feedback', 5000);
            return;
        }

        if (!userInfo) {
            showGlobalToast('error', 'Erro', 'Usuário não autenticado', 5000);
            return;
        }

        setIsSubmitting(true);

        try {
            // Preparar dados do feedback
            const newFeedback: Feedback = {
                userId: userInfo.id,
                userName: userInfo.user,
                type: feedbackType,
                description: description.trim(),
                timestamp: database.ServerValue.TIMESTAMP,
                isRead: false,
                app: 'Controladoria'
            };

            // Enviar para o Firebase Realtime Database
            await database().ref('/feedback').push(newFeedback);

            // Limpar estado e fechar modal
            setDescription('');
            setIsModalVisible(false);

            // Mostrar toast de sucesso
            showGlobalToast('success', 'Sucesso', 'Feedback enviado com sucesso!', 5000);
        } catch (error) {
            console.error('Erro ao enviar feedback:', error);
            showGlobalToast('error', 'Erro', 'Falha ao enviar feedback', 5000);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Botão Flutuante de Feedback */}
            <TouchableOpacity
                style={styles.floatingButton}
                onPress={() => setIsModalVisible(true)}
            >
                <Icon
                    name="feedback"
                    size={24}
                    color={customTheme.colors.onSecondary}
                />
            </TouchableOpacity>

            {/* Modal de Feedback */}
            <Portal>
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={isModalVisible}
                    onRequestClose={() => setIsModalVisible(false)}
                >
                    <View style={styles.modalBackground}>
                        <Surface style={styles.modalContainer}>
                            {/* Título */}
                            <View style={styles.modalHeader}>
                                <Icon
                                    name="feedback"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <Text style={styles.modalTitle}>
                                    Enviar Feedback
                                </Text>
                            </View>

                            {/* Tipos de Feedback */}
                            <View style={styles.feedbackTypeContainer}>
                                {feedbackTypes.map((type) => (
                                    <TouchableOpacity
                                        key={type.value}
                                        style={[
                                            styles.feedbackTypeButton,
                                            feedbackType === type.value && {
                                                backgroundColor: type.color + '20', // Cor com transparência
                                                borderColor: type.color
                                            }
                                        ]}
                                        onPress={() => setFeedbackType(type.value as any)}
                                    >
                                        <Icon
                                            name={type.icon}
                                            size={24}
                                            color={type.color}
                                        />
                                        <Text style={styles.feedbackTypeText}>
                                            {type.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Descrição */}
                            <TextInput
                                multiline
                                mode="outlined"
                                placeholder="Descreva seu feedback..."
                                value={description}
                                onChangeText={setDescription}
                                style={styles.descriptionInput}
                                numberOfLines={5}
                                maxLength={500}
                            />

                            {/* Contagem de caracteres */}
                            <Text style={styles.charCount}>
                                {description.length}/500
                            </Text>

                            {/* Botões de Ação */}
                            <View style={styles.actionButtons}>
                                <Button
                                    mode="outlined"
                                    onPress={() => setIsModalVisible(false)}
                                    style={styles.cancelButton}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    mode="contained"
                                    onPress={handleSubmitFeedback}
                                    loading={isSubmitting}
                                    disabled={isSubmitting || !description.trim()}
                                    style={styles.submitButton}
                                >
                                    Enviar Feedback
                                </Button>
                            </View>
                        </Surface>
                    </View>
                </Modal>
            </Portal>
        </>
    );
};

// Estilos
const { width, height } = Dimensions.get('window');
const styles = StyleSheet.create({
    floatingButton: {
        position: 'absolute',
        bottom: 75,
        right: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: customTheme.colors.secondary   ,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        zIndex: 999
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContainer: {
        width: width * 0.9,
        maxWidth: 500,
        padding: 20,
        borderRadius: 16,
        backgroundColor: customTheme.colors.surface
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.primary
    },
    feedbackTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16
    },
    feedbackTypeButton: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8
    },
    feedbackTypeText: {
        marginTop: 8,
        fontSize: 12,
        textAlign: 'center'
    },
    descriptionInput: {
        height: 120,
        marginBottom: 8
    },
    charCount: {
        alignSelf: 'flex-end',
        color: customTheme.colors.onSurfaceVariant,
        fontSize: 12,
        marginBottom: 16
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10
    },
    cancelButton: {
        flex: 1
    },
    submitButton: {
        flex: 1
    }
});

export default FeedbackFloatingButton;