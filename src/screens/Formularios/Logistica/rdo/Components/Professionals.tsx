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
import { Profissional, PROFISSIONAIS, GeneralInfoProps, FormDataInterface } from '../Types/rdoTypes';
import { ProfessionalSelectionModal } from './ProfessionalSelectionModal';

const Professionals: React.FC<GeneralInfoProps> = ({
    formData,
    saveFormData
}) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProfessionalIndex, setEditingProfessionalIndex] = useState<number | null>(null);

    const handleEditProfessional = (index: number) => {
        setEditingProfessionalIndex(index);
        setIsModalVisible(true);
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
        setEditingProfessionalIndex(null);
    };

    const handleRemoveProfessional = (index: number) => {
        // Make a copy of the existing professionals array or create an empty one
        const updatedProfessionals = [...(formData.profissionais || [])];
        // Remove the professional at the specified index
        updatedProfessionals.splice(index, 1);
        // Update the form data with the new array
        saveFormData({ profissionais: updatedProfessionals });
    };

    const getProfessionalIcon = (tipoLabel: string): string => {
        const profissional = PROFISSIONAIS.find(p => p.label === tipoLabel);
        return profissional?.icon || 'account';
    };

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                    name="account-group"
                    size={20}
                    color={customTheme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Profissionais
                </Text>
            </View>

            <View style={styles.inputGroup}>
                {formData.profissionais?.map((item, index) => (
                    <View key={`profissional-${item.id || index}`} style={styles.profissionalRow}>
                        <TouchableOpacity
                            style={styles.professionalButton}
                            onPress={() => handleEditProfessional(index)}
                        >
                            <View style={styles.professionalButtonContent}>
                                <MaterialCommunityIcons
                                    name={getProfessionalIcon(item.tipo)}
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <View style={styles.professionalTextContainer}>
                                    <Text style={styles.professionalNameText}>
                                        {item.tipo || "Selecione um profissional"}
                                    </Text>
                                    <Text style={styles.professionalQuantityText}>
                                        Quantidade: {item.quantidade || "1"}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => handleRemoveProfessional(index)}
                                style={styles.removeButton}
                                disabled={(formData.profissionais?.length ?? 0) <= 1}
                            >
                                <MaterialCommunityIcons
                                    name="delete-outline"
                                    size={24}
                                    color={(formData.profissionais?.length ?? 0) <= 1 ?
                                        customTheme.colors.surfaceDisabled :
                                        customTheme.colors.error}
                                />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity
                    style={styles.addProfessionalButton}
                    onPress={() => {
                        setEditingProfessionalIndex(null);
                        setIsModalVisible(true);
                    }}
                >
                    <MaterialCommunityIcons
                        name="plus"
                        size={24}
                        color={customTheme.colors.primary}
                    />
                    <Text style={styles.addProfessionalButtonText}>
                        Adicionar Profissional
                    </Text>
                </TouchableOpacity>
            </View>

            <ProfessionalSelectionModal
                visible={isModalVisible}
                onClose={handleModalClose}
                onConfirm={() => {}} // This is not needed since we're using saveFormData directly
                availableProfessionals={PROFISSIONAIS}
                formData={formData}
                saveFormData={saveFormData}
                editingIndex={editingProfessionalIndex}
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
    profissionalRow: {
        marginBottom: 8,
    },
    professionalButton: {
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
    professionalButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    professionalTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    professionalNameText: {
        fontSize: 16,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    professionalQuantityText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    removeButton: {
        padding: 8,
    },
    addProfessionalButton: {
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
    addProfessionalButtonText: {
        marginLeft: 8,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
});

export default Professionals;