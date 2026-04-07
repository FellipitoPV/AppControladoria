// schedulingSyncContext.tsx

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ecoApi } from '../../../api/ecoApi';

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
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    // Busca agendamentos da API
    const fetchAgendamentos = async () => {
        console.log('Buscando agendamentos da API');
        setSyncStatus('syncing');
        try {
            const data: AgendamentoLavagem[] = await ecoApi.list('agendamentos');
            console.log('Dados recebidos da API:', data.length);
            setAgendamentos(data);
            await saveLocally(data);
            setSyncStatus('idle');
        } catch (error) {
            console.error('Erro ao buscar agendamentos:', error);
            setSyncStatus('error');
        }
    };

    // Inicia polling a cada 60 segundos
    const startPolling = () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        fetchAgendamentos();
        pollIntervalRef.current = setInterval(fetchAgendamentos, 60000);
    };

    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
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

            // Se estiver online, atualiza na API
            if (netInfo.isConnected) {
                await ecoApi.update('agendamentos', agendamentoId, { concluido: true });
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
            await fetchAgendamentos();
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
                    startPolling();
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
                startPolling();
            } else {
                stopPolling();
            }
        });

        return () => {
            unsubscribeNetInfo();
            stopPolling();
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