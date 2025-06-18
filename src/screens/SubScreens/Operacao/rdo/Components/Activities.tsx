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
import { Atividade, GeneralInfoProps, FormDataInterface } from '../Types/rdoTypes';
import { ActivitySelectionModal } from './ActivitySelectionModal';

const Activities: React.FC<GeneralInfoProps> = ({
    formData,
    saveFormData
}) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);

    const handleEditActivity = (index: number) => {
        setEditingActivityIndex(index);
        setIsModalVisible(true);
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
        setEditingActivityIndex(null);
    };

    const handleRemoveActivity = (index: number) => {
        // Make a copy of the existing activities array or create an empty one
        const updatedActivities = [...(formData.atividades || [])];
        // Remove the activity at the specified index
        updatedActivities.splice(index, 1);
        // Update the form data with the new array
        saveFormData({ atividades: updatedActivities });
    };

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                    name="clipboard-list"
                    size={20}
                    color={customTheme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Atividades Realizadas
                </Text>
            </View>

            <View style={styles.inputGroup}>
                {formData.atividades?.map((item, index) => (
                    <View key={`atividade-${item.id || index}`} style={styles.atividadeRow}>
                        <TouchableOpacity
                            style={styles.activityButton}
                            onPress={() => handleEditActivity(index)}
                        >
                            <View style={styles.activityButtonContent}>
                                <MaterialCommunityIcons
                                    name="clipboard-text-outline"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <View style={styles.activityTextContainer}>
                                    <Text style={styles.activityDescText} numberOfLines={1}>
                                        {item.descricao || "Atividade sem descrição"}
                                    </Text>
                                    {item.observacao ? (
                                        <Text style={styles.activityObsText} numberOfLines={1}>
                                            Obs: {item.observacao}
                                        </Text>
                                    ) : null}
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => handleRemoveActivity(index)}
                                style={styles.removeButton}
                                disabled={(formData.atividades?.length ?? 0) <= 1}
                            >
                                <MaterialCommunityIcons
                                    name="delete-outline"
                                    size={24}
                                    color={(formData.atividades?.length ?? 0) <= 1 ? 
                                        customTheme.colors.surfaceDisabled : 
                                        customTheme.colors.error}
                                />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity
                    style={styles.addActivityButton}
                    onPress={() => {
                        setEditingActivityIndex(null);
                        setIsModalVisible(true);
                    }}
                >
                    <MaterialCommunityIcons
                        name="plus"
                        size={24}
                        color={customTheme.colors.primary}
                    />
                    <Text style={styles.addActivityButtonText}>
                        Adicionar Atividade
                    </Text>
                </TouchableOpacity>
            </View>

            <ActivitySelectionModal
                visible={isModalVisible}
                onClose={handleModalClose}
                onConfirm={() => {}} // This is not needed since we're using saveFormData directly
                formData={formData}
                saveFormData={saveFormData}
                editingIndex={editingActivityIndex}
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
    atividadeRow: {
        marginBottom: 8,
    },
    activityButton: {
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
    activityButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    activityTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    activityDescText: {
        fontSize: 16,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    activityObsText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 2,
    },
    removeButton: {
        padding: 8,
    },
    addActivityButton: {
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
    addActivityButtonText: {
        marginLeft: 8,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
});

export default Activities;