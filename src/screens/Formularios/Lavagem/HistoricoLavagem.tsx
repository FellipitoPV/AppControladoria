import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import {
    Surface,
    Text,
    Divider,
    IconButton,
    useTheme,
    Card,
    Chip,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import { customTheme } from '../../../theme/theme';
import ModernHeader from '../../../assets/components/ModernHeader';
import FullScreenImage from '../../../assets/components/FullScreenImage';

interface Lavagem {
    id: string;
    responsavel: string;
    data: string;
    hora: string;
    veiculo: {
        placa: string;
        tipo: string;
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
    const [lavagens, setLavagens] = useState<Lavagem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; id: string } | null>(null);
    const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);

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
            : (doc.fotos || []);

        // Normaliza o veículo
        const veiculo = isFormatoAntigo
            ? {
                placa: doc.placaVeiculo,
                tipo: 'veiculo' // assumes legacy entries are vehicles
            }
            : doc.veiculo;

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
            status: doc.status || 'concluido', // assume concluído para registros antigos
            createdAt: isFormatoAntigo
                ? new Date(doc.createdAt).getTime()
                : doc.createdAt?.toDate?.()?.getTime() || Date.now()
        };

        return lavagem;
    };

    // Atualiza a função de buscar lavagens
    const buscarLavagens = async () => {
        try {
            setLoading(true);

            // Busca registros novos
            const snapshotNovos = await firestore()
                .collection('registroLavagens')
                .orderBy('data', 'desc')
                .get();

            // Busca registros antigos
            const snapshotAntigos = await firestore()
                .collection('lavagens') // assumindo que esta é a coleção antiga
                .orderBy('data', 'desc')
                .get();

            // Combina e normaliza os dados
            const dadosNovos = snapshotNovos.docs.map(doc => normalizarLavagem({
                id: doc.id,
                ...doc.data()
            }));

            const dadosAntigos = snapshotAntigos.docs.map(doc => normalizarLavagem({
                id: doc.id,
                ...doc.data()
            }));

            // Combina os dois conjuntos de dados
            const todosDados = [...dadosNovos, ...dadosAntigos];

            // Ordena por data e hora
            todosDados.sort((a, b) => {
                const dataA = new Date(a.data.split('/').reverse().join('-'));
                const dataB = new Date(b.data.split('/').reverse().join('-'));

                if (dataA.getTime() === dataB.getTime()) {
                    return b.hora.localeCompare(a.hora);
                }
                return dataB.getTime() - dataA.getTime();
            });

            setLavagens(todosDados);
        } catch (error) {
            console.error('Erro ao buscar lavagens:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        buscarLavagens();
    }, []);

    useEffect(() => {
        buscarLavagens();
    }, []);

    const handlePhotoPress = (url: string, id: string) => {
        setSelectedPhoto({ uri: url, id });
        setIsFullScreenVisible(true);
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

    const renderLavagemCard = (lavagem: Lavagem) => {
        if (!lavagem || !lavagem.veiculo) {
            return null;
        }

        const chipColor = getTipoLavagemChipColor(lavagem.tipoLavagem || 'default');

        return (
            <Card style={styles.card} key={lavagem.id}>
                {/* Barra colorida superior */}
                <View style={[styles.cardGradient, { backgroundColor: chipColor.bg }]} />

                <Card.Content style={styles.cardContent}>
                    {/* Linha 1: Placa e Tipo/Data */}
                    <View style={styles.mainRow}>
                        {/* Lado Esquerdo - Apenas a Placa */}
                        <View style={styles.placaContainer}>
                            <Text style={styles.placa} numberOfLines={1}>
                                {lavagem.veiculo?.placa || 'Placa não informada'}
                            </Text>
                        </View>

                        {/* Lado Direito - Chip e Data/Hora em coluna */}
                        <View style={styles.rightContainer}>
                            <Chip
                                style={[styles.tipoChip, { backgroundColor: chipColor.bg }]}
                                textStyle={{ color: chipColor.text }}
                            >
                                {(lavagem.tipoLavagem || 'Não definido').toUpperCase()}
                            </Chip>
                            <View style={styles.dataContainer}>
                                <Text style={styles.dataHora}>{lavagem.data}</Text>
                                <Text style={styles.dataHora}>{lavagem.hora}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Linha 2: Veículo e Responsável */}
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Icon
                                name={lavagem.veiculo?.tipo === 'equipamento' ? 'build' : 'directions-car'}
                                size={16}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.infoText} numberOfLines={1}>
                                {lavagem.veiculo?.tipo || 'Não especificado'}
                            </Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Icon name="person" size={16} color={customTheme.colors.primary} />
                            <Text style={styles.infoText} numberOfLines={1}>
                                {lavagem.responsavel || 'Não informado'}
                            </Text>
                        </View>
                    </View>

                    {/* Linha 3: Produtos (em linha) */}
                    {Array.isArray(lavagem.produtos) && lavagem.produtos.length > 0 && (
                        <View style={styles.produtosRow}>
                            <Icon name="inventory" size={16} color={customTheme.colors.primary} />
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.produtosScroll}
                            >
                                {lavagem.produtos.map((produto, index) => (
                                    <Text key={index} style={styles.produtoText}>
                                        {produto.nome} ({produto.quantidade})
                                        {index < lavagem.produtos.length - 1 ? ', ' : ''}
                                    </Text>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Linha 4: Fotos em miniatura */}
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
                                    <Image
                                        source={{ uri: foto.url }}
                                        style={styles.miniThumbnail}
                                    />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    {/* Observações (opcional) */}
                    {lavagem.observacoes && (
                        <View style={styles.observacoesRow}>
                            <Icon name="comment" size={16} color={customTheme.colors.primary} />
                            <Text numberOfLines={2} style={styles.observacoesText}>
                                {lavagem.observacoes}
                            </Text>
                        </View>
                    )}

                    <View style={styles.actionButtons}>
                        <IconButton
                            icon="edit"
                            size={20}
                            onPress={() => handleEdit(lavagem)}
                            style={styles.actionButton}
                        />
                        <IconButton
                            icon="delete"
                            size={20}
                            onPress={() => handleDelete(lavagem.id)}
                            style={styles.actionButton}
                            iconColor={customTheme.colors.error}
                        />
                    </View>
                </Card.Content>
            </Card>
        );
    };

    const handleDelete = async (id: string) => {
        try {
            // Mostra um alerta de confirmação
            Alert.alert(
                "Confirmar exclusão",
                "Tem certeza que deseja excluir este registro?",
                [
                    {
                        text: "Cancelar",
                        style: "cancel"
                    },
                    {
                        text: "Sim, excluir",
                        style: "destructive",
                        onPress: async () => {
                            // Tenta excluir dos dois locais possíveis (novo e antigo)
                            await firestore().collection('registroLavagens').doc(id).delete();
                            await firestore().collection('lavagens').doc(id).delete();

                            // Atualiza a lista local removendo o item
                            setLavagens(prevLavagens =>
                                prevLavagens.filter(lavagem => lavagem.id !== id)
                            );
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Erro ao excluir lavagem:', error);
            Alert.alert("Erro", "Não foi possível excluir o registro.");
        }
    };

    const handleEdit = (lavagem: Lavagem) => {
        // Navega para a tela de edição passando os dados da lavagem
        navigation.navigate('EditarLavagem', { lavagem });
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
                        {lavagens.map(lavagem => renderLavagemCard(lavagem))}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 8,
        marginRight: -8, // Compensa o padding do IconButton
    },
    actionButton: {
        margin: 0,
        padding: 0,
    },
    card: {
        marginBottom: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    cardGradient: {
        height: 4,
        width: '100%',
    },
    cardContent: {
        padding: 12,
    },
    mainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    placaContainer: {
        flex: 1,
        marginRight: 12,
    },
    placa: {
        fontSize: 16,
        fontWeight: 'bold',
        color: customTheme.colors.onSurface,
    },
    rightContainer: {
        alignItems: 'flex-end',
        gap: 4,
    },
    tipoChip: {
        //height: 24,
        paddingHorizontal: 8,
    },
    dataContainer: {
        alignItems: 'flex-end',
    },
    dataHora: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    infoText: {
        fontSize: 13,
        color: customTheme.colors.onSurface,
    },
    produtosRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    produtosScroll: {
        flex: 1,
    },
    produtoText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    fotosRow: {
        marginTop: 4,
        marginBottom: 8,
    },
    miniThumbnail: {
        width: 40,
        height: 40,
        borderRadius: 4,
        marginRight: 4,
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
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    divider: {
        marginVertical: 12,
    },
    infoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
        marginBottom: 8,
    },
    produtosContainer: {
        marginTop: 16,
    },
    produtoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    fotosContainer: {
        marginTop: 16,
    },
    thumbnail: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 8,
    },
    observacoesContainer: {
        marginTop: 16,
    },
});