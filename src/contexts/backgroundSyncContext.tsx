// backgroundSyncContext.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
} from 'firebase/firestore';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {IAgendamentoLavagem} from '../screens/SubScreens/Lavagem/Components/lavagemTypes';
import NetInfo from '@react-native-community/netinfo';
import {db} from '../../firebase';

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
  isOnline: boolean; // Nova propriedade exportada
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

// Função de log personalizada para facilitar depuração
const logSync = (area: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[SYNC][${timestamp}][${area}] ${message}`;

  // if (data) {
  //     console.log(logMessage, data);
  // } else {
  //     console.log(logMessage);
  // }
};

export function BackgroundSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  logSync('Init', 'Inicializando BackgroundSyncProvider');

  // Estado de conectividade gerenciado internamente
  const [isOnline, setIsOnline] = useState(false);
  const [syncStates, setSyncStates] = useState<{[key: string]: SyncState}>({
    produtos: {
      data: [],
      lastSyncTime: null,
      status: 'idle',
    },
    agendamentos: {
      data: [],
      lastSyncTime: null,
      status: 'idle',
    },
    clientes: {
      // ← ADICIONE ISSO
      data: [],
      lastSyncTime: null,
      status: 'idle',
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [unsubscribers, setUnsubscribers] = useState<{
    [key: string]: (() => void) | null;
  }>({});

  // Referência para evitar renderizações desnecessárias
  const isMounted = useRef(true);

  // Funções auxiliares para persistência local
  const saveDataLocally = async (key: string, data: any[], timestamp: Date) => {
    try {
      logSync('Storage', `Salvando ${key} localmente - ${data.length} itens`);
      await AsyncStorage.setItem(`@${key}`, JSON.stringify(data));
      await AsyncStorage.setItem(`@${key}_lastSync`, timestamp.toISOString());
      logSync('Storage', `${key} salvo com sucesso`);
    } catch (error) {
      logSync('Error', `Erro ao salvar ${key} localmente:`, error);
    }
  };

  const loadDataLocally = async (key: string) => {
    try {
      logSync('Storage', `Carregando ${key} do armazenamento local`);
      const storedData = await AsyncStorage.getItem(`@${key}`);
      const lastSync = await AsyncStorage.getItem(`@${key}_lastSync`);

      const result = {
        data: storedData ? JSON.parse(storedData) : [],
        lastSyncTime: lastSync ? new Date(lastSync) : null,
      };

      logSync(
        'Storage',
        `${key} carregado: ${result.data.length} itens, última sincronização: ${result.lastSyncTime}`,
      );
      return result;
    } catch (error) {
      logSync('Error', `Erro ao carregar ${key} localmente:`, error);
      return {data: [], lastSyncTime: null};
    }
  };

  const startFirestoreSync = (collectionName: string) => {
    logSync(
      'Firestore',
      `Iniciando sincronização da coleção ${collectionName}`,
    );

    if (unsubscribers[collectionName]) {
      logSync(
        'Firestore',
        `Cancelando inscrição anterior para ${collectionName}`,
      );
      unsubscribers[collectionName]?.();
    }

    logSync('Firestore', `Configurando listener para ${collectionName}`);
    const subscriber = onSnapshot(
      collection(db(), collectionName),
      querySnapshot => {
        if (!isMounted.current) return;

        logSync(
          'Firestore',
          `Snapshot recebido para ${collectionName} - ${querySnapshot.docs.length} documentos`,
        );

        const syncedData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (syncedData.length === 0) {
          logSync(
            'Warning',
            `Nenhum dado recebido para ${collectionName}. Verificar coleção no Firebase.`,
          );
        } else {
          logSync(
            'Firestore',
            `Dados sincronizados de ${collectionName}: ${syncedData.length} itens`,
          );
          if (collectionName === 'produtos') {
            logSync('Detail', 'Amostra de produtos:', syncedData.slice(0, 2));
          }
        }

        const timestamp = new Date();
        setSyncStates(prev => {
          logSync('State', `Atualizando estado para ${collectionName}`);
          return {
            ...prev,
            [collectionName]: {
              data: syncedData,
              lastSyncTime: timestamp,
              status: 'idle',
            },
          };
        });

        saveDataLocally(collectionName, syncedData, timestamp);
      },
      error => {
        if (!isMounted.current) return;

        logSync('Error', `Erro na sincronização de ${collectionName}:`, error);
        setSyncStates(prev => ({
          ...prev,
          [collectionName]: {
            ...prev[collectionName],
            status: 'error',
          },
        }));
      },
    );

    setUnsubscribers(prev => ({
      ...prev,
      [collectionName]: subscriber,
    }));

    logSync('Firestore', `Listener configurado para ${collectionName}`);
  };

  // Gerenciamento de conectividade
  const handleConnectivityChange = async (isConnected: boolean | null) => {
    if (!isMounted.current) return;

    const connected = !!isConnected; // Converte para boolean
    logSync(
      'Network',
      `Mudança de conectividade detectada: ${connected ? 'Online' : 'Offline'}`,
    );

    setIsOnline(connected);

    if (connected) {
      logSync('Network', 'Dispositivo online, iniciando sincronização');
      setSyncStates(prev => ({
        ...prev,
        produtos: {...prev.produtos, status: 'syncing'},
        agendamentos: {...prev.agendamentos, status: 'syncing'},
        clientes: {...prev.clientes, status: 'syncing'},
      }));

      startFirestoreSync('produtos');
      startFirestoreSync('agendamentos');
      startFirestoreSync('clientes');
    } else {
      logSync('Network', 'Dispositivo offline, cancelando inscrições');
      Object.entries(unsubscribers).forEach(([collection, unsubscribe]) => {
        if (unsubscribe) {
          logSync('Firestore', `Cancelando inscrição para ${collection}`);
          unsubscribe();
        }
      });
      setUnsubscribers({});
    }
  };

  // Verificação de estado atual
  useEffect(() => {
    if (!isMounted.current) return;

    logSync('Debug', 'Estado atual dos produtos:', {
      quantidade: syncStates.produtos.data.length,
      status: syncStates.produtos.status,
      lastSync: syncStates.produtos.lastSyncTime,
      online: isOnline,
    });
  }, [syncStates.produtos, isOnline]);

  // Efeito para lidar com conectividade
  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      handleConnectivityChange(state.isConnected);
    });

    // Iniciar com verificação de conectividade
    NetInfo.fetch().then(state => {
      handleConnectivityChange(state.isConnected);
    });

    return () => {
      isMounted.current = false;
      unsubscribeNetInfo();
      Object.values(unsubscribers).forEach(unsubscribe => unsubscribe?.());
    };
  }, []);

  // Inicialização
  useEffect(() => {
    const initialize = async () => {
      logSync('Init', 'Inicializando sistema de sincronização');
      setIsLoading(true);

      // Carregar dados locais
      logSync('Init', 'Carregando dados locais');
      const produtosLocal = await loadDataLocally('produtos');
      const agendamentosLocal = await loadDataLocally('agendamentos');
      const clientesLocal = await loadDataLocally('clientes');

      if (!isMounted.current) return;

      logSync(
        'Init',
        `Dados locais carregados: ${produtosLocal.data.length} produtos, ${agendamentosLocal.data.length} agendamentos`,
      );

      setSyncStates(prev => ({
        ...prev,
        produtos: {
          data: produtosLocal.data,
          lastSyncTime: produtosLocal.lastSyncTime,
          status: 'idle',
        },
        agendamentos: {
          data: agendamentosLocal.data,
          lastSyncTime: agendamentosLocal.lastSyncTime,
          status: 'idle',
        },
        clientes: {
          // ← ADICIONE ISSO
          data: clientesLocal.data,
          lastSyncTime: clientesLocal.lastSyncTime,
          status: 'idle',
        },
      }));

      // Verificar configuração do Firebase
      try {
        logSync('Firestore', 'Verificando conexão com Firebase');
        const testRef = await getDocs(
          query(collection(db(), 'produtos'), limit(1)),
        );
        logSync(
          'Firestore',
          `Conexão de teste com Firebase: ${testRef.empty ? 'Vazia' : 'OK'}`,
        );
        if (testRef.empty) {
          logSync(
            'Warning',
            'A coleção de produtos parece estar vazia no Firebase',
          );
        }
      } catch (error) {
        logSync('Error', 'Erro ao verificar conexão com Firebase:', error);
      }

      if (!isMounted.current) return;
      setIsLoading(false);
      logSync('Init', 'Inicialização concluída');
    };

    initialize();
  }, []);

  // Adicionar método para marcar agendamento como concluído
  const marcarAgendamentoComoConcluido = async (agendamentoId: string) => {
    logSync(
      'Agendamento',
      `Marcando agendamento ${agendamentoId} como concluído`,
    );
    const netInfo = await NetInfo.fetch();

    try {
      // Atualiza estado local
      setSyncStates(prev => {
        const updatedAgendamentos = prev.agendamentos.data.map(ag =>
          ag.id === agendamentoId ? {...ag, concluido: true} : ag,
        );

        logSync('Agendamento', 'Estado local atualizado');
        return {
          ...prev,
          agendamentos: {
            ...prev.agendamentos,
            data: updatedAgendamentos,
          },
        };
      });

      // Se estiver online, atualiza no Firestore
      if (netInfo.isConnected) {
        logSync(
          'Agendamento',
          `Atualizando agendamento ${agendamentoId} no Firestore`,
        );
        await updateDoc(doc(db(), 'agendamentos', agendamentoId), {
          concluido: true,
        });
        logSync('Agendamento', 'Firestore atualizado com sucesso');
      } else {
        logSync(
          'Warning',
          'Dispositivo offline, aguardando sincronização futura',
        );
      }
    } catch (error) {
      logSync('Error', 'Erro ao marcar como concluído:', error);
      throw error;
    }
  };

  // Modificar forceSync para ser opcional
  const forceSync = async (
    collection?: 'produtos' | 'agendamentos' | 'clientes',
  ) => {
    logSync(
      'Force',
      `Forçando sincronização${
        collection ? ` para ${collection}` : ' para todas coleções'
      }`,
    );
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      if (collection) {
        // Sincroniza coleção específica
        logSync('Force', `Iniciando sincronização forçada para ${collection}`);
        setSyncStates(prev => ({
          ...prev,
          [collection]: {...prev[collection], status: 'syncing'},
        }));
        startFirestoreSync(collection);
      } else {
        // Sincroniza todas as coleções
        logSync('Force', 'Iniciando sincronização forçada para todas coleções');
        ['produtos', 'agendamentos', 'clientes'].forEach(col => {
          setSyncStates(prev => ({
            ...prev,
            [col]: {...prev[col], status: 'syncing'},
          }));
          startFirestoreSync(col);
        });
      }
    } else {
      logSync(
        'Warning',
        'Tentativa de sincronização forçada falhou: dispositivo offline',
      );
    }
  };

  // Logs de debug do estado atual
  const debugState = {
    isOnline,
    produtosCount: syncStates.produtos.data.length,
    agendamentosCount: syncStates.agendamentos.data.length,
    lastSyncProdutos: syncStates.produtos.lastSyncTime,
    lastSyncAgendamentos: syncStates.agendamentos.lastSyncTime,
  };

  logSync('Debug', 'Estado atual do contexto:', debugState);

  return (
    <BackgroundSyncContext.Provider
      value={{
        produtos: syncStates.produtos.data as ProdutoEstoque[],
        agendamentos: syncStates.agendamentos.data as IAgendamentoLavagem[],
        clientes: syncStates.clientes.data as Cliente[], // ← ADICIONE ISSO
        isLoading,
        isOnline,
        lastSyncTime: {
          produtos: syncStates.produtos.lastSyncTime,
          agendamentos: syncStates.agendamentos.lastSyncTime,
          clientes: syncStates.clientes.lastSyncTime, // ← ADICIONE ISSO
        },
        syncStatus: {
          produtos: syncStates.produtos.status,
          agendamentos: syncStates.agendamentos.status,
          clientes: syncStates.clientes.status, // ← ADICIONE ISSO
        },
        forceSync,
        marcarAgendamentoComoConcluido,
      }}>
      {children}
    </BackgroundSyncContext.Provider>
  );
}

// Hook personalizado com log adicional
export function useBackgroundSync() {
  logSync('Hook', 'useBackgroundSync foi chamado');
  const context = useContext(BackgroundSyncContext);
  if (!context) {
    logSync(
      'Error',
      'useBackgroundSync chamado fora do BackgroundSyncProvider',
    );
    throw new Error(
      'useBackgroundSync deve ser usado dentro de um BackgroundSyncProvider',
    );
  }
  logSync(
    'Hook',
    `Produtos disponíveis: ${context.produtos.length}, Status: ${context.syncStatus.produtos}, Online: ${context.isOnline}`,
  );
  return context;
}
