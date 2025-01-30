import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Button, Text, Surface } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { customTheme } from '../../theme/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface DateFilterProps {
    onFilterChange: (filter: DateFilterValue | null) => void;
}

interface DateFilterValue {
    startDate: string;
    endDate: string;
}

const DateFilter: React.FC<DateFilterProps> = ({ onFilterChange }) => {
    const [showStartPicker, setShowStartPicker] = useState<boolean>(false);
    const [showEndPicker, setShowEndPicker] = useState<boolean>(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [isFilterActive, setIsFilterActive] = useState<boolean>(false);

    const formatDate = (date: Date | null): string => {
        if (!date) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handleStartDateChange = (event: any, selectedDate?: Date): void => {
        setShowStartPicker(false);
        if (selectedDate) {
            selectedDate.setHours(0, 0, 0, 0);
            setStartDate(selectedDate);
        }
    };

    const handleEndDateChange = (event: any, selectedDate?: Date): void => {
        setShowEndPicker(false);
        if (selectedDate) {
            selectedDate.setHours(23, 59, 59, 999);
            setEndDate(selectedDate);
        }
    };

    const applyFilter = (): void => {
        if (startDate && endDate) {
            onFilterChange({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });
            setIsFilterActive(true);
        }
    };

    const clearFilter = (): void => {
        setStartDate(null);
        setEndDate(null);
        onFilterChange(null);
        setIsFilterActive(false);
    };

    return (
        <Surface style={styles.container}>
            {/* Linha de datas */}
            <View style={styles.datesContainer}>
                <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartPicker(true)}
                >
                    <Icon name="calendar" size={18} color={customTheme.colors.primary} />
                    <Text style={styles.dateText}>
                        {startDate ? formatDate(startDate) : 'Data Inicial'}
                    </Text>
                </TouchableOpacity>

                <Icon name="arrow-right" size={16} color={customTheme.colors.primary} />

                <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndPicker(true)}
                >
                    <Icon name="calendar" size={18} color={customTheme.colors.primary} />
                    <Text style={styles.dateText}>
                        {endDate ? formatDate(endDate) : 'Data Final'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Linha de botões */}
            <View style={styles.buttonsContainer}>
                <Button
                    mode="contained"
                    onPress={applyFilter}
                    disabled={!startDate || !endDate}
                    style={styles.filterButton}
                    contentStyle={styles.buttonContent}
                >
                    <Text style={{ color: customTheme.colors.onPrimary }}>
                        Aplicar Filtro
                    </Text>
                </Button>
                {isFilterActive && (
                    <Button
                        mode="outlined"
                        onPress={clearFilter}
                        style={styles.clearButton}
                        contentStyle={styles.buttonContent}
                    >
                        <Text style={{ color: customTheme.colors.onSurface }}>Limpar</Text>
                    </Button>
                )}
            </View>

            {showStartPicker && (
                <DateTimePicker
                    value={startDate || new Date()}
                    mode="date"
                    onChange={handleStartDateChange}
                    maximumDate={endDate || new Date()}
                />
            )}

            {showEndPicker && (
                <DateTimePicker
                    value={endDate || new Date()}
                    mode="date"
                    onChange={handleEndDateChange}
                    minimumDate={startDate || undefined}
                    maximumDate={new Date()}
                />
            )}
        </Surface>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 8,
        margin: 8,
        borderRadius: 12,
        elevation: 2,
        backgroundColor: customTheme.colors.surface,
    },
    datesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    dateButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    dateText: {
        marginLeft: 6,
        fontSize: 13,
        color: customTheme.colors.onSurfaceVariant,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    filterButton: {
        flex: 1,
        borderRadius: 8,
        backgroundColor: customTheme.colors.primary,
    },
    clearButton: {
        flex: 1,
        borderRadius: 8,
        borderColor: customTheme.colors.secondary,
    },
    buttonContent: {
        height: 40,
        paddingVertical: 0,
    },
});

export default DateFilter;