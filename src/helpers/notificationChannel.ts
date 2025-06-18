import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';

// Tipo para o handler de navegação
type NavigationHandler = (screenName: string, params?: object) => void;

// Variável para armazenar o handler de navegação
let navigationHandler: NavigationHandler | null = null;

/**
 * Define o handler de navegação para notificações
 * @param handler Função de callback que lida com a navegação
 */
export const setNotificationNavigationHandler = (handler: NavigationHandler) => {
    navigationHandler = handler;
    // console.log('Navigation handler set up');
};

/**
 * Navega para uma tela específica através do handler configurado
 * @param screenName Nome da tela para navegar
 * @param params Parâmetros opcionais para a navegação
 */
export const navigateFromNotification = (screenName: string, params?: object) => {
    if (navigationHandler) {
        navigationHandler(screenName, params);
        return true;
    }

    // Se o handler não está disponível, armazenar para processamento posterior
    if (screenName) {
        global.pendingNotificationNavigation = {
            screenName,
            params: params || {},
            requiresAuth: true // Assumindo que normalmente requer autenticação
        };
        console.log('Stored pending navigation to:', screenName);
        return true;
    }

    return false;
};

/**
 * Agenda uma notificação local com capacidade de navegação
 * @param title Título da notificação
 * @param message Mensagem da notificação
 * @param screenName Tela para navegar quando a notificação for clicada
 * @param params Parâmetros para a navegação
 * @param date Data para agendar a notificação
 * @param channelId ID do canal para Android (padrão: "rdo-scheduled-channel")
 * @param requiresAuth Indica se a navegação requer autenticação do usuário
 */
export const scheduleNotification = (
    title: string,
    message: string,
    screenName: string,
    params: any = {},
    date: Date,
    channelId: string = 'rdo-scheduled-channel',
    requiresAuth: boolean = true
) => {
    // Usar o ID fornecido no parâmetro ou gerar um novo ID
    const notificationId = params.id || `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Adicionar debug para visualizar a notificação sendo agendada
    console.log(`Agendando notificação ${notificationId} para ${date.toLocaleTimeString()}`);

    // Certificar-se de que params inclua o screen e o notificationId
    const enhancedParams = {
        ...params,
        screen: screenName,
        notificationId
    };

    // Usar o objeto userInfo tanto para Android quanto iOS
    const notificationData = {
        channelId,
        id: notificationId,
        title,
        message,
        date,
        allowWhileIdle: true,
        playSound: true,
        soundName: 'default',

        // Configurações específicas para iOS, mas também usar no Android
        userInfo: {
            screen: screenName,
            params: enhancedParams,
            requiresAuth,
            notificationId
        }
    };

    PushNotification.localNotificationSchedule(notificationData);

    return notificationId;
};

/**
 * Cria uma notificação local imediata com capacidade de navegação
 */
export const showNotification = (
    title: string,
    message: string,
    screenName: string,
    params: any = {},
    channelId: string = 'rdo-scheduled-channel',
    requiresAuth: boolean = true
) => {
    // Usar o ID fornecido no parâmetro ou gerar um novo ID
    const notificationId = params.id || `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Adicionar debug para visualizar a notificação sendo exibida
    console.log(`Exibindo notificação imediata ${notificationId}`);

    // Certificar-se de que params inclua o screen e o notificationId
    const enhancedParams = {
        ...params,
        screen: screenName,
        notificationId
    };

    // Usar o objeto userInfo tanto para Android quanto iOS
    const notificationData = {
        channelId,
        id: notificationId,
        title,
        message,
        allowWhileIdle: true,
        playSound: true,
        soundName: 'default',

        // Configurações específicas para iOS, mas também usar no Android
        userInfo: {
            screen: screenName,
            params: enhancedParams,
            requiresAuth,
            notificationId
        }
    };

    PushNotification.localNotification(notificationData);

    return notificationId;
};

/**
 * Remove uma notificação específica pelo ID
 */
export const removeNotification = (notificationId: string) => {
    console.log(`Removendo notificação: ${notificationId}`);
    PushNotification.cancelLocalNotification(notificationId);
};

/**
 * Remove todas as notificações pendentes
 */
export const removeAllNotifications = () => {
    console.log('Removendo todas as notificações');
    PushNotification.cancelAllLocalNotifications();
};

/**
 * Remove uma notificação recorrente com base no ID da repetição
 */
export const removeRepeatingNotification = (repeatId: string) => {
    console.log(`Removendo notificação recorrente: ${repeatId}`);

    // Em iOS, precisamos lidar com as notificações de forma diferente
    if (Platform.OS === 'ios') {
        PushNotification.getScheduledLocalNotifications((notifications) => {
            notifications.forEach((notification) => {
                const data = (notification as any).userInfo;
                if (data && data.repeatId === repeatId) {
                    PushNotification.cancelLocalNotification(notification.id);
                }
            });
        });
    } else {
        // No Android, podemos usar o ID diretamente
        PushNotification.cancelLocalNotification(repeatId);
    }
};

// Função para listar notificações pendentes (útil para debug)
export const listPendingNotifications = () => {
    PushNotification.getScheduledLocalNotifications((notifications) => {
        console.log('===== NOTIFICAÇÕES PENDENTES =====');
        console.log('Total:', notifications.length);
        notifications.forEach((notification, index) => {
            console.log(`[${index + 1}] ID: ${notification.id}`);
            console.log(`    Título: ${notification.title}`);
            console.log(`    Agendada para: ${new Date(notification.date).toLocaleString()}`);

            // Exibir dados adicionais
            const data = Platform.OS === 'ios'
                ? (notification as any).userInfo
                : (notification as any).userInfo; // Usando userInfo em ambas as plataformas

            if (data) {
                console.log(`    Tela: ${data.screen}`);
                console.log(`    Params:`, data.params);
            }
        });
        console.log('=================================');
    });
};