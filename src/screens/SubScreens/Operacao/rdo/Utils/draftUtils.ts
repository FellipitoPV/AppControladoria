import AsyncStorage from '@react-native-async-storage/async-storage';
import { FormDataInterface } from '../Types/rdoTypes';
import NotificationService from '../../../../../service/NotificationService';

// Chave padrão para o rascunho
const DRAFT_KEY = 'rdoDraft';
const DRAFT_NOTIFICATION_ID = 'rdo_draft_notification'; // ID para notificações de rascunho

// Funções de utilidade para formatação
export const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Variável para controlar a frequência das notificações
let lastNotificationTime = 0;
const NOTIFICATION_THROTTLE = 5000; // 5 segundos entre notificações

// Função atualizada para ativar notificação de rascunho
export const activateDraftNotification = () => {
  try {
    console.log("Ativando notificação de rascunho com NotificationService");

    // Cancelar notificações anteriores
    NotificationService.cancelAllNotifications();

    // Usar o método disponível no NotificationService
    // Vamos usar localNotification em vez de localNotificationSchedule
    NotificationService.localNotification(
      "Relatório Diario de Operação Pendente",
      "Você tem um formulário RDO não concluído. Toque para continuar."
    );

    console.log("Notificação de rascunho enviada");
    return true;
  } catch (error) {
    console.error('Erro ao ativar notificação de rascunho:', error);
    return false;
  }
};

// Modificar a função de salvar rascunho para incluir throttle de notificações
export const saveRdoDraft = async (data: FormDataInterface): Promise<void> => {
  try {
    const draft = {
      data,
      lastSaved: new Date().toISOString()
    };

    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    console.log("Rascunho salvo às:", new Date().toLocaleTimeString());

    // Verificar se já passou tempo suficiente desde a última notificação
    const now = Date.now();
    // if (now - lastNotificationTime > NOTIFICATION_THROTTLE) {
    //   // Ativar notificação de rascunho
    //   activateDraftNotification();
    //   lastNotificationTime = now;
    // }

    NotificationService.scheduleRepeatingNotification(
      "Relatório Diario de Operação em andamento...",
      "Toque aqui para continuar o formulario.",
      "RdoForm",
    )

  } catch (error) {
    console.error('Erro ao salvar rascunho:', error);
  }
};

// Função para verificar rascunhos pendentes ao iniciar o app
export const checkPendingDrafts = async (): Promise<boolean> => {
  try {
    const draftJson = await AsyncStorage.getItem(DRAFT_KEY);
    if (draftJson) {
      const draft = JSON.parse(draftJson);
      const lastSaved = new Date(draft.lastSaved);
      const now = new Date();

      // Se o rascunho foi salvo nas últimas 24 horas
      if ((now.getTime() - lastSaved.getTime()) < 24 * 60 * 60 * 1000) {
        return activateDraftNotification();
      }
    }
    return false;
  } catch (error) {
    console.error('Erro ao verificar rascunhos pendentes:', error);
    return false;
  }
};

// Restante das funções permanece o mesmo
export const loadRdoDraft = async (): Promise<{ data: FormDataInterface; lastSaved: string } | null> => {
  try {
    const draftJson = await AsyncStorage.getItem(DRAFT_KEY);
    if (draftJson) {
      // Desativar notificação quando o rascunho for carregado
      NotificationService.cancelAllNotifications()
      return JSON.parse(draftJson);
    }
    return null;
  } catch (error) {
    console.error('Erro ao carregar rascunho:', error);
    return null;
  }
};

export const clearRdoDraft = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
    console.log('Rascunho removido com sucesso');

    // Desativar notificação quando rascunho for limpo
    NotificationService.cancelAllNotifications()
  } catch (error) {
    console.error('Erro ao limpar rascunho:', error);
  }
};

// Versões com ID específico
export const saveRdoDraftWithId = async (
  formData: FormDataInterface,
  clienteId: string,
  servicoId: string
): Promise<void> => {
  try {
    const key = `rdo_draft_${clienteId}_${servicoId}`;
    const draftData = {
      data: formData,
      lastSaved: new Date().toISOString()
    };
    await AsyncStorage.setItem(key, JSON.stringify(draftData));
    console.log(`Rascunho salvo para cliente ${clienteId} e serviço ${servicoId}`);

    // Notificação modificada com throttle igual à versão padrão
    const now = Date.now();
    // if (now - lastNotificationTime > NOTIFICATION_THROTTLE) {
    //   // Usar o método disponível no NotificationService
    //   NotificationService.localNotification(
    //     "Relatório Diario de Operação Pendente",
    //     `Você tem um RDO não concluído para ${clienteId}. Toque para continuar.`
    //   );

    //   lastNotificationTime = now;
    // }

  } catch (error) {
    console.error('Erro ao salvar rascunho específico:', error);
  }
};

export const loadRdoDraftWithId = async (
  clienteId: string,
  servicoId: string
): Promise<{ data: FormDataInterface; lastSaved: string } | null> => {
  try {
    const key = `rdo_draft_${clienteId}_${servicoId}`;
    const draftJson = await AsyncStorage.getItem(key);

    // Desativar notificações
    NotificationService.cancelAllNotifications();

    if (draftJson) {
      return JSON.parse(draftJson);
    }
    return null;
  } catch (error) {
    console.error('Erro ao carregar rascunho específico:', error);
    return null;
  }
};

export const clearRdoDraftWithId = async (
  clienteId: string,
  servicoId: string
): Promise<void> => {
  try {
    const key = `rdo_draft_${clienteId}_${servicoId}`;
    await AsyncStorage.removeItem(key);
    console.log(`Rascunho removido para cliente ${clienteId} e serviço ${servicoId}`);

    // Desativar notificações
    NotificationService.cancelAllNotifications();
  } catch (error) {
    console.error('Erro ao limpar rascunho específico:', error);
  }
};

// Função de teste para verificar se o NotificationService está funcionando
export const testDraftNotification = () => {
  try {
    console.log("Testando notificação imediata");

    // Enviar uma notificação imediata
    NotificationService.localNotification(
      "Teste de Notificação RDO",
      "Esta é uma notificação de teste do draftUtils"
    );

    console.log("Notificação de teste enviada");
    return true;
  } catch (error) {
    console.error('Erro ao testar notificação:', error);
    return false;
  }
};

// Função para listar os métodos disponíveis no NotificationService
export const inspectNotificationService = () => {
  console.log("Métodos disponíveis no NotificationService:");
  for (const key in NotificationService) {
    console.log(`- ${key}`);
  }
};