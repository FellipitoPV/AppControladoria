import AsyncStorage from "@react-native-async-storage/async-storage";
import storage from '@react-native-firebase/storage';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { Compostagem } from "./Types";
import { hideMessage, MessageOptions, showMessage } from "react-native-flash-message";
import NetInfo from "@react-native-community/netinfo";
import Toast from "react-native-toast-message";
import { PendingData } from "../contexts/NetworkContext";

// Constantes
const TIMEOUT_VALUES = {
    DOCUMENTO: 20000,
    IMAGENS: 60000,
    UPDATE: 15000
};

const STORAGE_KEYS = {
    PENDING_COMPOSTAGENS: '@pendingCompostagens',
    PENDING_SYNC_LOCK: '@pendingSyncLock'
};

// Tipos e Enums
enum NotificationType {
    SUCCESS = "success",
    ERROR = "danger",
    WARNING = "warning",
    INFO = "info"
}

export type ShowNotificationOptions = {
    message: string;
    description?: string;
    type?: NotificationType;
    duration?: number;
    autoHide?: boolean;
} & Omit<MessageOptions, "message" | "type" | "icon" | "duration">;

// Funções de Utilidade
export const showNotification = ({
    message,
    description,
    type = NotificationType.INFO,
    duration = 3000,
    autoHide = true,
    ...rest
}: ShowNotificationOptions) => {
    showMessage({
        message,
        description,
        type,
        icon: type,
        duration: autoHide ? duration : 0,
        autoHide,
        ...rest
    });
};


// Modificação na assinatura da função para aceitar o cargo
// Repsonsavel pelo ID final salvo no firebase
export const saveCompostagemData = async (
    compostagemData: Compostagem,
    cargo?: string
): Promise<{
    success: boolean;
    isOffline: boolean;
    message: string;
}> => {
    try {
        // Gera um timestamp único para o ID
        const timestamp = Date.now();

        // Modifica o ID baseado no cargo
        compostagemData.id = cargo?.toLowerCase() === 'administrador'
            ? `0_ADM_${timestamp}`
            : timestamp.toString();

        // Resto do código permanece igual...
        const hasConnection = await checkInternetConnection();

        if (hasConnection) {
            try {
                const success = await sendDataToFirebase(compostagemData);
                if (success) {
                    return {
                        success: true,
                        isOffline: false,
                        message: "Dados salvos com sucesso no servidor!"
                    };
                }
            } catch (error) {
                console.error("Erro ao enviar para o Firebase:", error);
                await addToPendingData(compostagemData);
                return {
                    success: true,
                    isOffline: true,
                    message: "Conexão instável. Dados salvos localmente e serão sincronizados posteriormente."
                };
            }
        }

        await addToPendingData(compostagemData);
        return {
            success: true,
            isOffline: true,
            message: "Sem conexão com internet. Dados salvos localmente e serão sincronizados posteriormente."
        };

    } catch (error) {
        console.error("Erro ao salvar dados:", error);
        return {
            success: false,
            isOffline: false,
            message: "Erro ao salvar os dados. Por favor, tente novamente."
        };
    }
};

export const sendDataToFirebase = async (compostagemData: Compostagem): Promise<boolean> => {
    const abortController = new AbortController();
    let docRef: FirebaseFirestoreTypes.DocumentReference | null = null;

    try {
        // Verifica conexão inicial
        const initialConnection = await checkInternetConnection();
        if (!initialConnection) {
            console.log('Sem conexão inicial detectada');
            return false;
        }

        if (!compostagemData.id) {
            throw new Error('ID da compostagem não definido');
        }

        // Usa o ID customizado ao criar o documento
        docRef = firestore().collection('compostagens').doc(compostagemData.id);

        // Cria o documento com o ID específico
        await docRef.set({
            ...compostagemData,
            photoUrls: [],
            createdAt: new Date().toISOString()
        });

        console.log('Documento criado com ID:', compostagemData.id);

        // Upload de imagens se houver
        if (compostagemData.photoUris?.length) {
            try {
                const imageUrls = await uploadImages(compostagemData.id, compostagemData.photoUris);
                if (imageUrls.length > 0) {
                    await docRef.update({ photoUrls: imageUrls });
                }
            } catch (imageError) {
                console.error('Erro no upload de imagens:', imageError);
                // Continua mesmo se falhar o upload de imagens
            }
        }

        // Confirma se o documento existe
        const confirmDoc = await docRef.get();
        if (!confirmDoc.exists) {
            throw new Error('Documento não encontrado após criação');
        }

        console.log('Documento confirmado com sucesso');
        return true;

    } catch (error) {
        console.error('Erro no processo de salvamento:', error);

        if (docRef) {
            try {
                await docRef.delete();
                console.log('Documento excluído após erro');
            } catch (deleteError) {
                console.error('Erro ao excluir documento após falha:', deleteError);
            }
        }

        return false;
    }
};

// Funções Auxiliares
const uploadImages = async (docId: string, photoUris: string[]): Promise<string[]> => {
    const imageUrls: string[] = [];

    for (const [index, uri] of photoUris.entries()) {
        try {
            const fileName = `compostagens/${docId}_${index}.jpg`;
            const reference = storage().ref(fileName);

            await reference.putFile(uri);
            const url = await reference.getDownloadURL();
            imageUrls.push(url);

            console.log(`Imagem ${index + 1} enviada com sucesso`);
        } catch (error) {
            console.error(`Erro no upload da imagem ${index + 1}:`, error);
            throw error;
        }
    }

    return imageUrls;
};

const addToPendingData = async (dados: Compostagem): Promise<void> => {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        try {
            const lockKey = `${STORAGE_KEYS.PENDING_COMPOSTAGENS}_lock`;
            const hasLock = await AsyncStorage.getItem(lockKey);

            if (hasLock) {
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }

            await AsyncStorage.setItem(lockKey, 'true');

            const storedData = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
            const pendingData = storedData ? JSON.parse(storedData) : [];

            const isDuplicate = pendingData.some((item: Compostagem) =>
                item.data === dados.data &&
                item.hora === dados.hora
            );

            if (!isDuplicate) {
                pendingData.push({
                    ...dados,
                    timestamp: new Date().toISOString(),
                    attempts: 0
                });

                await AsyncStorage.setItem(STORAGE_KEYS.PENDING_COMPOSTAGENS, JSON.stringify(pendingData));
            }

            await AsyncStorage.removeItem(lockKey);
            return;
        } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
    }
};

export const checkForDuplicate = async (compostagemData: Compostagem): Promise<boolean> => {
    try {
        // Verifica no Firestore
        const query = await firestore()
            .collection('compostagens')
            .where('data', '==', compostagemData.data)
            .where('hora', '==', compostagemData.hora)
            .get();

        if (!query.empty) {
            console.log('Registro duplicado encontrado no Firestore');
            // Importante: Remover das pendências de forma síncrona
            await removeDuplicateFromPending(compostagemData);
            return true;
        }

        // Verifica nos pendentes com validação mais rigorosa
        const pendingData = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
        if (pendingData) {
            try {
                const pendingItems = JSON.parse(pendingData);

                // Verifica se pendingItems é um array
                if (!Array.isArray(pendingItems)) {
                    console.error('Dados pendentes corrompidos - não é um array');
                    // Limpa dados corrompidos
                    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
                    return false;
                }

                const isDuplicateInPending = pendingItems.some((pending: Compostagem) => {
                    // Validação mais rigorosa dos dados
                    if (!pending || !pending.data || !pending.hora) return false;

                    return pending.data === compostagemData.data &&
                        pending.hora === compostagemData.hora;
                });

                if (isDuplicateInPending) {
                    console.log('Registro duplicado encontrado nos pendentes');
                    return true;
                }
            } catch (parseError) {
                console.error('Erro ao processar dados pendentes:', parseError);
                // Limpa dados corrompidos
                await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
            }
        }

        return false;
    } catch (error) {
        console.error('Erro ao verificar duplicatas:', error);
        return false;
    }
};

const removeDuplicateFromPending = async (compostagemData: Compostagem): Promise<void> => {
    try {
        const pendingDataStr = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
        if (!pendingDataStr) return;

        let pendingItems: PendingData[];
        try {
            pendingItems = JSON.parse(pendingDataStr);
            if (!Array.isArray(pendingItems)) {
                await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
                return;
            }
        } catch (error) {
            await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
            return;
        }

        const filteredItems = pendingItems.filter(pending =>
            pending &&
            pending.data &&
            pending.hora &&
            !(pending.data === compostagemData.data && pending.hora === compostagemData.hora)
        );

        if (filteredItems.length !== pendingItems.length) {
            if (filteredItems.length === 0) {
                await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_COMPOSTAGENS);
            } else {
                await AsyncStorage.setItem(
                    STORAGE_KEYS.PENDING_COMPOSTAGENS,
                    JSON.stringify(filteredItems)
                );
            }
            console.log(`Removidas ${pendingItems.length - filteredItems.length} duplicatas`);
        }
    } catch (error) {
        console.error('Erro ao remover duplicata:', error);
    }
};

// Primeiro, vamos modificar a função showGlobalToast para aceitar um parâmetro opcional de countdown
export const showGlobalToast = (
    type: 'success' | 'error' | 'info',
    text1: string,
    text2: string,
    visibilityTime: number,
    from?: 'top' | 'bottom',
    countdown?: boolean
) => {
    if (countdown) {
        // Iniciamos com o número de segundos (visibilityTime em ms convertido para segundos)
        let seconds = Math.floor(visibilityTime / 1000);
        const intervalId = setInterval(() => {
            seconds--;
            if (seconds >= 0) {
                Toast.show({
                    type,
                    text1,
                    text2: `${text2} (${seconds}s)`,
                    position: from || 'top',
                    visibilityTime: 1000, // Atualiza a cada segundo
                });
            } else {
                clearInterval(intervalId);
            }
        }, 1000);

        // Mostra o toast inicial imediatamente
        Toast.show({
            type,
            text1,
            text2: `${text2} (${seconds}s)`,
            position: from || 'top',
            visibilityTime: 1000,
        });
    } else {
        // Comportamento normal sem countdown
        Toast.show({
            type,
            text1,
            text2,
            position: from || 'top',
            visibilityTime,
        });
    }
};

// Funções de Utilidade
export const checkInternetConnection = async (): Promise<boolean> => {
    try {
        const state = await NetInfo.fetch();
        console.log('Estado da conexão:', {
            isConnected: state.isConnected,
            type: state.type,
            isInternetReachable: state.isInternetReachable
        });

        // Verificação mais rigorosa da conexão
        return state.isConnected === true && state.isInternetReachable === true;
    } catch (error) {
        console.error('Erro ao verificar conexão:', error);
        return false;
    }
};