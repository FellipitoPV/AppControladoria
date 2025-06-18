import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    TouchableOpacity,
    Modal,
    Animated,
    Dimensions,
    StyleSheet,
} from 'react-native';
import {
    Surface,
    Text,
    Button,
    Chip,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';
import { customTheme } from '../../../../../theme/theme';
import { PLACAS_VEICULOS } from '../lavagemTypes';

interface FilterModalProps {
    visible: boolean;
    onDismiss: () => void;
    dataInicio: Date;
    dataFim: Date;
    setDataInicio: (date: Date) => void;
    setDataFim: (date: Date) => void;
    loading: boolean;
    onGerarRelatorio: () => void;
    placasFiltradas: string[];
    setPlacasFiltradas: (placas: string[]) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
    visible,
    onDismiss,
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

    // Animação de slide
    const screenHeight = Dimensions.get('screen').height;
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;

    useEffect(() => {
        if (visible) {
            // Animar entrada
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            }).start();
        } else {
            // Animar saída
            Animated.timing(slideAnim, {
                toValue: screenHeight,
                duration: 300,
                useNativeDriver: true
            }).start();
        }
    }, [visible]);

    const handleDismiss = () => {
        Animated.spring(slideAnim, {
            toValue: 600,
            bounciness: 2,
            speed: 20,
            useNativeDriver: true
        }).start();

        // Definir um timeout um pouco menor que a duração esperada da animação
        setTimeout(() => {
            onDismiss();
        }, 50); // 300ms é geralmente suficiente para a animação com esses parâmetros
    };

    const formatarDadosDropdown = () => {
        let todosItens = PLACAS_VEICULOS.map(veiculo => ({
            label: veiculo.value,
            value: veiculo.value,
            tipo: veiculo.tipo,
            icon: 'car'
        }));

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

    const handleSelectItem = (item: any) => {
        if (item.isCustom) {
            if (!placasFiltradas.includes(searchText.toUpperCase())) {
                setPlacasFiltradas([...placasFiltradas, searchText.toUpperCase()]);
            }
        } else {
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
        <Modal
            visible={visible}
            transparent
            animationType="fade"
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
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderContent}>
                                <Icon
                                    name="filter-variant"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <Text variant="titleLarge">Filtros do Relatório</Text>
                            </View>

                            <TouchableOpacity
                                onPress={handleDismiss}
                                style={styles.closeButton}
                            >
                                <Icon
                                    name="close"
                                    size={24}
                                    color={customTheme.colors.onSurfaceVariant}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Datas */}
                        <View style={styles.dateContainer}>
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
                        </View>

                        {/* Dropdown de Placas */}
                        <View style={styles.placasContainer}>
                            <Dropdown
                                style={styles.dropdown}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                inputSearchStyle={styles.inputSearchStyle}
                                data={formatarDadosDropdown()}
                                search
                                dropdownPosition='top'
                                maxHeight={300}
                                labelField="label"
                                valueField="value"
                                placeholder="Selecione ou digite uma placa"
                                searchPlaceholder="Digite para buscar ou adicionar..."
                                value={searchText}
                                onChangeText={(text) => setSearchText(text)}
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
                                    <View style={styles.dropdownItemContainer}>
                                        <Icon
                                            name={item.isCustom ? 'plus-circle' : 'car'}
                                            size={20}
                                            color={item.isCustom ? customTheme.colors.primary : customTheme.colors.secondary}
                                        />
                                        <Text style={styles.dropdownItemText}>
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

                        {/* Botões de Ação */}
                        <View style={styles.actionButtonsContainer}>
                            <Button
                                mode="outlined"
                                onPress={handleDismiss}
                                style={styles.actionButton}
                            >
                                Cancelar
                            </Button>
                            <Button
                                mode="contained"
                                onPress={onGerarRelatorio}
                                loading={loading}
                                style={styles.actionButton}
                                icon="file-search"
                            >
                                Buscar
                            </Button>
                        </View>
                    </Surface>
                </Animated.View>
            </View>

            {showDatePickerInicio && (
                <DateTimePicker
                    value={dataInicio}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowDatePickerInicio(false);
                        if (selectedDate) {
                            setDataInicio(selectedDate);
                        }
                    }}
                />
            )}

            {showDatePickerFim && (
                <DateTimePicker
                    value={dataFim}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowDatePickerFim(false);
                        if (selectedDate) {
                            setDataFim(selectedDate);
                        }
                    }}
                    maximumDate={new Date()}
                />
            )}
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
    },
    modalContent: {
        backgroundColor: customTheme.colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
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
        borderRadius: 20,
        backgroundColor: `${customTheme.colors.onSurfaceVariant}10`,
    },
    dateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 16,
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
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
    },
    dateText: {
        color: customTheme.colors.onSurface,
        fontSize: 14,
    },
    placasContainer: {
        marginBottom: 20,
    },
    dropdown: {
        height: 50,
        backgroundColor: customTheme.colors.surface,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
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
    dropdownIcon: {
        marginRight: 8,
    },
    dropdownItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
    },
    dropdownItemText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    chip: {
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    actionButton: {
        flex: 1,
    }
});

export default FilterModal;