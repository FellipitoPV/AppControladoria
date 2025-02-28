import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity
} from 'react-native';
import {
    Text,
    Surface
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../../../theme/theme';
import { Equipamento, EQUIPAMENTOS, GeneralInfoProps, FormDataInterface } from '../Types/rdoTypes';
import { EquipmentSelectionModal } from './EquipmentSelectionModal';

const Equipment: React.FC<GeneralInfoProps> = ({
    formData,
    saveFormData,
}) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingEquipmentIndex, setEditingEquipmentIndex] = useState<number | null>(null);

    const handleEditEquipment = (index: number) => {
        setEditingEquipmentIndex(index);
        setIsModalVisible(true);
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
        setEditingEquipmentIndex(null);
    };

    const handleRemoveEquipment = (index: number) => {
        // Make a copy of the existing equipment array or create an empty one
        const updatedEquipments = [...(formData.equipamentos || [])];
        // Remove the equipment at the specified index
        updatedEquipments.splice(index, 1);
        // Update the form data with the new array
        saveFormData({ equipamentos: updatedEquipments });
    };

    const getEquipmentIcon = (tipoLabel: string): string => {
        const equipamento = EQUIPAMENTOS.find(e => e.label === tipoLabel);
        return equipamento?.icon || 'wrench';
    };

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                    name="tools"
                    size={20}
                    color={customTheme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Equipamentos
                </Text>
            </View>

            <View style={styles.inputGroup}>
                {formData.equipamentos?.map((item, index) => (
                    <View key={`equipamento-${item.id || index}`} style={styles.equipamentoRow}>
                        <TouchableOpacity
                            style={styles.equipmentButton}
                            onPress={() => handleEditEquipment(index)}
                        >
                            <View style={styles.equipmentButtonContent}>
                                <MaterialCommunityIcons
                                    name={getEquipmentIcon(item.tipo)}
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <View style={styles.equipmentTextContainer}>
                                    <Text style={styles.equipmentNameText}>
                                        {item.tipo || "Selecione um equipamento"}
                                    </Text>
                                    <Text style={styles.equipmentQuantityText}>
                                        Quantidade: {item.quantidade || "1"}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => handleRemoveEquipment(index)}
                                style={styles.removeButton}
                                disabled={(formData.equipamentos?.length ?? 0) <= 1}
                            >
                                <MaterialCommunityIcons
                                    name="delete-outline"
                                    size={24}
                                    color={(formData.equipamentos?.length ?? 0) <= 1 ?
                                        customTheme.colors.surfaceDisabled :
                                        customTheme.colors.error}
                                />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity
                    style={styles.addEquipmentButton}
                    onPress={() => {
                        setEditingEquipmentIndex(null);
                        setIsModalVisible(true);
                    }}
                >
                    <MaterialCommunityIcons
                        name="plus"
                        size={24}
                        color={customTheme.colors.primary}
                    />
                    <Text style={styles.addEquipmentButtonText}>
                        Adicionar Equipamento
                    </Text>
                </TouchableOpacity>
            </View>

            <EquipmentSelectionModal
                visible={isModalVisible}
                onClose={handleModalClose}
                onConfirm={() => {}} // This is not needed since we're using saveFormData directly
                availableEquipments={EQUIPAMENTOS}
                formData={formData}
                saveFormData={saveFormData}
                editingIndex={editingEquipmentIndex}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    sectionTitle: {
        color: customTheme.colors.onSurface,
        fontWeight: '600',
        fontSize: 18,
    },
    inputGroup: {
        gap: 10,
    },
    equipamentoRow: {
        marginBottom: 8,
    },
    equipmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        padding: 12,
        elevation: 1,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    equipmentButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    equipmentTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    equipmentNameText: {
        fontSize: 16,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    equipmentQuantityText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    removeButton: {
        padding: 8,
    },
    addEquipmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: customTheme.colors.primary,
        borderStyle: 'dashed',
        borderRadius: 8,
        paddingVertical: 12,
        marginTop: 8,
    },
    addEquipmentButtonText: {
        marginLeft: 8,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
});

export default Equipment;