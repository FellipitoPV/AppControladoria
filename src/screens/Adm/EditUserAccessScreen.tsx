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
import { useFocusEffect } from '@react-navigation/native';
import { Text, Portal, Dialog, TextInput } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { showGlobalToast } from '../../helpers/GlobalApi';
import { customTheme } from '../../theme/theme';
import { AcessoInterface, AcessosType } from './components/admTypes';

interface User {
    id: string;
    user: string;
    email: string;
    telefone: string;
    cargo: string;
    ramal: string;
    area: string;
    acesso: string[];
    photoURL: string;
}

const AccessItem: React.FC<{
    item: AcessoInterface;  // Aqui mudamos para usar sua interface
    isSelected: boolean;
    onToggle: () => void;
}> = ({ item, isSelected, onToggle }) => {
    return (
        <TouchableOpacity
            onPress={onToggle}
            style={[styles.accessItem, isSelected && styles.accessItemSelected]}
        >
            <View style={styles.accessItemContent}>
                <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                    <MaterialIcons
                        name={item.icon}
                        size={20}
                        color={isSelected ? 'white' : customTheme.colors.primary}
                    />
                </View>
                <View style={styles.accessItemText}>
                    <Text style={[styles.accessItemLabel, isSelected && styles.accessItemLabelSelected]}>
                        {item.label}
                    </Text>
                    <Text style={styles.accessItemDescription}>
                        {item.description}
                    </Text>
                </View>
            </View>
            <MaterialIcons
                name={isSelected ? 'checkbox-intermediate' : 'checkbox-blank-outline'}
                size={24}
                color={isSelected ? customTheme.colors.primary : '#666'}
            />
        </TouchableOpacity>
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
            <MaterialIcons name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
    );
};

export default function EditUserAccessScreen() {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedAccess, setSelectedAccess] = useState<string[]>([]);
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

    const loadUsers = async () => {
        try {
            const snapshot = await firestore()
                .collection('users')
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

            const filteredUsers = listaUsuarios.filter(user =>
                user.cargo === 'Administrador' ||
                user.email.toLowerCase().endsWith('@ecologika.com.br')
            );

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

    const handleUserSelect = (user: User) => {
        setSelectedUser(user);
        setSelectedAccess(user.acesso || []);
    };

    const handleBack = () => {
        setSelectedUser(null);
        setSelectedAccess([]);
    };

    const handleToggleAccess = (accessId: string) => {
        setSelectedAccess(prev => {
            if (prev.includes(accessId)) {
                return prev.filter(id => id !== accessId);
            } else {
                return [...prev, accessId];
            }
        });
    };

    const handleSaveAccess = async () => {
        if (!selectedUser?.id) return;

        setLoading(true);
        try {
            await firestore()
                .collection('users')
                .doc(selectedUser.id)
                .update({
                    acesso: selectedAccess
                });

            showGlobalToast(
                'success',
                'Sucesso',
                'Acessos atualizados com sucesso!',
                3000
            );
            setConfirmDialogVisible(false);
            loadUsers(); // Recarrega a lista de usuários
            handleBack(); // Volta para a tela de busca
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
                    <View style={styles.header}>
                        <MaterialIcons
                            name="manage-accounts"
                            size={32}
                            color={customTheme.colors.primary}
                        />
                        <Text style={styles.headerTitle}>Gerenciar Acessos</Text>
                    </View>

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
                <ScrollView style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                            <MaterialIcons
                                name="keyboard-backspace"
                                size={24}
                                color={customTheme.colors.primary}
                            />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Editar Acessos</Text>
                    </View>

                    <View style={styles.userHeader}>
                        {selectedUser.photoURL ? (
                            <Image
                                source={{ uri: selectedUser.photoURL }}
                                style={styles.selectedUserAvatar}
                            />
                        ) : (
                            <View style={styles.selectedUserAvatarPlaceholder}>
                                <Text style={styles.selectedUserAvatarText}>
                                    {selectedUser.user.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <Text style={styles.selectedUserName}>{selectedUser.user}</Text>
                        <Text style={styles.selectedUserEmail}>{selectedUser.email}</Text>
                    </View>

                    <View style={styles.accessList}>
                        {AcessosType.map((access) => (
                            <AccessItem
                                key={access.id}
                                item={access}
                                isSelected={selectedAccess.includes(access.id)}
                                onToggle={() => handleToggleAccess(access.id)}
                            />
                        ))}
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={() => setConfirmDialogVisible(true)}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <MaterialIcons name="save" size={24} color="white" />
                                    <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
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
    accessItemDescription: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: customTheme.colors.primary,
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
    userHeader: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: `${customTheme.colors.primary}10`,
    },
    selectedUserAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 12,
    },
    selectedUserAvatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: customTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    selectedUserAvatarText: {
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
    },
    selectedUserName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    selectedUserEmail: {
        fontSize: 14,
        color: '#666',
    },
    accessList: {
        padding: 20,
        gap: 12,
    },
    accessItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
    },
    accessItemContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    accessItemSelected: {
        backgroundColor: `${customTheme.colors.primary}10`,
        borderColor: customTheme.colors.primary,
    },
    iconContainer: {
        width: 42,
        height: 42,
        borderRadius: 24,
        backgroundColor: `${customTheme.colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainerSelected: {
        backgroundColor: customTheme.colors.primary,
    },
    accessItemText: {
        flex: 1,
    },
    accessItemLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    accessItemLabelSelected: {
        color: customTheme.colors.primary,
    },
    buttonContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: customTheme.colors.primary,
        padding: 16,
        borderRadius: 12,
        elevation: 2,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
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