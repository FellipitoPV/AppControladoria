import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Surface, Text } from 'react-native-paper';
import { useMemo, useState } from 'react';

import ConfirmationModal from '../../../assets/components/ConfirmationModal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../../assets/components/ModernHeader';
import NovoAgendamentoModal from './Components/NovoAgendamentoModal';
import { IAgendamentoLavagem } from './Components/lavagemTypes';
import { customTheme } from '../../../theme/theme';
import { ecoApi } from '../../../api/ecoApi';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import { useBackgroundSync } from '../../../contexts/backgroundSyncContext';
import { useNetwork } from '../../../contexts/NetworkContext';
import { useUser } from '../../../contexts/userContext';

// ─── Helper de cor com opacidade ─────────────────────────────────────────────
const withAlpha = (hex: string, alpha: number) =>
    `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;

// ─── Formatação de data ───────────────────────────────────────────────────────
const formatarData = (dataStr: string): string => {
    try {
        const d = new Date(dataStr);
        if (isNaN(d.getTime())) return dataStr;
        return d.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return dataStr;
    }
};

// ─── Chip de status ───────────────────────────────────────────────────────────
const StatusBadge = ({ concluido }: { concluido: boolean }) => {
    const cor = concluido ? '#2E7D32' : customTheme.colors.warning;
    return (
        <View style={[s.statusBadge, { backgroundColor: withAlpha(cor, 0.12) }]}>
            <View style={[s.statusDot, { backgroundColor: cor }]} />
            <Text style={[s.statusText, { color: cor }]}>
                {concluido ? 'Concluído' : 'Pendente'}
            </Text>
        </View>
    );
};

// ─── Card de agendamento ──────────────────────────────────────────────────────
const AgendamentoCard = ({
    item,
    onPress,
    canDelete,
    onDeleteConfirm,
}: {
    item: IAgendamentoLavagem;
    onPress: () => void;
    canDelete: boolean;
    onDeleteConfirm: () => void;
}) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isEquipamento = item.tipoVeiculo === 'equipamento';
    const accentColor = item.concluido
        ? customTheme.colors.onSurfaceVariant
        : customTheme.colors.primary;

    return (
        <>
            <TouchableOpacity
                style={[s.card, item.concluido && s.cardConcluido]}
                onPress={onPress}
                disabled={item.concluido}
                activeOpacity={0.75}
            >
                {/* Faixa superior */}
                <View style={[s.cardAccentBar, { backgroundColor: accentColor }]} />

                <View style={s.cardBody}>
                    {/* ── Linha 1: ícone + placa + status + delete ── */}
                    <View style={s.cardTopRow}>
                        <View style={[s.veiculoIconBox, {
                            backgroundColor: withAlpha(accentColor, 0.1),
                        }]}>
                            <Icon
                                name={isEquipamento ? 'wrench' : 'car'}
                                size={22}
                                color={accentColor}
                            />
                        </View>

                        <View style={s.cardTopCenter}>
                            <Text style={[s.placaText, item.concluido && s.placaTextDim]} numberOfLines={1}>
                                {item.placa.replace(/^0_ADM_/, '')}
                            </Text>
                            <Text style={s.tipoVeiculoText}>
                                {isEquipamento ? 'Equipamento' : 'Veículo'}
                            </Text>
                        </View>

                        <View style={s.cardTopRight}>
                            <StatusBadge concluido={item.concluido} />
                            {canDelete && !item.concluido && (
                                <TouchableOpacity
                                    style={s.deleteBtn}
                                    onPress={() => setShowDeleteConfirm(true)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Icon name="trash-can-outline" size={20} color={customTheme.colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* ── Linha 2: tipo lavagem + data ── */}
                    <View style={s.cardInfoRow}>
                        <View style={s.infoCell}>
                            <Icon name="car-wash" size={14} color={customTheme.colors.onSurfaceVariant} />
                            <Text style={s.infoCellText}>
                                Lavagem {item.tipoLavagem === 'simples' ? 'Simples' : 'Completa'}
                            </Text>
                        </View>

                        <View style={s.infoCell}>
                            <Icon name="calendar-outline" size={14} color={customTheme.colors.onSurfaceVariant} />
                            <Text style={s.infoCellText}>{formatarData(item.data)}</Text>
                        </View>
                    </View>

                    {/* ── Linha 3: CTA (apenas pendentes) ── */}
                    {!item.concluido && (
                        <View style={s.ctaRow}>
                            <Icon name="gesture-tap" size={14} color={customTheme.colors.primary} />
                            <Text style={s.ctaText}>Toque para registrar a lavagem</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            <ConfirmationModal
                visible={showDeleteConfirm}
                title="Confirmar exclusão"
                message="Tem certeza que deseja excluir este agendamento?"
                itemToDelete={`Agendamento ${item.placa.replace(/^0_ADM_/, '')}`}
                onCancel={() => setShowDeleteConfirm(false)}
                onConfirm={() => {
                    onDeleteConfirm();
                    setShowDeleteConfirm(false);
                }}
                confirmText="Excluir"
                iconName="delete-alert"
            />
        </>
    );
};

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function AgendamentoLavagem({ navigation }: any) {
    const { isOnline } = useNetwork();
    const { userInfo } = useUser();
    const { agendamentos, forceSync } = useBackgroundSync();

    const [modalVisible, setModalVisible] = useState(false);
    const [mostrarConcluidos, setMostrarConcluidos] = useState(false);

    const admLevel = useMemo(() => {
        if (!userInfo) return false;
        if (userInfo.cargo?.toLowerCase() === 'administrador') return true;
        const washAccess = userInfo?.acesso?.find(a => a.moduleId === 'lavagem');
        return (washAccess?.level ?? 0) >= 3;
    }, [userInfo]);

    const agendamentosFiltrados = useMemo(() => {
        if (!Array.isArray(agendamentos)) return [];
        return agendamentos
            .filter(ag => mostrarConcluidos ? true : !ag.concluido)
            .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }, [agendamentos, mostrarConcluidos]);

    const pendentesCount = useMemo(
        () => agendamentos.filter(ag => !ag.concluido).length,
        [agendamentos],
    );

    // ── Criar agendamento ─────────────────────────────────────────────────────
    const handleAgendar = async (data: {
        placaSelecionada: string;
        tipoLavagemSelecionado: string;
        dataSelecionada: Date;
        isEquipamento: boolean;
        numeroEquipamento?: string;
    }) => {
        if (!isOnline) {
            showGlobalToast('error', 'Sem conexão', 'Você precisa estar online para criar agendamentos', 4000);
            return;
        }

        try {
            const adminPrefix = userInfo?.cargo === 'Administrador' ? '0_ADM_' : '';
            await ecoApi.create('agendamentos', {
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
            console.error('Erro ao criar agendamento:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível criar o agendamento', 4000);
        }
    };

    // ── Deletar agendamento ───────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        try {
            await ecoApi.delete('agendamentos', id);
            await forceSync('agendamentos');
            showGlobalToast('success', 'Sucesso', 'Agendamento excluído com sucesso', 4000);
        } catch (error) {
            console.error('Erro ao excluir agendamento:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível excluir o agendamento', 4000);
        }
    };

    // ── Navegar para o form ───────────────────────────────────────────────────
    const handleCardPress = (item: IAgendamentoLavagem) => {
        if (item.concluido) return;
        navigation.navigate('LavagemForm', {
            placa: item.placa.replace(/^0_ADM_/, ''),
            lavagem: item.tipoLavagem,
            agendamentoId: item.id,
            tipoVeiculo: item.tipoVeiculo,
        });
    };

    return (
        <SafeAreaView style={s.container}>
            <ModernHeader
                title="Agendamentos"
                iconName="calendar-check"
                onBackPress={() => navigation.goBack()}
                {...(admLevel && isOnline ? {
                    rightIcon: 'plus-box',
                    rightAction: () => setModalVisible(true),
                } : {})}
            />

            {/* ── Barra de resumo + toggle ────────────────────────────── */}
            <View style={s.summaryBar}>
                <View style={s.summaryLeft}>
                    <View style={s.summaryBadge}>
                        <Text style={s.summaryBadgeText}>{pendentesCount}</Text>
                    </View>
                    <Text style={s.summaryLabel}>
                        {pendentesCount === 1 ? 'agendamento pendente' : 'agendamentos pendentes'}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[s.toggleChip, mostrarConcluidos && s.toggleChipActive]}
                    onPress={() => setMostrarConcluidos(v => !v)}
                >
                    <Icon
                        name={mostrarConcluidos ? 'eye-off-outline' : 'eye-outline'}
                        size={14}
                        color={mostrarConcluidos ? customTheme.colors.primary : customTheme.colors.onSurfaceVariant}
                    />
                    <Text style={[s.toggleChipText, mostrarConcluidos && s.toggleChipTextActive]}>
                        Concluídos
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── Lista ou estado vazio ────────────────────────────────── */}
            {agendamentosFiltrados.length === 0 ? (
                <View style={s.emptyContainer}>
                    <View style={s.emptyIconBox}>
                        <Icon name="calendar-check" size={40} color={customTheme.colors.primary} />
                    </View>
                    <Text style={s.emptyTitle}>Tudo em dia!</Text>
                    <Text style={s.emptyText}>
                        {mostrarConcluidos
                            ? 'Nenhum agendamento encontrado.'
                            : 'Nenhuma lavagem pendente no momento.'}
                    </Text>
                    {admLevel && isOnline && (
                        <TouchableOpacity
                            style={s.emptyAddBtn}
                            onPress={() => setModalVisible(true)}
                        >
                            <Icon name="plus" size={16} color={customTheme.colors.primary} />
                            <Text style={s.emptyAddBtnText}>Novo agendamento</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <ScrollView
                    style={s.scrollView}
                    contentContainerStyle={s.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {agendamentosFiltrados.map(item => (
                        <AgendamentoCard
                            key={item.id}
                            item={item}
                            onPress={() => handleCardPress(item)}
                            canDelete={admLevel}
                            onDeleteConfirm={() => handleDelete(item.id)}
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

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
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

    // ── Barra de resumo ───────────────────────────────────────────────────────
    summaryBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: customTheme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.surfaceVariant,
    },
    summaryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    summaryBadge: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: customTheme.colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    summaryBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: customTheme.colors.primary,
    },
    summaryLabel: {
        fontSize: 13,
        color: customTheme.colors.onSurfaceVariant,
        fontWeight: '500',
    },
    toggleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customTheme.colors.outlineVariant,
        backgroundColor: customTheme.colors.background,
    },
    toggleChipActive: {
        backgroundColor: customTheme.colors.primaryContainer,
        borderColor: customTheme.colors.primary,
    },
    toggleChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: customTheme.colors.onSurfaceVariant,
    },
    toggleChipTextActive: {
        color: customTheme.colors.primary,
    },

    // ── Card ──────────────────────────────────────────────────────────────────
    card: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: customTheme.colors.surface,
        elevation: 2,
        borderWidth: 1,
        borderColor: customTheme.colors.surfaceVariant,
    },
    cardConcluido: {
        opacity: 0.7,
    },
    cardAccentBar: {
        height: 4,
    },
    cardBody: {
        padding: 14,
        gap: 10,
    },

    // linha 1
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    veiculoIconBox: {
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTopCenter: {
        flex: 1,
    },
    placaText: {
        fontSize: 17,
        fontWeight: '700',
        color: customTheme.colors.onSurface,
        letterSpacing: 0.3,
    },
    placaTextDim: {
        color: customTheme.colors.onSurfaceVariant,
    },
    tipoVeiculoText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 2,
    },
    cardTopRight: {
        alignItems: 'flex-end',
        gap: 8,
    },

    // status badge
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },

    // delete
    deleteBtn: {
        padding: 2,
    },

    // linha 2: tipo + data
    cardInfoRow: {
        flexDirection: 'row',
        gap: 16,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.surfaceVariant,
    },
    infoCell: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flex: 1,
    },
    infoCellText: {
        fontSize: 13,
        color: customTheme.colors.onSurfaceVariant,
        flexShrink: 1,
    },

    // cta
    ctaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    ctaText: {
        fontSize: 12,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },

    // ── Estado vazio ──────────────────────────────────────────────────────────
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: customTheme.colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: customTheme.colors.onSurface,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    emptyAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: customTheme.colors.primary,
    },
    emptyAddBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: customTheme.colors.primary,
    },
});
