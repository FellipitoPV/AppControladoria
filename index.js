import { AppRegistry, Platform } from 'react-native';

import App from './App';
import { PaperProvider } from 'react-native-paper';
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { name as appName } from './app.json';
import { customTheme } from './src/theme/theme';

// Inicializar a variável global para armazenar a navegação pendente quando o app é aberto via notificação
global.pendingNotificationNavigation = null;

// Configure push notifications
PushNotification.configure({
    // (Requisito) Chamado quando um token é gerado (iOS) ou quando um token remoto é recebido (Android)
    onRegister: function (token) {
        console.log("TOKEN:", token);
    },

    // (Requisito) Chamado quando o usuário clica em uma notificação ou uma notificação é recebida em foreground
    onNotification: function (notification) {
        console.log("NOTIFICATION RECEIVED:", notification);

        // Extrair dados de navegação da notificação
        const userInfo = notification.userInfo || notification.data || {};
        const screen = userInfo.screen;
        const params = userInfo.params;

        // Log detalhado para debug
        //console.log("Dados de navegação extraídos:", { screen, params });
        //console.log("Fonte de dados:", userInfo);

        // Verificar se temos dados de navegação
        if (screen) {
            // Verificar se o navigationRef global está disponível
            if (global.navigationRef && global.navigationRef.current) {
                console.log("Reference de navegação disponível. Navegando diretamente para:", screen);

                // Navegar após um pequeno delay para garantir que a UI esteja pronta
                setTimeout(() => {
                    try {
                        // Navegar diretamente para a tela desejada, sem verificar login
                        console.log(`Executando navegação direta para: ${screen}`);
                        global.navigationRef.current.navigate(screen, params);
                        //console.log("Navegação concluída com sucesso");
                    } catch (error) {
                        console.error("Erro durante a navegação:", error);
                    }
                }, 500); // Mantendo 500ms para maior segurança
            } else {
                //console.log("Navigation ref não disponível, armazenando para uso posterior");
                // Armazenar a navegação para ser processada quando o NavigationContainer estiver pronto
                global.pendingNotificationNavigation = {
                    screenName: screen,
                    params: params,
                    requiresAuth: false // Importante: marcar como não requerendo autenticação
                };
            }
        } else {
            console.log("Nenhum dado de navegação encontrado na notificação");
        }

        // Necessário no iOS
        notification.finish(Platform.OS === 'ios' ? PushNotificationIOS.FetchResult.NoData : '');
    },

    // Apenas para iOS
    permissions: {
        alert: true,
        badge: true,
        sound: true,
    },

    // Configurações adicionais importantes
    popInitialNotification: true,
    requestPermissions: true,

    // Garantir que as notificações em foreground sejam processadas
    foreground: true,
});

// Create a channel (required for Android)
PushNotification.createChannel(
    {
        channelId: "rdo-scheduled-channel", // Usar o mesmo ID definido no notificationChannel.ts
        channelName: "RDO Notifications",
        channelDescription: "Notifications for RDO draft and scheduled tasks",
        playSound: true,
        soundName: "default",
        importance: PushNotification.Importance.HIGH,
        vibrate: true,
    },
    (created) => console.log(`CreateChannel returned '${created}`)
);

// Também criar o canal default-channel-id que você usa no NotificationService
PushNotification.createChannel(
    {
        channelId: "default-channel-id",
        channelName: "Default Channel",
        channelDescription: "Default channel for notifications",
        playSound: true,
        soundName: "default",
        importance: PushNotification.Importance.HIGH,
        vibrate: true,
    },
    //(created) => console.log(`Default Channel created: ${created}`)
);

export default function Main() {
    return (
        <PaperProvider
            theme={customTheme}
            settings={{
                detectedTheme: false
            }}
        >
            <App />
        </PaperProvider>
    );
}

AppRegistry.registerComponent(appName, () => Main);