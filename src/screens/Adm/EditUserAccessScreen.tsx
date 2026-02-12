import { User, UserAccess, getLevelLabel } from './types/admTypes';
import {
    Alert,
    BackHandler,
    Image,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { EnhancedSearchContainer } from './components/ModernSearchBar';
import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';

import ConfirmationModal from '../../assets/components/ConfirmationModal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../assets/components/ModernHeader';
import { customTheme } from '../../theme/theme';
import { db } from '../../../firebase';
import { showGlobalToast } from '../../helpers/GlobalApi';

// ==================== ACCESS ITEM ====================

const AccessItem: React.FC<{
    access: UserAccess;
    onLevelChange: (moduleId: string, level: number) => void;
    onRemove: (moduleId: string) => void;
}> = ({ access, onLevelChange, onRemove }) => {
    const levels = [1, 2, 3];

    return (
        <View style={styles.accessItem}>
            <View style={styles.accessItemHeader}>
                <View style={styles.accessItemContent}>
                    <View style={styles.iconContainer}>
                        <Icon name="key-variant" size={18} color={customTheme.colors.primary} />
                    </View>
                    <View style={styles.accessItemText}>
                        <Text style={styles.accessItemLabel}>{access.moduleId}</Text>
                        <Text style={styles.accessItemDescription}>
                            Nível {access.level} - {getLevelLabel(access.level)}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => onRemove(access.moduleId)} style={styles.removeButton}>
                    <Icon name="close-circle" size={22} color={customTheme.colors.error} />
                </TouchableOpacity>
            </View>

            <View style={styles.levelSelector}>
                {levels.map((level) => (
                    <TouchableOpacity
                        key={level}
                        style={[styles.levelButton, access.level === level && styles.levelButtonSelected]}
                        onPress={() => onLevelChange(access.moduleId, level)}
                    >
                        <Text style={[styles.levelButtonText, access.level === level && styles.levelButtonTextSelected]}>
                            {level} - {getLevelLabel(level)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

// ==================== USER SEARCH ITEM ====================

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
                {user.acesso && user.acesso.length > 0 && (
                    <Text style={styles.userAccessList} numberOfLines={2}>
                        {user.acesso.map(a => `${a.moduleId}:${a.level}`).join(', ')}
                    </Text>
                )}
            </View>
            <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
    );
};

// ==================== MAIN SCREEN ====================

export default function EditUserAccessScreen() {
    const navigation = useNavigation<NavigationProp<ParamListBase>>();

    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedAccess, setSelectedAccess] = useState<UserAccess[]>([]);
    const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);

    const [newModuleId, setNewModuleId] = useState('');
    const [originalAccess, setOriginalAccess] = useState<UserAccess[]>([]);

    useEffect(() => {
        loadUsers();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                if (selectedUser) {
                    tryBack();
                    return true;
                }
                return false;
            };

            BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
        }, [selectedUser, selectedAccess, originalAccess])
    );

    const loadUsers = async () => {
        try {
            const usersQuery = query(
                collection(db(), 'users'),
                orderBy('user', 'asc')
            );
            const snapshot = await getDocs(usersQuery);

            const listaUsuarios: User[] = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                user: docSnap.data().user,
                email: docSnap.data().email,
                telefone: docSnap.data().telefone,
                cargo: docSnap.data().cargo,
                ramal: docSnap.data().ramal || '',
                area: docSnap.data().area || '',
                acesso: docSnap.data().acesso || [],
                photoURL: docSnap.data().photoURL || ''
            }));

            setUsers(listaUsuarios);
        } catch (error) {
            console.error('Erro ao acessar a coleção "users":', error);
            showGlobalToast('error', 'Erro', 'Não foi possível carregar os usuários', 3000);
        }
    };

    const handleUserSelect = (user: User) => {
        const acesso = user.acesso || [];
        setSelectedUser(user);
        setSelectedAccess(acesso);
        setOriginalAccess(acesso);
        setNewModuleId('');
    };

    const hasChanges = (): boolean => {
        if (selectedAccess.length !== originalAccess.length) return true;
        return selectedAccess.some(a => {
            const orig = originalAccess.find(o => o.moduleId === a.moduleId);
            return !orig || orig.level !== a.level;
        });
    };

    const handleBack = () => {
        setSelectedUser(null);
        setSelectedAccess([]);
        setOriginalAccess([]);
        setNewModuleId('');
    };

    const tryBack = () => {
        if (hasChanges()) {
            Alert.alert(
                'Alterações não salvas',
                'Você fez alterações que não foram salvas. Deseja salvar antes de sair?',
                [
                    { text: 'Descartar', style: 'destructive', onPress: handleBack },
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Salvar', onPress: handleSaveAccess },
                ],
            );
        } else {
            handleBack();
        }
    };

    // ==================== ACCESS MANAGEMENT ====================

    const handleAddModule = () => {
        const id = newModuleId.trim().toLowerCase();
        if (!id) {
            showGlobalToast('error', 'ID vazio', 'Informe o ID do módulo', 3000);
            return;
        }
        if (selectedAccess.find(a => a.moduleId === id)) {
            showGlobalToast('info', 'Já existe', `O módulo "${id}" já está na lista`, 3000);
            return;
        }

        setSelectedAccess(prev => [...prev, { moduleId: id, level: 1 }]);
        setNewModuleId('');
    };

    const handleLevelChange = (moduleId: string, level: number) => {
        setSelectedAccess(prev =>
            prev.map(a => a.moduleId === moduleId ? { ...a, level } : a)
        );
    };

    const handleRemove = (moduleId: string) => {
        setSelectedAccess(prev => prev.filter(a => a.moduleId !== moduleId));
    };

    // ==================== SAVE ====================

    const handleSaveAccess = () => {
        setConfirmDialogVisible(true);
    };

    const saveAccess = async () => {
        if (!selectedUser?.id) return;

        setLoading(true);
        try {
            await updateDoc(doc(db(), 'users', selectedUser.id), {
                acesso: selectedAccess
            });

            showGlobalToast('success', 'Sucesso', 'Acessos atualizados com sucesso!', 3000);
            setConfirmDialogVisible(false);
            loadUsers();
            handleBack();
        } catch (error) {
            console.error('Erro ao atualizar acessos:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível atualizar os acessos', 3000);
        } finally {
            setLoading(false);
        }
    };

    // ==================== SEARCH ====================

    const removeAccents = (str: string) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const filteredUsers = users.filter(user => {
        const searchTermNormalized = removeAccents(searchQuery.toLowerCase());
        const userNameNormalized = removeAccents((user.user || '').toLowerCase());
        const userEmailNormalized = removeAccents((user.email || '').toLowerCase());
        const userCargoNormalized = removeAccents((user.cargo || '').toLowerCase());
        const userAccessString = user.acesso
            ?.map(a => (a.moduleId || '').toLowerCase())
            .join(' ') || '';

        return userNameNormalized.includes(searchTermNormalized) ||
            userEmailNormalized.includes(searchTermNormalized) ||
            userCargoNormalized.includes(searchTermNormalized) ||
            userAccessString.includes(searchTermNormalized);
    });

    const getShortName = (fullName: string) => {
        const parts = fullName.trim().split(' ');
        if (parts.length === 1) return parts[0];
        return `${parts[0]} ${parts[parts.length - 1]}`;
    };

    // ==================== RENDER ====================

    return (
        <View style={styles.container}>
            {!selectedUser ? (
                <>
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
                <>
                    <ModernHeader
                        title={getShortName(selectedUser.user)}
                        iconName="account-edit"
                        rightIcon='content-save'
                        rightAction={handleSaveAccess}
                        onBackPress={tryBack}
                    />

                    <ScrollView style={styles.accessList}>
                        {/* Add new module */}
                        <View style={styles.addModuleRow}>
                            <TextInput
                                label="ID do módulo"
                                value={newModuleId}
                                onChangeText={setNewModuleId}
                                mode="outlined"
                                style={styles.addModuleInput}
                                placeholder="ex: sst, contaminados..."
                                autoCapitalize="none"
                                outlineColor={customTheme.colors.onSurfaceVariant}
                                activeOutlineColor={customTheme.colors.primary}
                                dense
                            />
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={handleAddModule}
                            >
                                <Icon name="plus-circle" size={40} color={customTheme.colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Current access list */}
                        {selectedAccess.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Icon name="shield-off-outline" size={48} color={customTheme.colors.onSurfaceVariant} />
                                <Text style={styles.emptyText}>Nenhum acesso configurado</Text>
                                <Text style={styles.emptySubtext}>
                                    Adicione um ID de módulo acima para começar
                                </Text>
                            </View>
                        ) : (
                            selectedAccess.map((access) => (
                                <AccessItem
                                    key={access.moduleId}
                                    access={access}
                                    onLevelChange={handleLevelChange}
                                    onRemove={handleRemove}
                                />
                            ))
                        )}
                    </ScrollView>
                </>
            )}

            <ConfirmationModal
                visible={confirmDialogVisible}
                title="Confirmar Alterações"
                message={`Tem certeza que deseja salvar as alterações nos acessos de ${selectedUser?.user}?`}
                onCancel={() => setConfirmDialogVisible(false)}
                onConfirm={saveAccess}
                loading={loading}
                confirmText="Salvar"
                iconName="content-save"
                colorScheme="primary"
            />
        </View>
    );
}

const styles = StyleSheet.create({
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
    userAccessList: {
        fontSize: 11,
        color: '#999',
        marginTop: 4,
    },

    // Access editing
    accessList: {
        padding: 16,
    },
    addModuleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    addModuleInput: {
        flex: 1,
        backgroundColor: '#fff',
    },
    addButton: {
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 8,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#666',
    },
    emptySubtext: {
        fontSize: 13,
        color: '#999',
    },

    // Access item
    accessItem: {
        padding: 12,
        backgroundColor: 'white',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        marginBottom: 8,
    },
    accessItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    accessItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
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
    accessItemDescription: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    removeButton: {
        padding: 4,
    },
    levelSelector: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 8,
    },
    levelButton: {
        flex: 1,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    levelButtonSelected: {
        backgroundColor: customTheme.colors.primary,
        borderColor: customTheme.colors.primary,
    },
    levelButtonText: {
        fontSize: 11,
        color: '#666',
    },
    levelButtonTextSelected: {
        color: 'white',
    },
});
