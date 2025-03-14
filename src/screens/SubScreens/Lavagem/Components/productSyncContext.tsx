// productSyncContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { UnidadeMedida } from './lavagemTypes';

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

interface ProductSyncContextData {
    produtos: ProdutoEstoque[];
    isLoading: boolean;
    lastSyncTime: Date | null;
    syncStatus: 'idle' | 'syncing' | 'error';
    forceSync: () => Promise<void>;
}

const ProductSyncContext = createContext<ProductSyncContextData>({} as ProductSyncContextData);

export function ProductSyncProvider({ children }: { children: React.ReactNode }) {
    const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
    const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

    // Função para salvar produtos no AsyncStorage
    const saveProdutosLocally = async (produtos: ProdutoEstoque[]) => {
        try {
            await AsyncStorage.setItem('@produtos', JSON.stringify(produtos));
            await AsyncStorage.setItem('@lastSyncTime', new Date().toISOString());
        } catch (error) {
            console.error('Erro ao salvar produtos localmente:', error);
        }
    };

    // Função para carregar produtos do AsyncStorage
    const loadProdutosLocally = async () => {
        try {
            const storedProdutos = await AsyncStorage.getItem('@produtos');
            const lastSync = await AsyncStorage.getItem('@lastSyncTime');

            if (storedProdutos) {
                setProdutos(JSON.parse(storedProdutos));
            }
            if (lastSync) {
                setLastSyncTime(new Date(lastSync));
            }
        } catch (error) {
            console.error('Erro ao carregar produtos localmente:', error);
        }
    };

    // Função para iniciar sincronização com Firestore
    const startFirestoreSync = () => {
        if (unsubscribe) {
            unsubscribe();
        }

        const subscriber = firestore()
            .collection('produtos')
            .onSnapshot(
                querySnapshot => {
                    const produtosData: ProdutoEstoque[] = [];
                    querySnapshot.forEach(doc => {
                        produtosData.push({
                            id: doc.id,
                            ...doc.data() as Omit<ProdutoEstoque, 'id'>
                        });
                    });

                    console.log(produtosData)

                    setProdutos(produtosData);
                    saveProdutosLocally(produtosData);
                    setLastSyncTime(new Date());
                    setSyncStatus('idle');
                },
                error => {
                    console.error('Erro na sincronização com Firestore:', error);
                    setSyncStatus('error');
                }
            );

        setUnsubscribe(() => subscriber);
    };

    // Função para gerenciar a conexão e sincronização
    const handleConnectivityChange = async (isConnected: boolean | null) => {
        if (isConnected) {
            setSyncStatus('syncing');
            startFirestoreSync();
        } else if (unsubscribe) {
            unsubscribe();
            setUnsubscribe(null);
        }
    };

    // Inicialização
    useEffect(() => {
        const initialize = async () => {
            setIsLoading(true);
            await loadProdutosLocally();

            // Configurar listener de conectividade
            const unsubscribeNetInfo = NetInfo.addEventListener(state => {
                handleConnectivityChange(state.isConnected);
            });

            // Verificar conexão inicial
            const netInfo = await NetInfo.fetch();
            handleConnectivityChange(netInfo.isConnected);

            setIsLoading(false);

            // Cleanup
            return () => {
                unsubscribeNetInfo();
                if (unsubscribe) {
                    unsubscribe();
                }
            };
        };

        initialize();
    }, []);

    // Função para forçar sincronização
    const forceSync = async () => {
        const netInfo = await NetInfo.fetch();
        if (netInfo.isConnected) {
            setSyncStatus('syncing');
            startFirestoreSync();
            console.log("Atualizando")
        }
    };

    return (
        <ProductSyncContext.Provider
            value={{
                produtos,
                isLoading,
                lastSyncTime,
                syncStatus,
                forceSync
            }}
        >
            {children}
        </ProductSyncContext.Provider>
    );
}

// Hook personalizado
export function useProductSync() {
    const context = useContext(ProductSyncContext);
    if (!context) {
        throw new Error('useProductSync deve ser usado dentro de um ProductSyncProvider');
    }
    return context;
}