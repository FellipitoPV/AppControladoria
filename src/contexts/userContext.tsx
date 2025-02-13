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
}

// Criação do contexto
const UserContext = createContext<UserContextData>({} as UserContextData);

// Provider do contexto
export function UserProvider({ children }: { children: React.ReactNode }) {
    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigation = useNavigation();

    // Carregar informações salvas ao iniciar o app
    useEffect(() => {
        loadSavedUserInfo();
    }, []);

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

    // Função para atualizar informações do usuário
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
                return userData.email.toLowerCase() === email.toLowerCase();
            });

            if (!userDoc) {
                throw new Error('Usuário não encontrado');
            }

            const userData = userDoc.data();

            const userWithId: User = {
                id: userDoc.id,
                user: userData.user || '',
                email: userData.email,
                cargo: userData.cargo || '',
                ...(userData.telefone && { telefone: userData.telefone }),
                ...(userData.ramal && { ramal: userData.ramal }),
                ...(userData.area && { area: userData.area }),
                ...(userData.acesso && { acesso: userData.acesso }),
            };

            setUserInfo(userWithId);

            await AsyncStorage.setItem('@UserInfo', JSON.stringify(userWithId));

        } catch (error: any) {
            console.error('Erro detalhado em updateUserInfo:', {
                message: error?.message || 'Erro desconhecido',
                code: error?.code,
                stack: error?.stack
            });
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Nova função para limpar informações do usuário
    const clearUserInfo = async () => {
        try {
            console.log('1. Iniciando processo de logout');

            // Lista de todas as chaves que precisam ser removidas
            const keysToRemove = [
                '@UserInfo',
                'userEmail',
                'userName',
                'password',
                'rememberMe',
                '@cameraPermissionRequested'
                // Adicione outras chaves que seu app possa usar
            ];

            // Remove todas as chaves do AsyncStorage
            await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
            console.log('2. Dados removidos do AsyncStorage');

            // Limpa o estado do usuário
            setUserInfo(null);
            console.log('3. Estado do usuário limpo');

            console.log('4. Logout concluído com sucesso');
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            throw new Error('Falha ao fazer logout');
        }
    };

    return (
        <UserContext.Provider
            value={{
                userInfo,
                isLoading,
                updateUserInfo,
                clearUserInfo
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