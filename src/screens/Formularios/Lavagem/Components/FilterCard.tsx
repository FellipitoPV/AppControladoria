import React, { useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import {
    Text,
    Button,
    Divider,
    Chip,
    Surface,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';
import { customTheme } from '../../../../theme/theme';
import { PLACAS_VEICULOS } from './lavagemTypes';

interface FilterCardProps {
    dataInicio: Date;
    dataFim: Date;
    setDataInicio: (date: Date) => void;
    setDataFim: (date: Date) => void;
    loading: boolean;
    onGerarRelatorio: () => void;
    placasFiltradas: string[];
    setPlacasFiltradas: (placas: string[]) => void;
}

const FilterCard: React.FC<FilterCardProps> = ({
    dataInicio,
    dataFim,
    setDataInicio,
    setDataFim,
    loading,
    onGerarRelatorio,
    placasFiltradas,
    setPlacasFiltradas,
}) => {
    const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
    const [showDatePickerFim, setShowDatePickerFim] = useState(false);
    const [searchText, setSearchText] = useState('');
    const dropdownRef = useRef(null);

    const handleDataInicioChange = (event: any, selectedDate?: Date) => {
        setShowDatePickerInicio(false);
        if (selectedDate) {
            setDataInicio(selectedDate);
        }
    };

    const handleDataFimChange = (event: any, selectedDate?: Date) => {
        setShowDatePickerFim(false);
        if (selectedDate) {
            setDataFim(selectedDate);
        }
    };

    const formatarDadosDropdown = () => {
        // Formatar apenas os veículos
        let todosItens = PLACAS_VEICULOS.map(veiculo => ({
            label: veiculo.value,
            value: veiculo.value,
            tipo: veiculo.tipo,
            icon: 'car'
        }));

        // Adiciona opção customizada se o texto de busca não corresponder a nenhuma placa existente
        if (searchText &&
            !todosItens.some(item =>
                item.label.toLowerCase().includes(searchText.toLowerCase()))) {
            todosItens.push({
                label: `Adicionar "${searchText.toUpperCase()}"`,
                value: searchText.toUpperCase(),
                tipo: 'placa',
                icon: 'plus',
            });
        }

        return todosItens;
    };

    const handleSearchTextChange = (text: string) => {
        setSearchText(text);
    };

    const handleSelectItem = (item: any) => {
        if (item.isCustom) {
            // Adiciona nova placa customizada
            if (!placasFiltradas.includes(searchText.toUpperCase())) {
                setPlacasFiltradas([...placasFiltradas, searchText.toUpperCase()]);
            }
        } else {
            // Adiciona placa existente
            if (!placasFiltradas.includes(item.value)) {
                setPlacasFiltradas([...placasFiltradas, item.value]);
            }
        }
        setSearchText('');
    };

    const removerPlaca = (placa: string) => {
        setPlacasFiltradas(placasFiltradas.filter(p => p !== placa));
    };

    return (
        <Surface style={styles.filterContainer}>
            <View style={styles.header}>
                <Icon
                    name="filter-variant"
                    size={20}
                    color={customTheme.colors.primary}
                />
                <Text variant="titleSmall" style={styles.headerText}>Filtros do Relatório</Text>
            </View>

            <View style={styles.filterRow}>
                <View style={styles.dateGroup}>
                    <Text variant="bodyMedium" style={styles.dateLabel}>
                        <Icon
                            name="calendar-start"
                            size={14}
                            color={customTheme.colors.onSurfaceVariant}
                        /> De:
                    </Text>
                    <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => setShowDatePickerInicio(true)}
                    >
                        <Text style={styles.dateText}>
                            {dataInicio.toLocaleDateString('pt-BR')}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.dateGroup}>
                    <Text variant="bodyMedium" style={styles.dateLabel}>
                        <Icon
                            name="calendar-end"
                            size={14}
                            color={customTheme.colors.onSurfaceVariant}
                        /> Até:
                    </Text>
                    <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => setShowDatePickerFim(true)}
                    >
                        <Text style={styles.dateText}>
                            {dataFim.toLocaleDateString('pt-BR')}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={onGerarRelatorio}
                    disabled={loading}
                    style={[styles.gerarButton, loading && styles.gerarButtonDisabled]}
                >
                    {loading ? (
                        <Icon name="loading" size={20} color={customTheme.colors.onPrimary} />
                    ) : (
                        <>
                            <Icon name="file-search" size={20} color={customTheme.colors.onPrimary} />
                            <Text style={styles.gerarButtonText}>Buscar</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.placasContainer}>
                <Dropdown
                    ref={dropdownRef}
                    style={styles.dropdown}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    inputSearchStyle={styles.inputSearchStyle}
                    iconStyle={styles.iconStyle}
                    data={formatarDadosDropdown()}
                    search
                    maxHeight={300}
                    labelField="label"
                    valueField="value"
                    placeholder="Selecione ou digite uma placa"
                    searchPlaceholder="Digite para buscar ou adicionar..."
                    value={searchText}
                    onChangeText={handleSearchTextChange}
                    onChange={handleSelectItem}
                    renderLeftIcon={() => (
                        <Icon
                            style={styles.dropdownIcon}
                            name="car-multiple"
                            size={20}
                            color={customTheme.colors.primary}
                        />
                    )}
                    renderItem={item => (
                        <View style={[
                            styles.dropdownItem,
                            item.isCustom && styles.dropdownItemCustom
                        ]}>
                            <Icon
                                name={item.isCustom ? 'plus-circle' : 'car'}
                                size={20}
                                color={item.isCustom ? customTheme.colors.primary : customTheme.colors.secondary}
                            />
                            <Text style={[
                                styles.dropdownLabel,
                                item.isCustom && styles.dropdownLabelCustom
                            ]}>
                                {item.label}
                            </Text>
                        </View>
                    )}
                />

                {placasFiltradas.length > 0 && (
                    <View style={styles.chipsContainer}>
                        {placasFiltradas.map((placa) => (
                            <Chip
                                key={placa}
                                onClose={() => removerPlaca(placa)}
                                style={styles.chip}
                                icon="car"
                                mode="flat"
                                selected
                                selectedColor={customTheme.colors.primary}
                            >
                                {placa}
                            </Chip>
                        ))}
                    </View>
                )}
            </View>

            {showDatePickerInicio && (
                <DateTimePicker
                    value={dataInicio}
                    mode="date"
                    display="default"
                    onChange={handleDataInicioChange}
                />
            )}

            {showDatePickerFim && (
                <DateTimePicker
                    value={dataFim}
                    mode="date"
                    display="default"
                    onChange={handleDataFimChange}
                    maximumDate={new Date()} // Isso impede a seleção de datas futuras
                />
            )}

        </Surface>
    );
};

const styles = StyleSheet.create({
    filterContainer: {
        backgroundColor: customTheme.colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    headerText: {
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 8,
    },
    dateGroup: {
        flex: 1,
    },
    dateLabel: {
        color: customTheme.colors.onSurfaceVariant,
        fontSize: 12,
        marginBottom: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 8,
    },
    dateText: {
        color: customTheme.colors.onSurface,
        fontSize: 14,
    },
    gerarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 8,
    },
    gerarButtonDisabled: {
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    gerarButtonText: {
        color: customTheme.colors.onPrimary,
        fontWeight: '500',
    },
    placasContainer: {
        marginTop: 12,
    },
    dropdown: {
        height: 50,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    placeholderStyle: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    selectedTextStyle: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    inputSearchStyle: {
        height: 40,
        fontSize: 14,
        color: customTheme.colors.onSurface,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 4,
    },
    iconStyle: {
        width: 20,
        height: 20,
    },
    dropdownIcon: {
        marginRight: 8,
    },
    dropdownItem: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
    },
    dropdownItemCustom: {
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    dropdownLabel: {
        marginLeft: 8,
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    dropdownLabelCustom: {
        color: customTheme.colors.primary,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    chip: {
        backgroundColor: customTheme.colors.surfaceVariant,
    },
});

export default FilterCard;