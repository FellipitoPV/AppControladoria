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
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../../firebase';
import { DDSInterface } from './DDSTypes';
import { DDSCard } from './DDSCard';
import ModernHeader from '../../../../assets/components/ModernHeader';
import { customTheme } from '../../../../theme/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
    DDSScreen: undefined;
    DDSFormScreen: { dds?: DDSInterface; mode: 'create' | 'edit' | 'view' };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const isDatePast = (date: Timestamp | string | any): boolean => {
    if (!date) return false;

    let dateObj: Date;

    if (date instanceof Timestamp) {
        dateObj = date.toDate();
    } else if (date && typeof date === 'object' && 'seconds' in date) {
        dateObj = new Date(date.seconds * 1000);
    } else if (typeof date === 'string') {
        dateObj = new Date(date);
    } else {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);

    return dateObj < today;
};

const DDSScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const [ddsList, setDdsList] = useState<DDSInterface[]>([]);
    const [filteredList, setFilteredList] = useState<DDSInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState<'agendados' | 'realizados'>('agendados');

    useEffect(() => {
        const ddsCollection = collection(db(), 'dds');
        const q = query(ddsCollection, orderBy('dataRealizacao', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const ddsData: DDSInterface[] = [];
                snapshot.forEach((doc) => {
                    ddsData.push({
                        id: doc.id,
                        ...doc.data(),
                    } as DDSInterface);
                });
                setDdsList(ddsData);
                setLoading(false);
                setRefreshing(false);
            },
            (error) => {
                console.error('Erro ao carregar DDS:', error);
                setLoading(false);
                setRefreshing(false);
            }
        );

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        filterDDS();
    }, [ddsList, searchQuery, selectedTab]);

    const filterDDS = useCallback(() => {
        let filtered = [...ddsList];

        // Filtro por data de realização
        if (selectedTab === 'agendados') {
            // Agendados: data ainda não passou (hoje ou futuro)
            filtered = filtered.filter((dds) => !isDatePast(dds.dataRealizacao));
        } else {
            // Realizados: data já passou
            filtered = filtered.filter((dds) => isDatePast(dds.dataRealizacao));
        }

        // Filtro por busca
        if (searchQuery.trim()) {
            const searchLower = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (dds) =>
                    dds.titulo?.toLowerCase().includes(searchLower) ||
                    dds.instrutor?.toLowerCase().includes(searchLower) ||
                    dds.assunto?.toLowerCase().includes(searchLower) ||
                    dds.local?.toLowerCase().includes(searchLower)
            );
        }

        setFilteredList(filtered);
    }, [ddsList, searchQuery, selectedTab]);

    const handleRefresh = () => {
        setRefreshing(true);
    };

    const handleAddDDS = () => {
        navigation.navigate('DDSFormScreen', { mode: 'create' });
    };

    const handleViewDDS = (dds: DDSInterface) => {
        navigation.navigate('DDSFormScreen', { dds, mode: 'view' });
    };

    const handleEditDDS = (dds: DDSInterface) => {
        navigation.navigate('DDSFormScreen', { dds, mode: 'edit' });
    };

    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
                name="clipboard-text-off-outline"
                size={64}
                color={customTheme.colors.outline}
            />
            <Text style={styles.emptyText}>
                {searchQuery
                    ? 'Nenhum DDS encontrado para esta busca'
                    : selectedTab === 'agendados'
                    ? 'Nenhum DDS agendado'
                    : 'Nenhum DDS realizado'}
            </Text>
            {!searchQuery && selectedTab === 'agendados' && (
                <Text style={styles.emptySubtext}>
                    Toque no botão + para agendar um novo DDS
                </Text>
            )}
        </View>
    );

    const renderItem = ({ item }: { item: DDSInterface }) => (
        <DDSCard
            dds={item}
            onPress={() => handleViewDDS(item)}
            onEdit={() => handleEditDDS(item)}
        />
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <ModernHeader
                    title="DDS"
                    iconName="account-group"
                    onBackPress={() => navigation.goBack()}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator
                        size="large"
                        color={customTheme.colors.primary}
                    />
                    <Text style={styles.loadingText}>Carregando DDS...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ModernHeader
                title="DDS - Diálogo Diário de Segurança"
                iconName="account-group"
                onBackPress={() => navigation.goBack()}
            />

            <Surface style={styles.filterContainer}>
                <Searchbar
                    placeholder="Buscar por título, instrutor, assunto..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchbar}
                    inputStyle={styles.searchInput}
                    iconColor={customTheme.colors.primary}
                />

                <SegmentedButtons
                    value={selectedTab}
                    onValueChange={(value) =>
                        setSelectedTab(value as 'agendados' | 'realizados')
                    }
                    buttons={[
                        {
                            value: 'agendados',
                            label: 'Agendados',
                            icon: 'calendar-clock',
                        },
                        {
                            value: 'realizados',
                            label: 'Realizados',
                            icon: 'check-circle',
                        },
                    ]}
                />
            </Surface>

            <FlatList
                data={filteredList}
                renderItem={renderItem}
                keyExtractor={(item) => item.id || Math.random().toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[customTheme.colors.primary]}
                    />
                }
                ListEmptyComponent={renderEmptyList}
                showsVerticalScrollIndicator={false}
            />

            <FAB
                icon="plus"
                style={styles.fab}
                onPress={handleAddDDS}
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

export default DDSScreen;
