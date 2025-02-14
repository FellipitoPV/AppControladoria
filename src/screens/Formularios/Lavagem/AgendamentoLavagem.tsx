import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
    SafeAreaView,
} from 'react-native';
import {
    Text,
    Surface,
    TextInput,
    Button,
    Card,
    Avatar,
    Chip,
    Divider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';

import ModernHeader from '../../../assets/components/ModernHeader';
import { useNetwork } from '../../../contexts/NetworkContext';
import { useUser } from '../../../contexts/userContext';
import { customTheme } from '../../../theme/theme';
import { PLACAS_VEICULOS, EQUIPAMENTOS, TIPOS_LAVAGEM, IAgendamentoLavagem } from './Components/lavagemTypes';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import { useBackgroundSync } from '../../../contexts/backgroundSyncContext';
import LocalAgendamentoCard from './Components/LocalAgendamentoCard';

export default function AgendamentoLavagem({ navigation }: any) {
    const { isOnline } = useNetwork();
    const { userInfo } = useUser();
    const {
        agendamentos,
        forceSync,
        marcarAgendamentoComoConcluido
    } = useBackgroundSync();

    const [modalVisible, setModalVisible] = useState(false);
    const [placaSelecionada, setPlacaSelecionada] = useState('');
    const [tipoLavagemSelecionado, setTipoLavagemSelecionado] = useState('');
    const [dataSelecionada, setDataSelecionada] = useState(new Date());
    const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
    const [numeroEquipamento, setNumeroEquipamento] = useState('');
    const [isEquipamento, setIsEquipamento] = useState(false);
    const [mostrarConcluidos, setMostrarConcluidos] = useState(false);

    // Estados para os DropDownPickers
    const [openPlacas, setOpenPlacas] = useState(false);
    const [openTipoLavagem, setOpenTipoLavagem] = useState(false);

    // Formatando os dados para o formato do DropDownPicker
    const placasItems = [...PLACAS_VEICULOS, ...EQUIPAMENTOS].map(item => ({
        label: item.value,
        value: item.value
    }));

    const tiposLavagemItems = TIPOS_LAVAGEM.map(item => ({
        label: item.label,
        value: item.value
    }));

    const agendamentosFiltrados = useMemo(() => {
        console.log('Filtering agendamentos:', agendamentos);
        if (!Array.isArray(agendamentos)) return [];

        return agendamentos
            .filter(ag => mostrarConcluidos ? true : !ag.concluido)
            .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }, [agendamentos, mostrarConcluidos]);

    const handleAgendar = async () => {
        try {
            if (!isOnline) {
                showGlobalToast(
                    'error',
                    'Sem conexão',
                    'É necessário estar online para criar novos agendamentos',
                    4000
                );
                return;
            }

            // Cria um prefixo especial para administradores no ID
            const adminPrefix = userInfo?.cargo === 'Administrador' ? '0_ADM_' : '';

            // Gera um ID personalizado
            const idPersonalizado = `${adminPrefix}${new Date().getTime()}`;

            await firestore().collection('agendamentos').doc(idPersonalizado).set({
                // Adiciona o prefixo na placa
                placa: isEquipamento
                    ? `${adminPrefix}${placaSelecionada}-${numeroEquipamento}`
                    : `${adminPrefix}${placaSelecionada}`,
                tipoLavagem: tipoLavagemSelecionado,
                data: dataSelecionada.toISOString(),
                concluido: false,
                tipoVeiculo: isEquipamento ? 'equipamento' : 'placa',
                func: userInfo?.cargo,
            });

            await forceSync('agendamentos');
            console.log('Agendamento criado:', {
                placa: isEquipamento
                    ? `${adminPrefix}${placaSelecionada}-${numeroEquipamento}`
                    : `${adminPrefix}${placaSelecionada}`,
                tipoLavagem: tipoLavagemSelecionado,
                data: dataSelecionada.toISOString()
            });

            setModalVisible(false);
            resetForm();

            showGlobalToast('success', 'Sucesso', 'Agendamento criado com sucesso', 4000);
        } catch (error) {
            console.error('Erro ao agendar lavagem:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível criar o agendamento', 4000);
        }
    };

    const canScheduleWash = useMemo(() => {
        if (!userInfo) return false;
        return userInfo.cargo?.toLowerCase() === 'administrador' || userInfo.acesso?.includes('lavagem') || false;
    }, [userInfo]);

    const resetForm = () => {
        setPlacaSelecionada('');
        setTipoLavagemSelecionado('');
        setDataSelecionada(new Date());
        setNumeroEquipamento('');
        setIsEquipamento(false);
    };

    const AgendamentoCard = ({ item, onPress }: { item: IAgendamentoLavagem; onPress: () => void }) => (
        <Surface style={[styles.card, item.concluido && styles.cardConcluido]}>
            <TouchableOpacity
                onPress={onPress}
                disabled={item.concluido}
                style={styles.cardTouchable}
            >
                {/* Barra de gradiente superior */}
                <View style={[
                    styles.cardGradient,
                    { backgroundColor: item.concluido ? customTheme.colors.surfaceVariant : customTheme.colors.primary }
                ]} />

                <View style={styles.cardContent}>

                    {/* Cabeçalho do Card */}
                    <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                            <Avatar.Icon
                                size={48}
                                icon={() => (
                                    <Icon
                                        name={item.tipoVeiculo === 'equipamento' ? 'build' : 'directions-car'}
                                        size={24}
                                        color="#FFF"
                                    />
                                )}
                                style={[
                                    styles.avatar,
                                    { backgroundColor: item.concluido ? customTheme.colors.surfaceVariant : customTheme.colors.primary }
                                ]}
                            />
                            <View style={styles.headerInfo}>
                                <Text variant="titleMedium" style={styles.plateText}>
                                    {item.placa}
                                </Text>
                                <View style={styles.chipContainer}>
                                    <Chip
                                        mode="flat"
                                        style={[
                                            item.concluido ? styles.concludedChip : styles.pendingChip
                                        ]}
                                        textStyle={styles.chipText}
                                    >
                                        {item.concluido ? 'Concluído' : 'Pendente'}
                                    </Chip>
                                </View>
                            </View>
                        </View>
                    </View>

                    <Divider style={styles.divider} />

                    {/* Informações da Lavagem */}
                    <View style={styles.cardFooter}>
                        <View style={styles.footerInfo}>
                            <Icon
                                name="local-car-wash"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.footerText}>
                                Lavagem {item.tipoLavagem === 'simples' ? 'Simples' : 'Completa'}
                            </Text>
                        </View>
                        <View style={styles.footerInfo}>
                            <Icon
                                name="calendar-today"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.footerText}>
                                {new Date(item.data).toLocaleDateString()}
                            </Text>
                        </View>
                        {!item.concluido && (
                            <View style={styles.footerInfo}>
                                <Icon
                                    name="touch-app"
                                    size={20}
                                    color={customTheme.colors.primary}
                                />
                                <Text style={[styles.footerText, styles.actionText]}>
                                    Toque para registrar
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Surface>
    );

    const handleCardPress = (item: IAgendamentoLavagem) => {
        if (item.concluido) return;

        // Determina a placa corretamente, removendo prefixos de admin se necessário
        const placa = item.placa.replace(/^0_ADM_/, '');

        navigation.navigate('LavagemForm', {
            placa, // Passa apenas a placa
            lavagem: item.tipoLavagem, // Passa o tipo de lavagem

            // Se precisar de informações adicionais para referência
            agendamentoId: item.id,
            tipoVeiculo: item.tipoVeiculo
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ModernHeader
                title="Agendamentos"
                iconName="calendar-today"
                onBackPress={() => navigation.goBack()}
            />

            <LocalAgendamentoCard placa={"LMD-4E79"} lavagem={"simples"} />

            {agendamentosFiltrados.length === 0 ? (
                <View style={styles.emptyState}>
                    <Icon name="check-circle-outline" size={64} color={customTheme.colors.primary} />
                    <Text variant="titleMedium" style={styles.emptyStateText}>
                        Nenhuma lavagem pendente!
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                >
                    {agendamentosFiltrados.map((item) => (
                        <AgendamentoCard
                            key={item.id}
                            item={item}
                            onPress={() => handleCardPress(item)}
                        />
                    ))}
                </ScrollView>
            )}

            {canScheduleWash && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => isOnline && setModalVisible(true)}
                    disabled={!isOnline}
                >
                    <Icon name="add" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            )}

            <Modal
                visible={modalVisible}
                onDismiss={() => setModalVisible(false)}
                onRequestClose={() => setModalVisible(false)}
                transparent
                animationType="slide"
            >
                <View style={styles.modalContainer}>
                    <Surface style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text variant="titleLarge">Novo Agendamento</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Icon name="close" size={24} color={customTheme.colors.onSurface} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <DropDownPicker
                                open={openPlacas}
                                value={placaSelecionada}
                                items={placasItems}
                                setOpen={setOpenPlacas}
                                setValue={setPlacaSelecionada}
                                placeholder="Selecione a placa ou equipamento"
                                style={styles.dropdown}
                                dropDownContainerStyle={styles.dropdownContainer}
                                placeholderStyle={styles.dropdownPlaceholder}
                                listItemContainerStyle={styles.dropdownItemContainer}
                                onChangeValue={(value) => {
                                    setIsEquipamento(EQUIPAMENTOS.some(equip => equip.value === value));
                                }}
                                zIndex={3000}
                                zIndexInverse={1000}
                            />

                            {isEquipamento && (
                                <TextInput
                                    mode="outlined"
                                    label="Número do Equipamento"
                                    value={numeroEquipamento}
                                    onChangeText={setNumeroEquipamento}
                                    keyboardType="numeric"
                                    style={[styles.input, { marginTop: 16 }]}
                                    left={<TextInput.Icon icon={() => (
                                        <Icon name="123" size={24} color={customTheme.colors.primary} />
                                    )} />}
                                />
                            )}

                            <View style={{ marginTop: 16 }}>
                                <DropDownPicker
                                    open={openTipoLavagem}
                                    value={tipoLavagemSelecionado}
                                    items={tiposLavagemItems}
                                    setOpen={setOpenTipoLavagem}
                                    setValue={setTipoLavagemSelecionado}
                                    placeholder="Selecione o tipo de lavagem"
                                    style={styles.dropdown}
                                    dropDownContainerStyle={styles.dropdownContainer}
                                    placeholderStyle={styles.dropdownPlaceholder}
                                    listItemContainerStyle={styles.dropdownItemContainer}
                                    zIndex={2000}
                                    zIndexInverse={2000}
                                />

                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => setMostrarDatePicker(true)}
                                >
                                    <Icon name="calendar-month" size={20} color={customTheme.colors.primary} />
                                    <Text>{dataSelecionada.toLocaleDateString()}</Text>
                                </TouchableOpacity>

                                {mostrarDatePicker && (
                                    <DateTimePicker
                                        value={dataSelecionada}
                                        mode="date"
                                        display="default"
                                        onChange={(event, selectedDate) => {
                                            setMostrarDatePicker(false);
                                            if (selectedDate) {
                                                setDataSelecionada(selectedDate);
                                            }
                                        }}
                                    />
                                )}

                                <Button
                                    mode="contained"
                                    onPress={handleAgendar}
                                    style={styles.agendarButton}
                                    disabled={!placaSelecionada || !tipoLavagemSelecionado || (isEquipamento && !numeroEquipamento)}
                                >
                                    Agendar Lavagem
                                </Button>
                            </View>
                        </ScrollView>
                    </Surface>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // Estilos do Card
    cardTouchable: {
        width: '100%',
    },
    cardGradient: {
        height: 4,
        width: '100%',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    cardContent: {
        padding: 16,
    },
    avatar: {
        marginRight: 12,
    },
    chipContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    chipText: {
        fontSize: 12,
        height: 'auto',
    },
    divider: {
        marginVertical: 12,
        backgroundColor: customTheme.colors.outlineVariant,
    },

    // Estilos do Footer do Card
    cardFooter: {
        marginTop: 8,
        gap: 12,
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    footerText: {
        color: customTheme.colors.onSurfaceVariant,
        fontSize: 14,
    },
    actionText: {
        color: customTheme.colors.primary,
        fontWeight: '500',
    },

    // Estilos adicionais para o Modal
    modalScrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    modalInputGroup: {
        marginTop: 16,
        gap: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 16,
    },

    // Estilos para o Toggle de Concluídos
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    toggleText: {
        color: customTheme.colors.onSurfaceVariant,
        fontSize: 14,
        fontWeight: '500',
    },

    // Estilos para feedback de estado
    offlineIndicator: {
        backgroundColor: `${customTheme.colors.error}15`,
        padding: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    offlineText: {
        color: customTheme.colors.error,
        fontSize: 14,
        fontWeight: '500',
    },
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 12,
    },
    card: {
        elevation: 2,
        borderRadius: 12,
        backgroundColor: customTheme.colors.surface,
    },
    cardConcluido: {
        opacity: 0.8,
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerInfo: {
        gap: 4,
    },
    headerRight: {
        alignItems: 'flex-end',
        gap: 8,
    },
    plateText: {
        fontWeight: '600',
    },
    dateText: {
        color: customTheme.colors.onSurfaceVariant,
    },
    concludedChip: {
        backgroundColor: `${customTheme.colors.primary}15`,
    },
    pendingChip: {
        backgroundColor: `${customTheme.colors.warning}15`,
    },
    typeChip: {
        height: 24,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyStateText: {
        marginTop: 16,
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: customTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 16,
    },
    modalContent: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 16,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    input: {
        backgroundColor: customTheme.colors.surface,
        marginBottom: 16,
    },
    dropdown: {
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        backgroundColor: customTheme.colors.surface,
        minHeight: 50,
    },
    dropdownContainer: {
        borderColor: customTheme.colors.outline,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
    },
    dropdownPlaceholder: {
        color: customTheme.colors.onSurfaceVariant,
    },
    dropdownItemContainer: {
        height: 50,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    agendarButton: {
        marginTop: 8,
    },
});