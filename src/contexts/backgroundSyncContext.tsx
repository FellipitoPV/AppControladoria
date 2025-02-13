// backgroundSyncContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export type UnidadeMedida = 'unidade' | 'kilo' | 'litro';

// Types
export interface ProdutoEstoque {
    id?: string;
    nome: string;
    quantidade: string;
    quantidadeMinima: string;
    unidadeMedida: UnidadeMedida;
    descricao: string;
    photoUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncState {
    data: any[];
    lastSyncTime: Date | null;
    status: SyncStatus;
}

interface BackgroundSyncContextData {
    produtos: ProdutoEstoque[];
    isLoading: boolean;
    lastSyncTime: Date | null;
    syncStatus: SyncStatus;
    forceSync: () => Promise<void>;
}

const BackgroundSyncContext = createContext<BackgroundSyncContextData>({} as BackgroundSyncContextData);

export function BackgroundSyncProvider({ children }: { children: React.ReactNode }) {
    const [syncStates, setSyncStates] = useState<{ [key: string]: SyncState }>({
        produtos: {
            data: [],
            lastSyncTime: null,
            status: 'idle'
        }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [unsubscribers, setUnsubscribers] = useState<{ [key: string]: (() => void) | null }>({});

    // Funções auxiliares para persistência local
    const saveDataLocally = async (key: string, data: any[], timestamp: Date) => {
        try {
            await AsyncStorage.setItem(`@${key}`, JSON.stringify(data));
            await AsyncStorage.setItem(`@${key}_lastSync`, timestamp.toISOString());
        } catch (error) {
            console.error(`Erro ao salvar ${key} localmente:`, error);
        }
    };

    const loadDataLocally = async (key: string) => {
        try {
            const storedData = await AsyncStorage.getItem(`@${key}`);
            const lastSync = await AsyncStorage.getItem(`@${key}_lastSync`);

            return {
                data: storedData ? JSON.parse(storedData) : [],
                lastSyncTime: lastSync ? new Date(lastSync) : null
            };
        } catch (error) {
            console.error(`Erro ao carregar ${key} localmente:`, error);
            return { data: [], lastSyncTime: null };
        }
    };

    // Função para iniciar sincronização com Firestore
    const startFirestoreSync = (collectionName: string) => {
        if (unsubscribers[collectionName]) {
            unsubscribers[collectionName]?.();
        }

        const subscriber = firestore()
            .collection(collectionName)
            .onSnapshot(
                querySnapshot => {
                    const syncedData = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    const timestamp = new Date();
                    setSyncStates(prev => ({
                        ...prev,
                        [collectionName]: {
                            data: syncedData,
                            lastSyncTime: timestamp,
                            status: 'idle'
                        }
                    }));

                    saveDataLocally(collectionName, syncedData, timestamp);
                },
                error => {
                    console.error(`Erro na sincronização de ${collectionName}:`, error);
                    setSyncStates(prev => ({
                        ...prev,
                        [collectionName]: {
                            ...prev[collectionName],
                            status: 'error'
                        }
                    }));
                }
            );

        setUnsubscribers(prev => ({
            ...prev,
            [collectionName]: subscriber
        }));
    };

    // Gerenciamento de conectividade
    const handleConnectivityChange = async (isConnected: boolean | null) => {
        if (isConnected) {
            setSyncStates(prev => ({
                ...prev,
                produtos: { ...prev.produtos, status: 'syncing' }
            }));
            startFirestoreSync('produtos');
            // Aqui você pode adicionar mais coleções para sincronizar no futuro
        } else {
            Object.entries(unsubscribers).forEach(([_, unsubscribe]) => unsubscribe?.());
            setUnsubscribers({});
        }
    };

    // Inicialização
    useEffect(() => {
        const initialize = async () => {
            setIsLoading(true);

            // Carregar dados locais
            const produtosLocal = await loadDataLocally('produtos');
            setSyncStates(prev => ({
                ...prev,
                produtos: {
                    data: produtosLocal.data,
                    lastSyncTime: produtosLocal.lastSyncTime,
                    status: 'idle'
                }
            }));

            // Configurar listener de conectividade
            const unsubscribeNetInfo = NetInfo.addEventListener(state => {
                handleConnectivityChange(state.isConnected);
            });

            // Verificar conexão inicial
            const netInfo = await NetInfo.fetch();
            handleConnectivityChange(netInfo.isConnected);

            setIsLoading(false);

            return () => {
                unsubscribeNetInfo();
                Object.values(unsubscribers).forEach(unsubscribe => unsubscribe?.());
            };
        };

        initialize();
    }, []);

    // Força sincronização
    const forceSync = async () => {
        const netInfo = await NetInfo.fetch();
        if (netInfo.isConnected) {
            setSyncStates(prev => ({
                ...prev,
                produtos: { ...prev.produtos, status: 'syncing' }
            }));
            startFirestoreSync('produtos');
        }
    };

    return (
        <BackgroundSyncContext.Provider
            value={{
                produtos: syncStates.produtos.data as ProdutoEstoque[],
                isLoading,
                lastSyncTime: syncStates.produtos.lastSyncTime,
                syncStatus: syncStates.produtos.status,
                forceSync
            }}
        >
            {children}
        </BackgroundSyncContext.Provider>
    );
}

// Hook personalizado
export function useBackgroundSync() {
    const context = useContext(BackgroundSyncContext);
    if (!context) {
        throw new Error('useBackgroundSync deve ser usado dentro de um BackgroundSyncProvider');
    }
    return context;
}