import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    FlatList,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import {
    Text,
    Searchbar,
    FAB,
    SegmentedButtons,
    Surface,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../../../firebase';
import { ToxicologicoInterface } from './ToxicologicoTypes';
import { ToxicologicoCard } from './ToxicologicoCard';
import ModernHeader from '../../../../assets/components/ModernHeader';
import { customTheme } from '../../../../theme/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
    ToxicologicoScreen: undefined;
    ToxicologicoFormScreen: {
        item?: ToxicologicoInterface;
        mode: 'create' | 'edit' | 'view';
    };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabValue = 'todos' | 'negativos' | 'positivos';

const ToxicologicoScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();

    const [list, setList] = useState<ToxicologicoInterface[]>([]);
    const [filteredList, setFilteredList] = useState<ToxicologicoInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState<TabValue>('todos');

    useEffect(() => {
        const q = query(
            collection(db(), 'toxicologico'),
            orderBy('dataCriacao', 'desc')
        );

        const unsubscribe = onSnapshot(
            q,
            snapshot => {
                const data: ToxicologicoInterface[] = snapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                } as ToxicologicoInterface));
                setList(data);
                setLoading(false);
                setRefreshing(false);
            },
            error => {
                console.error('Erro ao carregar toxicológico:', error);
                setLoading(false);
                setRefreshing(false);
            }
        );

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        filterList();
    }, [list, searchQuery, selectedTab]);

    const filterList = useCallback(() => {
        let filtered = [...list];

        if (selectedTab === 'negativos') {
            filtered = filtered.filter(i => i.resultado === 'Negativo');
        } else if (selectedTab === 'positivos') {
            filtered = filtered.filter(i => i.resultado === 'Positivo');
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
                i =>
                    i.colaborador?.toLowerCase().includes(q) ||
                    i.encarregado?.toLowerCase().includes(q) ||
                    i.tipoTeste?.toLowerCase().includes(q) ||
                    i.embasamento?.toLowerCase().includes(q)
            );
        }

        setFilteredList(filtered);
    }, [list, searchQuery, selectedTab]);

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
                name="flask-empty-outline"
                size={64}
                color={customTheme.colors.outline}
            />
            <Text style={styles.emptyText}>
                {searchQuery
                    ? 'Nenhum exame encontrado para esta busca'
                    : 'Nenhum exame toxicológico registrado'}
            </Text>
            {!searchQuery && (
                <Text style={styles.emptySubtext}>
                    Toque no botão + para registrar um novo exame
                </Text>
            )}
        </View>
    );

    const renderItem = ({ item }: { item: ToxicologicoInterface }) => (
        <ToxicologicoCard
            item={item}
            onPress={() => navigation.navigate('ToxicologicoFormScreen', { item, mode: 'view' })}
            onEdit={() => navigation.navigate('ToxicologicoFormScreen', { item, mode: 'edit' })}
        />
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <ModernHeader
                    title="Exames Toxicológicos"
                    iconName="flask-outline"
                    onBackPress={() => navigation.goBack()}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customTheme.colors.primary} />
                    <Text style={styles.loadingText}>Carregando exames...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ModernHeader
                title="Exames Toxicológicos"
                iconName="flask-outline"
                onBackPress={() => navigation.goBack()}
            />

            <Surface style={styles.filterContainer}>
                <Searchbar
                    placeholder="Buscar por colaborador, tipo..."
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
                        { value: 'todos', label: 'Todos', icon: 'flask-outline' },
                        { value: 'negativos', label: 'Negativos', icon: 'check-circle-outline' },
                        { value: 'positivos', label: 'Positivos', icon: 'alert-circle-outline' },
                    ]}
                />
            </Surface>

            <FlatList
                data={filteredList}
                renderItem={renderItem}
                keyExtractor={item => item.id || Math.random().toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => setRefreshing(true)}
                        colors={[customTheme.colors.primary]}
                    />
                }
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
            />

            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() => navigation.navigate('ToxicologicoFormScreen', { mode: 'create' })}
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
        padding: 16,
        backgroundColor: customTheme.colors.surface,
        elevation: 1,
    },
    searchbar: {
        marginBottom: 12,
        backgroundColor: customTheme.colors.surfaceVariant,
        elevation: 0,
    },
    searchInput: {
        fontSize: 14,
    },
    listContent: {
        paddingVertical: 8,
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

export default ToxicologicoScreen;
