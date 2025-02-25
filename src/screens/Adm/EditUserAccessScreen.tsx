import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
    BackHandler,
} from 'react-native';
import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Text, Portal, Dialog, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { showGlobalToast } from '../../helpers/GlobalApi';
import { customTheme } from '../../theme/theme';
import { AcessoInterface, AcessosType, User, UserAccess } from './components/admTypes';
import ModernHeader from '../../assets/components/ModernHeader';

interface AccessItemProps {
    item: AcessoInterface;
    selectedLevel: number | null;
    onLevelSelect: (moduleId: string, level: number | null) => void;
}

const AccessItem: React.FC<AccessItemProps> = ({ item, selectedLevel, onLevelSelect }) => {
    const levels = [
        { level: 1, label: "Básico" },
        { level: 2, label: "Avançado" },
        { level: 3, label: "Administrador" }
    ];

    return (
        <View style={styles.accessItem}>
            <View style={styles.accessItemHeader}>
                <View style={styles.accessItemContent}>
                    <View style={styles.iconContainer}>
                        <Icon
                            name={item.icon}
                            size={20}
                            color={selectedLevel ? customTheme.colors.primary : '#666'}
                        />
                    </View>
                    <View style={styles.accessItemText}>
                        <Text style={styles.accessItemLabel}>{item.label}</Text>
                        <Text style={styles.accessItemDescription}>{item.description}</Text>
                    </View>
                </View>
                {selectedLevel !== null && (
                    <TouchableOpacity
                        onPress={() => onLevelSelect(item.id, null)}
                        style={styles.removeButton}
                    >
                        <Icon name="close-circle" size={25} color={customTheme.colors.error} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.levelSelector}>
                {levels.map((levelOption) => (
                    <TouchableOpacity
                        key={levelOption.level}
                        style={[
                            styles.levelButton,
                            selectedLevel === levelOption.level && styles.levelButtonSelected
                        ]}
                        onPress={() => onLevelSelect(item.id, levelOption.level)}
                    >
                        <Text style={[
                            styles.levelButtonText,
                            selectedLevel === levelOption.level && styles.levelButtonTextSelected
                        ]}>
                            {levelOption.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const UserSearchItem: React.FC<{
    user: User;
    onSelect: () => void;
}> = ({ user, onSelect }) => {
    return (
        <TouchableOpacity style={styles.userItem} onPress={onSelect}>
            <View style={styles.userAvatarContainer}>
                {user.photoURL ? (
                    <Image source={{ uri: user.photoURL }} style={styles.userAvatar} />
                ) : (
                    <View style={styles.userAvatarPlaceholder}>
                        <Text style={styles.userAvatarText}>
                            {user.user.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.user}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userCargo}>{user.cargo}</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
    );
};

export default function EditUserAccessScreen() {
    const navigation = useNavigation<NavigationProp<ParamListBase>>();

    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedAccess, setSelectedAccess] = useState<UserAccess[]>([]);
    const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    // Controle do botão voltar
    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                if (selectedUser) {
                    handleBack();
                    return true; // Previne a navegação padrão
                }
                return false; // Permite a navegação padrão
            };

            BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () =>
                BackHandler.removeEventListener('hardwareBackPress', onBackPress);
        }, [selectedUser])
    );

    // Atualizar loadUsers
    const loadUsers = async () => {
        try {
            const snapshot = await firestore()
                .collection('users')
                .orderBy('user', 'asc') // 'asc' para ordem crescente (A-Z)
                .get();

            const listaUsuarios: User[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                user: doc.data().user,
                email: doc.data().email,
                telefone: doc.data().telefone,
                cargo: doc.data().cargo,
                ramal: doc.data().ramal || '',
                area: doc.data().area || '',
                acesso: doc.data().acesso || [],
                photoURL: doc.data().photoURL || ''
            }));

            setUsers(listaUsuarios);
        } catch (error) {
            console.error('Erro ao acessar a coleção "users":', error);
            showGlobalToast(
                'error',
                'Erro',
                'Não foi possível carregar os usuários',
                3000
            );
        }
    };

    // Função de seleção de usuário atualizada
    const handleUserSelect = (user: User) => {
        setSelectedUser(user);

        if (user.acesso) {
            // Se já tem acessos definidos, usa eles
            setSelectedAccess(user.acesso);
        } else {
            // Se não tem nenhum acesso ainda
            setSelectedAccess([]);
        }
    };

    const handleBack = () => {
        setSelectedUser(null);
        setSelectedAccess([]);
    };

    // Função para manipular seleção de nível
    const handleLevelSelect = (moduleId: string, level: number | null) => {
        setSelectedAccess(prev => {
            if (level === null) {
                // Remove o acesso se level for null
                return prev.filter(access => access.moduleId !== moduleId);
            }

            const existing = prev.find(access => access.moduleId === moduleId);
            if (existing) {
                return prev.map(access =>
                    access.moduleId === moduleId
                        ? { ...access, level }
                        : access
                );
            }
            return [...prev, { moduleId, level }];
        });
    };

    // Atualizar handleSaveAccess
    const handleSaveAccess = async () => {
        if (!selectedUser?.id) return;

        setLoading(true);
        try {
            await firestore()
                .collection('users')
                .doc(selectedUser.id)
                .update({
                    acesso: selectedAccess // Salva diretamente o array de UserAccess
                });

            showGlobalToast(
                'success',
                'Sucesso',
                'Acessos atualizados com sucesso!',
                3000
            );
            setConfirmDialogVisible(false);
            loadUsers();
            handleBack();
        } catch (error) {
            console.error('Erro ao atualizar acessos:', error);
            showGlobalToast(
                'error',
                'Erro',
                'Não foi possível atualizar os acessos',
                3000
            );
        } finally {
            setLoading(false);
        }
    };

    // Função para remover acentos para melhorar a busca
    const removeAccents = (str: string) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    // Filtra usuários baseado na busca
    const filteredUsers = users.filter(user => {
        const searchTermNormalized = removeAccents(searchQuery.toLowerCase());
        const userNameNormalized = removeAccents(user.user.toLowerCase());
        const userEmailNormalized = removeAccents(user.email.toLowerCase());
        const userCargoNormalized = removeAccents(user.cargo.toLowerCase());

        return userNameNormalized.includes(searchTermNormalized) ||
            userEmailNormalized.includes(searchTermNormalized) ||
            userCargoNormalized.includes(searchTermNormalized);
    });

    return (
        <View style={styles.container}>
            {!selectedUser ? (
                // Tela de busca de usuários
                <>
                    {/* Header */}
                    <ModernHeader
                        title="Gerenciar Acessos"
                        iconName="account-cog"
                        onBackPress={() => navigation?.goBack()}
                    />

                    <View style={styles.searchContainer}>
                        <TextInput
                            placeholder="Buscar usuário..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            left={<TextInput.Icon icon="account-search" />}
                            style={styles.searchInput}
                        />
                    </View>

                    <ScrollView style={styles.userList}>
                        {filteredUsers.map((user) => (
                            <UserSearchItem
                                key={user.id}
                                user={user}
                                onSelect={() => handleUserSelect(user)}
                            />
                        ))}
                    </ScrollView>
                </>
            ) : (
                // Tela de edição de acessos
                <>
                    <ModernHeader
                        title={selectedUser.user}
                        iconName="account-edit"
                        rightIcon='content-save'
                        rightAction={handleSaveAccess}
                        onBackPress={() => setSelectedUser(null)}
                    />

                    <View style={styles.accessList}>
                        {AcessosType.map((access) => (
                            <AccessItem
                                key={access.id}
                                item={access}
                                selectedLevel={selectedAccess.find(a => a.moduleId === access.id)?.level || null}
                                onLevelSelect={handleLevelSelect}
                            />
                        ))}
                    </View>
                </>
            )}

            {/* Dialog de Confirmação */}
            <Portal>
                <Dialog
                    visible={confirmDialogVisible}
                    onDismiss={() => setConfirmDialogVisible(false)}
                    style={styles.dialog}
                >
                    <Dialog.Title>Confirmar Alterações</Dialog.Title>
                    <Dialog.Content>
                        <Text style={styles.dialogText}>
                            Tem certeza que deseja salvar as alterações nos acessos de {selectedUser?.user}?
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <TouchableOpacity
                            onPress={() => setConfirmDialogVisible(false)}
                            style={styles.dialogCancelButton}
                        >
                            <Text style={styles.dialogCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSaveAccess}
                            style={styles.dialogConfirmButton}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={styles.dialogConfirmText}>Confirmar</Text>
                            )}
                        </TouchableOpacity>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    accessItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    removeButton: {
        padding: 0,
        right: 15,
    },
    levelButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    levelButtonSelected: {
        backgroundColor: customTheme.colors.primary,
        borderColor: customTheme.colors.primary,
    },
    levelButtonText: {
        fontSize: 12,
        color: '#666',
    },
    levelButtonTextSelected: {
        color: 'white',
    },
    accessItem: {
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        marginBottom: 12,
    },
    accessItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    levelSelector: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    accessItemDescription: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    searchContainer: {
        padding: 20,
        backgroundColor: `${customTheme.colors.primary}10`,
    },
    searchInput: {
        backgroundColor: 'white',
    },
    userList: {
        flex: 1,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    userAvatarContainer: {
        marginRight: 16,
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    userAvatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: customTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatarText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
    },
    userCargo: {
        fontSize: 12,
        color: customTheme.colors.primary,
        marginTop: 4,
    },
    accessList: {
        padding: 20,
        gap: 12,
    },
    iconContainer: {
        width: 42,
        height: 42,
        borderRadius: 24,
        backgroundColor: `${customTheme.colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    accessItemText: {
        flex: 1,
    },
    accessItemLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    dialog: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 8,
    },
    dialogText: {
        fontSize: 16,
        color: '#666',
    },
    dialogCancelButton: {
        padding: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    dialogConfirmButton: {
        padding: 8,
        minWidth: 80,
        alignItems: 'center',
        backgroundColor: customTheme.colors.primary,
        borderRadius: 8,
        marginLeft: 8,
    },
    dialogCancelText: {
        color: customTheme.colors.error,
        fontWeight: '500',
    },
    dialogConfirmText: {
        color: 'white',
        fontWeight: '500',
    },
})