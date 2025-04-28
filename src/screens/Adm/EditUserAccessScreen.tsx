import { AcessoInterface, AcessosType, User, UserAccess } from './types/admTypes';
import {
    ActivityIndicator,
    BackHandler,
    Image,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { EnhancedSearchContainer, ModernSearchBar } from './components/ModernSearchBar';
import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';

import ConfirmationModal from '../../assets/components/ConfirmationModal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../assets/components/ModernHeader';
import { customTheme } from '../../theme/theme';
import { db } from '../../../firebase';
import { showGlobalToast } from '../../helpers/GlobalApi';

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
                        <Icon name={item.icon} size={18} color={selectedLevel ? customTheme.colors.primary : '#666'} />
                    </View>
                    <View style={styles.accessItemText}>
                        <Text style={styles.accessItemLabel}>{item.label}</Text>
                        <Text numberOfLines={1} style={styles.accessItemDescription}>{item.description}</Text>
                    </View>
                </View>
                {selectedLevel !== null && (
                    <TouchableOpacity onPress={() => onLevelSelect(item.id, null)} style={styles.removeButton}>
                        <Icon name="close-circle" size={22} color={customTheme.colors.error} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.levelSelector}>
                {levels.map((levelOption) => (
                    <TouchableOpacity
                        key={levelOption.level}
                        style={[styles.levelButton, selectedLevel === levelOption.level && styles.levelButtonSelected]}
                        onPress={() => onLevelSelect(item.id, levelOption.level)}
                    >
                        <Text style={[styles.levelButtonText, selectedLevel === levelOption.level && styles.levelButtonTextSelected]}>
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
            const usersQuery = query(
                collection(db(), 'users'),
                orderBy('user', 'asc')
            );
            const snapshot = await getDocs(usersQuery);

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

    const handleSaveAccess = () => {
        setConfirmDialogVisible(true); // Abrir modal antes de salvar
    };

    // Atualizar saveAccess
    const saveAccess = async () => {
        if (!selectedUser?.id) return;

        setLoading(true);
        try {
            await updateDoc(doc(db(), 'users', selectedUser.id), {
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

    // Função auxiliar para extrair primeiro e último nome
    const getShortName = (fullName: string) => {
        const parts = fullName.trim().split(' ');
        if (parts.length === 1) return parts[0];
        return `${parts[0]} ${parts[parts.length - 1]}`;
    };

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

                    <EnhancedSearchContainer
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        resultCount={filteredUsers.length}
                    />

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
                        title={getShortName(selectedUser.user)}
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
            <ConfirmationModal
                visible={confirmDialogVisible}
                title="Confirmar Alterações"
                message={`Tem certeza que deseja salvar as alterações nos acessos de ${selectedUser?.user}?`}
                onCancel={() => setConfirmDialogVisible(false)}
                onConfirm={saveAccess}
                loading={loading}
                confirmText="Salvar"
                iconName="content-save"
                colorScheme="primary" // Novo parâmetro para definir o esquema de cores
            />

        </View>
    );
}

const styles = StyleSheet.create({
    accessItem: {
        padding: 12, // Reduzido de 16
        backgroundColor: 'white',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        marginBottom: 8, // Reduzido de 12
    },
    iconContainer: {
        width: 36, // Reduzido de 42
        height: 36, // Reduzido de 42
        borderRadius: 18,
        backgroundColor: `${customTheme.colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    levelSelector: {
        flexDirection: 'row',
        gap: 6, // Reduzido de 8
        marginTop: 6, // Reduzido de 8
    },
    accessList: {
        padding: 16, // Reduzido de 20
        gap: 8, // Reduzido de 12
    },
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
    accessItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
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
    accessItemText: {
        flex: 1,
    },
    accessItemLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
})