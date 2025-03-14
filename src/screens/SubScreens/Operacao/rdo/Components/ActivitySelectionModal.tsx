import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
    Animated
} from 'react-native';
import {
    Surface,
    Text,
    TextInput,
    Button
} from 'react-native-paper';
import { showGlobalToast } from '../../../../../helpers/GlobalApi';
import { customTheme } from '../../../../../theme/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Atividade, FormDataInterface } from '../Types/rdoTypes';

interface ActivitySelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (atividade: Atividade) => void;
    formData: FormDataInterface;
    saveFormData: (updates: Partial<FormDataInterface>) => void;
    editingIndex: number | null;
}

export const ActivitySelectionModal: React.FC<ActivitySelectionModalProps> = ({
    visible,
    onClose,
    onConfirm,
    formData,
    saveFormData,
    editingIndex
}) => {
    const [descricao, setDescricao] = useState('');
    const [observacao, setObservacao] = useState('');

    // Animation setup
    const screenHeight = Dimensions.get('screen').height;
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;

    // Initial activity for editing
    const initialActivity = editingIndex !== null && formData.atividades
        ? formData.atividades[editingIndex]
        : undefined;

    const handleConfirm = () => {
        if (!descricao.trim()) {
            showGlobalToast('error', 'Erro', 'Digite uma descrição para a atividade', 2000);
            return;
        }

        // Create new activities array by copying existing or creating empty array if undefined
        const newAtividades = [...(formData.atividades || [])];

        const newActivity: Atividade = {
            descricao: descricao.trim(),
            observacao: observacao.trim(),
            id: initialActivity?.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };

        if (editingIndex !== null && editingIndex >= 0 && editingIndex < newAtividades.length) {
            // Editing existing activity
            newAtividades[editingIndex] = newActivity;
        } else {
            // Adding new activity
            newAtividades.push(newActivity);
        }

        // Update form data with new activities array
        saveFormData({ atividades: newAtividades });
        onClose();
    };

    const handleDismiss = () => {
        Animated.spring(slideAnim, {
            toValue: screenHeight,
            bounciness: 2,
            speed: 20,
            useNativeDriver: true
        }).start();

        setTimeout(onClose, 50);
    };

    // Reset modal state and animate when visibility changes
    useEffect(() => {
        if (visible) {
            // Animate the modal in when it becomes visible
            Animated.spring(slideAnim, {
                toValue: 0,
                bounciness: 2,
                speed: 20,
                useNativeDriver: true
            }).start();

            if (initialActivity) {
                // Set values for editing mode
                setDescricao(initialActivity.descricao || '');
                setObservacao(initialActivity.observacao || '');
            } else {
                // Reset for new entry
                setDescricao('');
                setObservacao('');
            }
        } else {
            // Reset the animation when modal closes
            slideAnim.setValue(screenHeight);
        }
    }, [visible, initialActivity]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
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
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderContent}>
                                <MaterialCommunityIcons
                                    name="clipboard-list"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <Text variant="titleLarge">
                                    {initialActivity ? 'Editar Atividade' : 'Adicionar Atividade'}
                                </Text>
                            </View>

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

                        {/* Modal Content */}
                        <View style={styles.modalContentInner}>
                            {/* Description Input */}
                            <TextInput
                                mode="outlined"
                                label="Descrição da Atividade"
                                value={descricao}
                                onChangeText={setDescricao}
                                style={styles.input}
                                left={
                                    <TextInput.Icon
                                        icon={() => (
                                            <MaterialCommunityIcons
                                                name="text-box-outline"
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                        )}
                                    />
                                }
                            />

                            {/* Observation Input */}
                            <TextInput
                                mode="outlined"
                                label="Observação (opcional)"
                                value={observacao}
                                onChangeText={setObservacao}
                                multiline
                                numberOfLines={5}
                                style={styles.multilineInput}
                                left={
                                    <TextInput.Icon
                                        icon={() => (
                                            <MaterialCommunityIcons
                                                name="comment-outline"
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                        )}
                                    />
                                }
                            />

                            {/* Confirm Button */}
                            <Button
                                mode="contained"
                                onPress={handleConfirm}
                                style={styles.confirmButton}
                                disabled={!descricao.trim()}
                            >
                                {initialActivity ? 'Atualizar' : 'Adicionar'}
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
        maxHeight: '95%',
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
    closeButton: {
        padding: 8,
    },
    modalContentInner: {
        paddingVertical: 16,
        gap: 16,
    },
    input: {
        backgroundColor: '#FFFFFF',
    },
    multilineInput: {
        backgroundColor: '#FFFFFF',
        minHeight: 120,
        textAlignVertical: 'top',
    },
    confirmButton: {
        marginTop: 8,
    },
});