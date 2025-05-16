import {
    Avatar,
    Chip,
    Surface,
    Text,
    TextInput,
    useTheme,
    Modal,
    Portal,
    Button,
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
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import ModernHeader from '../../assets/components/ModernHeader';
import { User } from '../Adm/types/admTypes';
import { customTheme } from '../../theme/theme';
import { FirestoreGet } from '../../Hooks/Firebase/firebaseAPI';

const { width } = Dimensions.get('window');

const SHOW_ONLY_ECOLOGIKA_EMAILS = true;

export default function ContatosScreen({ navigation }: any) {
    const theme = useTheme();
    const [filter, setFilter] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Função para buscar usuários usando FirestoreGet
    const acessarUsuarios = async () => {
        try {
            const listaUsuarios: User[] = await FirestoreGet({
                collectionPath: 'users'
            });

            // Filtra usuários com cargo Administrador ou email @ecologika.com.br
            const filteredUsers = listaUsuarios.filter(user =>
                user.cargo === 'Administrador' ||
                (SHOW_ONLY_ECOLOGIKA_EMAILS && user.email.toLowerCase().endsWith('@ecologika.com.br'))
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

    const getCargoIcon = (cargo: string) => {
        return cargo === 'Administrador' ? 'admin-panel-settings' : 'work';
    };

    const openModal = (user: User) => {
        setSelectedUser(user);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedUser(null);
    };

    const ContactCard = ({ user }: { user: User }) => (
        <TouchableOpacity
            onPress={() => openModal(user)}
            activeOpacity={0.8}
            style={styles.cardTouchable}
        >
            <Surface style={styles.card}>
                <LinearGradient
                    colors={[`${customTheme.colors.primary}10`, '#FFFFFF']}
                    style={styles.cardGradient}
                />
                <View style={styles.cardBorder} />
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        {user.photoURL ? (
                            <Avatar.Image
                                size={48}
                                source={{ uri: user.photoURL }}
                                style={styles.avatar}
                            />
                        ) : (
                            <Avatar.Icon
                                size={48}
                                icon={() => (
                                    <Icon
                                        name="person"
                                        size={28}
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
                            <View style={styles.cargoContainer}>
                                <Icon
                                    name={getCargoIcon(user.cargo)}
                                    size={16}
                                    color={customTheme.colors.primary}
                                    style={styles.cargoIcon}
                                />
                                <Text style={styles.cargoText}>
                                    {user.cargo}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Surface>
        </TouchableOpacity>
    );

    const ContactModal = () => (
        <Portal>
            <Modal
                visible={modalVisible}
                onDismiss={closeModal}
                contentContainerStyle={styles.modalContainer}
            >
                {selectedUser && (
                    <View style={styles.modalContent}>
                        <LinearGradient
                            colors={[customTheme.colors.primary, customTheme.colors.secondary]}
                            style={styles.modalHeaderGradient}
                        />
                        <View style={styles.modalHeader}>
                            {selectedUser.photoURL ? (
                                <Avatar.Image
                                    size={80}
                                    source={{ uri: selectedUser.photoURL }}
                                    style={styles.modalAvatar}
                                />
                            ) : (
                                <Avatar.Icon
                                    size={80}
                                    icon={() => (
                                        <Icon
                                            name="person"
                                            size={48}
                                            color="#FFF"
                                        />
                                    )}
                                    style={styles.modalAvatar}
                                />
                            )}
                            <Text variant="titleLarge" style={styles.modalUserName}>
                                {selectedUser.user}
                            </Text>
                            <View style={styles.modalCargoContainer}>
                                <Icon
                                    name={getCargoIcon(selectedUser.cargo)}
                                    size={18}
                                    color={customTheme.colors.primary}
                                />
                                <Text style={styles.modalCargoText}>
                                    {selectedUser.cargo}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.modalInfo}>
                            {/* Email */}
                            <View style={styles.modalContactItem}>
                                <Icon
                                    name="mail"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <Text style={styles.modalContactText} numberOfLines={1}>
                                    {selectedUser.email}
                                </Text>
                                <Button
                                    mode="outlined"
                                    onPress={() => handleEmailPress(selectedUser.email)}
                                    style={styles.modalActionButton}
                                    icon="mail"
                                    compact
                                >
                                    Enviar
                                </Button>
                            </View>

                            {/* Telefone */}
                            {selectedUser.telefone && (
                                <View style={styles.modalContactItem}>
                                    <Icon
                                        name="phone"
                                        size={24}
                                        color={customTheme.colors.secondary}
                                    />
                                    <Text style={styles.modalContactText}>
                                        {selectedUser.telefone}
                                    </Text>
                                    <Button
                                        mode="outlined"
                                        onPress={() => handlePhonePress(selectedUser.telefone!)}
                                        style={styles.modalActionButton}
                                        icon="phone"
                                        compact
                                    >
                                        Ligar
                                    </Button>
                                </View>
                            )}

                            {/* Ramal */}
                            {selectedUser.ramal && (
                                <View style={styles.modalContactItem}>
                                    <Icon
                                        name="menu-book"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text style={styles.modalContactText}>
                                        Ramal: {selectedUser.ramal}
                                    </Text>
                                </View>
                            )}

                            {/* Área */}
                            {selectedUser.area && (
                                <View style={styles.modalContactItem}>
                                    <Icon
                                        name="business"
                                        size={24}
                                        color={customTheme.colors.secondary}
                                    />
                                    <Text style={styles.modalContactText}>
                                        Área: {selectedUser.area}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <Button
                            mode="contained"
                            onPress={closeModal}
                            style={styles.modalCloseButton}
                            icon="close"
                        >
                            Fechar
                        </Button>
                    </View>
                )}
            </Modal>
        </Portal>
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
                            <Surface style={styles.searchIconSurface}>
                                <Icon
                                    name="search"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                            </Surface>
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
                        <LinearGradient
                            colors={[`${customTheme.colors.primary}20`, `${customTheme.colors.secondary}20`]}
                            style={styles.emptyStateGradient}
                        />
                        <Icon
                            name="phone"
                            size={64}
                            color={customTheme.colors.primary}
                            style={styles.emptyStateIcon}
                        />
                        <Text variant="titleMedium" style={styles.emptyStateTitle}>
                            Nenhum contato encontrado
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

            <ContactModal />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    searchContainer: {
        padding: 16,
        backgroundColor: customTheme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outline,
    },
    searchInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        elevation: 2,
    },
    searchIconSurface: {
        borderRadius: 20,
        backgroundColor: `${customTheme.colors.primary}20`,
        padding: 4,
    },
    resultCount: {
        marginTop: 12,
        color: customTheme.colors.onSurfaceVariant,
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    contactsGrid: {
        width: '100%',
        gap: 16,
    },
    cardTouchable: {
        transform: [{ scale: 1 }],
    },
    card: {
        width: '100%',
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        overflow: 'hidden',
    },
    cardGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    cardBorder: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: customTheme.colors.primary,
    },
    cardContent: {
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatar: {
        backgroundColor: customTheme.colors.primary,
        borderWidth: 2,
        borderColor: `${customTheme.colors.primary}50`,
    },
    headerInfo: {
        flex: 1,
    },
    userName: {
        fontWeight: '700',
        fontSize: 18,
        color: customTheme.colors.onSurface,
    },
    cargoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    cargoIcon: {
        opacity: 0.8,
    },
    cargoText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        fontWeight: '500',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        elevation: 3,
        position: 'relative',
        overflow: 'hidden',
    },
    emptyStateGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.5,
    },
    emptyStateIcon: {
        marginBottom: 20,
        opacity: 0.7,
    },
    emptyStateTitle: {
        marginBottom: 12,
        color: customTheme.colors.onSurface,
        fontWeight: '700',
        fontSize: 18,
    },
    emptyStateSubtitle: {
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center',
        fontSize: 15,
        lineHeight: 22,
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        margin: 20,
        borderRadius: 20,
        padding: 24,
        maxHeight: '85%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    modalContent: {
        alignItems: 'center',
        gap: 20,
    },
    modalHeaderGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    modalHeader: {
        alignItems: 'center',
        gap: 12,
        marginTop: 20,
        marginBottom: 16,
    },
    modalAvatar: {
        backgroundColor: customTheme.colors.primary,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        elevation: 4,
    },
    modalUserName: {
        fontWeight: '800',
        fontSize: 22,
        color: customTheme.colors.onSurface,
    },
    modalCargoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: `${customTheme.colors.primary}20`,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    modalCargoText: {
        color: customTheme.colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    modalInfo: {
        width: '100%',
        gap: 16,
    },
    modalContactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 12,
        borderRadius: 12,
        backgroundColor: `${customTheme.colors.primary}05`,
    },
    modalContactText: {
        flex: 1,
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    modalActionButton: {
        borderColor: customTheme.colors.primary,
        borderWidth: 1,
        borderRadius: 8,
    },
    modalCloseButton: {
        marginTop: 20,
        backgroundColor: customTheme.colors.primary,
        borderRadius: 10,
        paddingVertical: 8,
        width: '60%',
        alignSelf: 'center',
    },
});