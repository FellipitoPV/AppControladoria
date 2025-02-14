// backgroundSyncContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { IAgendamentoLavagem } from '../screens/Formularios/Lavagem/Components/lavagemTypes';
import { useNetwork } from './NetworkContext';

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
    agendamentos: IAgendamentoLavagem[]; // Novo campo
    isLoading: boolean;
    lastSyncTime: {
        produtos: Date | null;
        agendamentos: Date | null; // Novo campo
    };
    syncStatus: {
        produtos: SyncStatus;
        agendamentos: SyncStatus; // Novo campo
    };
    forceSync: (collection?: 'produtos' | 'agendamentos') => Promise<void>; // Modificado para opcional
    marcarAgendamentoComoConcluido?: (agendamentoId: string) => Promise<void>; // Opcional
}

const BackgroundSyncContext = createContext<BackgroundSyncContextData>({} as BackgroundSyncContextData);

export function BackgroundSyncProvider({ children }: { children: React.ReactNode }) {
    const { isOnline } = useNetwork();
    const [syncStates, setSyncStates] = useState<{ [key: string]: SyncState }>({
        produtos: {
            data: [],
            lastSyncTime: null,
            status: 'idle'
        },
        agendamentos: { // Novo estado inicial
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
    
                    console.log(`Dados sincronizados de ${collectionName}:`, syncedData); // Adicionar log
    
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
        if (isOnline) {
            setSyncStates(prev => ({
                ...prev,
                produtos: { ...prev.produtos, status: 'syncing' },
                agendamentos: { ...prev.agendamentos, status: 'syncing' } // Adicionar esta linha
            }));

            startFirestoreSync('produtos');
            startFirestoreSync('agendamentos'); // Adicionar esta linha para sincronizar agendamentos
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
            const agendamentosLocal = await loadDataLocally('agendamentos'); // Adicionar esta linha

            setSyncStates(prev => ({
                ...prev,
                produtos: {
                    data: produtosLocal.data,
                    lastSyncTime: produtosLocal.lastSyncTime,
                    status: 'idle'
                },
                agendamentos: { // Adicionar bloco para agendamentos
                    data: agendamentosLocal.data,
                    lastSyncTime: agendamentosLocal.lastSyncTime,
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

    // Adicionar método para marcar agendamento como concluído
    const marcarAgendamentoComoConcluido = async (agendamentoId: string) => {
        const netInfo = await NetInfo.fetch();

        try {
            // Atualiza estado local
            setSyncStates(prev => {
                const updatedAgendamentos = prev.agendamentos.data.map(ag =>
                    ag.id === agendamentoId ? { ...ag, concluido: true } : ag
                );

                return {
                    ...prev,
                    agendamentos: {
                        ...prev.agendamentos,
                        data: updatedAgendamentos
                    }
                };
            });

            // Se estiver online, atualiza no Firestore
            if (netInfo.isConnected) {
                await firestore()
                    .collection('agendamentos')
                    .doc(agendamentoId)
                    .update({ concluido: true });
            }
        } catch (error) {
            console.error('Erro ao marcar como concluído:', error);
            throw error;
        }
    };

    // Modificar forceSync para ser opcional
    const forceSync = async (collection?: 'produtos' | 'agendamentos') => {
        const netInfo = await NetInfo.fetch();
        if (netInfo.isConnected) {
            if (collection) {
                // Sincroniza coleção específica
                setSyncStates(prev => ({
                    ...prev,
                    [collection]: { ...prev[collection], status: 'syncing' }
                }));
                startFirestoreSync(collection);
            } else {
                // Sincroniza todas as coleções
                ['produtos', 'agendamentos'].forEach(col => {
                    setSyncStates(prev => ({
                        ...prev,
                        [col]: { ...prev[col], status: 'syncing' }
                    }));
                    startFirestoreSync(col);
                });
            }
        }
    };

    return (
        <BackgroundSyncContext.Provider
            value={{
                produtos: syncStates.produtos.data as ProdutoEstoque[],
                agendamentos: syncStates.agendamentos.data as IAgendamentoLavagem[],
                isLoading,
                lastSyncTime: {
                    produtos: syncStates.produtos.lastSyncTime,
                    agendamentos: syncStates.agendamentos.lastSyncTime
                },
                syncStatus: {
                    produtos: syncStates.produtos.status,
                    agendamentos: syncStates.agendamentos.status
                },
                forceSync,
                marcarAgendamentoComoConcluido
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