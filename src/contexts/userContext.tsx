import React, { createContext, useState, useContext, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../helpers/Types';
import { showGlobalToast } from '../helpers/GlobalApi';
import { useNavigation } from '@react-navigation/native';

// Interface do contexto
interface UserContextData {
    userInfo: User | null;
    isLoading: boolean;
    updateUserInfo: () => Promise<void>;
    clearUserInfo: () => Promise<void>;
    updateUserPhoto: (photoURL: string) => Promise<void>;
}

// Criação do contexto
const UserContext = createContext<UserContextData>({} as UserContextData);

// Provider do contexto
export function UserProvider({ children }: { children: React.ReactNode }) {
    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userListener, setUserListener] = useState<(() => void) | null>(null);


    // Carregar informações salvas ao iniciar o app
    useEffect(() => {
        loadSavedUserInfo();
    }, []);

    // Função para configurar o listener do usuário
    const setupUserListener = async (email: string) => {
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

        const unsubscribe = firestore()
            .collection('users')
            .doc(userDoc.id)
            .onSnapshot(
                (doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
                        if (userData) { // Verificação adicional
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
                            AsyncStorage.setItem('@UserInfo', JSON.stringify(userWithId));
                        }
                    }
                },
                (error) => {
                    console.error('Erro no listener:', error);
                }
            );

        setUserListener(unsubscribe);
    };

    // Função para atualizar informações do usuário
    const updateUserInfo = async () => {
        try {
            setIsLoading(true);
            console.log('1. Iniciando updateUserInfo');

            const userEmail = await AsyncStorage.getItem('userEmail');
            console.log('2. Email recuperado:', userEmail);

            if (!userEmail) {
                throw new Error('Email do usuário não encontrado');
            }

            const email = userEmail.replace(/"/g, "").toLowerCase();
            console.log('3. Email formatado:', email);

            // Buscar os dados do usuário diretamente
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

            // Criar objeto do usuário
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

            // Salvar no AsyncStorage primeiro
            await AsyncStorage.setItem('@UserInfo', JSON.stringify(userWithId));

            // Atualizar o estado
            setUserInfo(userWithId);

            // Configurar o listener após salvar os dados
            await setupUserListener(email);
            console.log('4. Listener configurado e dados salvos com sucesso');

        } catch (error: any) {
            console.error('Erro em updateUserInfo:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Limpar o listener quando o componente for desmontado
    useEffect(() => {
        return () => {
            if (userListener) {
                userListener();
            }
        };
    }, [userListener]);

    // Função para carregar informações salvas
    const loadSavedUserInfo = async () => {
        try {
            const savedUserInfo = await AsyncStorage.getItem('@UserInfo');
            if (savedUserInfo) {
                setUserInfo(JSON.parse(savedUserInfo));
            }
        } catch (error) {
            console.error('Erro ao carregar informações do usuário:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const clearUserInfo = async () => {
        try {
            // Remove o listener se existir
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

    // Adicione esta função ao UserContext
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

            // Não precisa atualizar o state manualmente pois o listener fará isso
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

// Hook personalizado para usar o contexto
export function useUser() {
    const context = useContext(UserContext);

    if (!context) {
        throw new Error('useUser deve ser usado dentro de um UserProvider');
    }

    return context;
}