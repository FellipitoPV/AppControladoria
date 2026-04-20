import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    StyleSheet,
    View,
    FlatList,
    RefreshControl,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import {
    Text,
    Searchbar,
    FAB,
    SegmentedButtons,
    Surface,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ecoApi } from '../../../../api/ecoApi';
import {
    ControleDocumento,
    AreaDocumento,
    StatusDocumento,
    AREAS,
    AREA_COLORS,
    AREA_ICONS,
    getStatusDocumento,
} from './ControleDocumentosTypes';
import { ControleDocumentosCard } from './ControleDocumentosCard';
import ModernHeader from '../../../../assets/components/ModernHeader';
import { customTheme } from '../../../../theme/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
    ControleDocumentosScreen: undefined;
    ControleDocumentosFormScreen: {
        item?: ControleDocumento;
        mode: 'create' | 'edit' | 'view';
    };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabValue = 'todos' | StatusDocumento;

const ControleDocumentosScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();

    const [list, setList] = useState<ControleDocumento[]>([]);
    const [filteredList, setFilteredList] = useState<ControleDocumento[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState<TabValue>('todos');
    const [selectedArea, setSelectedArea] = useState<AreaDocumento | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchDocumentos = useCallback(async () => {
        try {
            const data: ControleDocumento[] = await ecoApi.list('controleDocumentos');
            data.sort((a, b) =>
                new Date(b.dataCriacao ?? 0).getTime() - new Date(a.dataCriacao ?? 0).getTime()
            );
            setList(data);
        } catch (error) {
            console.error('Erro ao carregar documentos:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchDocumentos();
        pollIntervalRef.current = setInterval(fetchDocumentos, 60000);
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [fetchDocumentos]);

    const filterList = useCallback(() => {
        let filtered = [...list];

        if (selectedArea) {
            filtered = filtered.filter(i => i.area === selectedArea);
        }

        if (selectedTab !== 'todos') {
            filtered = filtered.filter(
                i => getStatusDocumento(i.vencimento, i.alertaVencimento) === selectedTab,
            );
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
                i =>
                    i.tipoPrograma?.toLowerCase().includes(q) ||
                    i.responsavel?.toLowerCase().includes(q) ||
                    i.area?.toLowerCase().includes(q),
            );
        }

        setFilteredList(filtered);
    }, [list, searchQuery, selectedTab, selectedArea]);

    useEffect(() => {
        filterList();
    }, [filterList]);

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
                name="file-document-outline"
                size={64}
                color={customTheme.colors.outline}
            />
            <Text style={styles.emptyText}>
                {searchQuery
                    ? 'Nenhum documento encontrado para esta busca'
                    : 'Nenhum documento legal registrado'}
            </Text>
            {!searchQuery && (
                <Text style={styles.emptySubtext}>
                    Toque no botão + para registrar um novo documento
                </Text>
            )}
        </View>
    );

    const renderItem = ({ item }: { item: ControleDocumento }) => (
        <ControleDocumentosCard
            item={item}
            onPress={() =>
                navigation.navigate('ControleDocumentosFormScreen', { item, mode: 'view' })
            }
            onEdit={() =>
                navigation.navigate('ControleDocumentosFormScreen', { item, mode: 'edit' })
            }
        />
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <ModernHeader
                    title="Documentos Legais"
                    iconName="file-document-multiple-outline"
                    onBackPress={() => navigation.goBack()}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customTheme.colors.primary} />
                    <Text style={styles.loadingText}>Carregando documentos...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ModernHeader
                title="Documentos Legais"
                iconName="file-document-multiple-outline"
                onBackPress={() => navigation.goBack()}
            />

            <Surface style={styles.filterContainer} elevation={2}>
                <Searchbar
                    placeholder="Buscar por documento, responsável..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchbar}
                    inputStyle={styles.searchInput}
                    iconColor={customTheme.colors.primary}
                />

                <SegmentedButtons
                    value={selectedTab}
                    onValueChange={v => setSelectedTab(v as TabValue)}
                    buttons={[
                        { value: 'todos', label: 'Todos', icon: 'file-multiple' },
                        { value: 'vigente', label: 'Vigentes', icon: 'check-circle-outline' },
                        { value: 'alerta', label: 'Alerta', icon: 'clock-alert-outline' },
                        { value: 'vencido', label: 'Vencidos', icon: 'alert-circle-outline' },
                    ]}
                    style={styles.segmentedButtons}
                />

                {/* Filtro por área */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.areaScroll}
                >
                    <TouchableOpacity
                        style={[
                            styles.areaChip,
                            !selectedArea && { backgroundColor: customTheme.colors.primary },
                        ]}
                        onPress={() => setSelectedArea(null)}
                    >
                        <MaterialCommunityIcons
                            name="filter-remove"
                            size={14}
                            color={!selectedArea ? '#fff' : customTheme.colors.onSurfaceVariant}
                        />
                        <Text
                            style={[
                                styles.areaChipText,
                                !selectedArea && { color: '#fff' },
                            ]}
                        >
                            Todas
                        </Text>
                    </TouchableOpacity>

                    {AREAS.map(area => (
                        <TouchableOpacity
                            key={area}
                            style={[
                                styles.areaChip,
                                selectedArea === area && { backgroundColor: AREA_COLORS[area] },
                            ]}
                            onPress={() =>
                                setSelectedArea(prev => (prev === area ? null : area))
                            }
                        >
                            <MaterialCommunityIcons
                                name={AREA_ICONS[area]}
                                size={14}
                                color={selectedArea === area ? '#fff' : AREA_COLORS[area]}
                            />
                            <Text
                                style={[
                                    styles.areaChipText,
                                    { color: selectedArea === area ? '#fff' : AREA_COLORS[area] },
                                ]}
                            >
                                {area}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </Surface>

            <FlatList
                data={filteredList}
                renderItem={renderItem}
                keyExtractor={item => item.id || Math.random().toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchDocumentos(); }}
                        colors={[customTheme.colors.primary]}
                    />
                }
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
            />

            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() =>
                    navigation.navigate('ControleDocumentosFormScreen', { mode: 'create' })
                }
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
    filterContainer: {
        margin: 16,
        marginBottom: 8,
        padding: 12,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: customTheme.colors.surfaceVariant,
    },
    searchbar: {
        marginBottom: 12,
        backgroundColor: customTheme.colors.surfaceVariant,
        elevation: 0,
    },
    searchInput: {
        fontSize: 14,
    },
    segmentedButtons: {
        marginBottom: 10,
    },
    areaScroll: {
        flexDirection: 'row',
        paddingBottom: 2,
    },
    areaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginRight: 8,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderWidth: 1,
        borderColor: customTheme.colors.surfaceVariant,
        gap: 5,
    },
    areaChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: customTheme.colors.onSurfaceVariant,
    },
    listContent: {
        paddingTop: 0,
        paddingBottom: 100,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: customTheme.colors.outline,
        textAlign: 'center',
        marginTop: 8,
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 16,
        backgroundColor: customTheme.colors.primary,
    },
});

export default ControleDocumentosScreen;
