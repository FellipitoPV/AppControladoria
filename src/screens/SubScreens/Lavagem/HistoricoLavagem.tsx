import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { Surface, Text } from 'react-native-paper';
import React, { useEffect, useRef, useState } from 'react';
import { BASE_URL, ecoApi, ecoStorage } from '../../../api/ecoApi';
import { getVeiculoInfo, getTipoLavagemDetails } from './Components/utils/lavagemUtils';

import ConfirmationModal from '../../../assets/components/ConfirmationModal';
import DetalheLavagemModal from './Components/DetalheLavagemModal';
import { LavagemInterface } from './Components/lavagemTypes';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../../assets/components/ModernHeader';
import { customTheme } from '../../../theme/theme';
import { format } from 'date-fns';
import { hasAccess } from '../../Adm/types/admTypes';
import { ptBR } from 'date-fns/locale';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import { useUser } from '../../../contexts/userContext';

interface HistoricoLavagemProps {
    navigation: any;
}

export default function HistoricoLavagem({ navigation }: HistoricoLavagemProps) {
    const { userInfo } = useUser();
    const [lavagens, setLavagens] = useState<LavagemInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [todasLavagens, setTodasLavagens] = useState<LavagemInterface[]>([]);
    const [lagensFiltradas, setLavagensFiltradas] = useState<LavagemInterface[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const ITEMS_PER_PAGE = 15;

    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [filterVeiculo, setFilterVeiculo] = useState<string | null>(null);
    const [filterTipoLavagem, setFilterTipoLavagem] = useState<string | null>(null);

    const [selectedLavagem, setSelectedLavagem] = useState<LavagemInterface | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
    const [detalheModalVisible, setDetalheModalVisible] = useState(false);

    // Animações
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    const canEditDelete = () => userInfo && hasAccess(userInfo, 'lavagem', 2);

    const parseDataLavagem = (dataStr: any, hora?: string): Date => {
        if (!dataStr) return new Date(0);
        if (dataStr instanceof Date) return dataStr;
        if (typeof dataStr === 'string' && dataStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            const [dia, mes, ano] = dataStr.split('/').map(Number);
            const d = new Date(ano, mes - 1, dia);
            if (hora && hora.match(/^\d{2}:\d{2}/)) {
                const [h, m, s = 0] = hora.split(':').map(Number);
                d.setHours(h, m, s);
            }
            return isNaN(d.getTime()) ? new Date(0) : d;
        }
        const d = new Date(dataStr);
        return isNaN(d.getTime()) ? new Date(0) : d;
    };

    const buscarLavagens = async () => {
        try {
            setLoading(true);

            const registros = await ecoApi.list('registroLavagens');

            // Separar formato novo (tem campo veiculo) do antigo (tem placaVeiculo)
            const dadosNovos: LavagemInterface[] = registros
                .filter((r: any) => !r.placaVeiculo)
                .map((r: any) => ({
                    id: r._id ?? r.id,
                    responsavel: r.responsavel || '',
                    data: parseDataLavagem(r.data, r.hora),
                    hora: r.hora || '',
                    veiculo: r.veiculo || { placa: '', tipo: '' },
                    tipoLavagem: r.tipoLavagem || '',
                    produtos: r.produtos || [],
                    fotos: r.fotos || [],
                    fotosAntes: r.fotosAntes || [],
                    fotosDepois: r.fotosDepois || [],
                    checklist: r.checklist || [],
                    observacoes: r.observacoes || '',
                    status: r.status || 'concluido',
                    createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
                    createdBy: r.createdBy || null,
                    agendamentoId: r.agendamentoId || null,
                } as LavagemInterface));

            const dadosAntigos: LavagemInterface[] = registros
                .filter((r: any) => !!r.placaVeiculo)
                .map((r: any) => {
                    const fotos = r.photoUrls
                        ? r.photoUrls.map((url: string, i: number) => ({ url, timestamp: Date.now() + i, path: `legado/${r._id ?? r.id}/${i}` }))
                        : r.photoUris
                            ? r.photoUris.map((uri: any, i: number) => ({ url: uri.url || uri.uri || uri, timestamp: Date.now() + i, path: `legado/${r._id ?? r.id}/${i}` }))
                            : [];
                    return {
                        id: r._id ?? r.id,
                        responsavel: r.responsavel || '',
                        data: parseDataLavagem(r.data, r.hora),
                        hora: r.hora || '',
                        veiculo: { placa: r.placaVeiculo || '', tipo: 'veiculo', numeroEquipamento: null },
                        tipoLavagem: r.tipoLavagem || '',
                        produtos: (r.produtos || []).map((p: any) => ({
                            nome: p.produto || '',
                            quantidade: parseInt(p.quantidade) || 0,
                        })),
                        fotos,
                        observacoes: r.observacoes || '',
                        status: 'concluido',
                        createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
                        createdBy: null,
                        agendamentoId: null,
                    } as LavagemInterface;
                });

            const dadosOrdenados = [...dadosNovos, ...dadosAntigos].sort((a, b) => {
                const dataA = a.data instanceof Date ? a.data : new Date(0);
                const dataB = b.data instanceof Date ? b.data : new Date(0);
                return dataB.getTime() - dataA.getTime();
            });

            setTodasLavagens(dadosOrdenados);

            // Aplicar paginação inicial
            const primeiraPagina = dadosOrdenados.slice(0, ITEMS_PER_PAGE);
            setLavagens(primeiraPagina);
            setHasMore(dadosOrdenados.length > ITEMS_PER_PAGE);

            // Animar entrada dos cards
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true
                })
            ]).start();

        } catch (error) {
            console.error('Erro ao buscar lavagens:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível carregar o histórico de lavagens', 3000);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            // Coletar todas as fotos do registro para excluir do storage
            const lavagem = selectedLavagem;
            if (lavagem) {
                const todasFotos = [
                    ...(lavagem.fotosAntes || []),
                    ...(lavagem.fotosDepois || []),
                    ...(lavagem.fotos || []),
                ];
                const storagePrefix = `${BASE_URL}/storage/files/`;
                await Promise.allSettled(
                    todasFotos
                        .filter(f => f.url?.startsWith(storagePrefix))
                        .map(f => ecoStorage.delete(f.url!.replace(storagePrefix, '')))
                );
            }

            await ecoApi.delete('registroLavagens', id);
            showGlobalToast('success', 'Sucesso', 'Registro excluído com sucesso', 3000);
            onRefresh();
        } catch (error) {
            console.error('Erro ao excluir registro:', error);
            Alert.alert("Erro", "Não foi possível excluir o registro.");
        }
    };

    const handleLoadMore = () => {
        if (!hasMore || loadingMore) return;

        setLoadingMore(true);

        const nextPage = currentPage + 1;
        const startIndex = 0;
        const endIndex = nextPage * ITEMS_PER_PAGE;

        // Verificar se devemos usar as lavagens filtradas ou todas
        const source = filterStatus || filterVeiculo || filterTipoLavagem
            ? lagensFiltradas
            : todasLavagens;

        setLavagens(source.slice(startIndex, endIndex));
        setCurrentPage(nextPage);
        setHasMore(endIndex < source.length);
        setLoadingMore(false);
    };

    const aplicarFiltros = () => {
        let resultado = [...todasLavagens];

        if (filterStatus) {
            resultado = resultado.filter(item => item.status === filterStatus);
        }

        if (filterVeiculo) {
            resultado = resultado.filter(item =>
                item.veiculo.placa.toLowerCase().includes(filterVeiculo.toLowerCase())
            );
        }

        if (filterTipoLavagem) {
            resultado = resultado.filter(item => item.tipoLavagem === filterTipoLavagem);
        }

        setLavagensFiltradas(resultado);
        setLavagens(resultado.slice(0, ITEMS_PER_PAGE));
        setCurrentPage(1);
        setHasMore(resultado.length > ITEMS_PER_PAGE);
    };

    const limparFiltros = () => {
        setFilterStatus(null);
        setFilterVeiculo(null);
        setFilterTipoLavagem(null);
        setLavagens(todasLavagens.slice(0, ITEMS_PER_PAGE));
        setCurrentPage(1);
        setHasMore(todasLavagens.length > ITEMS_PER_PAGE);
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setCurrentPage(1);
        setHasMore(true);
        limparFiltros();
        buscarLavagens();
    }, []);

    useEffect(() => {
        buscarLavagens();
    }, []);

    useEffect(() => {
        if (filterStatus || filterVeiculo || filterTipoLavagem) {
            aplicarFiltros();
        }
    }, [filterStatus, filterVeiculo, filterTipoLavagem]);

    const formatarData = (data: Date | string | undefined, hora?: string) => {
        if (!data) return '';
        try {
            const date = parseDataLavagem(data, hora);
            if (date.getTime() === 0) return '';
            return format(date, "EEE, dd 'de' MMM", { locale: ptBR });
        } catch (error) {
            console.error('Erro ao formatar data:', error);
            return '';
        }
    };

    const renderLavagemCard = (lavagem: LavagemInterface, index: number) => {
        const tipoInfo = getTipoLavagemDetails(lavagem.tipoLavagem);
        const veiculoInfo = getVeiculoInfo(lavagem.veiculo?.tipo);
        const dataFormatada = formatarData(lavagem.data, lavagem.hora);
        const produtosValidos = (lavagem.produtos || []).filter(p => p.nome && !isNaN(p.quantidade));
        const todasFotos = [
            ...(lavagem.fotosAntes || []),
            ...(lavagem.fotosDepois || []),
            ...(lavagem.fotos || []),  // legado
        ];
        const fotosCount = todasFotos.length;

        return (
            <Animated.View
                key={lavagem.id}
                style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
            >
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => { setSelectedLavagem(lavagem); setDetalheModalVisible(true); }}
                    activeOpacity={0.75}
                >
                    {/* Faixa de cor no topo */}
                    <View style={[styles.cardAccentBar, { backgroundColor: tipoInfo.text }]} />

                    <View style={styles.cardContent}>

                        {/* ── Linha 1: tipo + data ──────────────────────── */}
                        <View style={styles.cardTopRow}>
                            <View style={[styles.tipoBadge, { backgroundColor: tipoInfo.bg }]}>
                                <MaterialCommunityIcons name={tipoInfo.icon} size={13} color={tipoInfo.text} />
                                <Text style={[styles.tipoBadgeText, { color: tipoInfo.text }]}>
                                    {(lavagem.tipoLavagem || '').toUpperCase()}
                                </Text>
                            </View>

                            <View style={styles.dataHoraBox}>
                                <Text style={styles.dataText}>{dataFormatada}</Text>
                                {!!lavagem.hora && (
                                    <Text style={styles.horaText}>{lavagem.hora}</Text>
                                )}
                            </View>
                        </View>

                        {/* ── Linha 2: veículo (destaque) ───────────────── */}
                        <View style={styles.veiculoRow}>
                            <View style={[styles.veiculoIconBox, { backgroundColor: `${veiculoInfo.color}18` }]}>
                                <MaterialCommunityIcons
                                    name={veiculoInfo.icon}
                                    size={22}
                                    color={veiculoInfo.color}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.veiculoPlaca} numberOfLines={1}>
                                    {lavagem.veiculo?.placa || '—'}
                                    {lavagem.veiculo?.numeroEquipamento
                                        ? `  Nº ${lavagem.veiculo.numeroEquipamento}`
                                        : ''}
                                </Text>
                                <Text style={styles.veiculoTipo}>
                                    {veiculoInfo.label}
                                </Text>
                            </View>
                        </View>

                        {/* ── Linha 3: produtos ─────────────────────────── */}
                        {produtosValidos.length > 0 && (
                            <View style={styles.produtosRow}>
                                <MaterialCommunityIcons
                                    name="spray-bottle"
                                    size={14}
                                    color={customTheme.colors.onSurfaceVariant}
                                />
                                {produtosValidos.slice(0, 3).map((p, idx) => (
                                    <View key={idx} style={styles.produtoBadge}>
                                        <Text style={styles.produtoBadgeText}>
                                            {p.nome} ({p.quantidade})
                                        </Text>
                                    </View>
                                ))}
                                {produtosValidos.length > 3 && (
                                    <View style={[styles.produtoBadge, styles.produtoBadgeMais]}>
                                        <Text style={[styles.produtoBadgeText, { color: customTheme.colors.primary }]}>
                                            +{produtosValidos.length - 3}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* ── Rodapé: fotos + responsável + delete ──────── */}
                        <View style={styles.cardFooter}>
                            {/* Fotos */}
                            <View style={styles.fotosRow}>
                                {fotosCount > 0 ? (
                                    <>
                                        {todasFotos.slice(0, 3).map((foto, idx) => (
                                            <Image
                                                key={idx}
                                                source={{ uri: foto.url }}
                                                style={styles.thumbnail}
                                            />
                                        ))}
                                        {fotosCount > 3 && (
                                            <View style={styles.thumbnailExtra}>
                                                <Text style={styles.thumbnailExtraText}>+{fotosCount - 3}</Text>
                                            </View>
                                        )}
                                    </>
                                ) : (
                                    <View style={styles.semFotos}>
                                        <MaterialCommunityIcons
                                            name="image-off-outline"
                                            size={14}
                                            color={customTheme.colors.onSurfaceVariant}
                                        />
                                        <Text style={styles.semFotosText}>Sem fotos</Text>
                                    </View>
                                )}
                            </View>

                            {/* Responsável + delete */}
                            <View style={styles.responsavelRow}>
                                <MaterialCommunityIcons
                                    name="account-circle-outline"
                                    size={15}
                                    color={customTheme.colors.onSurfaceVariant}
                                />
                                <Text style={styles.responsavelText} numberOfLines={1}>
                                    {lavagem.responsavel}
                                </Text>
                                {canEditDelete() && (
                                    <TouchableOpacity
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            setSelectedLavagem(lavagem);
                                            setShowDeleteConfirm(true);
                                        }}
                                        style={styles.deleteBtn}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <MaterialCommunityIcons
                                            name="trash-can-outline"
                                            size={18}
                                            color={customTheme.colors.error}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderFilterBar = () => {
        const hasFilter = !!(filterStatus || filterVeiculo || filterTipoLavagem);
        const sourceCount = hasFilter ? lagensFiltradas.length : todasLavagens.length;

        const FilterChip = ({
            label,
            icon,
            value,
            active,
            onPress,
        }: {
            label: string;
            icon: string;
            value: string;
            active: boolean;
            onPress: () => void;
        }) => (
            <TouchableOpacity
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <MaterialCommunityIcons
                    name={icon}
                    size={14}
                    color={active ? customTheme.colors.primary : customTheme.colors.onSurfaceVariant}
                />
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {label}
                </Text>
                {active && (
                    <MaterialCommunityIcons name="close" size={12} color={customTheme.colors.primary} />
                )}
            </TouchableOpacity>
        );

        return (
            <View style={styles.filterBar}>
                {/* Resumo */}
                <View style={styles.filterSummary}>
                    <MaterialCommunityIcons name="history" size={14} color={customTheme.colors.onSurfaceVariant} />
                    <Text style={styles.filterSummaryText}>
                        {sourceCount} {sourceCount === 1 ? 'registro' : 'registros'}
                        {hasFilter ? ' encontrados' : ' no total'}
                    </Text>
                    {hasFilter && (
                        <TouchableOpacity onPress={limparFiltros} style={styles.clearBtn}>
                            <Text style={styles.clearBtnText}>Limpar</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Chips de filtro */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScrollContent}
                >
                    <FilterChip
                        label="Completa"
                        icon="shimmer"
                        value="completa"
                        active={filterTipoLavagem === 'completa'}
                        onPress={() => setFilterTipoLavagem(filterTipoLavagem === 'completa' ? null : 'completa')}
                    />
                    <FilterChip
                        label="Simples"
                        icon="car-wash"
                        value="simples"
                        active={filterTipoLavagem === 'simples'}
                        onPress={() => setFilterTipoLavagem(filterTipoLavagem === 'simples' ? null : 'simples')}
                    />
                </ScrollView>
            </View>
        );
    };

    const renderLoadMoreButton = () => {
        const restantes = todasLavagens.length - lavagens.length;
        return (
            <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
                disabled={loadingMore}
                activeOpacity={0.7}
            >
                {loadingMore ? (
                    <ActivityIndicator size="small" color={customTheme.colors.primary} />
                ) : (
                    <>
                        <MaterialCommunityIcons name="chevron-double-down" size={16} color={customTheme.colors.primary} />
                        <Text style={styles.loadMoreText}>
                            Ver mais {restantes > 0 ? `(${restantes} restantes)` : ''}
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
                <MaterialCommunityIcons name="car-wash" size={40} color={customTheme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma lavagem encontrada</Text>
            <Text style={styles.emptyText}>
                {(filterStatus || filterVeiculo || filterTipoLavagem)
                    ? 'Nenhum registro corresponde aos filtros aplicados.'
                    : 'Ainda não há registros de lavagem no sistema.'}
            </Text>
            {(filterStatus || filterVeiculo || filterTipoLavagem) && (
                <TouchableOpacity style={styles.emptyLimparBtn} onPress={limparFiltros}>
                    <MaterialCommunityIcons name="filter-off-outline" size={15} color={customTheme.colors.primary} />
                    <Text style={styles.emptyLimparText}>Limpar filtros</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <ModernHeader
                title="Histórico de Lavagens"
                iconName="car-wash"
                onBackPress={() => navigation.goBack()}

                rightIcon='clipboard-plus'
                rightAction={() => navigation.navigate('LavagemForm')}
            />

            {/* Barra de filtros */}
            {!loading && renderFilterBar()}

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customTheme.colors.primary} />
                    <Text style={styles.loadingText}>Carregando histórico...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[customTheme.colors.primary]}
                        />
                    }
                >
                    <View style={styles.container}>
                        {/* Lista de lavagens */}
                        {lavagens.length > 0 ? (
                            lavagens.map((lavagem, index) => renderLavagemCard(lavagem, index))
                        ) : (
                            renderEmptyState()
                        )}

                        {/* Botão Carregar Mais */}
                        {hasMore && lavagens.length > 0 && renderLoadMoreButton()}
                    </View>
                </ScrollView>
            )}

            {/* Modal de Detalhe */}
            {selectedLavagem && (
                <DetalheLavagemModal
                    visible={detalheModalVisible}
                    onClose={() => {
                        setDetalheModalVisible(false);
                        setSelectedLavagem(null);
                    }}
                    lavagem={selectedLavagem}
                    onEdit={() => {
                        setDetalheModalVisible(false);
                        navigation.navigate('LavagemForm', {
                            mode: 'edit',
                            LavagemInterface: selectedLavagem
                        });
                    }}
                />
            )}

            {/* Modal de Confirmação para Exclusão */}
            <ConfirmationModal
                visible={showDeleteConfirm}
                title="Confirmar exclusão"
                message="Tem certeza que deseja excluir este registro de lavagem?"
                itemToDelete={`Lavagem de ${selectedLavagem?.veiculo?.placa} em ${selectedLavagem?.data}`}
                onCancel={() => setShowDeleteConfirm(false)}
                onConfirm={() => {
                    if (selectedLavagem?.id) {
                        handleDelete(selectedLavagem.id);
                    }
                    setShowDeleteConfirm(false);
                }}
                confirmText="Excluir"
                iconName="delete-alert"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // ── Layout ───────────────────────────────────────────────────────────────
    safeArea: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    scrollView: {
        flex: 1,
    },
    container: {
        padding: 16,
        paddingBottom: 32,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 15,
        color: customTheme.colors.onSurfaceVariant,
    },

    // ── Barra de filtros ─────────────────────────────────────────────────────
    filterBar: {
        backgroundColor: customTheme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.surfaceVariant,
        paddingBottom: 10,
    },
    filterSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 8,
    },
    filterSummaryText: {
        flex: 1,
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        fontWeight: '500',
    },
    clearBtn: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: customTheme.colors.error,
    },
    clearBtnText: {
        fontSize: 11,
        color: customTheme.colors.error,
        fontWeight: '600',
    },
    filterScrollContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        backgroundColor: customTheme.colors.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customTheme.colors.outlineVariant,
    },
    filterChipActive: {
        backgroundColor: customTheme.colors.primaryContainer,
        borderColor: customTheme.colors.primary,
    },
    filterChipText: {
        fontSize: 13,
        color: customTheme.colors.onSurfaceVariant,
        fontWeight: '500',
    },
    filterChipTextActive: {
        fontSize: 13,
        color: customTheme.colors.primary,
        fontWeight: '600',
    },

    // ── Card ─────────────────────────────────────────────────────────────────
    card: {
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: customTheme.colors.surface,
        elevation: 2,
        borderWidth: 1,
        borderColor: customTheme.colors.surfaceVariant,
    },
    cardAccentBar: {
        height: 4,
    },
    cardContent: {
        padding: 14,
        gap: 12,
    },

    // linha 1: tipo + data
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    tipoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tipoBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    dataHoraBox: {
        alignItems: 'flex-end',
    },
    dataText: {
        fontSize: 13,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        textTransform: 'capitalize',
    },
    horaText: {
        fontSize: 11,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 1,
    },

    // linha 2: veículo
    veiculoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    veiculoIconBox: {
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    veiculoPlaca: {
        fontSize: 17,
        fontWeight: '700',
        color: customTheme.colors.onSurface,
        letterSpacing: 0.3,
    },
    veiculoTipo: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 1,
    },

    // linha 3: produtos
    produtosRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
    },
    produtoBadge: {
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    produtoBadgeMais: {
        backgroundColor: customTheme.colors.primaryContainer,
    },
    produtoBadgeText: {
        fontSize: 11,
        color: customTheme.colors.onSurfaceVariant,
        fontWeight: '500',
    },

    // rodapé
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.surfaceVariant,
    },
    fotosRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    thumbnail: {
        width: 32,
        height: 32,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: customTheme.colors.surfaceVariant,
    },
    thumbnailExtra: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: customTheme.colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumbnailExtraText: {
        fontSize: 10,
        color: customTheme.colors.primary,
        fontWeight: '700',
    },
    semFotos: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    semFotosText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    responsavelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexShrink: 1,
        maxWidth: '55%',
    },
    responsavelText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        flex: 1,
    },
    deleteBtn: {
        marginLeft: 6,
        padding: 2,
    },

    // ── Load more ────────────────────────────────────────────────────────────
    loadMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 4,
        marginBottom: 8,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: customTheme.colors.primary,
        backgroundColor: customTheme.colors.surface,
    },
    loadMoreText: {
        fontSize: 14,
        fontWeight: '600',
        color: customTheme.colors.primary,
    },

    // ── Estado vazio ─────────────────────────────────────────────────────────
    emptyContainer: {
        marginTop: 24,
        paddingVertical: 48,
        paddingHorizontal: 24,
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: customTheme.colors.surfaceVariant,
    },
    emptyIconBox: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: customTheme.colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: customTheme.colors.onSurface,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyLimparBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 20,
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: customTheme.colors.primary,
    },
    emptyLimparText: {
        fontSize: 13,
        fontWeight: '600',
        color: customTheme.colors.primary,
    },
});