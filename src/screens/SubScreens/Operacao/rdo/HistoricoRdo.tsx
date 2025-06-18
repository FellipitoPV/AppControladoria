import React, { useEffect, useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert
} from 'react-native';
import { Surface, Text, Card, Chip } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import ConfirmationModal from '../../../../assets/components/ConfirmationModal';
import ModernHeader from '../../../../assets/components/ModernHeader';
import { useUser } from '../../../../contexts/userContext';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import { customTheme } from '../../../../theme/theme';
import { hasAccess } from '../../../Adm/types/admTypes';
import DetalheRdoModal from './Components/DetalheRdoModal';
import { FormDataInterface } from './Types/rdoTypes';
import storage from '@react-native-firebase/storage';

interface HistoricoRdoProps {
    navigation: any;
}

export default function HistoricoRdo({ navigation }: HistoricoRdoProps) {
    const { userInfo } = useUser();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [todosRelatorios, setTodosRelatorios] = useState<FormDataInterface[]>([]);
    const [relatoriosVisiveis, setRelatoriosVisiveis] = useState<FormDataInterface[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const LIMIT = 20;

    const [selectedRelatorio, setSelectedRelatorio] = useState<FormDataInterface | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

    const [detalheModalVisible, setDetalheModalVisible] = useState(false);

    const canEditDelete = () => userInfo && hasAccess(userInfo, 'logistica', 2);

    const buscarRelatorios = async () => {
        try {
            setLoading(true);

            const snapshot = await firestore()
                .collection('relatoriosRDO')
                .orderBy('createdAt', 'desc')
                .get();

            // console.log(`Quantidade de relatórios: ${snapshot.size}`);

            const dados = snapshot.docs.map(doc => {
                const data = doc.data() as FormDataInterface;
                return {
                    id: doc.id,
                    numeroRdo: data.numeroRdo || doc.id,
                    cliente: data.cliente || '',
                    clienteNome: data.clienteNome || '',
                    servico: data.servico || '',
                    responsavel: data.responsavel || '',
                    material: data.material || '',
                    funcao: data.funcao || '',
                    inicioOperacao: data.inicioOperacao || '',
                    terminoOperacao: data.terminoOperacao || '',
                    data: data.data || '',
                    condicaoTempo: data.condicaoTempo || { manha: '', tarde: '', noite: '' },
                    diaSemana: data.diaSemana || '',
                    profissionais: data.profissionais || [],
                    equipamentos: data.equipamentos || [],
                    atividades: data.atividades || [],
                    ocorrencias: data.ocorrencias || [],
                    comentarioGeral: data.comentarioGeral || '',
                    createdAt: data.createdAt || null,
                    createdBy: data.createdBy || '',
                    photos: Array.isArray(data.photos)
                        ? data.photos.map(photo => ({
                            uri: photo.uri || '',
                            id: photo.id || '',
                            filename: photo.filename || ''
                        }))
                        : [],
                    pdfUrl: data.pdfUrl,
                    lastPdfGenerated: data.lastPdfGenerated,
                    updatedAt: data.updatedAt,
                } as FormDataInterface;
            });

            // Ordenar por data de criação (mais recente primeiro)
            const dadosOrdenados = dados.sort((a, b) => {
                const dataA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
                const dataB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
                return dataB - dataA;
            });

            setTodosRelatorios(dadosOrdenados);
            setRelatoriosVisiveis(dadosOrdenados.slice(0, LIMIT));
            setHasMore(dadosOrdenados.length > LIMIT);

        } catch (error) {
            console.error('Erro ao buscar relatórios:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível carregar os relatórios', 3000);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleLoadMore = () => {
        const nextPage = currentPage + 1;
        const startIndex = 0;
        const endIndex = nextPage * LIMIT;

        setRelatoriosVisiveis(todosRelatorios.slice(startIndex, endIndex));
        setCurrentPage(nextPage);
        setHasMore(endIndex < todosRelatorios.length);
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setCurrentPage(1);
        setHasMore(true);
        buscarRelatorios();
    }, []);

    useEffect(() => {
        buscarRelatorios();
    }, []);

    const handleDelete = async (id: string) => {
        try {
            // Primeiro, obtenha a referência do documento para checar a URL do PDF
            const docSnapshot = await firestore()
                .collection('relatoriosRDO')
                .doc(id)
                .get();

            if (docSnapshot.exists) {
                const data = docSnapshot.data();
                const numeroRdo = data?.numeroRdo;

                try {
                    // 1. Excluir PDF se existir
                    if (data?.pdfUrl) {
                        const fileRef = storage().ref(`RelatoriosRDO/${numeroRdo}.pdf`);
                        await fileRef.delete();
                    }

                    // 2. Listar todos os arquivos na pasta de fotos
                    const photosRef = storage().ref(`relatoriosPhotos/${numeroRdo}/fotos`);
                    const photosList = await photosRef.listAll();

                    // 3. Excluir cada arquivo encontrado
                    const deletePromises = photosList.items.map(itemRef => itemRef.delete());
                    await Promise.all(deletePromises);

                    console.log(`Todos os arquivos em relatorios/${numeroRdo}/fotos foram excluídos`);
                } catch (storageError) {
                    console.error('Erro ao excluir arquivos:', storageError);
                }

                // 4. Excluir o documento do Firestore
                await firestore().collection('relatoriosRDO').doc(id).delete();
            }

            // Depois exclua o documento
            await firestore()
                .collection('relatoriosRDO')
                .doc(id)
                .delete();

            showGlobalToast('success', 'Sucesso', 'Relatório excluído com sucesso', 3000);
            onRefresh();
        } catch (error) {
            console.error('Erro ao excluir relatório:', error);
            Alert.alert("Erro", "Não foi possível excluir o registro.");
        }
    };

    const getServicoChipColor = (servico: string) => {
        switch (servico.toLowerCase()) {
            case 'desmantelamento':
                return { bg: customTheme.colors.primaryContainer, text: customTheme.colors.primary };
            case 'descaracterização':
                return { bg: customTheme.colors.secondaryContainer, text: customTheme.colors.secondary };
            case 'repetro':
                return { bg: customTheme.colors.tertiaryContainer, text: customTheme.colors.tertiary };
            default:
                return { bg: customTheme.colors.surfaceVariant, text: customTheme.colors.onSurfaceVariant };
        }
    };

    const getMaterialIcon = (material: string) => {
        switch (material.toLowerCase()) {
            case 'flexiveis':
                return 'pipe';
            case 'umbilical':
                return 'power-plug';
            case 'sucata':
                return 'delete';
            case 'equipamentos':
                return 'wrench';
            default:
                return 'package-variant';
        }
    };

    const getDiaSemanaLabel = (dia: string) => {
        const dias: { [key: string]: string } = {
            'domingo': 'Domingo',
            'segunda': 'Segunda-feira',
            'terca': 'Terça-feira',
            'quarta': 'Quarta-feira',
            'quinta': 'Quinta-feira',
            'sexta': 'Sexta-feira',
            'sabado': 'Sábado'
        };
        return dias[dia] || dia;
    };

    const getTempoIcon = (tempo?: string) => {
        if (!tempo) return 'weather-partly-cloudy';

        switch (tempo.toLowerCase()) {
            case 'sol':
                return 'weather-sunny';
            case 'nublado':
                return 'weather-cloudy';
            case 'chuva':
                return 'weather-rainy';
            case 'impraticavel':
                return 'alert';
            default:
                return 'weather-partly-cloudy';
        }
    };

    const renderRelatorioCard = (relatorio: FormDataInterface) => {
        const chipColor = getServicoChipColor(relatorio.servico);

        return (
            <TouchableOpacity
                style={styles.card}
                key={relatorio.id}
                onPress={() => {
                    setSelectedRelatorio(relatorio);
                    setDetalheModalVisible(true);
                }}
                activeOpacity={0.7}
            >
                {/* Barra colorida superior */}
                <View style={[styles.cardGradient, { backgroundColor: chipColor.bg }]} />

                <View style={styles.cardContent}>
                    {/* Cabeçalho: Número RDO, Serviço, Data */}
                    <View style={styles.headerRow}>
                        <Text style={styles.numeroRdo} numberOfLines={1}>
                            RDO #{relatorio.numeroRdo}
                        </Text>

                        <View style={styles.headerRight}>
                            <Chip
                                style={[styles.tipoChip, { backgroundColor: chipColor.bg }]}
                                textStyle={{ color: chipColor.text }}
                            >
                                {relatorio.servico.toUpperCase()}
                            </Chip>
                            <Text style={styles.dataHora}>
                                {relatorio.data} - {getDiaSemanaLabel(relatorio.diaSemana)}
                            </Text>
                        </View>
                    </View>

                    {/* Linha 2: Cliente */}
                    <View style={styles.clienteRow}>
                        <MaterialCommunityIcons
                            name="domain"
                            size={16}
                            color={customTheme.colors.primary}
                        />
                        <Text style={styles.clienteText} numberOfLines={1}>
                            {relatorio.clienteNome || 'Cliente não informado'}
                        </Text>
                    </View>

                    {/* Linha 3: Material e horários */}
                    <View style={styles.detailsRow}>
                        <View style={styles.materialContainer}>
                            <MaterialCommunityIcons
                                name={getMaterialIcon(relatorio.material)}
                                size={16}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.materialText} numberOfLines={1}>
                                {relatorio.material.charAt(0).toUpperCase() + relatorio.material.slice(1)}
                            </Text>
                        </View>

                        <View style={styles.horarioContainer}>
                            <MaterialCommunityIcons
                                name="clock-outline"
                                size={16}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.horarioText}>
                                {relatorio.inicioOperacao} - {relatorio.terminoOperacao}
                            </Text>
                        </View>
                    </View>

                    {/* Linha 4: Condições do tempo */}
                    <View style={styles.tempoRow}>
                        <View style={styles.tempoItem}>
                            <MaterialCommunityIcons
                                name={getTempoIcon(relatorio.condicaoTempo.manha)}
                                size={16}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.tempoText}>Manhã</Text>
                        </View>

                        <View style={styles.tempoItem}>
                            <MaterialCommunityIcons
                                name={getTempoIcon(relatorio.condicaoTempo.tarde)}
                                size={16}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.tempoText}>Tarde</Text>
                        </View>

                        <View style={styles.tempoItem}>
                            <MaterialCommunityIcons
                                name={getTempoIcon(relatorio.condicaoTempo.noite)}
                                size={16}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.tempoText}>Noite</Text>
                        </View>
                    </View>

                    {/* Linha 5: Resumo de profissionais e equipamentos */}
                    <View style={styles.resumoRow}>
                        <View style={styles.resumoItem}>
                            <MaterialCommunityIcons
                                name="account-group"
                                size={16}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.resumoText}>
                                {relatorio?.profissionais?.reduce((acc, curr) => acc + Number(curr.quantidade), 0)} profissionais
                            </Text>
                        </View>

                        <View style={styles.resumoItem}>
                            <MaterialCommunityIcons
                                name="tools"
                                size={16}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.resumoText}>
                                {relatorio?.equipamentos?.reduce((acc, curr) => acc + Number(curr.quantidade), 0)} equipamentos
                            </Text>
                        </View>

                        <View style={styles.resumoItem}>
                            <MaterialCommunityIcons
                                name="clipboard-list"
                                size={16}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.resumoText}>
                                {relatorio?.atividades?.length} atividades
                            </Text>
                        </View>
                    </View>

                    {/* Linha 6: Responsável e Ações */}
                    <View style={styles.footerRow}>
                        <View style={styles.responsavelContainer}>
                            <MaterialCommunityIcons name="account" size={16} color={customTheme.colors.primary} />
                            <Text style={styles.responsavelText} numberOfLines={1}>
                                {relatorio.responsavel || 'Não informado'}
                            </Text>
                        </View>

                        {canEditDelete() && (
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation(); // Prevent opening details when deleting
                                        setSelectedRelatorio(relatorio);
                                        setShowDeleteConfirm(true);
                                    }}
                                    style={styles.actionButton}>
                                    <MaterialCommunityIcons name="delete" size={20} color={customTheme.colors.error} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ModernHeader
                title="Histórico de Relatórios"
                iconName="clipboard-text"
                onBackPress={() => navigation.goBack()}
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
                        {/* Lista de relatórios */}
                        {relatoriosVisiveis.length > 0 ? (
                            relatoriosVisiveis.map(relatorio => renderRelatorioCard(relatorio))
                        ) : (
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons
                                    name="clipboard-text-off"
                                    size={48}
                                    color={customTheme.colors.onSurfaceVariant}
                                />
                                <Text style={styles.emptyText}>
                                    Nenhum relatório encontrado
                                </Text>
                            </View>
                        )}

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
                                                Carregar mais ({todosRelatorios.length - relatoriosVisiveis.length} restantes)
                                            </Text>
                                            <MaterialCommunityIcons
                                                name="chevron-down"
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

            {selectedRelatorio && (
                <DetalheRdoModal
                    visible={detalheModalVisible}
                    onClose={() => {
                        setDetalheModalVisible(false);
                        setSelectedRelatorio(null);
                    }}
                    refresh={buscarRelatorios}
                    relatorio={{
                        ...selectedRelatorio,
                        profissionais: selectedRelatorio.profissionais?.map(prof => ({
                            tipo: prof.tipo,
                            quantidade: prof.quantidade.toString(),
                            id: prof.id
                        })) || [],
                        equipamentos: selectedRelatorio.equipamentos?.map(equip => ({
                            tipo: equip.tipo,
                            quantidade: equip.quantidade.toString(),
                            id: equip.id
                        })) || [],
                        atividades: selectedRelatorio.atividades || [],
                        photos: selectedRelatorio.photos?.map(photo => ({
                            uri: photo.uri || '',
                            id: photo.id || ''
                        })) || []
                    }}
                />
            )}

            <ConfirmationModal
                visible={showDeleteConfirm}
                title="Confirmar exclusão"
                message="Tem certeza que deseja excluir este relatório?"
                itemToDelete={`RDO #${selectedRelatorio?.numeroRdo}`}
                onCancel={() => setShowDeleteConfirm(false)}
                onConfirm={() => {
                    if (selectedRelatorio?.id) {
                        handleDelete(selectedRelatorio.id);
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
    card: {
        marginBottom: 12,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF', // Cor de fundo do card
        elevation: 2, // Sombra para Android
        shadowColor: '#000', // Sombra para iOS
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },

    cardGradient: {
        height: 4,
        width: '100%',
    },
    cardContent: {
        padding: 12,
        borderRadius: 5,
        gap: 15,
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
    numeroRdo: {
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
    clienteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    clienteText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    materialContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    materialText: {
        fontSize: 13,
        color: customTheme.colors.onSurface,
    },
    horarioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    horarioText: {
        fontSize: 13,
        color: customTheme.colors.onSurface,
    },
    tempoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 8,
        padding: 8,
    },
    tempoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
        justifyContent: 'center',
    },
    tempoText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    resumoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    resumoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    resumoText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.surfaceVariant,
        paddingTop: 8,
        marginTop: 4,
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
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 10,
        opacity: 0.8,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center',
    }
});