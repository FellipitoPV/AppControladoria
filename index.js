import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { PaperProvider } from 'react-native-paper';
import { customTheme } from './src/theme/theme'; // Ajuste o caminho conforme sua estrutura

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