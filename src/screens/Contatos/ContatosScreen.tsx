import {
    Avatar,
    Chip,
    Surface,
    Text,
    TextInput,
    useTheme,
} from 'react-native-paper';
import {
    Dimensions,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';

import Icon from 'react-native-vector-icons/MaterialIcons';
import ModernHeader from '../../assets/components/ModernHeader';
import { User } from '../Adm/types/admTypes';
import { customTheme } from '../../theme/theme';
import { db } from '../../../firebase';

const { width } = Dimensions.get('window');

const SHOW_ONLY_ECOLOGIKA_EMAILS = true;

export default function ContatosScreen({ navigation }: any) {
    const theme = useTheme();
    const [filter, setFilter] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

    // Atualizar acessarUsuarios
    const acessarUsuarios = async () => {
        try {
            const snapshot = await getDocs(collection(db(), 'users'));

            const listaUsuarios: User[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                user: doc.data().user,
                email: doc.data().email,
                telefone: doc.data().telefone,
                cargo: doc.data().cargo,
                ramal: doc.data().ramal || '',
                area: doc.data().area || '',
                photoURL: doc.data().photoURL || ''
            }));

            const filteredUsers = listaUsuarios.filter(user =>
                user.cargo === 'Administrador' ||
                user.email.toLowerCase().endsWith('@ecologika.com.br')
            );

            setUsers(filteredUsers);
            setFilteredUsers(filteredUsers);
        } catch (error) {
            console.error('Erro ao acessar a coleção "users":', error);
        }
    };

    useEffect(() => {
        acessarUsuarios();
    }, []);

    useEffect(() => {
        if (filter.trim() === '') {
            setFilteredUsers(users);
        } else {
            const lowerCaseFilter = filter.toLowerCase();
            const filteredData = users.filter((item) =>
                item.user.toLowerCase().includes(lowerCaseFilter) ||
                item.cargo.toLowerCase().includes(lowerCaseFilter) ||
                item.area?.toLowerCase().includes(lowerCaseFilter)
            );
            setFilteredUsers(filteredData);
        }
    }, [filter, users]);

    const handleEmailPress = (email: string) => {
        Linking.openURL(`mailto:${email}`);
    };

    const handlePhonePress = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    const ContactCard = ({ user }: { user: User }) => (
        <Surface style={styles.card}>
            {/* Barra de gradiente superior */}
            <View style={styles.cardGradient} />

            <View style={styles.cardContent}>

                {/* Cabeçalho do Card */}
                <View style={styles.cardHeader}>
                    {user.photoURL ? (
                        <Avatar.Image
                            size={56}
                            source={{ uri: user.photoURL }}
                            style={styles.avatar}
                        />
                    ) : (
                        <Avatar.Icon
                            size={56}
                            icon={() => (
                                <Icon
                                    name="person"
                                    size={32}
                                    color="#FFF"
                                />
                            )}
                            style={styles.avatar}
                        />
                    )}
                    <View style={styles.headerInfo}>
                        <Text variant="titleMedium" style={styles.userName}>
                            {user.user}
                        </Text>
                        <Chip
                            style={styles.cargoChip}
                            textStyle={styles.cargoChipText}
                        >
                            {user.cargo}
                        </Chip>
                    </View>
                </View>

                {/* Informações de Contato */}
                <View style={styles.contactInfo}>
                    {/* Email */}
                    <TouchableOpacity
                        onPress={() => handleEmailPress(user.email)}
                        style={styles.contactItem}
                    >
                        <Icon
                            name="mail"
                            size={20}
                            color={customTheme.colors.primary}
                        />
                        <Text style={styles.contactText} numberOfLines={1}>
                            {user.email}
                        </Text>
                    </TouchableOpacity>

                    {/* Telefone */}
                    {user.telefone && (
                        <TouchableOpacity
                            onPress={() => user.telefone && handlePhonePress(user.telefone)}
                            style={[styles.contactItem, styles.phoneItem]}
                        >
                            <Icon
                                name="phone"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.contactText}>
                                {user.telefone}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Ramal */}
                    {user.ramal && (
                        <View style={[styles.contactItem, styles.ramalItem]}>
                            <Icon
                                name="menu-book"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.contactText}>
                                Ramal: {user.ramal}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Surface>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <ModernHeader
                title="Contatos Ecologika"
                iconName="phone"
                onBackPress={() => navigation.goBack()}
            />

            {/* Header com Busca */}
            <View style={styles.searchContainer}>
                <TextInput
                    mode="outlined"
                    placeholder="Buscar por nome, cargo ou área..."
                    value={filter}
                    onChangeText={setFilter}
                    left={<TextInput.Icon
                        icon={() => (
                            <Icon
                                name="search"
                                size={24}
                                color={customTheme.colors.primary}
                            />
                        )}
                    />}
                    style={styles.searchInput}
                />
                <Text style={styles.resultCount}>
                    {filteredUsers.length} {filteredUsers.length === 1 ? 'colaborador encontrado' : 'colaboradores encontrados'}
                </Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {filteredUsers.length === 0 ? (
                    <Surface style={styles.emptyState}>
                        <Icon
                            name="phone"
                            size={48}
                            color={customTheme.colors.primary}
                            style={styles.emptyStateIcon}
                        />
                        <Text variant="titleMedium" style={styles.emptyStateTitle}>
                            Nenhum resultado encontrado
                        </Text>
                        <Text style={styles.emptyStateSubtitle}>
                            Tente buscar por outro nome, cargo ou área
                        </Text>
                    </Surface>
                ) : (
                    <View style={styles.contactsGrid}>
                        {filteredUsers
                            .sort((a, b) => a.user.localeCompare(b.user))
                            .map((user) => (
                                <ContactCard key={user.id} user={user} />
                            ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    contactsGrid: {
        width: '100%',
        gap: 16,
    },
    card: {
        width: '100%', // Ao invés de calcular com base na width da tela
        borderRadius: 8,
        overflow: 'hidden',
        elevation: 2,
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    searchContainer: {
        padding: 16,
        backgroundColor: customTheme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outline,
    },
    searchInput: {
        backgroundColor: '#FFFFFF',
    },
    resultCount: {
        marginTop: 8,
        color: customTheme.colors.onSurfaceVariant,
        fontSize: 14,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    cardGradient: {
        height: 3,
        backgroundColor: customTheme.colors.primary,
    },
    cardContent: {
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    avatar: {
        backgroundColor: customTheme.colors.primary,
    },
    headerInfo: {
        flex: 1,
    },
    userName: {
        fontWeight: '600',
        marginBottom: 4,
    },
    cargoChip: {
        backgroundColor: `${customTheme.colors.primary}20`,
        // height: 24,
    },
    cargoChipText: {
        color: customTheme.colors.primary,
        fontSize: 12,
    },
    contactInfo: {
        gap: 8,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 8,
        borderRadius: 8,
        backgroundColor: `${customTheme.colors.primary}10`,
    },
    phoneItem: {
        backgroundColor: `${customTheme.colors.secondary}10`,
    },
    ramalItem: {
        backgroundColor: `${customTheme.colors.primary}10`,
    },
    contactText: {
        flex: 1,
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
        borderRadius: 8,
    },
    emptyStateIcon: {
        marginBottom: 16,
        opacity: 0.5,
    },
    emptyStateTitle: {
        marginBottom: 8,
        color: customTheme.colors.onSurfaceVariant,
    },
    emptyStateSubtitle: {
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center',
    },
});