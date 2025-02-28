// notificationChannel.ts - versão simplificada e robusta

import PushNotification, { Importance } from 'react-native-push-notification';
import { Platform } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

// Variável global para armazenar a função de navegação
let navigationHandler: ((screenName: string, params?: object) => void) | null = null;

// Variável para armazenar o callback de estado da notificação
let notificationStateCallback: ((isRunning: boolean) => void) | null = null;

interface NotificationConfig {
    id?: number;
    title: string;
    message: string;
    interval?: number;
    smallIconName?: string;
    screen?: string;
    params?: object;
}

// Função para configurar o handler de navegação
export const setNotificationNavigationHandler = (
    handler: (screenName: string, params?: object) => void
) => {
    navigationHandler = handler;
    console.log('🧭 Notification navigation handler set');
};

// Função para configurar o callback de estado da notificação
export const setNotificationStateCallback = (
    callback: (isRunning: boolean) => void
) => {
    notificationStateCallback = callback;
    console.log('🔄 Notification state callback set');
};

export const createRepeatingNotification = ({
    id = 1,
    title,
    message,
    interval = 5000,
    smallIconName = 'ic_notification',
    screen = 'Home',
    params = {}
}: NotificationConfig) => {
    // Primeiro, vamos garantir que não haja notificação duplicada
    try {
        if (id) {
            PushNotification.cancelLocalNotification(id.toString());
        }
    } catch (error) {
        console.error('Erro ao cancelar notificação existente:', error);
    }

    // Agora, crie a nova notificação
    try {
        PushNotification.localNotificationSchedule({
            id,
            channelId: Platform.OS === 'android' ? "rdo-scheduled-channel" : undefined,
            title,
            message,
            date: new Date(Date.now() + interval),
            repeatType: 'time',
            repeatTime: interval,
            allowWhileIdle: true,
            playSound: true,
            soundName: 'default',
            visibility: 'public',
            smallIcon: smallIconName,
            largeIcon: "",
            // Dados da navegação armazenados aqui
            userInfo: {
                screen,
                params,
                notificationId: id
            },
        });

        console.log(`🔁 Repeating Notification Created for screen: ${screen} with ID: ${id}`);
    } catch (error) {
        console.error('Erro ao criar notificação:', error);
    }
};

export const removeRepeatingNotification = (id?: number) => {
    console.log(`🧹 Tentando remover notificação: ${id || 'todas'}`);

    try {
        if (id) {
            console.log(`🧹 Removendo notificação específica: ${id}`);
            PushNotification.cancelLocalNotification(id.toString());
        } else {
            console.log(`🧹 Removendo todas as notificações`);
            PushNotification.cancelAllLocalNotifications();
        }
        console.log('🧹 Notificação(ões) removida(s) com sucesso');

        // Atualizar o estado da notificação se o callback estiver definido
        if (notificationStateCallback) {
            notificationStateCallback(false);
        }
    } catch (error) {
        console.error('Erro ao remover notificação:', error);
    }
};

// Função para criar o canal de notificação
export const createNotificationChannel = () => {
    if (Platform.OS === 'android') {
        try {
            PushNotification.createChannel(
                {
                    channelId: "rdo-scheduled-channel",
                    channelName: "Scheduled Notifications",
                    channelDescription: "Notifications for background service",
                    playSound: true,
                    soundName: "default",
                    importance: Importance.HIGH,
                    vibrate: true,
                },
                (created) => console.log(`Channel created: ${created}`)
            );
        } catch (error) {
            console.error('Erro ao criar canal de notificação:', error);
        }
    }
};

// Configurar os listeners para notificações
export const configureNotificationListeners = () => {
    console.log('🔔 Configurando listeners de notificação');

    try {
        // Configurar o listener de abertura de notificação
        PushNotification.configure({
            // Chamado quando uma notificação é tocada
            onNotification: function (notification) {
                console.log('📣 NOTIFICATION RECEIVED:', notification);

                try {
                    // Extrair dados da notificação
                    const data = notification.data || {};
                    console.log('📣 Notification data:', data);

                    const screen = data.screen;
                    const params = data.params;
                    const notificationId = data.notificationId;

                    console.log('📱 Notification clicked - Screen:', screen, 'Params:', params, 'ID:', notificationId);

                    // Cancelar a notificação ao clicar nela
                    if (notificationId) {
                        console.log(`🔕 Tentando cancelar notificação ${notificationId}`);
                        removeRepeatingNotification(Number(notificationId));
                    }

                    // Se tivermos um handler de navegação configurado e uma tela, navegue para ela
                    if (navigationHandler && screen) {
                        console.log('🧭 Tentando navegar para:', screen);
                        setTimeout(() => {
                            console.log('🧭 Executando navegação para:', screen);
                            navigationHandler?.(screen, params);
                        }, 300);
                    } else {
                        console.log('⚠️ Navigation handler not set or screen not specified:',
                            'Handler:', !!navigationHandler,
                            'Screen:', screen);
                    }

                    // Necessário para iOS
                    if (Platform.OS === 'ios' && notification.finish) {
                        notification.finish(PushNotificationIOS.FetchResult.NoData);
                    }
                } catch (error) {
                    console.error('❌ Erro ao processar notificação:', error);
                }
            },

            // IOS Permissions
            permissions: {
                alert: true,
                badge: true,
                sound: true,
            },

            popInitialNotification: true,
            requestPermissions: Platform.OS === 'ios'
        });

        console.log('🔔 Listeners de notificação configurados com sucesso');
    } catch (error) {
        console.error('❌ Erro ao configurar listeners de notificação:', error);
    }
};