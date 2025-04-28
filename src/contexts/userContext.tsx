import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../screens/Adm/types/admTypes';
import { db } from '../../firebase';

interface UserContextData {
    userInfo: User | null;
    isLoading: boolean;
    updateUserInfo: () => Promise<void>;
    clearUserInfo: () => Promise<void>;
    updateUserPhoto: (photoURL: string) => Promise<void>;
    refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextData>({} as UserContextData);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Usando useRef em vez de useState para o listener para evitar re-renders
    const userListenerRef = useRef<(() => void) | null>(null);

    // Também usar ref para o userID atual para evitar dependências cíclicas
    const currentUserIdRef = useRef<string | null>(null);

    // Função para configurar o listener do usuário
    const setupUserListener = async (userId: string) => {
        // Não configurar se já existir um listener para o mesmo usuário
        if (userListenerRef.current && currentUserIdRef.current === userId) {
            console.log(`Listener já existe para usuário: ${userId}`);
            return;
        }

        // Limpar listener anterior se existir
        if (userListenerRef.current) {
            console.log('Removendo listener anterior antes de criar novo');
            userListenerRef.current();
            userListenerRef.current = null;
        }

        console.log(`Configurando listener para o usuário: ${userId}`);
        currentUserIdRef.current = userId;

        const userDocRef = doc(db(), 'users', userId);

        const unsubscribe = onSnapshot(
            userDocRef,
            async (doc) => {
                if (doc.exists()) {
                    const userData = doc.data();
                    if (userData) {
                        console.log('Dados do usuário atualizados via listener');
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
                } else {
                    console.warn(`Documento do usuário ${userId} não existe mais`);
                }
            },
            (error) => {
                console.error('Erro no listener:', error);
            }
        );

        userListenerRef.current = unsubscribe;
    };

    // Função explícita para recarregar dados do usuário atual
    const refreshUserData = async () => {
        try {
            if (!userInfo?.id) {
                console.warn('Tentativa de atualizar dados sem ID de usuário');
                return;
            }

            console.log(`Atualizando dados do usuário manualmente: ${userInfo.id}`);
            const userDocRef = doc(db(), 'users', userInfo.id);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData) {
                    const updatedUser: User = {
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

                    setUserInfo(updatedUser);
                    await AsyncStorage.setItem('@UserInfo', JSON.stringify(updatedUser));
                    console.log('Dados do usuário atualizados via refresh manual');

                    // Garantir que o listener esteja ativo para este usuário
                    if (!userListenerRef.current || currentUserIdRef.current !== userInfo.id) {
                        await setupUserListener(userInfo.id);
                    }
                }
            } else {
                console.warn(`Refresh falhou: Documento do usuário ${userInfo.id} não existe`);
            }
        } catch (error) {
            console.error('Erro ao atualizar dados do usuário:', error);
        }
    };

    const updateUserInfo = async () => {
        try {
            setIsLoading(true);
            const userEmail = await AsyncStorage.getItem('userEmail');

            if (!userEmail) {
                throw new Error('Email do usuário não encontrado');
            }

            const email = userEmail.replace(/"/g, "").toLowerCase();

            const usersQuery = query(
                collection(db(), 'users'),
                where('email', '==', email.toLowerCase())
            );

            const usersSnapshot = await getDocs(usersQuery);

            if (usersSnapshot.empty) {
                console.warn(`Usuário com email ${email} não encontrado`);
                throw new Error('Usuário não encontrado');
            }

            const userDoc = usersSnapshot.docs[0];
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
            console.log('Dados de usuário atualizados e listener configurado');

        } catch (error) {
            console.error('Erro em updateUserInfo:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Inicialização do usuário (executado uma vez na montagem)
    useEffect(() => {
        const initializeUser = async () => {
            try {
                const savedUserInfo = await AsyncStorage.getItem('@UserInfo');
                if (savedUserInfo) {
                    const parsedUser: User = JSON.parse(savedUserInfo);
                    setUserInfo(parsedUser);

                    // Configura o listener usando o ID do usuário salvo
                    if (parsedUser.id) {
                        await setupUserListener(parsedUser.id);
                    } else {
                        console.warn('User ID não encontrado no storage, impossível configurar listener');
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
            if (userListenerRef.current) {
                console.log('Removendo listener de usuário ao desmontar provider');
                userListenerRef.current();
                userListenerRef.current = null;
                currentUserIdRef.current = null;
            }
        };
    }, []);
    // =====

    const clearUserInfo = async () => {
        try {
            if (userListenerRef.current) {
                userListenerRef.current();
                userListenerRef.current = null;
                currentUserIdRef.current = null;
                console.log('Listener de usuário removido durante logout');
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
            console.log('Dados de usuário limpos com sucesso');

        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            throw new Error('Falha ao fazer logout');
        }
    };

    const updateUserPhoto = async (photoURL: string) => {
        try {
            if (!userInfo?.id) throw new Error('Usuário não encontrado');

            const userDocRef = doc(db(), 'users', userInfo.id);
            await updateDoc(userDocRef, {
                photoURL,
                updatedAt: serverTimestamp()
            });

            console.log('Foto de perfil atualizada com sucesso');

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
                updateUserPhoto,
                refreshUserData
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