import React, { useState } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import {
    Text,
    Surface,
    Chip,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../../../theme/theme';
import FilterModal from './FilterModal';

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
    const [modalVisible, setModalVisible] = useState(false);

    return (
        <>
            <Surface style={styles.filterContainer}>
                <TouchableOpacity
                    style={styles.filterHeader}
                    onPress={() => setModalVisible(true)}
                >
                    <View style={styles.filterHeaderContent}>
                        <View style={styles.iconContainer}>
                            <Icon
                                name="filter-variant"
                                size={20}
                                color={customTheme.colors.onPrimary}
                            />
                        </View>
                        <View style={styles.dateInfo}>
                            <Text style={styles.dateLabel}>Período</Text>
                            <Text style={styles.dateText}>
                                {dataInicio.toLocaleDateString('pt-BR')} - {dataFim.toLocaleDateString('pt-BR')}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.chevronContainer}>
                        <Icon
                            name="chevron-right"
                            size={24}
                            color={customTheme.colors.onPrimary}
                        />
                    </View>
                </TouchableOpacity>

                {placasFiltradas.length > 0 && (
                    <View style={styles.chipsContainer}>
                        {placasFiltradas.map((placa) => (
                            <Chip
                                key={placa}
                                style={styles.chip}
                                textStyle={styles.chipText}
                                icon="car"
                                mode="outlined"
                            >
                                {placa}
                            </Chip>
                        ))}
                    </View>
                )}
            </Surface>

            <FilterModal
                visible={modalVisible}
                onDismiss={() => setModalVisible(false)}
                dataInicio={dataInicio}
                dataFim={dataFim}
                setDataInicio={setDataInicio}
                setDataFim={setDataFim}
                loading={loading}
                onGerarRelatorio={() => {
                    onGerarRelatorio();
                    setModalVisible(false);
                }}
                placasFiltradas={placasFiltradas}
                setPlacasFiltradas={setPlacasFiltradas}
            />
        </>
    );
};

const styles = StyleSheet.create({
    filterContainer: {
        backgroundColor: customTheme.colors.surface,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 16,
        elevation: 3,
        borderWidth: 1,
        borderColor: customTheme.colors.outlineVariant,
    },
    filterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    filterHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        backgroundColor: customTheme.colors.primary,
        borderRadius: 10,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateInfo: {
        flex: 1,
    },
    dateLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 4,
    },
    dateText: {
        fontSize: 14,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    chevronContainer: {
        backgroundColor: `${customTheme.colors.primary}`,
        borderRadius: 20,
        right: 20,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    chip: {
        backgroundColor: customTheme.colors.surfaceVariant,
        borderColor: customTheme.colors.outline,
    },
    chipText: {
        color: customTheme.colors.onSurface,
    }
});

export default FilterCard;