import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ecoApi, ecoStorage } from '../api/ecoApi';

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface PendingOperation {
    id: string;
    type: 'save' | 'upload_photo';
    path: string;
    data: any;
    timestamp: number;
    localUri?: string; // Para fotos offline
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
    uploadPhotoOffline: (storagePath: string, localUri: string) => Promise<string>;
    forceSync: () => Promise<void>;
    clearCache: () => Promise<void>;
}

// Função auxiliar para verificar conectividade no momento da chamada
const checkConnectivity = async (): Promise<boolean> => {
    try {
        const state = await NetInfo.fetch();
        return !!state.isConnected && !!state.isInternetReachable;
    } catch {
        return false;
    }
};

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
        const cacheKey = `${year}_${checklistId}_${locationId}`;

        logSync('Save', `Salvando checklist: ${cacheKey}`);

        // Sempre salva no cache primeiro
        await saveToCache(cacheKey, data);

        // Verificar conectividade no momento da chamada
        const currentlyOnline = await checkConnectivity();
        logSync('Save', `Conectividade ao salvar: ${currentlyOnline ? 'Online' : 'Offline'}`);

        if (currentlyOnline) {
            try {
                const existing = await ecoApi.list('checklists', { year, checklistId, locationId });
                if (existing.length > 0) {
                    await ecoApi.update('checklists', existing[0]._id ?? existing[0].id, { respostas: data });
                } else {
                    await ecoApi.create('checklists', { year, checklistId, locationId, respostas: data });
                }
                logSync('Save', `Checklist salvo na API: ${cacheKey}`);
            } catch (error) {
                logSync('Error', 'Erro ao salvar na API, adicionando à fila', error);
                await addPendingOperation({
                    id: `${Date.now()}_${cacheKey}`,
                    type: 'save',
                    path: 'checklists',
                    data: { year, checklistId, locationId, respostas: data },
                    timestamp: Date.now(),
                });
            }
        } else {
            logSync('Save', 'Offline: adicionando à fila de sincronização');
            await addPendingOperation({
                id: `${Date.now()}_${cacheKey}`,
                type: 'save',
                path: 'checklists',
                data: { year, checklistId, locationId, respostas: data },
                timestamp: Date.now(),
            });
        }
    };

    // Carregar checklist (API primeiro quando online, cache como fallback)
    const loadChecklist = async (
        year: string,
        checklistId: string,
        locationId: string
    ): Promise<any> => {
        const cacheKey = `${year}_${checklistId}_${locationId}`;

        logSync('Load', `Carregando checklist: ${cacheKey}`);

        // Verificar conectividade no momento da chamada (não usar estado)
        const currentlyOnline = await checkConnectivity();
        logSync('Load', `Conectividade atual: ${currentlyOnline ? 'Online' : 'Offline'}`);

        if (currentlyOnline) {
            // ONLINE: API é a fonte da verdade
            try {
                const results = await ecoApi.list('checklists', { year, checklistId, locationId });

                if (results.length > 0) {
                    const respostas = results[0].respostas ?? null;
                    await saveToCache(cacheKey, respostas); // Atualiza cache
                    logSync('Load', `Checklist carregado da API: ${cacheKey}`);
                    return respostas;
                } else {
                    // Não existe na API = limpar cache local
                    logSync('Load', 'Checklist não existe na API, limpando cache');
                    await AsyncStorage.removeItem(`@checklist_cache_${cacheKey}`);
                    return null;
                }
            } catch (error) {
                logSync('Error', 'Erro ao carregar da API, usando cache', error);
                return loadFromCache(cacheKey);
            }
        } else {
            // OFFLINE: usa cache
            logSync('Load', 'Offline: usando dados do cache');
            return loadFromCache(cacheKey);
        }
    };

    // Carregar perguntas do checklist
    const loadQuestions = async (checklistId: string): Promise<any[]> => {
        const cacheKey = `questions_${checklistId}`;

        logSync('Load', `Carregando perguntas: ${checklistId}`);

        // Verificar conectividade no momento da chamada
        const currentlyOnline = await checkConnectivity();

        if (currentlyOnline) {
            // ONLINE: API é a fonte da verdade
            try {
                const results = await ecoApi.list('checklistsConfig', { checklistId });

                if (results.length > 0) {
                    const questions = results[0].questions || [];
                    await saveToCache(cacheKey, questions);
                    logSync('Load', `Perguntas carregadas da API`);
                    return questions;
                } else {
                    // Não existe na API = limpar cache
                    logSync('Load', 'Perguntas não existem na API, limpando cache');
                    await AsyncStorage.removeItem(`@checklist_cache_${cacheKey}`);
                    return [];
                }
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
        // Verificar conectividade real
        const currentlyOnline = await checkConnectivity();

        if (!currentlyOnline) {
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
                logSync('Sync', `Processando operação: ${op.id} (${op.type})`);

                if (op.type === 'upload_photo' && op.localUri) {
                    const filename = `checklist_${Date.now()}_${op.path.split('/').pop()}`;
                    const uploadResult = await ecoStorage.upload({
                        uri: op.localUri,
                        type: 'image/jpeg',
                        name: filename,
                    });
                    logSync('Sync', `Foto enviada: ${uploadResult.url}`);
                } else if (op.type === 'save') {
                    const { year, checklistId, locationId, respostas } = op.data;
                    const existing = await ecoApi.list('checklists', { year, checklistId, locationId });
                    if (existing.length > 0) {
                        await ecoApi.update('checklists', existing[0]._id ?? existing[0].id, { respostas });
                    } else {
                        await ecoApi.create('checklists', op.data);
                    }
                }

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

    // Upload de foto (online ou offline)
    const uploadPhotoOffline = async (storagePath: string, localUri: string): Promise<string> => {
        logSync('Photo', `Upload de foto: ${storagePath}`);

        const currentlyOnline = await checkConnectivity();

        if (currentlyOnline) {
            // Online: fazer upload direto
            try {
                const filename = `checklist_${Date.now()}_${storagePath.split('/').pop()}`;
                const uploadResult = await ecoStorage.upload({
                    uri: localUri,
                    type: 'image/jpeg',
                    name: filename,
                });
                logSync('Photo', `Foto enviada com sucesso: ${uploadResult.url}`);
                return uploadResult.url;
            } catch (error) {
                logSync('Error', 'Erro ao enviar foto online, salvando para depois', error);
                const tempId = `temp_${Date.now()}`;
                await addPendingOperation({
                    id: `photo_${Date.now()}`,
                    type: 'upload_photo',
                    path: storagePath,
                    data: { tempId },
                    timestamp: Date.now(),
                    localUri,
                });
                return tempId;
            }
        } else {
            // Offline: salvar URI local e adicionar à fila
            logSync('Photo', 'Offline: salvando foto para upload posterior');
            const tempId = `temp_${Date.now()}`;
            await addPendingOperation({
                id: `photo_${Date.now()}`,
                type: 'upload_photo',
                path: storagePath,
                data: { tempId },
                timestamp: Date.now(),
                localUri,
            });
            return tempId;
        }
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
                uploadPhotoOffline,
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