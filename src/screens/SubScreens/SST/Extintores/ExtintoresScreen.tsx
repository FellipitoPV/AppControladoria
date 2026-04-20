import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FAB, Searchbar, SegmentedButtons, Surface, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../../../assets/components/ModernHeader';
import { ecoApi } from '../../../../api/ecoApi';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import { customTheme } from '../../../../theme/theme';
import ExtintorCard from './ExtintorCard';
import {
    defaultExtintoresConfig,
    ExtintorInterface,
    ExtintoresConfig,
    getDiasCriticos,
    getExtintorStatus,
    normalizeExtintor,
} from './ExtintoresTypes';

type RootStackParamList = {
    ExtintoresScreen: undefined;
    ExtintoresFormScreen: {
        extintor?: ExtintorInterface;
        config?: ExtintoresConfig;
        mode: 'create' | 'edit';
    };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExtintoresScreen'>;
type StatusTab = 'todos' | 'vencidos' | 'avencer' | 'validos';

const ExtintoresScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState<StatusTab>('todos');
    const [extintores, setExtintores] = useState<ExtintorInterface[]>([]);
    const [config, setConfig] = useState<ExtintoresConfig>(defaultExtintoresConfig);

    const loadData = useCallback(async () => {
        try {
            const [extintoresData, configurations] = await Promise.all([
                ecoApi.list('hidrantes'),
                ecoApi.list('configurations').catch(() => []),
            ]);

            setExtintores(extintoresData.map(normalizeExtintor));

            const configDoc = configurations?.[0]?.extintores;
            if (configDoc) {
                setConfig({
                    tipos: configDoc.tipos || defaultExtintoresConfig.tipos,
                    capacidade: configDoc.capacidade || defaultExtintoresConfig.capacidade,
                    validade: Number(configDoc.validade || defaultExtintoresConfig.validade),
                    validadeHidrostatico: Number(
                        configDoc.validadeHidrostatico || defaultExtintoresConfig.validadeHidrostatico,
                    ),
                    localizacoes: configDoc.localizacoes || defaultExtintoresConfig.localizacoes,
                });
            } else {
                setConfig(defaultExtintoresConfig);
            }
        } catch (error) {
            console.error('Erro ao carregar extintores:', error);
            showGlobalToast('error', 'Erro', 'Nao foi possivel carregar os extintores', 4000);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData]),
    );

    const filteredList = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return [...extintores]
            .filter(item => {
                const status = getExtintorStatus(item, config.validadeHidrostatico);
                const statusMatch =
                    selectedTab === 'todos' ||
                    (selectedTab === 'vencidos' && status === 'Vencido') ||
                    (selectedTab === 'avencer' && status === 'A Vencer') ||
                    (selectedTab === 'validos' && status === 'Valido');

                if (!statusMatch) {
                    return false;
                }

                if (!normalizedQuery) {
                    return true;
                }

                return [item.numero, item.tipo, item.localizacao, item.unidadeEcologika, item.carga]
                    .join(' ')
                    .toLowerCase()
                    .includes(normalizedQuery);
            })
            .sort(
                (a, b) =>
                    getDiasCriticos(a, config.validadeHidrostatico) -
                    getDiasCriticos(b, config.validadeHidrostatico),
            );
    }, [config.validadeHidrostatico, extintores, searchQuery, selectedTab]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleDelete = (extintor: ExtintorInterface) => {
        Alert.alert(
            'Excluir extintor',
            `Deseja excluir o extintor #${extintor.numero}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const id = extintor.hidranteId || extintor.id;
                            if (!id) {
                                showGlobalToast('error', 'Erro', 'Registro sem identificador');
                                return;
                            }
                            await ecoApi.delete('hidrantes', id);
                            showGlobalToast('success', 'Sucesso', 'Extintor excluido com sucesso');
                            loadData();
                        } catch (error) {
                            console.error('Erro ao excluir extintor:', error);
                            showGlobalToast('error', 'Erro', 'Nao foi possivel excluir o extintor');
                        }
                    },
                },
            ],
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
                name="fire-extinguisher"
                size={64}
                color={customTheme.colors.outline}
            />
            <Text style={styles.emptyText}>
                {searchQuery ? 'Nenhum extintor encontrado para esta busca' : 'Nenhum extintor cadastrado'}
            </Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <ModernHeader
                    title="Extintores"
                    iconName="fire-extinguisher"
                    onBackPress={() => navigation.goBack()}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customTheme.colors.primary} />
                    <Text style={styles.loadingText}>Carregando extintores...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ModernHeader
                title="Extintores"
                iconName="fire-extinguisher"
                onBackPress={() => navigation.goBack()}
            />

            <Surface style={styles.filtersContainer} elevation={2}>
                <Searchbar
                    placeholder="Buscar por numero, localizacao ou tipo"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchbar}
                    inputStyle={styles.searchInput}
                    iconColor={customTheme.colors.primary}
                />

                <SegmentedButtons
                    value={selectedTab}
                    onValueChange={value => setSelectedTab(value as StatusTab)}
                    buttons={[
                        { value: 'todos', label: 'Todos' },
                        { value: 'vencidos', label: 'Vencidos' },
                        { value: 'avencer', label: 'A vencer' },
                        { value: 'validos', label: 'Validos' },
                    ]}
                />

                <Text style={styles.summaryText}>
                    {filteredList.length} extintor(es) exibido(s)
                </Text>
            </Surface>

            <FlatList
                data={filteredList}
                keyExtractor={item => item.hidranteId || item.id || item.numero}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[customTheme.colors.primary]}
                    />
                }
                renderItem={({ item }) => (
                    <ExtintorCard
                        extintor={item}
                        validadeHidrostatico={config.validadeHidrostatico}
                        onPress={() =>
                            navigation.navigate('ExtintoresFormScreen', {
                                extintor: item,
                                config,
                                mode: 'edit',
                            })
                        }
                        onEdit={() =>
                            navigation.navigate('ExtintoresFormScreen', {
                                extintor: item,
                                config,
                                mode: 'edit',
                            })
                        }
                        onDelete={() => handleDelete(item)}
                    />
                )}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
            />

            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() => navigation.navigate('ExtintoresFormScreen', { mode: 'create', config })}
                color={customTheme.colors.onPrimary}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
    },
    filtersContainer: {
        margin: 16,
        marginBottom: 8,
        padding: 12,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: customTheme.colors.surfaceVariant,
    },
    searchbar: {
        marginBottom: 10,
        backgroundColor: customTheme.colors.surfaceVariant,
        elevation: 0,
    },
    searchInput: {
        minHeight: 0,
    },
    summaryText: {
        marginTop: 10,
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'right',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 88,
        paddingTop: 0,
        flexGrow: 1,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: customTheme.colors.primary,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
    },
    emptyText: {
        marginTop: 12,
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center',
        fontSize: 13,
    },
});

export default ExtintoresScreen;
