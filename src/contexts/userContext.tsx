import React, { createContext, useContext, useEffect, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../screens/Adm/types/admTypes';
import { ecoApi } from '../api/ecoApi';

interface UserContextData {
    userInfo: User | null;
    isLoading: boolean;
    updateUserInfo: () => Promise<void>;
    clearUserInfo: () => Promise<void>;
    updateUserPhoto: (photoURL: string) => Promise<void>;
    refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextData>({} as UserContextData);

const mapApiUserToUser = (data: any): User => ({
    id: data._id ?? data.id ?? '',
    user: data.user || '',
    email: data.email || '',
    cargo: data.cargo || '',
    photoURL: data.photoURL ?? null,
    telefone: data.telefone ?? null,
    ramal: data.ramal ?? null,
    area: data.area ?? null,
    acesso: data.acesso || [],
    emergency_contacts: data.emergency_contacts ?? [],
});

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUserData = async () => {
        try {
            if (!userInfo?.id) {
                console.warn('Tentativa de atualizar dados sem ID de usuário');
                return;
            }

            console.log(`Atualizando dados do usuário manualmente: ${userInfo.id}`);
            const data = await ecoApi.getById('users', userInfo.id);
            const updatedUser = mapApiUserToUser(data);

            setUserInfo(updatedUser);
            await AsyncStorage.setItem('@UserInfo', JSON.stringify(updatedUser));
            console.log('Dados do usuário atualizados via refresh manual');

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

            const email = userEmail.replace(/"/g, '').toLowerCase();
            const results = await ecoApi.list('users', { email });

            if (!results || results.length === 0) {
                console.warn(`Usuário com email ${email} não encontrado`);
                throw new Error('Usuário não encontrado');
            }

            const userWithId = mapApiUserToUser(results[0]);
            await AsyncStorage.setItem('@UserInfo', JSON.stringify(userWithId));
            setUserInfo(userWithId);
            console.log('Dados de usuário atualizados');

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
                }
            } catch (error) {
                console.error('Erro ao carregar informações do usuário:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeUser();
    }, []);
    // =====

    const clearUserInfo = async () => {
        try {
            await AsyncStorage.multiRemove([
                '@UserInfo',
                '@authToken',
                'userEmail',
                'userName',
                'rememberMe',
                '@cameraPermissionRequested',
            ]);
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

            await ecoApi.update('users', userInfo.id, { photoURL });
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