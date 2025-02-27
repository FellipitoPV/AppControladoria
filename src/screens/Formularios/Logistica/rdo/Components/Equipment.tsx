import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import { customTheme } from '../../../../../theme/theme';
import { Equipamento, DropdownRef, EQUIPAMENTOS } from '../Types/rdoTypes';

interface EquipmentProps {
    equipamentosSelecionados: Equipamento[];
    setEquipamentosSelecionados: React.Dispatch<React.SetStateAction<Equipamento[]>>;
}

const Equipment: React.FC<EquipmentProps> = ({
    equipamentosSelecionados,
    setEquipamentosSelecionados
}) => {
    const [dropdownRefs, setDropdownRefs] = useState<React.RefObject<DropdownRef>[]>([]);
    const [equipamentoValues, setEquipamentoValues] = useState<{ [key: number]: string }>({});

    useEffect(() => {
        // Initialize dropdown refs when equipment changes
        setDropdownRefs(Array(equipamentosSelecionados.length).fill(0).map(() => React.createRef()));
    }, [equipamentosSelecionados.length]);

    useEffect(() => {
        // Inicialize os valores de controle para equipamentos existentes
        if (equipamentosSelecionados.length > 0) {
            const initialValues: { [key: number]: string } = {};
            equipamentosSelecionados.forEach((equip, idx) => {
                const equipItem = EQUIPAMENTOS.find(e => e.label === equip.tipo);
                if (equipItem) {
                    initialValues[idx] = equipItem.value;
                }
            });
            setEquipamentoValues(initialValues);
        }
    }, [equipamentosSelecionados]); // Adicionar equipamentosSelecionados como dependência

    const adicionarEquipamento = () => {
        setEquipamentosSelecionados([
            ...equipamentosSelecionados,
            {
                tipo: '',
                quantidade: '1',
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
            }
        ]);
    };

    const removerEquipamento = (index: number) => {
        const novosEquipamentos = equipamentosSelecionados.filter((_, idx) => idx !== index);
        setEquipamentosSelecionados(novosEquipamentos);

        setEquipamentoValues(prev => {
            const newValues = { ...prev };
            delete newValues[index];
            return newValues;
        });

    };

    const atualizarEquipamento = (index: number, atualizacoes: Partial<Equipamento>) => {
        const novosEquipamentos = [...equipamentosSelecionados];
        novosEquipamentos[index] = {
            ...novosEquipamentos[index],
            ...atualizacoes
        };
        setEquipamentosSelecionados(novosEquipamentos);
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
                {equipamentosSelecionados.map((item, index) => (
                    <View key={`equipamento-${item.id || index}`}  style={styles.itemRow}>
                        <View style={styles.itemMain}>
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
                                    data={EQUIPAMENTOS.filter(e =>
                                        !equipamentosSelecionados.some(es =>
                                            es.tipo === e.value && es !== item
                                        )
                                    )}
                                    placeholder='Selecione um equipamento'
                                    labelField="label"
                                    valueField="value"
                                    value={equipamentoValues[index]}
                                    onChange={value => {
                                        // Atualiza o valor de controle
                                        setEquipamentoValues(prev => ({
                                            ...prev,
                                            [index]: value.value
                                        }));

                                        // Mantém a lógica atual
                                        atualizarEquipamento(index, {
                                            tipo: value.label,
                                            quantidade: item.quantidade || '1'
                                        });
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

                            <TextInput
                                mode="outlined"
                                placeholder="Qtd"
                                value={item.quantidade}
                                onChangeText={value => {
                                    atualizarEquipamento(index, { quantidade: value });
                                }}
                                keyboardType="numeric"
                                style={styles.quantidadeInput}
                                left={<TextInput.Icon
                                    icon={() => (
                                        <MaterialCommunityIcons
                                            name="numeric"
                                            size={24}
                                            color={customTheme.colors.primary}
                                        />
                                    )}
                                />}
                            />

                            <TouchableOpacity
                                onPress={() => removerEquipamento(index)}
                                style={styles.removeButton}
                                disabled={equipamentosSelecionados.length === 1}
                            >
                                <MaterialCommunityIcons
                                    name="delete-outline"
                                    size={24}
                                    color={equipamentosSelecionados.length === 1 ?
                                        customTheme.colors.surfaceDisabled :
                                        customTheme.colors.error}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                <Button
                    mode="outlined"
                    onPress={adicionarEquipamento}
                    icon="plus"
                    style={styles.addButton}
                >
                    Adicionar Equipamento
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
    itemRow: {
        marginBottom: 16,
    },
    itemMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dropdownContainer: {
        flex: 3,
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
    quantidadeInput: {
        flex: 1,
        maxWidth: 100,
        backgroundColor: '#FFFFFF',
        height: 56,
    },
    removeButton: {
        padding: 8,
        height: 56,
        justifyContent: 'center',
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

export default Equipment;