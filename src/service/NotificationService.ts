// NotificationService.ts
import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';

class NotificationService {
    constructor() {
        this.configure();
    }

    configure = () => {
        // A configuração principal já está no index.js, então podemos simplificar aqui
        // Apenas criamos o canal específico para este serviço
        PushNotification.createChannel(
            {
                channelId: 'default-channel-id',
                channelName: 'Default Channel',
                channelDescription: 'A default channel for notifications',
                playSound: true,
                soundName: 'default',
                importance: 4,
                vibrate: true,
            },
            (created) => console.log(`Channel created: ${created}`)
        );
    };

    // Função para mostrar uma notificação local com dados de navegação
    localNotification = (title: string, message: string, screen?: string, params?: any) => {
        // Criar objeto de navegação
        const navigationData = {
            screen: screen,
            params: params
        };

        console.log(`📱 Enviando notificação local para tela: ${screen}`);

        PushNotification.localNotification({
            channelId: 'default-channel-id',
            title: title,
            message: message,
            playSound: true,
            soundName: 'default',
            importance: 'high',
            vibrate: true,
            // Importante: incluir dados em ambos formatos para compatibilidade entre plataformas
            userInfo: navigationData, // Para iOS
        });
    };

    // Função para agendar uma notificação repetitiva com navegação
    scheduleRepeatingNotification = (
        title: string,
        message: string,
        screen?: string,
        params?: any
    ) => {
        // console.log(` Notificação repetitiva iniciada com sucesso para tela: ${screen}`);

        const notificationId = 1; // Você pode usar qualquer número inteiro único

        // Criar objeto de navegação
        const navigationData = {
            screen: screen,
            params: params
        };

        PushNotification.localNotificationSchedule({
            channelId: 'default-channel-id',
            title: title,
            message: message,
            date: new Date(Date.now() + 5000), // 5 segundos a partir de agora
            smallIcon: "ic_notification", // Use um ícone mínimo personalizado
            largeIconUrl: '',
            bigLargeIcon: '',
            bigLargeIconUrl: '',
            largeIcon: '',
            repeatType: 'time',
            repeatTime: 5000, // Repetir a cada 5 segundos
            onlyAlertOnce: true,
            id: String(notificationId), // Converter para string conforme esperado pela biblioteca
            number: notificationId, // Número da notificação
            // Incluir dados em ambos formatos para compatibilidade
            userInfo: navigationData, // Para iOS
            // Garantir que seja processada em primeiro plano
            ignoreInForeground: false,
        });
    };

    // Função para enviar uma notificação única com ações
    localNotificationWithAction = (
        title: string,
        message: string,
        screen?: string,
        params?: any,
        detailScreen?: string,
        detailParams?: any
    ) => {
        // Criar objeto de navegação com detalhes
        const navigationData = {
            screen: screen,
            params: params,
            detailScreen: detailScreen,
            detailParams: detailParams
        };

        console.log(`🔔 Enviando notificação com ações para tela: ${screen}`);

        PushNotification.localNotification({
            channelId: 'default-channel-id',
            title: title,
            message: message,
            playSound: true,
            soundName: 'default',
            importance: 'high',
            vibrate: true,
            // Incluir dados em ambos formatos para compatibilidade
            userInfo: navigationData, // Para iOS
            // Adicionar ações personalizadas (apenas Android)
            actions: ["View", "Dismiss"]
        });
    };

    // Nova função para enviar notificação com maior prioridade
    localNotificationHighPriority = (title: string, message: string, screen?: string, params?: any) => {
        const navigationData = {
            screen: screen,
            params: params
        };

        console.log(`🚨 Enviando notificação de alta prioridade para tela: ${screen}`);

        PushNotification.localNotification({
            channelId: 'default-channel-id',
            title: title,
            message: message,
            playSound: true,
            soundName: 'default',
            importance: 'high',
            priority: 'high',
            vibrate: true,
            visibility: 'public',
            // Incluir dados em ambos formatos
            userInfo: navigationData,
            // Configurações adicionais para garantir que seja notada
            ignoreInForeground: false,
            onlyAlertOnce: false,
        });
    };

    // Função para cancelar todas as notificações
    cancelAllNotifications = () => {
        PushNotification.cancelAllLocalNotifications();
        console.log("🧹 Todas as notificações foram canceladas");
    };

    // Função específica para cancelar notificação repetitiva
    cancelRepeatingNotification = (id: number = 1) => {
        PushNotification.cancelLocalNotification(String(id));
        console.log(`🛑 Notificação repetitiva ${id} foi cancelada`);
    };

    processNotificationOpen = (screen?: string, params?: any) => {
        console.log("🔔 Processando clique em notificação manualmente:", screen);

        if (screen && global.navigationRef && global.navigationRef.current) {
            setTimeout(() => {
                try {
                    console.log(`🧭 Navegando para: ${screen}`);
                    global?.navigationRef?.current.navigate(screen, params);
                    console.log("✅ Navegação concluída com sucesso");
                } catch (error) {
                    console.error("❌ Erro durante a navegação:", error);
                }
            }, 500);
        } else {
            console.log("⚠️ Não foi possível processar a navegação: referência de navegação indisponível ou tela não especificada");
        }
    };

}

export default new NotificationService();