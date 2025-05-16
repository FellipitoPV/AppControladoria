import { AppRegistry, Platform } from 'react-native';

import App from './App';
import { PaperProvider } from 'react-native-paper';
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { name as appName } from './app.json';
import { customTheme } from './src/theme/theme';

// Inicializar a variável global para armazenar a navegação pendente quando o app é aberto via notificação
global.pendingNotificationNavigation = null;

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