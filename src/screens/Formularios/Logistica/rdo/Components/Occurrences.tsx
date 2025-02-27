import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import { customTheme } from '../../../../../theme/theme';
import { Ocorrencia, DropdownRef, TIPOS_OCORRENCIAS } from '../Types/rdoTypes';

interface OccurrencesProps {
    ocorrencias: Ocorrencia[];
    setOcorrencias: React.Dispatch<React.SetStateAction<Ocorrencia[]>>;
}

const Occurrences: React.FC<OccurrencesProps> = ({
    ocorrencias,
    setOcorrencias
}) => {
    const [dropdownRefs, setDropdownRefs] = useState<React.RefObject<DropdownRef>[]>([]);
    const [tipoValues, setTipoValues] = useState<Record<number, string>>({});

    useEffect(() => {
        // Initialize dropdown refs when occurrences change
        setDropdownRefs(Array(ocorrencias.length).fill(0).map(() => React.createRef()));
    }, [ocorrencias.length]);

    const adicionarOcorrencia = () => {
        setOcorrencias([...ocorrencias, { tipo: '', descricao: '' }]);
    };

    const removerOcorrencia = (index: number) => {
        const novasOcorrencias = ocorrencias.filter((_, idx) => idx !== index);
        setOcorrencias(novasOcorrencias);
    };

    const atualizarOcorrencia = (index: number, atualizacoes: Partial<Ocorrencia>) => {
        const novasOcorrencias = [...ocorrencias];
        novasOcorrencias[index] = {
            ...novasOcorrencias[index],
            ...atualizacoes
        };
        setOcorrencias(novasOcorrencias);
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
                {ocorrencias.length === 0 ? (
                    <Text style={styles.infoText}>
                        Não há ocorrências registradas. Adicione se necessário.
                    </Text>
                ) : (
                    ocorrencias.map((item, index) => (
                        <View key={`ocorrencia-${index}`} style={styles.ocorrenciaContainer}>
                            <View style={styles.ocorrenciaHeader}>
                                <Text style={styles.ocorrenciaTitle}>Ocorrência {index + 1}</Text>
                                <TouchableOpacity
                                    onPress={() => removerOcorrencia(index)}
                                    style={styles.removeButton}
                                >
                                    <MaterialCommunityIcons
                                        name="delete-outline"
                                        size={24}
                                        color={customTheme.colors.error}
                                    />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.dropdownContainer}
                                onPress={() => dropdownRefs[index]?.current?.open()}
                            >
                                <Dropdown
                                    ref={dropdownRefs[index]}
                                    style={styles.dropdown}
                                    placeholderStyle={styles.placeholderStyle}
                                    selectedTextStyle={styles.selectedTextStyle}
                                    iconStyle={styles.iconStyle}
                                    data={TIPOS_OCORRENCIAS}
                                    labelField="label"
                                    valueField="value"
                                    placeholder="Tipo de Ocorrência"
                                    value={tipoValues[index]}
                                    onChange={value => {
                                        // Atualiza o estado de controle do dropdown
                                        setTipoValues(prev => ({ ...prev, [index]: value.value }));

                                        // Mantém a lógica atual de salvar o label no estado principal
                                        atualizarOcorrencia(index, {
                                            tipo: value.label
                                        });
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

                            <TextInput
                                mode="outlined"
                                label="Descrição da Ocorrência"
                                value={item.descricao}
                                onChangeText={(texto) => atualizarOcorrencia(index, { descricao: texto })}
                                style={[styles.input, styles.multilineInput, { marginTop: 10 }]}
                                multiline={true}
                                numberOfLines={3}
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
                        </View>
                    ))
                )}

                <Button
                    mode="outlined"
                    onPress={adicionarOcorrencia}
                    icon="plus"
                    style={styles.addButton}
                >
                    Adicionar Ocorrência
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
    ocorrenciaContainer: {
        width: '100%',
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
    },
    ocorrenciaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    ocorrenciaTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.primary,
    },
    infoText: {
        textAlign: 'center',
        color: customTheme.colors.onSurfaceVariant,
        marginVertical: 10,
        fontStyle: 'italic',
    },
    removeButton: {
        padding: 8,
        justifyContent: 'center',
    },
    dropdownContainer: {
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        height: 56,
    },
    dropdown: {
        height: 56,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
    },
    input: {
        backgroundColor: '#FFFFFF',
        height: 56,
    },
    multilineInput: {
        height: 120,
        textAlignVertical: 'top',
    },
    addButton: {
        marginTop: 8,
        borderColor: customTheme.colors.primary,
        borderStyle: 'dashed',
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
    iconStyle: {
        width: 24,
        height: 24,
    },
});

export default Occurrences;