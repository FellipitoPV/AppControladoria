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
import { Profissional, PROFISSIONAIS, FormDataInterface } from '../Types/rdoTypes';

interface ProfessionalSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (profissional: Profissional) => void;
    availableProfessionals: Array<{ label: string; value: string; icon: string }>;
    formData: FormDataInterface;
    saveFormData: (updates: Partial<FormDataInterface>) => void;
    editingIndex: number | null;
}

export const ProfessionalSelectionModal: React.FC<ProfessionalSelectionModalProps> = ({
    visible,
    onClose,
    onConfirm,
    formData,
    availableProfessionals,
    saveFormData,
    editingIndex
}) => {
    const [selectedProfessional, setSelectedProfessional] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [selectedProfessionalLabel, setSelectedProfessionalLabel] = useState('');

    // Animation setup
    const screenHeight = Dimensions.get('screen').height;
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;
    const professionalRef = useRef<any>(null);

    // Initial professional for editing
    const initialProfessional = editingIndex !== null && formData.profissionais
        ? formData.profissionais[editingIndex]
        : undefined;

    // Improved filter for available professionals
    // Only show professionals that aren't already selected in formData
    // Except for the one being edited (if in edit mode)
    const getFilteredProfessionals = () => {
        // Make sure profissionais exists in formData
        const existingProfissionais = formData.profissionais || [];

        return PROFISSIONAIS.filter(prof => {
            // If we're editing, allow the current professional type
            if (initialProfessional && initialProfessional.tipo === prof.label) {
                return true;
            }

            // Check if this professional type already exists in the form data
            const alreadyExists = existingProfissionais.some(
                existingProf => existingProf.tipo === prof.label
            );

            // Only include professionals that don't already exist in the form
            return !alreadyExists;
        });
    };

    // Get filtered professionals
    const filteredProfessionals = getFilteredProfessionals();

    const handleConfirm = () => {
        if (!selectedProfessional) {
            showGlobalToast('error', 'Erro', 'Selecione um profissional', 2000);
            return;
        }

        if (!quantity || parseInt(quantity) < 1) {
            showGlobalToast('error', 'Erro', 'Quantidade inválida', 2000);
            return;
        }

        // Create new professionals array by copying existing or creating empty array if undefined
        const newProfissionais = [...(formData.profissionais || [])];

        const newProfessional: Profissional = {
            tipo: selectedProfessionalLabel,
            quantidade: quantity,
            id: initialProfessional?.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };

        if (editingIndex !== null && editingIndex >= 0 && editingIndex < newProfissionais.length) {
            // Editing existing professional
            newProfissionais[editingIndex] = newProfessional;
        } else {
            // Adding new professional
            newProfissionais.push(newProfessional);
        }

        // Update form data with new professionals array
        saveFormData({ profissionais: newProfissionais });
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

    const handleQuantityChange = (text: string) => {
        // Remove any non-numeric characters
        const numericText = text.replace(/[^0-9]/g, '');

        // Ensure quantity is at least 1
        const quantityValue = parseInt(numericText || '0');

        if (isNaN(quantityValue) || quantityValue < 1) {
            setQuantity('1');
        } else {
            setQuantity(quantityValue.toString());
        }
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

            if (initialProfessional) {
                // Set values for editing mode
                const profItem = PROFISSIONAIS.find(p => p.label === initialProfessional.tipo);
                setSelectedProfessional(profItem?.value || '');
                setSelectedProfessionalLabel(initialProfessional.tipo || '');
                setQuantity(initialProfessional.quantidade || '1');
            } else {
                // Reset for new entry
                setSelectedProfessional('');
                setSelectedProfessionalLabel('');
                setQuantity('1');
            }
        } else {
            // Reset the animation when modal closes
            slideAnim.setValue(screenHeight);
        }
    }, [visible, initialProfessional]);

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
                                    name="account-group"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <Text variant="titleLarge">
                                    {initialProfessional ? 'Editar Profissional' : 'Adicionar Profissional'}
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

                            {/* Professional Dropdown */}
                            <TouchableOpacity
                                style={styles.dropdownContainer}
                                activeOpacity={0.7}
                                onPress={() => professionalRef.current?.open()}
                            >
                                <Dropdown
                                    ref={professionalRef}
                                    style={styles.dropdown}
                                    placeholderStyle={styles.placeholderStyle}
                                    selectedTextStyle={styles.selectedTextStyle}
                                    data={filteredProfessionals}
                                    dropdownPosition='top'
                                    labelField="label"
                                    valueField="value"
                                    placeholder="Selecione o profissional"
                                    value={selectedProfessional}
                                    onChange={item => {
                                        setSelectedProfessional(item.value);
                                        setSelectedProfessionalLabel(item.label);
                                    }}
                                    renderLeftIcon={() => (
                                        <MaterialCommunityIcons
                                            name="account"
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

                            {/* Quantity Input */}
                            <TextInput
                                mode="outlined"
                                label="Quantidade"
                                value={quantity}
                                onChangeText={handleQuantityChange}
                                keyboardType="numeric"
                                style={styles.quantityInput}
                                left={
                                    <TextInput.Icon
                                        icon={() => (
                                            <MaterialCommunityIcons
                                                name="numeric"
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
                                disabled={!selectedProfessional}
                            >
                                {initialProfessional ? 'Atualizar' : 'Adicionar'}
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
    quantityInput: {
        backgroundColor: '#FFFFFF',
    },
    confirmButton: {
        marginTop: 8,
    },
});