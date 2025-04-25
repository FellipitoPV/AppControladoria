import { Avatar, Button, Chip, Dialog, Divider, Portal, Surface, Text, TextInput } from 'react-native-paper';
import { EQUIPAMENTOS, IAgendamentoLavagem, PLACAS_VEICULOS, TIPOS_LAVAGEM } from './Components/lavagemTypes';
import { Modal, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { useMemo, useRef, useState } from 'react';

import ConfirmationModal from '../../../assets/components/ConfirmationModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';
import { DropdownRef } from '../../../helpers/Types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../../assets/components/ModernHeader';
import NovoAgendamentoModal from './Components/NovoAgendamentoModal';
import { customTheme } from '../../../theme/theme';
import { db } from '../../../../firebase';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import { useBackgroundSync } from '../../../contexts/backgroundSyncContext';
import { useNetwork } from '../../../contexts/NetworkContext';
import { useUser } from '../../../contexts/userContext';

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

    const veiculoRef = useRef<DropdownRef>(null);
    const tipoLavagemRef = useRef<DropdownRef>(null);

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
        //console.log('Filtering agendamentos:', agendamentos);
        if (!Array.isArray(agendamentos)) return [];

        return agendamentos
            .filter(ag => mostrarConcluidos ? true : !ag.concluido)
            .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }, [agendamentos, mostrarConcluidos]);

    const handleAgendar = async (data: {
        placaSelecionada: string;
        tipoLavagemSelecionado: string;
        dataSelecionada: Date;
        isEquipamento: boolean;
        numeroEquipamento?: string;
    }) => {
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
    
            await setDoc(doc(db(), 'agendamentos', idPersonalizado), {
                placa: data.isEquipamento
                    ? `${adminPrefix}${data.placaSelecionada}-${data.numeroEquipamento}`
                    : `${adminPrefix}${data.placaSelecionada}`,
                tipoLavagem: data.tipoLavagemSelecionado,
                data: data.dataSelecionada.toISOString(),
                concluido: false,
                tipoVeiculo: data.isEquipamento ? 'equipamento' : 'placa',
                func: userInfo?.cargo,
                createBy: userInfo?.user,
            });
    
            await forceSync('agendamentos');
    
            showGlobalToast('success', 'Sucesso', 'Agendamento criado com sucesso', 4000);
        } catch (error) {
            console.error('Erro ao agendar lavagem:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível criar o agendamento', 4000);
        }
    };
    
    const AgendamentoCard = ({ item, onPress }: { item: IAgendamentoLavagem; onPress: () => void }) => {
        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
        const handleDelete = async () => {
            try {
                await deleteDoc(doc(db(), 'agendamentos', item.id));
                await forceSync('agendamentos');
                showGlobalToast('success', 'Sucesso', 'Agendamento excluído com sucesso', 4000);
            } catch (error) {
                console.error('Erro ao excluir agendamento:', error);
                showGlobalToast('error', 'Erro', 'Não foi possível excluir o agendamento', 4000);
            }
        };
    
        return (
            <>
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
                                                name={item.tipoVeiculo === 'equipamento' ? 'wrench' : 'car'}
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
    
                                {/* Botão de exclusão para administradores */}
                                {admLevel && !item.concluido && (
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => setShowDeleteConfirm(true)}
                                    >
                                        <Icon
                                            name="delete"
                                            size={24}
                                            color={customTheme.colors.error}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
    
                            <Divider style={styles.divider} />
    
                            {/* Informações da Lavagem */}
                            <View style={styles.cardFooter}>
                                <View style={styles.footerInfo}>
                                    <Icon
                                        name="car-wash"
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
                                            name="gesture-tap"
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
    
                {/* Modal de confirmação de exclusão */}
                <ConfirmationModal
                    visible={showDeleteConfirm}
                    title="Confirmar exclusão"
                    message="Tem certeza que deseja excluir este agendamento?"
                    itemToDelete={`Agendamento ${item.placa}`}
                    onCancel={() => setShowDeleteConfirm(false)}
                    onConfirm={() => {
                        handleDelete();
                        setShowDeleteConfirm(false);
                    }}
                    confirmText="Excluir"
                    iconName="delete-alert"
                />
            </>
        );
    };

    const admLevel = useMemo(() => {
        if (!userInfo) return false;

        // Verifica se é admin geral do sistema
        if (userInfo.cargo?.toLowerCase() === 'administrador') return true;

        // Verifica se tem nível 3 no módulo de lavagem
        const washAccess = userInfo?.acesso?.find(access => access.moduleId === 'lavagem');
        if (washAccess)
            return washAccess?.level >= 3 || false;
        else
            return false;

    }, [userInfo]);

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
                {...(admLevel && isOnline ? {
                    rightIcon: 'plus-box',
                    rightAction: () => setModalVisible(true)
                } : {})}
            />

            {/* Teste local */}
            {/* <LocalAgendamentoCard placa={"LMD-4E79"} lavagem={"simples"} /> */}

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

            <NovoAgendamentoModal
                visible={modalVisible}
                onDismiss={() => setModalVisible(false)}
                onAgendar={handleAgendar}
            />

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    deleteButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: `${customTheme.colors.error}10`,
    },

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
    plateText: {
        fontWeight: '600',
    },
    concludedChip: {
        backgroundColor: `${customTheme.colors.primary}15`,
    },
    pendingChip: {
        backgroundColor: `${customTheme.colors.warning}15`,
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
});