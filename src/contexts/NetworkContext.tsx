import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    checkForDuplicate,
    checkInternetConnection,
    sendDataToFirebase,
    showGlobalToast
} from '../helpers/GlobalApi';
import { collection, getDocs, query, where } from 'firebase/firestore';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Compostagem } from '../helpers/Types';
import NetInfo from "@react-native-community/netinfo";
import { db } from '../../firebase';

// Tipos
interface NetworkContextData {
    showGlobalToast: typeof showGlobalToast;
    checkAndSendPendingData: () => Promise<void>;
    isOnline: boolean;
    isSyncing: boolean;
    hasPendingData: boolean;
}

const STORAGE_KEYS = {
    PENDING_COMPOSTAGENS: '@pendingCompostagens',
    PENDING_SYNC_LOCK: '@pendingSyncLock'
};

export interface PendingData extends Compostagem {
    timestamp: string;
    attempts: number;
    syncId?: string; // Identificador único para rastrear tentativas de sync
}

const NetworkContext = createContext<NetworkContextData>({} as NetworkContextData);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [hasPendingData, setHasPendingData] = useState(false);

    const checkPendingData = async (): Promise<boolean> => {
        try {
            const pendingCompostagens = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
            if (!pendingCompostagens) {
                setHasPendingData(false);
                return false;
            }

            try {
                const pendingData: PendingData[] = JSON.parse(pendingCompostagens);

                // Validação mais rigorosa
                if (!Array.isArray(pendingData)) {
                    console.error('Dados pendentes inválidos - não é um array');
                    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
                    setHasPendingData(false);
                    return false;
                }

                // Filtrar itens inválidos e duplicados
                const validItems = pendingData.filter((item, index, self) =>
                    item &&
                    item.data &&
                    typeof item.data === 'string' &&
                    // Remover duplicatas baseado em data e hora
                    index === self.findIndex(t => t.data === item.data)
                );

                // Se houver diferença, atualiza o storage
                if (validItems.length !== pendingData.length) {
                    if (validItems.length === 0) {
                        await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
                        setHasPendingData(false);
                        return false;
                    }
                    await AsyncStorage.setItem(
                        STORAGE_KEYS.PENDING_COMPOSTAGENS,
                        JSON.stringify(validItems)
                    );
                }

                const hasPending = validItems.length > 0;
                setHasPendingData(hasPending);
                return hasPending;

            } catch (parseError) {
                console.error('Erro ao processar dados pendentes:', parseError);
                await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
                setHasPendingData(false);
                return false;
            }
        } catch (error) {
            console.error('Erro ao verificar dados pendentes:', error);
            setHasPendingData(false);
            return false;
        }
    };

    const processPendingData = async (): Promise<{
        success: boolean;
        processed: number;
        total: number;
    }> => {
        try {
            const pendingDataStr = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
            if (!pendingDataStr) {
                setHasPendingData(false);
                return { success: true, processed: 0, total: 0 };
            }
    
            let pendingData: PendingData[];
            try {
                pendingData = JSON.parse(pendingDataStr);
                if (!Array.isArray(pendingData) || pendingData.length === 0) {
                    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
                    setHasPendingData(false);
                    return { success: true, processed: 0, total: 0 };
                }
            } catch (parseError) {
                console.error('Erro ao processar JSON:', parseError);
                await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
                setHasPendingData(false);
                return { success: true, processed: 0, total: 0 };
            }
    
            let successCount = 0;
            const remainingItems: PendingData[] = [];
            const total = pendingData.length;
    
            for (const item of pendingData) {
                if (!item || !item.data) continue;
    
                try {
                    // Primeiro, verifica se já existe no Firebase
                    const q = query(
                        collection(db(), 'compostagens'),
                        where('data', '==', item.data),
                    );
                    const existingDoc = await getDocs(q);
    
                    if (!existingDoc.empty) {
                        // Se já existe no Firebase, considera como sucesso
                        console.log('Documento já existe no Firebase - removendo dos pendentes');
                        successCount++;
                        continue; // Não adiciona aos remainingItems
                    }
    
                    // Se não existe, tenta enviar
                    const success = await sendDataToFirebase(item);
    
                    if (success) {
                        // Confirma se foi salvo
                        const confirmQuery = await getDocs(q);
    
                        if (!confirmQuery.empty) {
                            console.log('Documento enviado e confirmado no Firebase');
                            successCount++;
                            continue; // Não adiciona aos remainingItems
                        } else {
                            console.error('Documento não encontrado após envio');
                            throw new Error('Falha na confirmação do envio');
                        }
                    }
    
                    // Se chegou aqui, não foi sucesso
                    item.attempts = (item.attempts || 0) + 1;
                    if (item.attempts < 3) {
                        remainingItems.push(item);
                    } else {
                        console.log('Item excedeu limite de tentativas:', item);
                    }
                } catch (error) {
                    console.error('Erro ao processar item:', error);
                    item.attempts = (item.attempts || 0) + 1;
                    if (item.attempts < 3) {
                        remainingItems.push(item);
                    }
                }
            }
    
            // Atualiza storage com items restantes
            if (remainingItems.length > 0) {
                await AsyncStorage.setItem(
                    STORAGE_KEYS.PENDING_COMPOSTAGENS,
                    JSON.stringify(remainingItems)
                );
                setHasPendingData(true);
            } else {
                await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
                setHasPendingData(false);
            }
    
            return {
                success: remainingItems.length === 0,
                processed: successCount,
                total
            };
        } catch (error) {
            console.error('Erro ao processar dados pendentes:', error);
            throw error;
        }
    };

    // Sincroniza dados pendentes
    const checkAndSendPendingData = async () => {
        if (isSyncing) {
            console.log("Já existe uma sincronização em andamento");
            return;
        }

        if (!isOnline) {
            console.log("Dispositivo offline");
            return;
        }

        try {
            setIsSyncing(true);
            const hasPending = await checkPendingData();

            if (!hasPending) {
                console.log("Sem dados pendentes");
                return;
            }

            showGlobalToast('info', 'Sincronizando', 'Enviando dados pendentes...', 9999999);

            const results = await processPendingData();
            await checkPendingData();

            const { success, processed, total } = results;

            if (success && total > 0) {
                showGlobalToast('success', 'Sincronização concluída',
                    'Todos os dados foram enviados', 4000);
            } else if (processed > 0) {
                showGlobalToast('info', 'Sincronização parcial',
                    `${processed}/${total} itens sincronizados`, 4000);
            } else if (total > 0) {
                showGlobalToast('error', 'Falha na sincronização',
                    'Não foi possível sincronizar os dados', 4000);
            }
        } catch (error) {
            console.error('Erro na sincronização:', error);
            showGlobalToast('error', 'Erro', 'Falha ao sincronizar dados', 4000);
        } finally {
            setIsSyncing(false);
        }
    };

    // Monitora conexão
    useEffect(() => {
        let lastConnectionState: boolean | null = null;
        let syncTimeout: NodeJS.Timeout | null = null;

        const unsubscribe = NetInfo.addEventListener(async state => {
            const isConnected = !!state.isConnected && !!state.isInternetReachable;
            setIsOnline(isConnected);

            if (isConnected !== lastConnectionState) {
                if (isConnected) {
                    const hasPending = await checkPendingData();
                    if (hasPending) {
                        showGlobalToast('info', 'Dados pendentes',
                            'Iniciando sincronização...', 4000);

                        if (syncTimeout) {
                            clearTimeout(syncTimeout);
                        }

                        syncTimeout = setTimeout(async () => {
                            await checkAndSendPendingData();
                        }, 3000);
                    }
                } else {
                    if (syncTimeout) {
                        clearTimeout(syncTimeout);
                    }
                    showGlobalToast('error', 'Desconectado',
                        'Conexão com a internet perdida', 4000);
                }
                lastConnectionState = isConnected;
            }
        });

        checkPendingData();

        return () => {
            unsubscribe();
            if (syncTimeout) {
                clearTimeout(syncTimeout);
            }
        };
    }, []);

    return (
        <NetworkContext.Provider value={{
            showGlobalToast,
            checkAndSendPendingData,
            isOnline,
            isSyncing,
            hasPendingData
        }}>
            {children}
        </NetworkContext.Provider>
    );
};

export const useNetwork = () => useContext(NetworkContext);