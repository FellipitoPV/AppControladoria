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
import { Dropdown } from 'react-native-element-dropdown';
import { showGlobalToast } from '../../../../../helpers/GlobalApi';
import { customTheme } from '../../../../../theme/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Ocorrencia, FormDataInterface } from '../Types/rdoTypes';

interface OccurrenceSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (ocorrencia: Ocorrencia) => void;
    tiposOcorrencias: Array<{ label: string; value: string; icon: string }>;
    formData: FormDataInterface;
    saveFormData: (updates: Partial<FormDataInterface>) => void;
    editingIndex: number | null;
}

export const OccurrenceSelectionModal: React.FC<OccurrenceSelectionModalProps> = ({
    visible,
    onClose,
    onConfirm,
    tiposOcorrencias,
    formData,
    saveFormData,
    editingIndex
}) => {
    const [selectedType, setSelectedType] = useState('');
    const [selectedTypeLabel, setSelectedTypeLabel] = useState('');
    const [descricao, setDescricao] = useState('');

    // Animation setup
    const screenHeight = Dimensions.get('screen').height;
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;
    const typeRef = useRef<any>(null);

    // Initial occurrence for editing
    const initialOccurrence = editingIndex !== null && formData.ocorrencias
        ? formData.ocorrencias[editingIndex]
        : undefined;

    const handleConfirm = () => {
        if (!selectedType) {
            showGlobalToast('error', 'Erro', 'Selecione um tipo de ocorrência', 2000);
            return;
        }

        if (!descricao.trim()) {
            showGlobalToast('error', 'Erro', 'Informe a descrição da ocorrência', 2000);
            return;
        }

        // Create new occurrences array by copying existing or creating empty array if undefined
        const newOcorrencias = [...(formData.ocorrencias || [])];

        const newOccurrence: Ocorrencia = {
            tipo: selectedTypeLabel,
            descricao: descricao.trim(),
            id: initialOccurrence?.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };

        if (editingIndex !== null && editingIndex >= 0 && editingIndex < newOcorrencias.length) {
            // Editing existing occurrence
            newOcorrencias[editingIndex] = newOccurrence;
        } else {
            // Adding new occurrence
            newOcorrencias.push(newOccurrence);
        }

        // Update form data with new occurrences array
        saveFormData({ ocorrencias: newOcorrencias });
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

            if (initialOccurrence) {
                // Set values for editing mode
                const typeItem = tiposOcorrencias.find(t => t.label === initialOccurrence.tipo);
                setSelectedType(typeItem?.value || '');
                setSelectedTypeLabel(initialOccurrence.tipo || '');
                setDescricao(initialOccurrence.descricao || '');
            } else {
                // Reset for new entry
                setSelectedType('');
                setSelectedTypeLabel('');
                setDescricao('');
            }
        } else {
            // Reset the animation when modal closes
            slideAnim.setValue(screenHeight);
        }
    }, [visible, initialOccurrence, tiposOcorrencias]);

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
                                    name="alert-circle"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <Text variant="titleLarge">
                                    {initialOccurrence ? 'Editar Ocorrência' : 'Adicionar Ocorrência'}
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
                            {/* Occurrence Type Dropdown */}
                            <TouchableOpacity
                                style={styles.dropdownContainer}
                                activeOpacity={0.7}
                                onPress={() => typeRef.current?.open()}
                            >
                                <Dropdown
                                    ref={typeRef}
                                    autoScroll={false}
                                    style={styles.dropdown}
                                    placeholderStyle={styles.placeholderStyle}
                                    selectedTextStyle={styles.selectedTextStyle}
                                    data={tiposOcorrencias}
                                    labelField="label"
                                    valueField="value"
                                    placeholder="Selecione o tipo de ocorrência"
                                    value={selectedType}
                                    onChange={item => {
                                        setSelectedType(item.value);
                                        setSelectedTypeLabel(item.label);
                                    }}
                                    renderLeftIcon={() => (
                                        <MaterialCommunityIcons
                                            name="alert"
                                            size={20}
                                            color={customTheme.colors.primary}
                                            style={styles.dropdownIcon}
                                        />
                                    )}
                                    renderItem={item => (
                                        <View style={styles.dropdownItem}>
                                            <MaterialCommunityIcons
                                                name={item.icon}
                                                size={20}
                                                color={customTheme.colors.primary}
                                            />
                                            <Text style={styles.dropdownLabel}>
                                                {item.label}
                                            </Text>
                                        </View>
                                    )}
                                />
                            </TouchableOpacity>

                            {/* Description Input */}
                            <TextInput
                                mode="outlined"
                                label="Descrição da Ocorrência"
                                value={descricao}
                                onChangeText={setDescricao}
                                multiline
                                numberOfLines={5}
                                style={styles.multilineInput}
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

                            {/* Confirm Button */}
                            <Button
                                mode="contained"
                                onPress={handleConfirm}
                                style={styles.confirmButton}
                                disabled={!selectedType || !descricao.trim()}
                            >
                                {initialOccurrence ? 'Atualizar' : 'Adicionar'}
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
    dropdownContainer: {
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
    },
    dropdown: {
        height: 56,
        paddingHorizontal: 16,
    },
    dropdownIcon: {
        marginRight: 12,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    dropdownLabel: {
        flex: 1,
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    placeholderStyle: {
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
    },
    selectedTextStyle: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
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