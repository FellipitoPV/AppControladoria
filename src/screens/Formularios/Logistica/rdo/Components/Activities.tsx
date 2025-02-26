import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../../../theme/theme';
import { Atividade } from '../Types/rdoTypes';

interface ActivitiesProps {
    atividadesRealizadas: Atividade[];
    setAtividadesRealizadas: React.Dispatch<React.SetStateAction<Atividade[]>>;
}

const Activities: React.FC<ActivitiesProps> = ({
    atividadesRealizadas,
    setAtividadesRealizadas
}) => {
    const adicionarAtividade = () => {
        setAtividadesRealizadas([...atividadesRealizadas, { descricao: '', observacao: '' }]);
    };

    const removerAtividade = (index: number) => {
        const novasAtividades = atividadesRealizadas.filter((_, idx) => idx !== index);
        setAtividadesRealizadas(novasAtividades);
    };

    const atualizarAtividade = (index: number, atualizacoes: Partial<Atividade>) => {
        const novasAtividades = [...atividadesRealizadas];
        novasAtividades[index] = {
            ...novasAtividades[index],
            ...atualizacoes
        };
        setAtividadesRealizadas(novasAtividades);
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
                {atividadesRealizadas.map((item, index) => (
                    <View key={`atividade-${index}`} style={styles.atividadeContainer}>
                        <View style={styles.atividadeHeader}>
                            <Text style={styles.atividadeTitle}>{index + 1}° Atividade</Text>
                            <TouchableOpacity
                                onPress={() => removerAtividade(index)}
                                style={styles.removeButton}
                                disabled={atividadesRealizadas.length === 1}
                            >
                                <MaterialCommunityIcons
                                    name="delete-outline"
                                    size={24}
                                    color={atividadesRealizadas.length === 1 ?
                                        customTheme.colors.surfaceDisabled :
                                        customTheme.colors.error}
                                />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            mode="outlined"
                            label="Descrição"
                            value={item.descricao}
                            onChangeText={(texto) => atualizarAtividade(index, { descricao: texto })}
                            style={styles.input}
                            left={<TextInput.Icon
                                icon={() => (
                                    <MaterialCommunityIcons
                                        name="text-box-outline"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                )}
                            />}
                        />

                        <TextInput
                            mode="outlined"
                            label="Observação"
                            value={item.observacao}
                            onChangeText={(texto) => atualizarAtividade(index, { observacao: texto })}
                            style={[styles.input, styles.multilineInput, { marginTop: 10 }]}
                            multiline={true}
                            numberOfLines={5}
                            left={<TextInput.Icon
                                icon={() => (
                                    <MaterialCommunityIcons
                                        name="comment-outline"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                )}
                            />}
                        />
                    </View>
                ))}

                <Button
                    mode="outlined"
                    onPress={adicionarAtividade}
                    icon="plus"
                    style={styles.addButton}
                >
                    Adicionar Atividade
                </Button>
            </View>
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
    atividadeContainer: {
        marginBottom: 20,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: customTheme.colors.primary,
    },
    atividadeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    atividadeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.primary,
    },
    input: {
        backgroundColor: '#FFFFFF',
        height: 56,
    },
    multilineInput: {
        height: 120,
        textAlignVertical: 'top',
    },
    removeButton: {
        padding: 8,
        justifyContent: 'center',
    },
    addButton: {
        marginTop: 8,
        borderColor: customTheme.colors.primary,
        borderStyle: 'dashed',
    },
});

export default Activities;