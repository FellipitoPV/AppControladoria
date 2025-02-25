import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
    Alert,
    Modal,
} from 'react-native';
import { Surface, Button, Text, Card, Chip, TextInput, Dialog, Portal } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import { customTheme } from '../../../theme/theme';
import ModernHeader from '../../../assets/components/ModernHeader';
import FullScreenImage from '../../../assets/components/FullScreenImage';
import { Dropdown } from 'react-native-element-dropdown';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import { PLACAS_VEICULOS, TIPOS_LAVAGEM } from './Components/lavagemTypes';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DropdownRef } from '../../../helpers/Types';
import { useUser } from '../../../contexts/userContext';
import { hasAccess } from '../../Adm/components/admTypes';
import EditLavagemModal from './Components/EditLavagemModal';
import ConfirmationModal from '../../../assets/components/ConfirmationModal';

interface Lavagem {
    id: string;
    responsavel: string;
    data: string;
    hora: string;
    veiculo: {
        placa: string;
        tipo: string;
        numeroEquipamento?: string;
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
    observacoes: string;
    status: string;
    createdAt: number;
}

interface HistoricoLavagemProps {
    navigation: any;
}

export default function HistoricoLavagem({ navigation }: HistoricoLavagemProps) {
    const { userInfo } = useUser();

    const [lavagens, setLavagens] = useState<Lavagem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; id: string } | null>(null);
    const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);

    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 20;

    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)
    const [todasLavagens, setTodasLavagens] = useState<Lavagem[]>([]);
    const [lavagensVisiveis, setLavagensVisiveis] = useState<Lavagem[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedLavagem, setSelectedLavagem] = useState<Lavagem | null>(null);

    const canEditeDelete = () => userInfo && hasAccess(userInfo, 'lavagem', 2);

    // Função para normalizar os produtos
    const normalizarProdutos = (produtos: any[]) => {
        if (!Array.isArray(produtos)) return [];

        return produtos.map(prod => {
            // Se for formato antigo (tem 'produto' ao invés de 'nome')
            if ('produto' in prod) {
                return {
                    nome: prod.produto,
                    quantidade: parseInt(prod.quantidade) || 1 // Converte para número
                };
            }
            // Formato novo
            return {
                nome: prod.nome || 'Produto não especificado',
                quantidade: prod.quantidade || 1
            };
        });
    };

    // Função para normalizar os dados de lavagem
    const normalizarLavagem = (doc: any): Lavagem => {

        // Verifica se é o formato antigo (pela presença de placaVeiculo)
        const isFormatoAntigo = 'placaVeiculo' in doc;

        // Normaliza as fotos
        const fotos = isFormatoAntigo
            ? (doc.photoUrls || []).map((url: string, index: number) => ({
                url,
                path: `legacy_${index}`,
                timestamp: new Date(doc.createdAt).getTime()
            }))
            : (doc.fotos || []).map((foto: any, index: number) => ({
                url: foto.url || '',
                path: foto.path || `new_${index}`,
                timestamp: foto.timestamp || (doc.createdAt?.toDate?.()?.getTime() || Date.now())
            }));

        // Normaliza o veículo
        const veiculo = isFormatoAntigo
            ? {
                placa: doc.placaVeiculo,
                tipo: doc.placaVeiculo.includes('COMPACTADORA') || doc.placaVeiculo.includes('EQUIPAMENTO')
                    ? 'equipamento'
                    : 'veiculo',
                numeroEquipamento: doc.placaVeiculo.includes('COMPACTADORA') || doc.placaVeiculo.includes('EQUIPAMENTO')
                    ? doc.placaVeiculo.split('-')[1]
                    : null
            }
            : doc.veiculo || {
                placa: '',
                tipo: 'veiculo',
                numeroEquipamento: null
            };

        // Normaliza a data de criação
        let createdAtTime;
        if (isFormatoAntigo) {
            createdAtTime = new Date(doc.createdAt).getTime();
        } else {
            createdAtTime = doc.createdAt?.toDate?.()?.getTime() || Date.now();
        }

        // Normaliza os produtos
        const produtos = normalizarProdutos(doc.produtos || []);

        // Constrói o objeto normalizado
        const lavagem: Lavagem = {
            id: doc.id,
            responsavel: doc.responsavel || '',
            data: doc.data || '',
            hora: doc.hora || '',
            veiculo: veiculo,
            tipoLavagem: doc.tipoLavagem || '',
            produtos: produtos,
            fotos: fotos,
            observacoes: doc.observacoes || '',
            status: doc.status || 'concluido',
            createdAt: createdAtTime
        };

        return lavagem;
    };

    // Modifique a função buscarLavagens para usar apenas um campo de ordenação por enquanto
    const buscarLavagens = async () => {
        try {
            setLoading(true);

            // Buscar todos os registros sem limite
            let queryAntigos = firestore()
                .collection('registroLavagens')
                .orderBy('createdAt', 'desc');

            let queryNovos = firestore()
                .collection('lavagens')
                .orderBy('data', 'desc');

            const [snapshotNovos, snapshotAntigos] = await Promise.all([
                queryNovos.get(),
                queryAntigos.get()
            ]);

            console.log('===== DIAGNÓSTICO DE LAVAGENS =====');
            console.log(`Quantidade de documentos NOVOS (lavagens): ${snapshotNovos.size}`);
            console.log(`Quantidade de documentos ANTIGOS (registroLavagens): ${snapshotAntigos.size}`);

            // Processar os dados
            const dadosNovos = snapshotNovos.docs.map(doc => normalizarLavagem({
                id: doc.id,
                ...doc.data()
            }));

            const dadosAntigos = snapshotAntigos.docs.map(doc => normalizarLavagem({
                id: doc.id,
                ...doc.data()
            }));

            // Combinar e ordenar todos os dados
            const todosDados = [...dadosNovos, ...dadosAntigos].sort((a, b) => {
                if (a.createdAt && b.createdAt) {
                    return b.createdAt - a.createdAt;
                }

                const dataA = new Date(a.data.split('/').reverse().join('-') + ' ' + a.hora);
                const dataB = new Date(b.data.split('/').reverse().join('-') + ' ' + b.hora);
                return dataB.getTime() - dataA.getTime();
            });

            // Guardar todos os dados em um estado
            setTodasLavagens(todosDados);
            // Mostrar apenas os primeiros 20
            setLavagensVisiveis(todosDados.slice(0, LIMIT));
            // Atualizar se ainda há mais para mostrar
            setHasMore(todosDados.length > LIMIT);

        } catch (error) {
            console.error('Erro ao buscar lavagens:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleLoadMore = () => {
        const nextPage = currentPage + 1;
        const startIndex = 0;
        const endIndex = nextPage * LIMIT;

        setLavagensVisiveis(todasLavagens.slice(startIndex, endIndex));
        setCurrentPage(nextPage);
        setHasMore(endIndex < todasLavagens.length);
    };

    const handleEdit = (lavagem: Lavagem) => {
        setSelectedLavagem(lavagem);
        setEditModalVisible(true);
    };

    // Modifique a função de refresh para resetar os estados
    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setLastVisible(null);
        setHasMore(true);
        buscarLavagens();
    }, []);

    useEffect(() => {
        buscarLavagens();
    }, []);

    const handlePhotoPress = (url: string, id: string) => {
        setSelectedPhoto({ uri: url, id });
        setIsFullScreenVisible(true);
    };

    const getOptimizedImageUrl = (url: string, width: number = 100) => {
        // Verifica se é uma URL do Firebase Storage
        if (url.includes('firebasestorage.googleapis.com')) {
            // Adiciona parâmetros de redimensionamento
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}w=${width}&h=${width}&alt=media`;
        }
        return url;
    };

    const getTipoLavagemChipColor = (tipo: string) => {
        switch (tipo.toLowerCase()) {
            case 'completa':
                return { bg: customTheme.colors.primaryContainer, text: customTheme.colors.primary };
            case 'simples':
                return { bg: customTheme.colors.secondaryContainer, text: customTheme.colors.secondary };
            default:
                return { bg: customTheme.colors.surfaceVariant, text: customTheme.colors.onSurfaceVariant };
        }
    };

    const ThumbnailImage = ({ uri, style }: { uri: string; style?: any }) => {
        const [isLoading, setIsLoading] = useState(true);
        // Gera URL otimizada para thumbnail
        const thumbnailUrl = getOptimizedImageUrl(uri, 80); // 2x o tamanho para telas retina

        return (
            <View style={[style, styles.thumbnailContainer]}>
                <Image
                    source={{ uri: thumbnailUrl }}
                    style={[style, { position: 'absolute' }]}
                    onLoadStart={() => setIsLoading(true)}
                    onLoadEnd={() => setIsLoading(false)}
                />
                {isLoading && (
                    <View style={[style, styles.loadingContainer]}>
                        <ActivityIndicator
                            size="small"
                            color={customTheme.colors.primary}
                        />
                    </View>
                )}
            </View>
        );
    };

    const renderLavagemCard = (lavagem: Lavagem) => {
        if (!lavagem || !lavagem.veiculo) {
            return null;
        }

        const chipColor = getTipoLavagemChipColor(lavagem.tipoLavagem || 'default');

        // Helper function to check if the plate is valid
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
            let icon = 'inventory'; // Ícone para outros tipos
            let label = 'Outros';

            if (isEquipment) {
                icon = 'build';
                label = 'Equipamento';
            } else if (isValidVehicle) {
                icon = 'directions-car';
                label = 'Veículo';
            }

            return {
                icon,
                label,
                displayText: isEquipment
                    ? `Equipamento${veiculo.numeroEquipamento ? ` #${veiculo.numeroEquipamento}` : ''}`
                    : (isValidVehicle ? 'Veículo' : 'Outros')
            };
        };

        const vehicleInfo = getVehicleDisplayInfo(lavagem.veiculo);

        return (
            <Card style={styles.card} key={lavagem.id}>
                {/* Barra colorida superior */}
                <View style={[styles.cardGradient, { backgroundColor: chipColor.bg }]} />

                <Card.Content style={styles.cardContent}>
                    {/* Linha 1: Placa, Tipo Lavagem, Data/Hora */}
                    <View style={styles.headerRow}>
                        <Text style={styles.placa} numberOfLines={1}>
                            {lavagem.veiculo?.placa || 'Não informado'}
                        </Text>

                        <View style={styles.headerRight}>
                            <Chip
                                style={[styles.tipoChip, { backgroundColor: chipColor.bg }]}
                                textStyle={{ color: chipColor.text }}
                            >
                                {(lavagem.tipoLavagem || 'Não definido').toUpperCase()}
                            </Chip>
                            <Text style={styles.dataHora}>
                                {`${lavagem.data} às ${lavagem.hora.split(':').slice(0, 2).join(':')}`}
                            </Text>
                        </View>
                    </View>

                    {vehicleInfo ?
                        <>
                            {/* Linha 2: Tipo de Veículo/Equipamento */}
                            < View style={styles.veiculoRow}>
                                <Icon
                                    name={vehicleInfo.icon}
                                    size={16}
                                    color={customTheme.colors.primary}
                                />
                                <Text style={styles.veiculoText} numberOfLines={1}>
                                    {vehicleInfo.displayText}
                                </Text>
                            </View>
                        </>
                        : null}

                    {/* Linha 3: Fotos em miniatura (se houver) */}
                    {Array.isArray(lavagem.fotos) && lavagem.fotos.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.fotosRow}
                        >
                            {lavagem.fotos.map((foto, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handlePhotoPress(foto.url, foto.path)}
                                >
                                    <ThumbnailImage
                                        uri={foto.url}
                                        style={styles.miniThumbnail}
                                    />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    {/* Linha 3: Observações (opcional) */}
                    {lavagem.observacoes && (
                        <View style={styles.observacoesRow}>
                            <Icon name="comment" size={16} color={customTheme.colors.primary} />
                            <Text numberOfLines={2} style={styles.observacoesText}>
                                {lavagem.observacoes}
                            </Text>
                        </View>
                    )}

                    {/* Linha 4: Responsável e Ações */}
                    <View style={styles.footerRow}>
                        <View style={styles.responsavelContainer}>
                            <Icon name="person" size={16} color={customTheme.colors.primary} />
                            <Text style={styles.responsavelText} numberOfLines={1}>
                                {lavagem.responsavel || 'Não informado'}
                            </Text>
                        </View>

                        {canEditeDelete() ?
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    onPress={() => handleEdit(lavagem)}
                                    style={styles.actionButton}>
                                    <Icon name="edit" size={20} color={customTheme.colors.primary} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => {
                                        setSelectedLavagem(lavagem);
                                        setShowDeleteConfirm(true);
                                    }}
                                    style={styles.actionButton}>
                                    <Icon name="delete" size={20} color={customTheme.colors.error} />
                                </TouchableOpacity>
                            </View>
                            : null}
                    </View>

                </Card.Content>
            </Card >
        );
    };

    const handleDelete = async (id: string) => {
        try {
            // Tenta excluir dos dois locais possíveis (novo e antigo)
            await firestore().collection('registroLavagens').doc(id).delete();
            await firestore().collection('lavagens').doc(id).delete();

            // Atualiza a lista local removendo o item
            setLavagens(prevLavagens =>
                prevLavagens.filter(lavagem => lavagem.id !== id)
            );
            onRefresh()
        } catch (error) {
            console.error('Erro ao excluir lavagem:', error);
            Alert.alert("Erro", "Não foi possível excluir o registro.");
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ModernHeader
                title="Histórico de Lavagens"
                iconName="history"
                onBackPress={() => navigation.goBack()}
            />

            <FullScreenImage
                visible={isFullScreenVisible}
                photo={selectedPhoto}
                onClose={() => {
                    setIsFullScreenVisible(false);
                    setSelectedPhoto(null);
                }}
            />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customTheme.colors.primary} />
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
                        {lavagensVisiveis.map(lavagem => renderLavagemCard(lavagem))}

                        {/* Botão Carregar Mais */}
                        {hasMore && (
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
                                                Carregar mais ({todasLavagens.length - lavagensVisiveis.length} restantes)
                                            </Text>
                                            <Icon
                                                name="expand-more"
                                                size={20}
                                                color={customTheme.colors.primary}
                                            />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView>
            )}

            <EditLavagemModal
                visible={editModalVisible}
                lavagem={selectedLavagem}
                onDismiss={() => {
                    setEditModalVisible(false);
                    setSelectedLavagem(null);
                }}
                onSave={() => {
                    setEditModalVisible(false);
                    setSelectedLavagem(null);
                    buscarLavagens(); // Recarregar dados
                }}
            />

            <ConfirmationModal
                visible={showDeleteConfirm}
                title="Confirmar exclusão"
                message="Tem certeza que deseja excluir esta lavagem?"
                itemToDelete={`Lavagem #${selectedLavagem?.id}`}
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
    thumbnailContainer: {
        backgroundColor: customTheme.colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    miniThumbnail: {
        width: 40,
        height: 40,
        borderRadius: 10,
        marginRight: 4,
    },
    loadMoreWrapper: {
        paddingHorizontal: 16,
        paddingVertical: 8,
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
    card: {
        marginBottom: 8,
        elevation: 2,
        borderRadius: 10,
        overflow: 'hidden',
    },
    cardGradient: {
        height: 4,
        width: '100%',
    },
    cardContent: {
        padding: 12,
        borderRadius: 5,
        gap: 8, // Espaçamento uniforme entre as linhas
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    placa: {
        fontSize: 16,
        fontWeight: 'bold',
        color: customTheme.colors.onSurface,
        flex: 1,
        marginRight: 12,
    },
    tipoChip: {
        paddingHorizontal: 8,
    },
    dataHora: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    veiculoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    veiculoText: {
        fontSize: 13,
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    observacoesRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,
    },
    observacoesText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        flex: 1,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    responsavelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    responsavelText: {
        fontSize: 13,
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 4,
    },
    fotosRow: {
        marginTop: 4,
        marginBottom: 8,
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
});
