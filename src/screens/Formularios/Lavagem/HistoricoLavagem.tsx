import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Animated,
    Dimensions,
    Image
} from 'react-native';
import { Surface, Text, Card, Chip, Badge } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import ModernHeader from '../../../assets/components/ModernHeader';
import { useUser } from '../../../contexts/userContext';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import { customTheme } from '../../../theme/theme';
import { hasAccess } from '../../Adm/components/admTypes';
import ConfirmationModal from '../../../assets/components/ConfirmationModal';
import DetalheLavagemModal from './Components/DetalheLavagemModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getTipoLavagemDetails, getTipoVeiculoColor, getTipoVeiculoIcon, getTipoVeiculoLabel } from './Components/utils/lavagemUtils';

interface HistoricoLavagemProps {
    navigation: any;
}

interface LavagemData {
    id: string;
    responsavel: string;
    data: string;
    hora: string;
    veiculo: {
        placa: string;
        tipo: string;
        numeroEquipamento?: string | null;
    };
    tipoLavagem: string;
    produtos: Array<{
        nome: string;
        quantidade: number;
    }>;
    fotos: Array<{
        url: string;
        timestamp: number;
        path: string;
    }>;
    observacoes?: string;
    status: string;
    createdAt: any;
    createdBy: string | null;
    agendamentoId?: string | null;
}

export default function HistoricoLavagem({ navigation }: HistoricoLavagemProps) {
    const { userInfo } = useUser();
    const [lavagens, setLavagens] = useState<LavagemData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [todasLavagens, setTodasLavagens] = useState<LavagemData[]>([]);
    const [lagensFiltradas, setLavagensFiltradas] = useState<LavagemData[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const ITEMS_PER_PAGE = 15;

    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [filterVeiculo, setFilterVeiculo] = useState<string | null>(null);
    const [filterTipoLavagem, setFilterTipoLavagem] = useState<string | null>(null);

    const [selectedLavagem, setSelectedLavagem] = useState<LavagemData | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
    const [detalheModalVisible, setDetalheModalVisible] = useState(false);

    // Animações
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    const canEditDelete = () => userInfo && hasAccess(userInfo, 'lavagem', 2);

    const buscarLavagens = async () => {
        try {
            setLoading(true);

            // Buscar lavagens no novo formato
            const snapshotNovo = await firestore()
                .collection('registroLavagens')
                .orderBy('createdAt', 'desc')
                .get();

            // Buscar lavagens no formato antigo
            const snapshotAntigo = await firestore()
                .collection('registroLavagens')
                .where('placaVeiculo', '!=', null)
                .get();

            console.log(`Quantidade de lavagens novas: ${snapshotNovo.size}`);
            console.log(`Quantidade de lavagens antigas: ${snapshotAntigo.size}`);

            // Processar dados do novo formato
            const dadosNovos = snapshotNovo.docs
                .filter(doc => !doc.data().placaVeiculo) // Filtrar apenas os registros do novo formato
                .map(doc => {
                    const data = doc.data() as LavagemData;
                    return {
                        id: doc.id,
                        responsavel: data.responsavel || '',
                        data: data.data || '',
                        hora: data.hora || '',
                        veiculo: data.veiculo || { placa: '', tipo: '' },
                        tipoLavagem: data.tipoLavagem || '',
                        produtos: data.produtos || [],
                        fotos: data.fotos || [],
                        observacoes: data.observacoes || '',
                        status: data.status || 'concluido',
                        createdAt: data.createdAt || null,
                        createdBy: data.createdBy || null,
                        agendamentoId: data.agendamentoId || null
                    } as LavagemData;
                });

            // Processar dados do formato antigo
            const dadosAntigos = snapshotAntigo.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    responsavel: data.responsavel || '',
                    data: data.data || '',
                    hora: data.hora || '',
                    veiculo: {
                        placa: data.placaVeiculo || '',
                        tipo: 'veiculo', // Assumir que todos são veículos no formato antigo
                        numeroEquipamento: null
                    },
                    tipoLavagem: data.tipoLavagem || '',
                    produtos: (data.produtos || []).map((p: any) => ({
                        nome: p.produto || '',
                        quantidade: parseInt(p.quantidade) || 0
                    })),
                    fotos: [], // Iniciar vazio
                    observacoes: data.observacoes || '',
                    status: 'concluido', // Assumir que todos são concluídos no formato antigo
                    createdAt: data.createdAt ?
                        (typeof data.createdAt === 'string' ?
                            firestore.Timestamp.fromDate(new Date(data.createdAt)) :
                            data.createdAt
                        ) : null,
                    createdBy: null,
                    agendamentoId: null
                } as LavagemData;
            });

            // Processar fotos do formato antigo
            for (const lavagem of dadosAntigos) {
                const docData = snapshotAntigo.docs.find(doc => doc.id === lavagem.id)?.data();

                if (docData) {
                    // Tratar photoUrls como array de strings
                    if (docData.photoUrls && Array.isArray(docData.photoUrls)) {
                        lavagem.fotos = docData.photoUrls.map((url: string, index: number) => ({
                            url,
                            timestamp: Date.now() + index,
                            path: `legado/${lavagem.id}/${index}`
                        }));
                    }
                    // Tratar photoUris como array de objetos
                    else if (docData.photoUris && Array.isArray(docData.photoUris)) {
                        lavagem.fotos = docData.photoUris.map((uri: any, index: number) => ({
                            url: uri.url || uri.uri || uri,
                            timestamp: Date.now() + index,
                            path: `legado/${lavagem.id}/${index}`
                        }));
                    }
                }
            }

            // Combinar dados dos dois formatos
            const todosDados = [...dadosNovos, ...dadosAntigos];

            // Ordenar por data de criação (mais recente primeiro)
            const dadosOrdenados = todosDados.sort((a, b) => {
                let dataA = 0;
                let dataB = 0;

                // Para objetos com createdAt como Timestamp
                if (a.createdAt && typeof a.createdAt.toDate === 'function') {
                    dataA = a.createdAt.toDate().getTime();
                }
                // Para strings de data ISO
                else if (a.createdAt && typeof a.createdAt === 'string') {
                    dataA = new Date(a.createdAt).getTime();
                }

                if (b.createdAt && typeof b.createdAt.toDate === 'function') {
                    dataB = b.createdAt.toDate().getTime();
                }
                else if (b.createdAt && typeof b.createdAt === 'string') {
                    dataB = new Date(b.createdAt).getTime();
                }

                return dataB - dataA;
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

    const handleDelete = async (id: string) => {
        try {
            await firestore()
                .collection('registroLavagens')
                .doc(id)
                .delete();

            showGlobalToast('success', 'Sucesso', 'Registro excluído com sucesso', 3000);
            onRefresh();
        } catch (error) {
            console.error('Erro ao excluir registro:', error);
            Alert.alert("Erro", "Não foi possível excluir o registro.");
        }
    };

    const formatarData = (data: string) => {
        if (!data) return '';

        try {
            // Assumindo que data está em formato DD/MM/YYYY
            const parts = data.split('/');
            if (parts.length !== 3) return data;

            const dia = parseInt(parts[0]);
            const mes = parseInt(parts[1]) - 1; // Mês em JS começa em 0
            const ano = parseInt(parts[2]);

            const date = new Date(ano, mes, dia);

            // Formatar para exibição (com nome do dia da semana)
            return format(date, "EEE, dd 'de' MMM", { locale: ptBR });
        } catch (error) {
            console.error('Erro ao formatar data:', error);
            return data;
        }
    };

    const renderLavagemCard = (lavagem: LavagemData, index: number) => {
        const tipoLavagemInfo = getTipoLavagemDetails(lavagem.tipoLavagem);
        const dataFormatada = formatarData(lavagem.data);
        const animationDelay = index * 100; // Escalonar animação por índice

        return (
            <Animated.View
                key={lavagem.id}
                style={[
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    }
                ]}
            >
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => {
                        setSelectedLavagem(lavagem);
                        setDetalheModalVisible(true);
                    }}
                    activeOpacity={0.7}
                >
                    {/* Barra colorida superior */}
                    <View style={[styles.cardGradient, { backgroundColor: tipoLavagemInfo.bg }]} />

                    <View style={styles.cardContent}>
                        {/* Cabeçalho: Tipo de Lavagem, Status e Data */}
                        <View style={styles.headerRow}>
                            <Chip
                                icon={() => (
                                    <MaterialCommunityIcons
                                        name={tipoLavagemInfo.icon}
                                        size={16}
                                        color={tipoLavagemInfo.text}
                                    />
                                )}
                                style={[styles.tipoChip, { backgroundColor: tipoLavagemInfo.bg }]}
                                textStyle={{ color: tipoLavagemInfo.text }}
                            >
                                {lavagem.tipoLavagem.toUpperCase()}
                            </Chip>

                            {/* <View style={styles.statusContainer}>
                                <Badge
                                    style={[
                                        styles.statusBadge,
                                        {
                                            backgroundColor: lavagem.status === 'concluido' ?
                                                customTheme.colors.primaryContainer :
                                                customTheme.colors.errorContainer
                                        }
                                    ]}
                                >
                                    {lavagem.status === 'concluido' ? 'Concluído' : 'Pendente'}
                                </Badge>
                            </View> */}
                        </View>

                        {/* Linha 2: Veículo e Data/Hora */}
                        <View style={styles.infoRow}>
                            <View style={styles.veiculoContainer}>
                                <MaterialCommunityIcons
                                    name={getTipoVeiculoIcon(lavagem.veiculo.tipo)}
                                    size={20}
                                    color={getTipoVeiculoColor(lavagem.veiculo.tipo)}
                                />
                                <View style={styles.veiculoInfoContainer}>
                                    <Text style={styles.veiculoText}>
                                        {lavagem.veiculo.placa}
                                        {lavagem.veiculo.numeroEquipamento ?
                                            ` (Eq. ${lavagem.veiculo.numeroEquipamento})` :
                                            ''}
                                    </Text>

                                    {/* Badge mostrando o tipo do item quando for "outros" */}
                                    {lavagem.veiculo.tipo.toLowerCase() === 'outros' && (
                                        <View style={styles.tipoOutrosContainer}>
                                            <Text style={styles.tipoOutrosText}>
                                                {getTipoVeiculoLabel(lavagem.veiculo.tipo)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={styles.dataHoraContainer}>
                                <MaterialCommunityIcons
                                    name="calendar-today"
                                    size={18}
                                    color={customTheme.colors.secondary}
                                />
                                <View>
                                    <Text style={styles.dataText}>
                                        {dataFormatada}
                                    </Text>
                                    <Text style={styles.horaText}>
                                        {lavagem.hora}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Linha 3: Produtos utilizados */}
                        {lavagem.produtos && lavagem.produtos.length > 0 &&
                            lavagem.produtos.some(p => p.nome && !isNaN(p.quantidade)) && (
                                <View style={styles.produtosContainer}>
                                    <Text style={styles.produtosTitle}>
                                        <MaterialCommunityIcons
                                            name="spray-bottle"
                                            size={16}
                                            color={customTheme.colors.primary}
                                            style={{ marginRight: 4 }}
                                        />
                                        Produtos:
                                    </Text>
                                    <View style={styles.produtosRow}>
                                        {lavagem.produtos
                                            .filter(produto => produto.nome && !isNaN(produto.quantidade))
                                            .slice(0, 3).map((produto, idx) => (
                                                <Chip
                                                    key={`${lavagem.id}-prod-${idx}`}
                                                    style={styles.produtoChip}
                                                    textStyle={styles.produtoChipText}
                                                >
                                                    {produto.nome} ({produto.quantidade})
                                                </Chip>
                                            ))}

                                        {lavagem.produtos.filter(p => p.nome && !isNaN(p.quantidade)).length > 3 && (
                                            <Chip
                                                style={styles.produtoChipMais}
                                                textStyle={{ color: customTheme.colors.primary }}
                                            >
                                                +{lavagem.produtos.filter(p => p.nome && !isNaN(p.quantidade)).length - 3}
                                            </Chip>
                                        )}
                                    </View>
                                </View>
                            )}

                        {/* Linha 4: Fotos e Responsável */}
                        <View style={styles.footerRow}>
                            <View style={styles.fotosContainer}>
                                <MaterialCommunityIcons
                                    name="image-multiple"
                                    size={18}
                                    color={customTheme.colors.primary}
                                />
                                <Text style={styles.fotosText}>
                                    {lavagem.fotos?.length || 0} fotos
                                </Text>

                                {/* Miniatura das fotos */}
                                {lavagem.fotos && lavagem.fotos.length > 0 && (
                                    <View style={styles.thumbnailsContainer}>
                                        {lavagem.fotos.slice(0, 2).map((foto, idx) => (
                                            <Image
                                                key={`thumb-${idx}`}
                                                source={{ uri: foto.url }}
                                                style={styles.thumbnail}
                                            />
                                        ))}

                                        {lavagem.fotos.length > 2 && (
                                            <View style={styles.moreThumbnails}>
                                                <Text style={styles.moreThumbnailsText}>
                                                    +{lavagem.fotos.length - 2}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>

                            <View style={styles.responsavelActionContainer}>
                                <View style={styles.responsavelContainer}>
                                    <MaterialCommunityIcons
                                        name="account"
                                        size={16}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text style={styles.responsavelText} numberOfLines={1}>
                                        {lavagem.responsavel}
                                    </Text>
                                </View>

                                {canEditDelete() && (
                                    <TouchableOpacity
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            setSelectedLavagem(lavagem);
                                            setShowDeleteConfirm(true);
                                        }}
                                        style={styles.deleteButton}
                                    >
                                        <MaterialCommunityIcons
                                            name="delete"
                                            size={20}
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

    const renderFilterBar = () => (
        <View style={styles.filterBar}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
            >

                {/* Filtro de Tipo de Lavagem */}
                <TouchableOpacity
                    style={[
                        styles.filterChip,
                        filterTipoLavagem === 'completa' && styles.filterChipActive
                    ]}
                    onPress={() => setFilterTipoLavagem(
                        filterTipoLavagem === 'completa' ? null : 'completa'
                    )}
                >
                    <MaterialCommunityIcons
                        name="car-wash"
                        size={16}
                        color={filterTipoLavagem === 'completa' ?
                            customTheme.colors.primary :
                            customTheme.colors.onSurfaceVariant
                        }
                    />
                    <Text
                        style={[
                            styles.filterChipText,
                            filterTipoLavagem === 'completa' && styles.filterChipTextActive
                        ]}
                    >
                        Completa
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterChip,
                        filterTipoLavagem === 'simples' && styles.filterChipActive
                    ]}
                    onPress={() => setFilterTipoLavagem(
                        filterTipoLavagem === 'simples' ? null : 'simples'
                    )}
                >
                    <MaterialCommunityIcons
                        name="car-wash"
                        size={16}
                        color={filterTipoLavagem === 'simples' ?
                            customTheme.colors.primary :
                            customTheme.colors.onSurfaceVariant
                        }
                    />
                    <Text
                        style={[
                            styles.filterChipText,
                            filterTipoLavagem === 'simples' && styles.filterChipTextActive
                        ]}
                    >
                        Simples
                    </Text>
                </TouchableOpacity>

                {/* Botão para limpar filtros */}
                {(filterStatus || filterVeiculo || filterTipoLavagem) && (
                    <TouchableOpacity
                        style={styles.clearFilterButton}
                        onPress={limparFiltros}
                    >
                        <MaterialCommunityIcons
                            name="close"
                            size={16}
                            color={customTheme.colors.error}
                        />
                        <Text style={styles.clearFilterText}>
                            Limpar filtros
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );

    const renderLoadMoreButton = () => (
        <View style={styles.loadMoreWrapper}>
            <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
                disabled={loadingMore}
            >
                {loadingMore ? (
                    <ActivityIndicator size="small" color={customTheme.colors.primary} />
                ) : (
                    <>
                        <Text style={styles.loadMoreText}>
                            Carregar mais
                            {todasLavagens.length - lavagens.length > 0 &&
                                ` (${todasLavagens.length - lavagens.length} restantes)`}
                        </Text>
                        <MaterialCommunityIcons
                            name="chevron-double-down"
                            size={20}
                            color={customTheme.colors.primary}
                        />
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
                name="car-off"
                size={64}
                color={customTheme.colors.onSurfaceVariant}
            />
            <Text style={styles.emptyTitle}>
                Nenhuma lavagem encontrada
            </Text>
            <Text style={styles.emptyText}>
                Não há registros de lavagens no sistema.
            </Text>

            {(filterStatus || filterVeiculo || filterTipoLavagem) && (
                <TouchableOpacity
                    style={styles.clearFilterButtonEmpty}
                    onPress={limparFiltros}
                >
                    <Text style={styles.clearFilterButtonEmptyText}>
                        Limpar filtros
                    </Text>
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
                            lavagemData: selectedLavagem
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
    veiculoInfoContainer: {
        flex: 1,
    },
    tipoOutrosContainer: {
        backgroundColor: customTheme.colors.tertiaryContainer || '#FFF3E0',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 2,
    },
    tipoOutrosText: {
        fontSize: 10,
        color: customTheme.colors.tertiary || '#FF9800',
        fontWeight: '600',
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    container: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
    },

    // Estilos dos filtros
    filterBar: {
        backgroundColor: customTheme.colors.surfaceVariant,
        paddingVertical: 12,
        elevation: 2,
    },
    filterScrollContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        marginRight: 8,
        gap: 6,
    },
    filterChipActive: {
        backgroundColor: customTheme.colors.primaryContainer,
        borderColor: customTheme.colors.primary,
    },
    filterChipText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    filterChipTextActive: {
        fontSize: 14,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    clearFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: customTheme.colors.errorContainer,
        borderRadius: 20,
        gap: 6,
    },
    clearFilterText: {
        fontSize: 14,
        color: customTheme.colors.error,
        fontWeight: '500',
    },
    clearFilterButtonEmpty: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: customTheme.colors.errorContainer,
        borderRadius: 20,
    },
    clearFilterButtonEmptyText: {
        fontSize: 14,
        color: customTheme.colors.error,
        fontWeight: '500',
    },

    // Estilos dos cards
    card: {
        marginBottom: 16,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardGradient: {
        height: 5,
        width: '100%',
    },
    cardContent: {
        padding: 16,
        gap: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tipoChip: {
        paddingHorizontal: 8,
        height: 28,
    },

    // Info Row
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    veiculoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    veiculoText: {
        fontSize: 17,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
    dataHoraContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dataText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    horaText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },

    // Produtos
    produtosContainer: {
        gap: 8,
    },
    produtosTitle: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    produtosRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    produtoChip: {
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    produtoChipText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    produtoChipMais: {
        backgroundColor: customTheme.colors.primaryContainer,
    },

    // Footer
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.surfaceVariant,
        paddingTop: 12,
    },
    fotosContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    fotosText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    thumbnailsContainer: {
        flexDirection: 'row',
        marginLeft: 8,
        gap: 4,
    },
    thumbnail: {
        width: 30,
        height: 30,
        borderRadius: 4,
    },
    moreThumbnails: {
        width: 30,
        height: 30,
        borderRadius: 4,
        backgroundColor: customTheme.colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreThumbnailsText: {
        fontSize: 10,
        color: customTheme.colors.onSurfaceVariant,
        fontWeight: '600',
    },
    responsavelActionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    responsavelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    responsavelText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    deleteButton: {
        padding: 4,
    },

    // Load More
    loadMoreWrapper: {
        paddingTop: 8,
        paddingBottom: 24,
    },
    loadMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        backgroundColor: customTheme.colors.primaryContainer,
        borderRadius: 10,
        gap: 8,
    },
    loadMoreText: {
        color: customTheme.colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },

    // Estado vazio
    emptyContainer: {
        paddingVertical: 48,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 12,
        opacity: 0.9,
    },
    emptyTitle: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.onSurfaceVariant,
    },
    emptyText: {
        marginTop: 8,
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center',
        paddingHorizontal: 32,
    },

    // FAB
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 16,
        backgroundColor: customTheme.colors.primary,
        borderRadius: 28,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    fabText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});