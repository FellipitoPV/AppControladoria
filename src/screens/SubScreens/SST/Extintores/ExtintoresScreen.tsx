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
import { Button, FAB, Searchbar, SegmentedButtons, Surface, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../../../assets/components/ModernHeader';
import { ecoApi } from '../../../../api/ecoApi';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import { customTheme } from '../../../../theme/theme';
import ExtintorCard from './ExtintorCard';
import {
    defaultExtintoresConfig,
    EquipamentoTipo,
    ExtintorInterface,
    ExtintoresConfig,
    getDiasCriticos,
    getEquipamentoLabelPlural,
    getEquipamentoTipo,
    normalizeExtintor,
} from './ExtintoresTypes';

type RootStackParamList = {
    ChecklistScreen: {
        category?: string;
        title?: string;
        headerIcon?: string;
        reportVariant?: 'sst' | 'meioAmbiente' | 'qualidade';
    } | undefined;
    ExtintoresScreen: undefined;
    ExtintoresFormScreen: {
        assetType?: EquipamentoTipo;
        extintor?: ExtintorInterface;
        config?: ExtintoresConfig;
        mode: 'create' | 'edit';
    };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExtintoresScreen'>;
type UnidadeTab = 'Ecologika' | 'LOG';

const getUnidadeGroup = (unidadeEcologika?: string): UnidadeTab =>
    unidadeEcologika === 'LOG' ? 'LOG' : 'Ecologika';

const ExtintoresScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUnidade, setSelectedUnidade] = useState<UnidadeTab>('Ecologika');
    const [selectedAssetType, setSelectedAssetType] = useState<EquipamentoTipo>('Extintor');
    const [extintores, setExtintores] = useState<ExtintorInterface[]>([]);
    const [config, setConfig] = useState<ExtintoresConfig>(defaultExtintoresConfig);
    const currentAssetLabel = selectedAssetType;
    const currentAssetLabelPlural = getEquipamentoLabelPlural(selectedAssetType);

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
                const assetTypeMatch = getEquipamentoTipo(item) === selectedAssetType;
                if (!assetTypeMatch) {
                    return false;
                }

                const unidadeMatch = getUnidadeGroup(item.unidadeEcologika) === selectedUnidade;

                if (!unidadeMatch) {
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
    }, [config.validadeHidrostatico, extintores, searchQuery, selectedAssetType, selectedUnidade]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleDelete = (extintor: ExtintorInterface) => {
        const assetType = getEquipamentoTipo(extintor);
        Alert.alert(
            `Excluir ${assetType.toLowerCase()}`,
            `Deseja excluir o ${assetType.toLowerCase()} #${extintor.numero}?`,
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
                            showGlobalToast('success', 'Sucesso', `${assetType} excluido com sucesso`);
                            loadData();
                        } catch (error) {
                            console.error(`Erro ao excluir ${assetType.toLowerCase()}:`, error);
                            showGlobalToast('error', 'Erro', `Nao foi possivel excluir o ${assetType.toLowerCase()}`);
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
                {searchQuery ? `Nenhum ${currentAssetLabel.toLowerCase()} encontrado para esta busca` : `Nenhum ${currentAssetLabel.toLowerCase()} cadastrado`}
            </Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <ModernHeader
                    title={currentAssetLabelPlural}
                    iconName="fire-extinguisher"
                    onBackPress={() => navigation.goBack()}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customTheme.colors.primary} />
                    <Text style={styles.loadingText}>Carregando {currentAssetLabelPlural.toLowerCase()}...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ModernHeader
                title={currentAssetLabelPlural}
                iconName="fire-extinguisher"
                onBackPress={() => navigation.goBack()}
            />

            <Surface style={styles.filtersContainer} elevation={2}>
                <SegmentedButtons
                    value={selectedAssetType}
                    onValueChange={value => setSelectedAssetType(value as EquipamentoTipo)}
                    buttons={[
                        { value: 'Extintor', label: 'Extintores' },
                        { value: 'Hidrante', label: 'Hidrantes' },
                    ]}
                    style={styles.assetTypeButtons}
                />

                <Searchbar
                    placeholder="Buscar por numero, localizacao ou tipo"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchbar}
                    inputStyle={styles.searchInput}
                    iconColor={customTheme.colors.primary}
                />

                {selectedAssetType === 'Hidrante' && (
                    <Button
                        mode="outlined"
                        icon="clipboard-check-outline"
                        onPress={() => navigation.navigate('ChecklistScreen')}
                        style={styles.checklistButton}
                        contentStyle={styles.checklistButtonContent}
                    >
                        Ir para checklist
                    </Button>
                )}

                <View style={styles.unitFilterContainer}>
                    <Text style={styles.unitFilterLabel}>Unidade</Text>
                    <SegmentedButtons
                        value={selectedUnidade}
                        onValueChange={value => setSelectedUnidade(value as UnidadeTab)}
                        buttons={[
                            { value: 'Ecologika', label: 'Ecologika' },
                            { value: 'LOG', label: 'LOG' },
                        ]}
                    />
                </View>

                <Text style={styles.summaryText}>
                    {filteredList.length} {currentAssetLabel.toLowerCase()}(es) exibido(s)
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
                        assetType={getEquipamentoTipo(item)}
                        validadeHidrostatico={config.validadeHidrostatico}
                        onPress={() =>
                            navigation.navigate('ExtintoresFormScreen', {
                                assetType: getEquipamentoTipo(item),
                                extintor: item,
                                config,
                                mode: 'edit',
                            })
                        }
                        onEdit={() =>
                            navigation.navigate('ExtintoresFormScreen', {
                                assetType: getEquipamentoTipo(item),
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
                onPress={() => navigation.navigate('ExtintoresFormScreen', { mode: 'create', config, assetType: selectedAssetType })}
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
    assetTypeButtons: {
        marginBottom: 10,
    },
    searchbar: {
        marginBottom: 10,
        backgroundColor: customTheme.colors.surfaceVariant,
        elevation: 0,
    },
    checklistButton: {
        marginBottom: 10,
        borderColor: customTheme.colors.outlineVariant,
    },
    checklistButtonContent: {
        height: 42,
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
    unitFilterContainer: {
        marginTop: 10,
    },
    unitFilterLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 6,
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
