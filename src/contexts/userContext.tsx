import React, { createContext, useState, useContext, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../screens/Adm/components/admTypes';

interface UserContextData {
    userInfo: User | null;
    isLoading: boolean;
    updateUserInfo: () => Promise<void>;
    clearUserInfo: () => Promise<void>;
    updateUserPhoto: (photoURL: string) => Promise<void>;
}

const UserContext = createContext<UserContextData>({} as UserContextData);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userListener, setUserListener] = useState<(() => void) | null>(null);

    // Função para configurar o listener do usuário
    const setupUserListener = async (userId: string) => {
        // Limpar listener anterior se existir
        if (userListener) {
            userListener();
        }

        const unsubscribe = firestore()
            .collection('users')
            .doc(userId)
            .onSnapshot(
                async (doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
                        if (userData) {
                            const userWithId: User = {
                                id: doc.id,
                                user: userData.user || '',
                                email: userData.email || '',
                                cargo: userData.cargo || '',
                                photoURL: userData.photoURL || null,
                                telefone: userData.telefone || null,
                                ramal: userData.ramal || null,
                                area: userData.area || null,
                                acesso: userData.acesso || [],
                            };

                            setUserInfo(userWithId);
                            await AsyncStorage.setItem('@UserInfo', JSON.stringify(userWithId));
                        }
                    }
                },
                (error) => {
                    console.error('Erro no listener:', error);
                }
            );

        setUserListener(unsubscribe);
    };

    // Carregar informações salvas e configurar listener ao iniciar
    useEffect(() => {
        const initializeUser = async () => {
            try {
                const savedUserInfo = await AsyncStorage.getItem('@UserInfo');
                if (savedUserInfo) {
                    const parsedUser = JSON.parse(savedUserInfo);
                    setUserInfo(parsedUser);

                    // Configura o listener usando o ID do usuário salvo
                    if (parsedUser.id) {
                        await setupUserListener(parsedUser.id);
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar informações do usuário:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeUser();

        // Cleanup quando o componente for desmontado
        return () => {
            if (userListener) {
                userListener();
            }
        };
    }, []);

    const updateUserInfo = async () => {
        try {
            setIsLoading(true);
            const userEmail = await AsyncStorage.getItem('userEmail');

            if (!userEmail) {
                throw new Error('Email do usuário não encontrado');
            }

            const email = userEmail.replace(/"/g, "").toLowerCase();

            const usersSnapshot = await firestore()
                .collection('users')
                .get();

            const userDoc = usersSnapshot.docs.find(doc => {
                const userData = doc.data();
                return userData.email?.toLowerCase() === email.toLowerCase();
            });

            if (!userDoc) {
                throw new Error('Usuário não encontrado');
            }

            const userData = userDoc.data();
            const userWithId: User = {
                id: userDoc.id,
                user: userData.user || '',
                email: userData.email || '',
                cargo: userData.cargo || '',
                photoURL: userData.photoURL || null,
                telefone: userData.telefone || null,
                ramal: userData.ramal || null,
                area: userData.area || null,
                acesso: userData.acesso || [],
            };

            await AsyncStorage.setItem('@UserInfo', JSON.stringify(userWithId));
            setUserInfo(userWithId);

            // Configura o listener com o ID do usuário
            await setupUserListener(userDoc.id);

        } catch (error) {
            console.error('Erro em updateUserInfo:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const clearUserInfo = async () => {
        try {
            if (userListener) {
                userListener();
                setUserListener(null);
            }

            const keysToRemove = [
                '@UserInfo',
                'userEmail',
                'userName',
                'password',
                'rememberMe',
                '@cameraPermissionRequested'
            ];

            await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
            setUserInfo(null);

        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            throw new Error('Falha ao fazer logout');
        }
    };

    const updateUserPhoto = async (photoURL: string) => {
        try {
            if (!userInfo?.id) throw new Error('Usuário não encontrado');

            await firestore()
                .collection('users')
                .doc(userInfo.id)
                .update({
                    photoURL,
                    updatedAt: firestore.FieldValue.serverTimestamp()
                });

        } catch (error) {
            console.error('Erro ao atualizar foto:', error);
            throw error;
        }
    };

    return (
        <UserContext.Provider
            value={{
                userInfo,
                isLoading,
                updateUserInfo,
                clearUserInfo,
                updateUserPhoto
            }}
        >
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);

    if (!context) {
        throw new Error('useUser deve ser usado dentro de um UserProvider');
    }

    return context;
}