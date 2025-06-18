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
import { Equipamento, EQUIPAMENTOS, FormDataInterface } from '../Types/rdoTypes';

interface EquipmentSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (equipamento: Equipamento) => void;
    availableEquipments: Array<{ label: string; value: string; icon: string }>;
    formData: FormDataInterface;
    saveFormData: (updates: Partial<FormDataInterface>) => void;
    editingIndex: number | null;
}

export const EquipmentSelectionModal: React.FC<EquipmentSelectionModalProps> = ({
    visible,
    onClose,
    onConfirm,
    availableEquipments,
    formData,
    saveFormData,
    editingIndex
}) => {
    const [selectedEquipment, setSelectedEquipment] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [selectedEquipmentLabel, setSelectedEquipmentLabel] = useState('');

    // Animation setup
    const screenHeight = Dimensions.get('screen').height;
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;
    const equipmentRef = useRef<any>(null);

    // Initial equipment for editing
    const initialEquipment = editingIndex !== null && formData.equipamentos
        ? formData.equipamentos[editingIndex]
        : undefined;

    // Improved filter for available equipments
    const getFilteredEquipments = () => {
        // Make sure equipamentos exists in formData
        const existingEquipamentos = formData.equipamentos || [];
        
        return EQUIPAMENTOS.filter(equip => {
            // If we're editing, allow the current equipment type
            if (initialEquipment && initialEquipment.tipo === equip.label) {
                return true;
            }
            
            // Check if this equipment type already exists in the form data
            const alreadyExists = existingEquipamentos.some(
                existingEquip => existingEquip.tipo === equip.label
            );
            
            // Only include equipments that don't already exist in the form
            return !alreadyExists;
        });
    };

    // Get filtered equipments
    const filteredEquipments = getFilteredEquipments();

    const handleConfirm = () => {
        if (!selectedEquipment) {
            showGlobalToast('error', 'Erro', 'Selecione um equipamento', 2000);
            return;
        }

        if (!quantity || parseInt(quantity) < 1) {
            showGlobalToast('error', 'Erro', 'Quantidade inválida', 2000);
            return;
        }

        // Create new equipments array by copying existing or creating empty array if undefined
        const newEquipamentos = [...(formData.equipamentos || [])];

        const newEquipment: Equipamento = {
            tipo: selectedEquipmentLabel,
            quantidade: quantity,
            id: initialEquipment?.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };

        if (editingIndex !== null && editingIndex >= 0 && editingIndex < newEquipamentos.length) {
            // Editing existing equipment
            newEquipamentos[editingIndex] = newEquipment;
        } else {
            // Adding new equipment
            newEquipamentos.push(newEquipment);
        }

        // Update form data with new equipments array
        saveFormData({ equipamentos: newEquipamentos });
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

            if (initialEquipment) {
                // Set values for editing mode
                const equipItem = EQUIPAMENTOS.find(e => e.label === initialEquipment.tipo);
                setSelectedEquipment(equipItem?.value || '');
                setSelectedEquipmentLabel(initialEquipment.tipo || '');
                setQuantity(initialEquipment.quantidade || '1');
            } else {
                // Reset for new entry
                setSelectedEquipment('');
                setSelectedEquipmentLabel('');
                setQuantity('1');
            }
        } else {
            // Reset the animation when modal closes
            slideAnim.setValue(screenHeight);
        }
    }, [visible, initialEquipment]);

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
                                    name="tools"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <Text variant="titleLarge">
                                    {initialEquipment ? 'Editar Equipamento' : 'Adicionar Equipamento'}
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

                            {/* Equipment Dropdown */}
                            <TouchableOpacity
                                style={styles.dropdownContainer}
                                activeOpacity={0.7}
                                onPress={() => equipmentRef.current?.open()}
                            >
                                <Dropdown
                                    ref={equipmentRef}
                                    style={styles.dropdown}
                                    placeholderStyle={styles.placeholderStyle}
                                    selectedTextStyle={styles.selectedTextStyle}
                                    data={filteredEquipments}
                                    dropdownPosition='top'
                                    labelField="label"
                                    valueField="value"
                                    placeholder="Selecione o equipamento"
                                    value={selectedEquipment}
                                    onChange={item => {
                                        setSelectedEquipment(item.value);
                                        setSelectedEquipmentLabel(item.label);
                                    }}
                                    renderLeftIcon={() => (
                                        <MaterialCommunityIcons
                                            name="wrench"
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
                                disabled={!selectedEquipment}
                            >
                                {initialEquipment ? 'Atualizar' : 'Adicionar'}
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