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
import { Ocorrencia, TIPOS_OCORRENCIAS, GeneralInfoProps, FormDataInterface } from '../Types/rdoTypes';
import { OccurrenceSelectionModal } from './OccurrenceSelectionModal';

const Occurrences: React.FC<GeneralInfoProps> = ({
    formData,
    saveFormData
}) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingOccurrenceIndex, setEditingOccurrenceIndex] = useState<number | null>(null);

    const handleEditOccurrence = (index: number) => {
        setEditingOccurrenceIndex(index);
        setIsModalVisible(true);
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
        setEditingOccurrenceIndex(null);
    };

    const handleRemoveOccurrence = (index: number) => {
        // Make a copy of the existing occurrences array or create an empty one
        const updatedOccurrences = [...(formData.ocorrencias || [])];
        // Remove the occurrence at the specified index
        updatedOccurrences.splice(index, 1);
        // Update the form data with the new array
        saveFormData({ ocorrencias: updatedOccurrences });
    };

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                    name="alert-circle"
                    size={20}
                    color={customTheme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Ocorrências (Opcional)
                </Text>
            </View>

            <View style={styles.inputGroup}>
                {!formData.ocorrencias || formData.ocorrencias.length === 0 ? (
                    <Text style={styles.infoText}>
                        Não há ocorrências registradas. Adicione se necessário.
                    </Text>
                ) : (
                    formData.ocorrencias.map((item, index) => (
                        <View key={`ocorrencia-${item.id || index}`} style={styles.ocorrenciaRow}>
                            <TouchableOpacity
                                style={styles.occurrenceButton}
                                onPress={() => handleEditOccurrence(index)}
                            >
                                <View style={styles.occurrenceButtonContent}>
                                    <MaterialCommunityIcons
                                        name="alert"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                    <View style={styles.occurrenceTextContainer}>
                                        <Text style={styles.occurrenceTypeText} numberOfLines={1}>
                                            {item.tipo || "Tipo não especificado"}
                                        </Text>
                                        {item.descricao ? (
                                            <Text style={styles.occurrenceDescText} numberOfLines={1}>
                                                {item.descricao}
                                            </Text>
                                        ) : null}
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleRemoveOccurrence(index)}
                                    style={styles.removeButton}
                                >
                                    <MaterialCommunityIcons
                                        name="delete-outline"
                                        size={24}
                                        color={customTheme.colors.error}
                                    />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </View>
                    ))
                )}

                <TouchableOpacity
                    style={styles.addOccurrenceButton}
                    onPress={() => {
                        setEditingOccurrenceIndex(null);
                        setIsModalVisible(true);
                    }}
                >
                    <MaterialCommunityIcons
                        name="plus"
                        size={24}
                        color={customTheme.colors.primary}
                    />
                    <Text style={styles.addOccurrenceButtonText}>
                        Adicionar Ocorrência
                    </Text>
                </TouchableOpacity>
            </View>

            <OccurrenceSelectionModal
                visible={isModalVisible}
                onClose={handleModalClose}
                onConfirm={() => {}} // This is not needed since we're using saveFormData directly
                tiposOcorrencias={TIPOS_OCORRENCIAS}
                formData={formData}
                saveFormData={saveFormData}
                editingIndex={editingOccurrenceIndex}
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
    infoText: {
        textAlign: 'center',
        color: customTheme.colors.onSurfaceVariant,
        marginVertical: 10,
        fontStyle: 'italic',
    },
    ocorrenciaRow: {
        marginBottom: 8,
    },
    occurrenceButton: {
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
    occurrenceButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    occurrenceTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    occurrenceTypeText: {
        fontSize: 16,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    occurrenceDescText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 2,
    },
    removeButton: {
        padding: 8,
    },
    addOccurrenceButton: {
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
    addOccurrenceButtonText: {
        marginLeft: 8,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
});

export default Occurrences;