// schedulingSyncContext.tsx

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { db } from '../../../../firebase';

// Tipos
interface AgendamentoLavagem {
    id: string;
    placa: string;
    tipoLavagem: string;
    data: string;
    concluido: boolean;
}

interface SchedulingSyncContextData {
    agendamentos: AgendamentoLavagem[];
    agendamentosHoje: AgendamentoLavagem[];
    isLoading: boolean;
    syncStatus: 'idle' | 'syncing' | 'error';
    marcarComoConcluido: (agendamentoId: string) => Promise<void>;
    forceSync: () => Promise<void>;
}

// Chaves para Storage
const STORAGE_KEY = '@agendamentos_data';

// Criação do Context
const SchedulingSyncContext = createContext<SchedulingSyncContextData>({} as SchedulingSyncContextData);

export function SchedulingSyncProvider({ children }: { children: React.ReactNode }) {
    // Estados
    const [agendamentos, setAgendamentos] = useState<AgendamentoLavagem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
    const [firestoreUnsubscribe, setFirestoreUnsubscribe] = useState<(() => void) | null>(null);

    // Função para salvar dados localmente
    const saveLocally = async (data: AgendamentoLavagem[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            console.log('Dados salvos localmente');
        } catch (error) {
            console.error('Erro ao salvar dados localmente:', error);
        }
    };

    // Função para carregar dados locais
    const loadLocalData = async () => {
        try {
            const localData = await AsyncStorage.getItem(STORAGE_KEY);
            if (localData) {
                const parsedData = JSON.parse(localData);
                setAgendamentos(parsedData);
                console.log('Dados locais carregados:', parsedData.length);
            }
        } catch (error) {
            console.error('Erro ao carregar dados locais:', error);
        }
    };

    // Função para iniciar sincronização com Firestore
    const startFirestoreSync = () => {
        console.log('Iniciando sincronização com Firestore');
        setSyncStatus('syncing');

        const unsubscribe = onSnapshot(collection(db(), 'agendamentos'), {
            next: async (snapshot) => {
                try {
                    const agendamentosData: AgendamentoLavagem[] = [];

                    snapshot.forEach(doc => {
                        const data = doc.data();
                        agendamentosData.push({
                            id: doc.id,
                            placa: data.placa || '',
                            tipoLavagem: data.tipoLavagem || '',
                            data: data.data || '',
                            concluido: Boolean(data.concluido)
                        });
                    });

                    console.log('Dados recebidos do Firestore:', agendamentosData.length);

                    setAgendamentos(agendamentosData);
                    await saveLocally(agendamentosData);
                    setSyncStatus('idle');
                } catch (error) {
                    console.error('Erro ao processar dados do Firestore:', error);
                    setSyncStatus('error');
                }
            },
            error: (error) => {
                console.error('Erro na sincronização:', error);
                setSyncStatus('error');
            }
        });

        setFirestoreUnsubscribe(() => unsubscribe);
    };

    // Marcar agendamento como concluído
    const marcarComoConcluido = async (agendamentoId: string) => {
        try {
            const netInfo = await NetInfo.fetch();

            // Atualiza estado local imediatamente
            const updatedAgendamentos = agendamentos.map(ag =>
                ag.id === agendamentoId ? { ...ag, concluido: true } : ag
            );
            setAgendamentos(updatedAgendamentos);
            await saveLocally(updatedAgendamentos);

            // Se estiver online, atualiza no Firestore
            if (netInfo.isConnected) {
                await updateDoc(doc(db(), 'agendamentos', agendamentoId), {
                    concluido: true
                });
            }
        } catch (error) {
            console.error('Erro ao marcar como concluído:', error);
            throw error;
        }
    };

    // Força sincronização manual
    const forceSync = async () => {
        const netInfo = await NetInfo.fetch();
        if (netInfo.isConnected) {
            startFirestoreSync();
        }
    };

    // Calcula agendamentos de hoje
    const agendamentosHoje = useMemo(() => {
        console.log('Calculando agendamentos de hoje...');

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);

        return agendamentos.filter(agendamento => {
            try {
                const dataAgendamento = new Date(agendamento.data);
                const isHoje = dataAgendamento >= hoje && dataAgendamento < amanha;
                const naoConcluido = !agendamento.concluido;

                console.log('Analisando agendamento:', {
                    id: agendamento.id,
                    data: dataAgendamento,
                    isHoje,
                    naoConcluido
                });

                return isHoje && naoConcluido;
            } catch (error) {
                console.error('Erro ao processar data:', agendamento.data);
                return false;
            }
        });
    }, [agendamentos]);

    // Efeito inicial
    useEffect(() => {
        const initialize = async () => {
            setIsLoading(true);
            try {
                // Primeiro carrega dados locais
                await loadLocalData();

                // Depois inicia sincronização se houver conexão
                const netInfo = await NetInfo.fetch();
                if (netInfo.isConnected) {
                    startFirestoreSync();
                }
            } catch (error) {
                console.error('Erro na inicialização:', error);
                setSyncStatus('error');
            } finally {
                setIsLoading(false);
            }
        };

        initialize();

        // Monitora mudanças de conectividade
        const unsubscribeNetInfo = NetInfo.addEventListener(state => {
            if (state.isConnected) {
                startFirestoreSync();
            }
        });

        return () => {
            unsubscribeNetInfo();
            if (firestoreUnsubscribe) {
                firestoreUnsubscribe();
            }
        };
    }, []);

    // Debug: Log de atualizações
    useEffect(() => {
        console.log('Agendamentos atualizados pelo provider:', {
            total: agendamentos.length,
            hoje: agendamentosHoje.length
        });
    }, [agendamentos, agendamentosHoje]);

    return (
        <SchedulingSyncContext.Provider
            value={{
                agendamentos,
                agendamentosHoje,
                isLoading,
                syncStatus,
                marcarComoConcluido,
                forceSync
            }}
        >
            {children}
        </SchedulingSyncContext.Provider>
    );
}

// Hook personalizado
export function useSchedulingSync() {
    const context = useContext(SchedulingSyncContext);
    if (!context) {
        throw new Error('useSchedulingSync deve ser usado dentro de um SchedulingSyncProvider');
    }
    return context;
}