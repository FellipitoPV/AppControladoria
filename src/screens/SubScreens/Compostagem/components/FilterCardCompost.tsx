import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Modal
} from 'react-native';
import {
    Text,
    Card,
    Button,
    Surface,
    Divider,
    Chip
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { customTheme } from '../../../../theme/theme';

interface FilterCardCompostProps {
    dataInicio: Date;
    dataFim: Date;
    setDataInicio: (date: Date) => void;
    setDataFim: (date: Date) => void;
    loading: boolean;
    onGerarRelatorio: () => void;
    leirasDisponiveis: string[];
    leirasFiltradas: string[];
    setLeirasFiltradas: (leiras: string[]) => void;
}

const FilterCardCompost: React.FC<FilterCardCompostProps> = ({
    dataInicio,
    dataFim,
    setDataInicio,
    setDataFim,
    loading,
    onGerarRelatorio,
    leirasDisponiveis,
    leirasFiltradas,
    setLeirasFiltradas,
}) => {
    const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
    const [showDatePickerFim, setShowDatePickerFim] = useState(false);
    const [showLeirasModal, setShowLeirasModal] = useState(false);

    // Formatar data em DD/MM/AAAA
    const formatarData = (data: Date) => {
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        return `${dia}/${mes}/${ano}`;
    };

    // Alterar a data de início
    const onChangeDataInicio = (event: any, selectedDate?: Date) => {
        setShowDatePickerInicio(Platform.OS === 'ios');
        if (selectedDate) {
            setDataInicio(selectedDate);
        }
    };

    // Alterar a data de fim
    const onChangeDataFim = (event: any, selectedDate?: Date) => {
        setShowDatePickerFim(Platform.OS === 'ios');
        if (selectedDate) {
            setDataFim(selectedDate);
        }
    };

    // Alternar seleção de leira no filtro
    const toggleLeira = (leira: string) => {
        if (leirasFiltradas.includes(leira)) {
            setLeirasFiltradas(leirasFiltradas.filter(p => p !== leira));
        } else {
            setLeirasFiltradas([...leirasFiltradas, leira]);
        }
    };

    // Limpar todos os filtros de leira
    const limparFiltroLeiras = () => {
        setLeirasFiltradas([]);
    };

    return (
        <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
                {/* Layout compacto com elementos lado a lado */}
                <View style={styles.horizontalLayout}>
                    {/* Seleção de Período - lado esquerdo */}
                    <View style={styles.periodSection}>
                        <View style={styles.headerWithIcon}>
                            <Icon name="calendar-range" size={16} color={customTheme.colors.primary} />
                            <Text style={styles.sectionTitle}>Período</Text>
                        </View>

                        <View style={styles.datesContainer}>
                            {/* Data Inicial */}
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setShowDatePickerInicio(true)}
                                disabled={loading}
                            >
                                <Icon name="calendar-start" size={14} color={customTheme.colors.primary} />
                                <View style={styles.dateTextContainer}>
                                    <Text style={styles.dateLabel}>Início</Text>
                                    <Text style={styles.dateValue}>{formatarData(dataInicio)}</Text>
                                </View>
                            </TouchableOpacity>

                            {/* Data Final */}
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setShowDatePickerFim(true)}
                                disabled={loading}
                            >
                                <Icon name="calendar-end" size={14} color={customTheme.colors.primary} />
                                <View style={styles.dateTextContainer}>
                                    <Text style={styles.dateLabel}>Fim</Text>
                                    <Text style={styles.dateValue}>{formatarData(dataFim)}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Separador vertical */}
                    <View style={styles.verticalDivider} />

                    {/* Filtro de Leiras - lado direito */}
                    <View style={styles.leirasSection}>
                        <View style={styles.headerWithIcon}>
                            <Icon name="filter-variant" size={16} color={customTheme.colors.primary} />
                            <Text style={styles.sectionTitle}>Filtrar por Leira</Text>
                        </View>

                        <View style={styles.leirasFilterContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.filterButton,
                                    { backgroundColor: customTheme.colors.primaryContainer }
                                ]}
                                onPress={() => setShowLeirasModal(true)}
                                disabled={loading}
                            >
                                <Icon name="silo" size={14} color={customTheme.colors.primary} />
                                <Text style={styles.filterButtonText} numberOfLines={1}>
                                    {leirasFiltradas.length > 0
                                        ? `${leirasFiltradas.length} leira(s)`
                                        : 'Selecionar Leiras'}
                                </Text>
                            </TouchableOpacity>

                            {leirasFiltradas.length > 0 && (
                                <TouchableOpacity
                                    style={styles.clearFilterButton}
                                    onPress={limparFiltroLeiras}
                                    disabled={loading}
                                >
                                    <Icon name="close-circle" size={18} color={customTheme.colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>

                {/* Pickers de data */}
                {showDatePickerInicio && (
                    <DateTimePicker
                        value={dataInicio}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onChangeDataInicio}
                    />
                )}

                {showDatePickerFim && (
                    <DateTimePicker
                        value={dataFim}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onChangeDataFim}
                    />
                )}

                {/* Chips das leiras selecionadas - somente se tiver alguma leira selecionada */}
                {leirasFiltradas.length > 0 && (
                    <View style={styles.chipsContainer}>
                        {leirasFiltradas.map(leira => (
                            <Chip
                                key={leira}
                                mode="outlined"
                                onClose={() => toggleLeira(leira)}
                                style={styles.chip}
                                compact
                            >
                                Leira {leira}
                            </Chip>
                        ))}
                    </View>
                )}

                {/* Botão para gerar relatório */}
                <Button
                    mode="contained"
                    onPress={onGerarRelatorio}
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                    icon="file-search"
                    labelStyle={styles.buttonLabel}
                    compact
                >
                    Buscar Compostagens
                </Button>
            </Card.Content>

            {/* Modal de seleção de leiras */}
            <Modal
                visible={showLeirasModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowLeirasModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <Surface style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Selecionar Leiras</Text>
                            <TouchableOpacity
                                onPress={() => setShowLeirasModal(false)}
                                style={styles.closeButton}
                            >
                                <Icon name="close" size={24} color={customTheme.colors.error} />
                            </TouchableOpacity>
                        </View>

                        <Divider />

                        <View style={styles.modalBody}>
                            {leirasDisponiveis.length > 0 ? (
                                <View style={styles.leirasGrid}>
                                    {leirasDisponiveis.map(leira => (
                                        <TouchableOpacity
                                            key={leira}
                                            style={[
                                                styles.leiraItem,
                                                leirasFiltradas.includes(leira) && styles.leiraItemSelected
                                            ]}
                                            onPress={() => toggleLeira(leira)}
                                        >
                                            <Icon
                                                name={leirasFiltradas.includes(leira) ? "checkbox-marked" : "checkbox-blank-outline"}
                                                size={20}
                                                color={leirasFiltradas.includes(leira) ? customTheme.colors.primary : customTheme.colors.onSurfaceVariant}
                                            />
                                            <Text
                                                style={[
                                                    styles.leiraItemText,
                                                    leirasFiltradas.includes(leira) && styles.leiraItemTextSelected
                                                ]}
                                            >
                                                Leira {leira}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <Text style={styles.emptyText}>Nenhuma leira disponível</Text>
                            )}
                        </View>

                        <Divider />

                        <View style={styles.modalFooter}>
                            <Button
                                mode="text"
                                onPress={limparFiltroLeiras}
                                style={styles.modalButton}
                            >
                                Limpar
                            </Button>
                            <Button
                                mode="contained"
                                onPress={() => setShowLeirasModal(false)}
                                style={styles.modalButton}
                            >
                                Confirmar
                            </Button>
                        </View>
                    </Surface>
                </View>
            </Modal>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginVertical: 8, // Reduzido para ocupar menos espaço
        elevation: 2,
    },
    cardContent: {
        padding: 12, // Reduzido para ocupar menos espaço
    },
    horizontalLayout: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    periodSection: {
        flex: 1,
        marginRight: 8,
    },
    leirasSection: {
        flex: 1,
        marginLeft: 8,
    },
    verticalDivider: {
        width: 1,
        backgroundColor: customTheme.colors.outlineVariant,
    },
    headerWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 4,
        color: customTheme.colors.primary,
    },
    datesContainer: {
        gap: 6, // Espaçamento entre os botões de data
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 8, // Reduzido para ocupar menos espaço
        borderRadius: 8,
    },
    dateTextContainer: {
        marginLeft: 6,
        flex: 1,
    },
    dateLabel: {
        fontSize: 11, // Reduzido para ocupar menos espaço
        color: customTheme.colors.onSurfaceVariant,
    },
    dateValue: {
        fontSize: 13, // Reduzido para ocupar menos espaço
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    leirasFilterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8, // Reduzido para ocupar menos espaço
        borderRadius: 8,
        flex: 1,
    },
    filterButtonText: {
        marginLeft: 6,
        fontSize: 13,
        color: customTheme.colors.primary,
    },
    clearFilterButton: {
        padding: 4,
        marginLeft: 4,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        marginBottom: 8,
    },
    chip: {
        margin: 3,
        height: 28, // Altura reduzida
    },
    button: {
        marginTop: 8,
        height: 36, // Altura reduzida
    },
    buttonLabel: {
        fontSize: 13, // Tamanho da fonte reduzido
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        width: '90%',
        maxWidth: 400,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: customTheme.colors.onSurface,
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        padding: 16,
        maxHeight: 300,
    },
    leirasGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    leiraItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        margin: 4,
        width: '45%',
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    leiraItemSelected: {
        backgroundColor: customTheme.colors.primaryContainer,
    },
    leiraItemText: {
        marginLeft: 8,
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    leiraItemTextSelected: {
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    emptyText: {
        textAlign: 'center',
        color: customTheme.colors.onSurfaceVariant,
        padding: 16,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
    },
    modalButton: {
        minWidth: 90,
    },
});

export default FilterCardCompost;