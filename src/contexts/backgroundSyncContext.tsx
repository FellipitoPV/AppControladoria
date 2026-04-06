// backgroundSyncContext.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {IAgendamentoLavagem} from '../screens/SubScreens/Lavagem/Components/lavagemTypes';
import NetInfo from '@react-native-community/netinfo';
import {ecoApi} from '../api/ecoApi';

export type UnidadeMedida = 'unidade' | 'kilo' | 'litro';

// Types
export interface ProdutoEstoque {
  id?: string;
  nome: string;
  quantidade: string;
  quantidadeMinima: string;
  unidadeMedida: UnidadeMedida;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface Cliente {
  id?: string;
  numero: string;
  cod: string;
  numeroContrato: string;
  cnpjCpf: string;
  razaoSocial: string;
  endereco: string;
  status: string;
  data: string;
}

interface SyncState {
  data: any[];
  lastSyncTime: Date | null;
  status: SyncStatus;
}

interface BackgroundSyncContextData {
  produtos: ProdutoEstoque[];
  agendamentos: IAgendamentoLavagem[];
  clientes: Cliente[];
  isLoading: boolean;
  isOnline: boolean;
  lastSyncTime: {
    produtos: Date | null;
    agendamentos: Date | null;
    clientes: Date | null;
  };
  syncStatus: {
    produtos: SyncStatus;
    agendamentos: SyncStatus;
    clientes: SyncStatus;
  };
  forceSync: (collection?: 'produtos' | 'agendamentos' | 'clientes') => Promise<void>;
  marcarAgendamentoComoConcluido?: (agendamentoId: string) => Promise<void>;
}

const BackgroundSyncContext = createContext<BackgroundSyncContextData>(
  {} as BackgroundSyncContextData,
);

// Normaliza _id do MongoDB para id
const normalizeId = (item: any) => ({
  ...item,
  id: item._id ?? item.id ?? '',
});

const COLLECTIONS = ['produtos', 'agendamentos', 'clientes'] as const;
type CollectionName = typeof COLLECTIONS[number];

export function BackgroundSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnline, setIsOnline] = useState(false);
  const [syncStates, setSyncStates] = useState<{[key: string]: SyncState}>({
    produtos:     { data: [], lastSyncTime: null, status: 'idle' },
    agendamentos: { data: [], lastSyncTime: null, status: 'idle' },
    clientes:     { data: [], lastSyncTime: null, status: 'idle' },
  });
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  // ── Persistência local ────────────────────────────────────────────────────

  const saveDataLocally = async (key: string, data: any[], timestamp: Date) => {
    try {
      await AsyncStorage.setItem(`@${key}`, JSON.stringify(data));
      await AsyncStorage.setItem(`@${key}_lastSync`, timestamp.toISOString());
    } catch {}
  };

  const loadDataLocally = async (key: string) => {
    try {
      const storedData = await AsyncStorage.getItem(`@${key}`);
      const lastSync = await AsyncStorage.getItem(`@${key}_lastSync`);
      return {
        data: storedData ? JSON.parse(storedData) : [],
        lastSyncTime: lastSync ? new Date(lastSync) : null,
      };
    } catch {
      return { data: [], lastSyncTime: null };
    }
  };

  // ── Fetch da API ──────────────────────────────────────────────────────────

  const fetchFromApi = async (collectionName: CollectionName) => {
    if (!isMounted.current) return;

    setSyncStates(prev => ({
      ...prev,
      [collectionName]: { ...prev[collectionName], status: 'syncing' },
    }));

    try {
      const raw = await ecoApi.list(collectionName);
      const data = raw.map(normalizeId);
      const timestamp = new Date();

      if (!isMounted.current) return;

      setSyncStates(prev => ({
        ...prev,
        [collectionName]: { data, lastSyncTime: timestamp, status: 'idle' },
      }));

      saveDataLocally(collectionName, data, timestamp);
    } catch (error) {
      console.error(`[Sync] Erro ao buscar ${collectionName}:`, error);
      if (!isMounted.current) return;
      setSyncStates(prev => ({
        ...prev,
        [collectionName]: { ...prev[collectionName], status: 'error' },
      }));
    }
  };

  // ── Conectividade ─────────────────────────────────────────────────────────

  const handleConnectivityChange = async (isConnected: boolean | null) => {
    if (!isMounted.current) return;
    const connected = !!isConnected;
    setIsOnline(connected);

    if (connected) {
      await Promise.all(COLLECTIONS.map(fetchFromApi));
    }
  };

  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      handleConnectivityChange(state.isConnected);
    });

    NetInfo.fetch().then(state => {
      handleConnectivityChange(state.isConnected);
    });

    return () => {
      isMounted.current = false;
      unsubscribeNetInfo();
    };
  }, []);

  // ── Inicialização (dados locais) ──────────────────────────────────────────

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      const [produtosLocal, agendamentosLocal, clientesLocal] = await Promise.all([
        loadDataLocally('produtos'),
        loadDataLocally('agendamentos'),
        loadDataLocally('clientes'),
      ]);

      if (!isMounted.current) return;

      setSyncStates(prev => ({
        ...prev,
        produtos:     { data: produtosLocal.data,     lastSyncTime: produtosLocal.lastSyncTime,     status: 'idle' },
        agendamentos: { data: agendamentosLocal.data, lastSyncTime: agendamentosLocal.lastSyncTime, status: 'idle' },
        clientes:     { data: clientesLocal.data,     lastSyncTime: clientesLocal.lastSyncTime,     status: 'idle' },
      }));

      setIsLoading(false);
    };

    initialize();
  }, []);

  // ── Marcar agendamento como concluído ─────────────────────────────────────

  const marcarAgendamentoComoConcluido = async (agendamentoId: string) => {
    // Otimista: atualiza estado local imediatamente
    setSyncStates(prev => ({
      ...prev,
      agendamentos: {
        ...prev.agendamentos,
        data: prev.agendamentos.data.map(ag =>
          ag.id === agendamentoId ? { ...ag, concluido: true } : ag,
        ),
      },
    }));

    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      await ecoApi.update('agendamentos', agendamentoId, { concluido: true });
    }
  };

  // ── forceSync ─────────────────────────────────────────────────────────────

  const forceSync = async (collection?: CollectionName) => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    if (collection) {
      await fetchFromApi(collection);
    } else {
      await Promise.all(COLLECTIONS.map(fetchFromApi));
    }
  };

  return (
    <BackgroundSyncContext.Provider
      value={{
        produtos:     syncStates.produtos.data     as ProdutoEstoque[],
        agendamentos: syncStates.agendamentos.data as IAgendamentoLavagem[],
        clientes:     syncStates.clientes.data     as Cliente[],
        isLoading,
        isOnline,
        lastSyncTime: {
          produtos:     syncStates.produtos.lastSyncTime,
          agendamentos: syncStates.agendamentos.lastSyncTime,
          clientes:     syncStates.clientes.lastSyncTime,
        },
        syncStatus: {
          produtos:     syncStates.produtos.status,
          agendamentos: syncStates.agendamentos.status,
          clientes:     syncStates.clientes.status,
        },
        forceSync,
        marcarAgendamentoComoConcluido,
      }}>
      {children}
    </BackgroundSyncContext.Provider>
  );
}

export function useBackgroundSync() {
  const context = useContext(BackgroundSyncContext);
  if (!context) {
    throw new Error('useBackgroundSync deve ser usado dentro de um BackgroundSyncProvider');
  }
  return context;
}
