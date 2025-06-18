import {
    ActivityIndicator,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Container, ProgramacaoEquipamento } from './types/logisticTypes';
import { Dialog, Portal, Surface, Text } from 'react-native-paper';
import React, { useEffect, useState } from 'react';
import { getDatabase, onValue, ref, remove } from 'firebase/database';

import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { NavigationProp } from '@react-navigation/native';
import { customTheme } from '../../../theme/theme';
import { dbRealTime } from '../../../../firebase';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import { useUser } from '../../../contexts/userContext';

const HistoricoOperacoes = ({ navigation }: { navigation: NavigationProp<any> }) => {
    const { userInfo } = useUser();
    const [operacoes, setOperacoes] = useState<ProgramacaoEquipamento[]>([]);
    const [loading, setLoading] = useState(true);

    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [selectedOperacao, setSelectedOperacao] = useState<ProgramacaoEquipamento | null>(null);

    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [filteredOperacoes, setFilteredOperacoes] = useState<ProgramacaoEquipamento[]>([]);

    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    useEffect(() => {
        setFilteredOperacoes(operacoes);
    }, [operacoes]);


    useEffect(() => {
        const buscarHistorico = async () => {
            try {
                // Busca todos os registros do histórico
                const snapshot = await new Promise((resolve, reject) => {
                    onValue(ref(dbRealTime(), 'historico'), (snap) => resolve(snap), reject);
                });

                const data = (snapshot as any)?.val();

                if (data) {
                    const historicoArray = Object.entries(data).map(([key, value]: [string, any]) => ({
                        firebaseKey: key,
                        ...value
                    }));

                    // Ordena por data de conclusão, mais recente primeiro
                    const historicoOrdenado = historicoArray.sort((a, b) => {
                        return new Date(b.dataConclusao).getTime() - new Date(a.dataConclusao).getTime();
                    });

                    setOperacoes(historicoOrdenado);
                } else {
                    setOperacoes([]);
                }
            } catch (error) {
                console.error('Erro ao buscar histórico:', error);
            } finally {
                setLoading(false);
            }
        };

        buscarHistorico();
    }, []);

    // Função para deletar do histórico
    const handleDelete = async () => {
        if (!selectedOperacao) return;

        try {
            await remove(ref(dbRealTime(), `historico/${selectedOperacao.firebaseKey}`));

            // Atualiza a lista local
            setOperacoes(prevOperacoes =>
                prevOperacoes.filter(op => op.firebaseKey !== selectedOperacao.firebaseKey)
            );

            showGlobalToast('success', 'Sucesso', 'Registro removido com sucesso!', 3000);
        } catch (error) {
            console.error('Erro ao excluir registro:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível excluir o registro', 3000);
        } finally {
            setDeleteDialogVisible(false);
            setSelectedOperacao(null);
        }
    };

    // Funções para manipular as mudanças de data
    const onStartDateChange = (event: any, selectedDate?: Date) => {
        setShowStartDatePicker(false);
        if (selectedDate) {
            setStartDate(selectedDate);
            // Se a data final já estiver selecionada e for menor que a inicial
            if (endDate && selectedDate > endDate) {
                setEndDate(selectedDate);
            }
        }
    };

    const onEndDateChange = (event: any, selectedDate?: Date) => {
        setShowEndDatePicker(false);
        if (selectedDate) {
            // Garantir que a data final não seja menor que a inicial
            if (startDate && selectedDate < startDate) {
                showGlobalToast(
                    'info',
                    'Atenção',
                    'A data final não pode ser menor que a data inicial',
                    3000
                );
                return;
            }
            setEndDate(selectedDate);
        }
    };

    const formatarTipoContainer = (container: Container): string => {
        let localTipo = container.tipo;

        if (container.tipo === "cacamba") {
            localTipo = "Caçamba";
        }

        if (container.residuo && container.capacidade) {
            return `${localTipo} ${container.capacidade} - ${container.residuo}`;
        }
        else if (container.capacidade) {
            return `${localTipo} ${container.capacidade}`;
        }

        return localTipo;
    };

    const abrirGoogleMaps = (cliente: string, endereco: string) => {
        const enderecoFormatado = endereco.replace(/\s/g, '+');
        const url = Platform.select({
            ios: `maps://0,0?q=${cliente}${enderecoFormatado}`,
            android: `geo:0,0?q=${cliente}${enderecoFormatado}`,
            default: `https://www.google.com/maps/search/?api=1&query=${cliente}${enderecoFormatado}`
        });

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${cliente}${enderecoFormatado}`);
            }
        });
    };

    const renderOperacao = (operacao: ProgramacaoEquipamento) => {
        return (
            <Surface key={operacao.id} style={styles.operacaoCard}>
                {/* Header com Data de Conclusão */}
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <MaterialIcons name="check-circle" size={24} color={customTheme.colors.primary} />
                        <Text style={styles.dataText}>
                            Concluído em: {operacao.dataConclusao ? new Date(operacao.dataConclusao).toLocaleDateString('pt-BR') : 'Data não disponível'}
                        </Text>
                    </View>

                    {userInfo?.cargo === "Administrador" && (
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => {
                                setSelectedOperacao(operacao);
                                setDeleteDialogVisible(true);
                            }}
                        >
                            <MaterialIcons
                                name="delete"
                                size={20}
                                color={customTheme.colors.error}
                            />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.cardContent}>
                    {/* Linha 1: Cliente e Endereço */}
                    <View style={styles.infoRow}>
                        <View style={styles.clienteContainer}>
                            <View style={styles.iconLabel}>
                                <MaterialIcons name="business" size={20} color={customTheme.colors.primary} />
                                <Text style={styles.labelText}>Cliente:</Text>
                            </View>
                            <Text style={styles.clienteText}>{operacao.cliente}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.enderecoContainer}
                            onPress={() => abrirGoogleMaps(operacao.cliente, operacao.endereco)}
                        >
                            <View style={styles.iconLabel}>
                                <MaterialIcons name="location-on" size={20} color={customTheme.colors.primary} />
                                <Text style={styles.labelText}>Endereço:</Text>
                            </View>
                            <View style={styles.enderecoWrapper}>
                                <Text style={styles.enderecoText} >
                                    {operacao.endereco}
                                </Text>
                                <MaterialIcons name="map" size={16} color={customTheme.colors.primary} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Equipamentos e Containers */}
                    <View style={styles.itemsRow}>
                        {operacao.equipamentos.length > 0 && (
                            <View style={styles.itemsSection}>
                                <View style={styles.iconLabel}>
                                    <MaterialIcons name="local-shipping" size={20} color={customTheme.colors.primary} />
                                    <Text style={styles.labelText}>Equipamentos:</Text>
                                </View>
                                <View style={styles.itemsList}>
                                    {operacao.equipamentos.map((equip, index) => (
                                        <View key={index} style={styles.itemChip}>
                                            <Text style={styles.itemText}>
                                                {equip.tipo} ({equip.quantidade}x)
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {operacao.containers?.length > 0 && (
                            <View style={styles.itemsSection}>
                                <View style={styles.iconLabel}>
                                    <MaterialIcons name="inventory" size={20} color={customTheme.colors.primary} />
                                    <Text style={styles.labelText}>Containers:</Text>
                                </View>
                                <View style={styles.itemsList}>
                                    {operacao.containers.map((container, index) => (
                                        <View key={index} style={styles.itemChip}>
                                            <Text style={styles.itemText}>
                                                {formatarTipoContainer(container)} ({container.quantidade}x)
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Informações dos Responsáveis */}
                    <View style={styles.responsaveisContainer}>
                        <View style={styles.responsaveisHeader}>
                            <MaterialIcons name="people" size={20} color={customTheme.colors.primary} />
                            <Text style={styles.labelText}>Responsáveis:</Text>
                        </View>

                        <View style={styles.responsaveisList}>
                            <View style={styles.responsavelItem}>
                                <MaterialIcons name="engineering" size={16} color={customTheme.colors.secondary} />
                                <Text style={styles.responsavelLabel}>Operação:</Text>
                                <Text style={styles.responsavelNome}>{operacao.responsavelOperacao?.nome || 'Não definido'}</Text>
                            </View>

                            <View style={styles.responsavelItem}>
                                <MaterialIcons name="local-shipping" size={16} color={customTheme.colors.secondary} />
                                <Text style={styles.responsavelLabel}>Carregamento:</Text>
                                <Text style={styles.responsavelNome}>{operacao.responsavelCarregamento?.nome || 'Não definido'}</Text>
                            </View>

                            <View style={styles.responsavelItem}>
                                <MaterialIcons name="admin-panel-settings" size={16} color={customTheme.colors.secondary} />
                                <Text style={styles.responsavelLabel}>Logística:</Text>
                                <Text style={styles.responsavelNome}>{operacao.createdBy || 'Não definido'}</Text>
                            </View>
                        </View>
                    </View>

                </View>
            </Surface>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={customTheme.colors.primary} />
                <Text style={styles.loadingText}>Carregando histórico...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <MaterialIcons name="history" size={32} color={customTheme.colors.primary} />
                    <Text variant="headlineMedium" style={styles.headerTitle}>
                        Histórico de Operações
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <MaterialIcons
                        name="filter-list"
                        size={24}
                        color={
                            startDate || endDate
                                ? customTheme.colors.primary
                                : customTheme.colors.onSurfaceVariant
                        }
                    />
                    {(startDate || endDate) && (
                        <View style={styles.filterActiveDot} />
                    )}
                </TouchableOpacity>
            </View>


            <ScrollView style={styles.content}>
                {filteredOperacoes.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="history" size={48} color={customTheme.colors.onSurfaceVariant} />
                        <Text style={styles.emptyText}>
                            {startDate || endDate
                                ? 'Nenhuma operação encontrada no período selecionado'
                                : 'Nenhuma operação no histórico'
                            }
                        </Text>
                    </View>
                ) : (
                    filteredOperacoes.map(operacao => renderOperacao(operacao))
                )}
                <Text> </Text>
            </ScrollView>

            {/* Dialog de exclusão */}
            <Portal>
                <Dialog
                    visible={deleteDialogVisible}
                    onDismiss={() => {
                        setDeleteDialogVisible(false);
                        setSelectedOperacao(null);
                    }}
                    style={styles.deleteDialog}
                >
                    <Dialog.Title>Confirmar Exclusão</Dialog.Title>
                    <Dialog.Content>
                        <View style={styles.deleteDialogContent}>
                            <Text style={styles.deleteWarningText}>
                                Tem certeza que deseja excluir este registro do histórico?
                            </Text>

                            <View style={styles.deleteInfoContainer}>
                                <View style={styles.deleteInfoRow}>
                                    <Text style={styles.deleteInfoLabel}>Cliente:</Text>
                                    <Text style={styles.deleteInfoValue}>{selectedOperacao?.cliente}</Text>
                                </View>

                                <View style={styles.deleteInfoRow}>
                                    <Text style={styles.deleteInfoLabel}>Criado por:</Text>
                                    <Text style={styles.deleteInfoValue}>{selectedOperacao?.createdBy}</Text>
                                </View>

                                <View style={styles.deleteInfoRow}>
                                    <Text style={styles.deleteInfoLabel}>Concluído por:</Text>
                                    <Text style={styles.deleteInfoValue}>
                                        {selectedOperacao?.responsavelOperacao?.nome}
                                    </Text>
                                </View>

                                <Text style={styles.deleteWarningSubtext}>
                                    Esta ação não pode ser desfeita.
                                </Text>
                            </View>
                        </View>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setDeleteDialogVisible(false);
                                setSelectedOperacao(null);
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.deleteConfirmButton}
                            onPress={handleDelete}
                        >
                            <MaterialIcons name="delete" size={20} color={customTheme.colors.onError} />
                            <Text style={styles.deleteConfirmButtonText}>Excluir</Text>
                        </TouchableOpacity>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Dialog de Filtro */}
            <Portal>
                <Dialog
                    visible={filterModalVisible}
                    onDismiss={() => setFilterModalVisible(false)}
                    style={styles.filterDialog}
                >
                    <Dialog.Title>Filtrar por Período</Dialog.Title>
                    <Dialog.Content>
                        <View style={styles.filterContent}>
                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() => setShowStartDatePicker(true)}
                            >
                                <MaterialIcons name="calendar-today" size={20} color={customTheme.colors.primary} />
                                <Text style={[
                                    styles.dateText,
                                    !startDate && styles.dateTextPlaceholder
                                ]}>
                                    {startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Data inicial'}
                                </Text>
                            </TouchableOpacity>

                            {showStartDatePicker && (
                                <DateTimePicker
                                    value={startDate || new Date()}
                                    mode="date"
                                    onChange={onStartDateChange}
                                    maximumDate={new Date()}
                                />
                            )}

                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() => setShowEndDatePicker(true)}
                            >
                                <MaterialIcons name="calendar-today" size={20} color={customTheme.colors.primary} />
                                <Text style={[
                                    styles.dateText,
                                    !endDate && styles.dateTextPlaceholder
                                ]}>
                                    {endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Data final'}
                                </Text>
                            </TouchableOpacity>

                            {showEndDatePicker && (
                                <DateTimePicker
                                    value={endDate || new Date()}
                                    mode="date"
                                    onChange={onEndDateChange}
                                    minimumDate={startDate || undefined}
                                    maximumDate={new Date()}
                                />
                            )}

                            {(startDate || endDate) && (
                                <TouchableOpacity
                                    style={styles.clearFilterButton}
                                    onPress={() => {
                                        setStartDate(null);
                                        setEndDate(null);
                                        setFilteredOperacoes(operacoes);
                                        setFilterModalVisible(false);
                                    }}
                                >
                                    <MaterialIcons name="clear" size={20} color={customTheme.colors.error} />
                                    <Text style={styles.clearFilterText}>Limpar Filtro</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setFilterModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.applyFilterButton}
                            onPress={() => {
                                const filtered = operacoes.filter(op => {
                                    const opDate = new Date(op.dataEntrega);
                                    if (startDate && endDate) {
                                        return opDate >= startDate && opDate <= endDate;
                                    }
                                    if (startDate) {
                                        return opDate >= startDate;
                                    }
                                    if (endDate) {
                                        return opDate <= endDate;
                                    }
                                    return true;
                                });
                                setFilteredOperacoes(filtered);
                                setFilterModalVisible(false);
                            }}
                        >
                            <MaterialIcons name="check" size={20} color={customTheme.colors.onPrimary} />
                            <Text style={styles.applyFilterText}>Aplicar Filtro</Text>
                        </TouchableOpacity>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

        </View>
    );
};

const styles = StyleSheet.create({
    dateTextPlaceholder: {
        color: customTheme.colors.onSurfaceVariant,
    },
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
    },

    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },

    filterButton: {
        padding: 8,
        position: 'relative',
    },

    filterActiveDot: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: customTheme.colors.primary,
    },

    filterDialog: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 28,
        marginHorizontal: 24,
    },

    filterContent: {
        gap: 16,
    },

    dateText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },

    clearFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
    },

    clearFilterText: {
        fontSize: 14,
        color: customTheme.colors.error,
    },

    applyFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: customTheme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },

    applyFilterText: {
        fontSize: 14,
        color: customTheme.colors.onPrimary,
        fontWeight: '500',
    },

    deleteButton: {
        padding: 8,
    },
    deleteDialog: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 28,
        marginHorizontal: 24,
    },
    deleteDialogContent: {
        gap: 16,
    },
    deleteWarningText: {
        fontSize: 16,
        color: customTheme.colors.error,
        marginBottom: 8,
    },
    deleteInfoContainer: {
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    deleteInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deleteInfoLabel: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        fontWeight: '500',
        width: 100,
    },
    deleteInfoValue: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    deleteWarningSubtext: {
        fontSize: 12,
        color: customTheme.colors.error,
        fontStyle: 'italic',
        marginTop: 8,
    },
    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    cancelButtonText: {
        fontSize: 14,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    deleteConfirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: customTheme.colors.error,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    deleteConfirmButtonText: {
        fontSize: 14,
        color: customTheme.colors.onError,
        fontWeight: '500',
    },

    responsaveisContainer: {
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 8,
    },
    responsaveisHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    responsaveisList: {
        gap: 8,
        marginLeft: 4,
    },
    responsavelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    responsavelLabel: {
        fontSize: 13,
        color: customTheme.colors.onSurfaceVariant,
        fontWeight: '500',
        width: 100, // Largura fixa para alinhar os nomes
    },
    responsavelNome: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        paddingVertical: 16,
        paddingHorizontal: 20,
        elevation: 4,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outline,
    },
    headerTitle: {
        flex: 1,
        marginLeft: 12,
        color: customTheme.colors.onSurface,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    operacaoCard: {
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: customTheme.colors.surface,
        elevation: 2,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outline,
    },
    dataText: {
        fontSize: 15,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    cardContent: {
        padding: 12,
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        gap: 12,
    },
    clienteContainer: {
        flex: 1,
    },
    enderecoContainer: {
        flex: 2,
    },
    iconLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    labelText: {
        fontSize: 13,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    clienteText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    enderecoWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    enderecoText: {
        flex: 1,
        fontSize: 14,
        color: customTheme.colors.primary,
        textDecorationLine: 'underline',
    },
    itemsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    itemsSection: {
        flex: 1,
    },
    itemsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    itemChip: {
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    itemText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        marginTop: 48,
    },
    emptyText: {
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
    },
});

export default HistoricoOperacoes;