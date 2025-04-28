import { LavagemInterface, PLACAS_VEICULOS } from './lavagemTypes';
import {
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { Surface, Text } from 'react-native-paper';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Timestamp } from 'firebase/firestore';
import { customTheme } from '../../../../theme/theme';

interface RelatorioContentProps {
    lavagens: LavagemInterface[];
    onGerarExcel: () => Promise<void>;  // Nova prop
    loading: boolean;                    // Nova prop
}

const RelatorioContent: React.FC<RelatorioContentProps> = ({
    lavagens,
    onGerarExcel,
    loading
}) => {
    const totalLavagens = lavagens.length;
    const totalPorTipo = lavagens.reduce((acc, lavagem) => {
        acc[lavagem.tipoLavagem] = (acc[lavagem.tipoLavagem] || 0) + 1;
        return acc;
    }, {} as { [key: string]: number });

    const isValidPlate = (placa: string) => {
        return PLACAS_VEICULOS.some(item => item.value === placa);
    };

    // Helper function to get vehicle display info
    const getVehicleDisplayInfo = (veiculo: {
        placa: string;
        tipo: string;
        numeroEquipamento?: string;
    }) => {
        if (!veiculo) return null;

        const isEquipment = veiculo.tipo === 'equipamento';
        const isValidVehicle = isValidPlate(veiculo.placa);

        // Define icon and label based on conditions
        let icon = 'help-circle-outline'; // Default icon for unknown/other
        let label = 'Outros';

        if (isEquipment) {
            icon = 'wrench';
            label = 'Equipamento';
        } else if (isValidVehicle) {
            icon = 'truck';
            label = 'Veículo';
        }

        return {
            icon,
            label,
            displayValue: veiculo.placa + (veiculo.numeroEquipamento ? ` (#${veiculo.numeroEquipamento})` : '')
        };
    };

    return (
        <View style={styles.container}>
            <Surface style={styles.headerContainer} elevation={1}>
                <View style={styles.titleContainer}>
                    <Icon
                        name="file-document-outline"
                        size={24}
                        color={customTheme.colors.primary}
                    />
                    <Text variant="titleMedium" style={styles.relatorioTitle}>
                        Resumo do Relatório
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={onGerarExcel}
                    disabled={loading}
                    style={styles.excelButton}
                >
                    <Icon
                        name="microsoft-excel"
                        size={20}
                        color={customTheme.colors.onPrimary}
                        style={styles.excelIcon}
                    />
                    <Text style={styles.excelButtonText}>
                        Excel
                    </Text>
                </TouchableOpacity>
            </Surface>

            <View style={styles.statsContainer}>
                <Surface style={styles.statItem} elevation={1}>
                    <Icon
                        name="car-wash"
                        size={24}
                        color={customTheme.colors.primary}
                    />
                    <Text style={styles.statLabel}>Total de Lavagens</Text>
                    <Text style={styles.statValue}>{totalLavagens}</Text>
                </Surface>

                {Object.entries(totalPorTipo).map(([tipo, quantidade]) => (
                    <Surface key={tipo} style={styles.statItem} elevation={1}>
                        <Icon
                            name="hand-wash"
                            size={24}
                            color={customTheme.colors.secondary}
                        />
                        <Text style={styles.statLabel}>{tipo}</Text>
                        <Text style={styles.statValue}>{quantidade}</Text>
                    </Surface>
                ))}
            </View>

            <ScrollView style={styles.listaContainer}>
                {lavagens.map(lavagem => (
                    <Surface key={lavagem.id} style={styles.lavagemItem} elevation={1}>
                        <View style={styles.lavagemHeader}>
                            <View style={styles.headerTopRow}>
                                <View style={styles.placaContainer}>
                                    {(() => {
                                        const vehicleInfo = getVehicleDisplayInfo({
                                            ...lavagem.veiculo,
                                            numeroEquipamento: lavagem.veiculo.numeroEquipamento ?? undefined,
                                        });
                                        return (
                                            <>
                                                <Icon
                                                    name={vehicleInfo?.icon || 'help-circle-outline'}
                                                    size={20}
                                                    color={customTheme.colors.primary}
                                                    style={styles.placaIcon}
                                                />
                                                <View style={styles.placaTextContainer}>
                                                    <Text variant="titleMedium" style={styles.placaText}>
                                                        {vehicleInfo?.displayValue || lavagem.veiculo.placa}
                                                    </Text>
                                                    <Text style={styles.tipoVeiculoText}>
                                                        {vehicleInfo?.label}
                                                    </Text>
                                                </View>
                                            </>
                                        );
                                    })()}
                                </View>
                            </View>
                            <View style={styles.dataContainer}>
                                <Icon
                                    name="calendar-clock"
                                    size={16}
                                    color={customTheme.colors.onSurfaceVariant}
                                    style={styles.dataIcon}
                                />
                                <Text style={styles.dataText}>
                                    {lavagem.data && lavagem.data instanceof Timestamp ? lavagem.data.toDate().toLocaleDateString() : lavagem.data} - {lavagem.hora}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.lavagemDetails}>
                            <View style={styles.detailRow}>
                                <Icon
                                    name="water"
                                    size={16}
                                    color={customTheme.colors.secondary}
                                    style={styles.detailIcon}
                                />
                                <Text style={styles.detailText}>
                                    {lavagem.tipoLavagem}
                                </Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Icon
                                    name="account"
                                    size={16}
                                    color={customTheme.colors.secondary}
                                    style={styles.detailIcon}
                                />
                                <Text style={styles.detailText}>
                                    {lavagem.responsavel}
                                </Text>
                            </View>
                        </View>
                    </Surface>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    lavagemHeader: {
        marginBottom: 8,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    placaContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
    },
    placaTextContainer: {
        flex: 1,
    },
    placaText: {
        color: customTheme.colors.onSurface,
        flexShrink: 1,
    },
    dataContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4, // Adiciona espaço entre a placa e a data
    },
    tipoVeiculoText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: -2,
    },
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 8,
        backgroundColor: customTheme.colors.surface,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    relatorioTitle: {
        color: customTheme.colors.primary,
    },
    excelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    excelIcon: {
        marginRight: 4,
    },
    excelButtonText: {
        color: customTheme.colors.onPrimary,
        fontWeight: '500',
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-evenly',
        gap: 8,
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    statItem: {
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        padding: 12,
        minWidth: '29%',
    },
    statLabel: {
        marginTop: 4,
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center',
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: customTheme.colors.primary,
    },
    listaContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    lavagemItem: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    placaIcon: {
        marginRight: 4,
    },
    dataIcon: {
        marginRight: 4,
    },
    dataText: {
        color: customTheme.colors.onSurfaceVariant,
        fontSize: 12,
    },
    lavagemDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailIcon: {
        marginRight: 4,
    },
    detailText: {
        color: customTheme.colors.onSurfaceVariant,
        fontSize: 13,
    },
});

export default RelatorioContent;