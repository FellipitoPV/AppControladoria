import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ref, onValue, set, off } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { dbRealTime } from '../../firebase';

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface PendingOperation {
    id: string;
    type: 'save';
    path: string;
    data: any;
    timestamp: number;
}

interface ChecklistSyncContextData {
    isOnline: boolean;
    isLoading: boolean;
    syncStatus: SyncStatus;
    lastSyncTime: Date | null;
    pendingOperations: number;
    saveChecklist: (year: string, checklistId: string, locationId: string, data: any) => Promise<void>;
    loadChecklist: (year: string, checklistId: string, locationId: string) => Promise<any>;
    loadQuestions: (checklistId: string) => Promise<any[]>;
    forceSync: () => Promise<void>;
    clearCache: () => Promise<void>;
}

const ChecklistSyncContext = createContext<ChecklistSyncContextData>(
    {} as ChecklistSyncContextData
);

const logSync = (area: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[CHECKLIST_SYNC][${timestamp}][${area}] ${message}`, data || '');
};

export function ChecklistSyncProvider({ children }: { children: React.ReactNode }) {
    const [isOnline, setIsOnline] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [pendingOps, setPendingOps] = useState<PendingOperation[]>([]);
    
    const isMounted = useRef(true);
    const listeners = useRef<{ [key: string]: any }>({});

    // Gerenciar fila de operações pendentes
    const loadPendingOperations = async (): Promise<PendingOperation[]> => {
        try {
            const stored = await AsyncStorage.getItem('@checklist_pending_ops');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            logSync('Error', 'Erro ao carregar operações pendentes', error);
            return [];
        }
    };

    const savePendingOperations = async (ops: PendingOperation[]) => {
        try {
            await AsyncStorage.setItem('@checklist_pending_ops', JSON.stringify(ops));
        } catch (error) {
            logSync('Error', 'Erro ao salvar operações pendentes', error);
        }
    };

    const addPendingOperation = async (operation: PendingOperation) => {
        const ops = await loadPendingOperations();
        ops.push(operation);
        await savePendingOperations(ops);
        setPendingOps(ops);
        logSync('Queue', `Operação adicionada à fila: ${operation.id}`);
    };

    // Salvar dados localmente no cache
    const saveToCache = async (key: string, data: any) => {
        try {
            await AsyncStorage.setItem(`@checklist_cache_${key}`, JSON.stringify(data));
            logSync('Cache', `Dados salvos no cache: ${key}`);
        } catch (error) {
            logSync('Error', 'Erro ao salvar no cache', error);
        }
    };

    const loadFromCache = async (key: string): Promise<any | null> => {
        try {
            const cached = await AsyncStorage.getItem(`@checklist_cache_${key}`);
            if (cached) {
                logSync('Cache', `Dados carregados do cache: ${key}`);
                return JSON.parse(cached);
            }
            return null;
        } catch (error) {
            logSync('Error', 'Erro ao carregar do cache', error);
            return null;
        }
    };

    // Salvar checklist (online ou offline)
    const saveChecklist = async (
        year: string,
        checklistId: string,
        locationId: string,
        data: any
    ) => {
        const path = `checklists/${year}/${checklistId}/${locationId}`;
        const cacheKey = `${year}_${checklistId}_${locationId}`;

        logSync('Save', `Salvando checklist: ${path}`);

        // Sempre salva no cache primeiro
        await saveToCache(cacheKey, data);

        if (isOnline) {
            try {
                const dataRef = ref(dbRealTime(), path);
                await set(dataRef, data);
                logSync('Save', `Checklist salvo no Firebase: ${path}`);
            } catch (error) {
                logSync('Error', 'Erro ao salvar no Firebase, adicionando à fila', error);
                await addPendingOperation({
                    id: `${Date.now()}_${cacheKey}`,
                    type: 'save',
                    path,
                    data,
                    timestamp: Date.now(),
                });
            }
        } else {
            logSync('Save', 'Offline: adicionando à fila de sincronização');
            await addPendingOperation({
                id: `${Date.now()}_${cacheKey}`,
                type: 'save',
                path,
                data,
                timestamp: Date.now(),
            });
        }
    };

    // Carregar checklist (cache primeiro, depois Firebase)
    const loadChecklist = async (
        year: string,
        checklistId: string,
        locationId: string
    ): Promise<any> => {
        const path = `checklists/${year}/${checklistId}/${locationId}`;
        const cacheKey = `${year}_${checklistId}_${locationId}`;

        logSync('Load', `Carregando checklist: ${path}`);

        if (isOnline) {
            // ONLINE: Firebase é a fonte da verdade
            try {
                return new Promise((resolve) => {
                    const dataRef = ref(dbRealTime(), path);
                    
                    onValue(dataRef, (snapshot) => {
                        if (snapshot.exists()) {
                            const data = snapshot.val();
                            saveToCache(cacheKey, data); // Atualiza cache
                            logSync('Load', `Checklist carregado do Firebase: ${path}`);
                            resolve(data);
                        } else {
                            // Firebase vazio = limpar cache local
                            logSync('Load', 'Checklist não existe no Firebase, limpando cache');
                            AsyncStorage.removeItem(`@checklist_cache_${cacheKey}`);
                            resolve(null);
                        }
                    }, { onlyOnce: true });
                });
            } catch (error) {
                logSync('Error', 'Erro ao carregar do Firebase, usando cache', error);
                const cached = await loadFromCache(cacheKey);
                return cached;
            }
        } else {
            // OFFLINE: usa cache
            logSync('Load', 'Offline: usando dados do cache');
            const cached = await loadFromCache(cacheKey);
            return cached;
        }
    };

    // Carregar perguntas do checklist
    const loadQuestions = async (checklistId: string): Promise<any[]> => {
        const path = `checklists-config/${checklistId}/questions`;
        const cacheKey = `questions_${checklistId}`;

        logSync('Load', `Carregando perguntas: ${path}`);

        if (isOnline) {
            // ONLINE: Firebase é a fonte da verdade
            try {
                return new Promise((resolve) => {
                    const questionsRef = ref(dbRealTime(), path);
                    
                    onValue(questionsRef, (snapshot) => {
                        if (snapshot.exists()) {
                            const questions = snapshot.val();
                            saveToCache(cacheKey, questions);
                            logSync('Load', `Perguntas carregadas do Firebase`);
                            resolve(questions);
                        } else {
                            // Firebase vazio = limpar cache
                            logSync('Load', 'Perguntas não existem no Firebase, limpando cache');
                            AsyncStorage.removeItem(`@checklist_cache_${cacheKey}`);
                            resolve([]);
                        }
                    }, { onlyOnce: true });
                });
            } catch (error) {
                logSync('Error', 'Erro ao carregar perguntas, usando cache', error);
                const cached = await loadFromCache(cacheKey);
                return cached || [];
            }
        } else {
            // OFFLINE: usa cache
            logSync('Load', 'Offline: usando perguntas do cache');
            const cached = await loadFromCache(cacheKey);
            return cached || [];
        }
    };

    // Processar fila de operações pendentes
    const processPendingOperations = async () => {
        if (!isOnline) {
            logSync('Sync', 'Offline: aguardando conexão para processar fila');
            return;
        }

        const ops = await loadPendingOperations();
        
        if (ops.length === 0) {
            // logSync('Sync', 'Nenhuma operação pendente');
            return;
        }

        logSync('Sync', `Processando ${ops.length} operações pendentes`);
        setSyncStatus('syncing');

        const failed: PendingOperation[] = [];

        for (const op of ops) {
            try {
                logSync('Sync', `Processando operação: ${op.id}`);
                const dataRef = ref(dbRealTime(), op.path);
                await set(dataRef, op.data);
                logSync('Sync', `Operação concluída: ${op.id}`);
            } catch (error) {
                logSync('Error', `Falha ao processar operação: ${op.id}`, error);
                failed.push(op);
            }
        }

        await savePendingOperations(failed);
        setPendingOps(failed);
        setSyncStatus('idle');
        setLastSyncTime(new Date());

        logSync('Sync', `Sincronização concluída. ${failed.length} operações falharam`);
    };

    // Forçar sincronização manual
    const forceSync = async () => {
        logSync('Force', 'Forçando sincronização');
        await processPendingOperations();
    };

    // Limpar todo o cache de checklists
    const clearCache = async () => {
        try {
            logSync('Cache', 'Limpando todo o cache de checklists');
            const keys = await AsyncStorage.getAllKeys();
            const checklistKeys = keys.filter(key => key.startsWith('@checklist_cache_'));
            await AsyncStorage.multiRemove(checklistKeys);
            logSync('Cache', `${checklistKeys.length} itens de cache removidos`);
        } catch (error) {
            logSync('Error', 'Erro ao limpar cache', error);
        }
    };

    // Gerenciar conectividade
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const connected = !!state.isConnected;
            // logSync('Network', `Conectividade: ${connected ? 'Online' : 'Offline'}`);
            setIsOnline(connected);
        });

        NetInfo.fetch().then(state => {
            setIsOnline(!!state.isConnected);
        });

        return () => {
            isMounted.current = false;
            unsubscribe();
        };
    }, []);

    // Processar fila quando ficar online
    useEffect(() => {
        if (isOnline) {
            // logSync('Network', 'Ficou online, processando fila...');
            processPendingOperations();
        }
    }, [isOnline]);

    // Carregar operações pendentes ao iniciar
    useEffect(() => {
        const init = async () => {
            const ops = await loadPendingOperations();
            setPendingOps(ops);
            // logSync('Init', `${ops.length} operações pendentes carregadas`);
        };
        init();
    }, []);

    return (
        <ChecklistSyncContext.Provider
            value={{
                isOnline,
                isLoading,
                syncStatus,
                lastSyncTime,
                pendingOperations: pendingOps.length,
                saveChecklist,
                loadChecklist,
                loadQuestions,
                forceSync,
                clearCache,
            }}
        >
            {children}
        </ChecklistSyncContext.Provider>
    );
}

export function useChecklistSync() {
    const context = useContext(ChecklistSyncContext);
    if (!context) {
        throw new Error('useChecklistSync deve ser usado dentro de ChecklistSyncProvider');
    }
    return context;
}