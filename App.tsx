import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import FlashMessage from "react-native-flash-message";
import Toast, { ToastConfig } from 'react-native-toast-message';
import { StyleSheet, Text, View } from 'react-native';
import { UserProvider } from './src/contexts/userContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import WelcomeScreen from './src/screens/Login/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen/HomeScreen';
import { BackgroundSyncProvider } from './src/contexts/backgroundSyncContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importar suas telas
import FormularioOcorrencia from './src/screens/Formularios/ocorrencia/FormularioOcorrencia';
import RelatorioOcorrenciaList from './src/screens/Formularios/ocorrencia/RelatoriosLista';
import NovaLavagem from './src/screens/Formularios/Lavagem/LavagemForm';
import LavagemScreen from './src/screens/Formularios/Lavagem/LavagemScreen';
import ContatosScreen from './src/screens/Contatos/ContatosScreen';
import AgendamentoLavagem from './src/screens/Formularios/Lavagem/AgendamentoLavagem';
import HistoricoLavagem from './src/screens/Formularios/Lavagem/HistoricoLavagem';
import ControleEstoque from './src/screens/Formularios/Lavagem/ControleEstoque';
import CompostagemScreen from './src/screens/Formularios/Compostagem/CompostagemScreen';
import CompostagemForm from './src/screens/Formularios/Compostagem/CompostagemForm';
import CompostagemHistory from './src/screens/Formularios/Compostagem/CompostagemHistory';
import LogisticaScreen from './src/screens/Formularios/Logistica/LogisticaScreen';
import RegisterScreen from './src/screens/Login/RegisterScreen';
import ProfileScreen from './src/screens/HomeScreen/components/ProfileScreen';
import OperacaoScreen from './src/screens/Formularios/Operacao/OperacaoScreen';
import ListaProgramacoes from './src/screens/Formularios/Logistica/ListaProgramacoes';
import FormularioProgramacao from './src/screens/Formularios/Logistica/Components/FormularioProgramacao';
import RelatorioLavagens from './src/screens/Formularios/Lavagem/RelatorioLavagens';
import MyAccessScreen from './src/screens/HomeScreen/components/MyAccessScreen';
import EditUserAccessScreen from './src/screens/Adm/EditUserAccessScreen';
import HistoricoOperacoes from './src/screens/Formularios/Logistica/HistoricoOperacoes';
import RelatorioCompostagem from './src/screens/Formularios/Compostagem/RelatorioCompostagem';
import RdoForm from './src/screens/Formularios/Logistica/rdo/RdoForm';
import HistoricoRdo from './src/screens/Formularios/Logistica/rdo/HistoricoRdo';
import ForgotPasswordScreen from './src/screens/Login/ForgotPasswordScreen';
import LoginScreen from './src/screens/Login/LoginScreen';

// Importar funções de notificação
import { setNotificationNavigationHandler, removeRepeatingNotification } from './src/helpers/notificationChannel';

// Defina os tipos das rotas para o seu navegador
interface RootStackParamList {
  Login: { nextScreen?: string; nextScreenParams?: object };
  Home: undefined;
  Register: undefined;
  ForgotPass: undefined;
  // Adicione outras rotas conforme necessário
  [key: string]: object | undefined; // Para permitir navegação dinâmica
}

// Declare o tipo global para a navegação
declare global {
  var navigationRef: React.RefObject<any> | null;
  var isUserLoggedIn: (() => boolean) | null;
  var setUserLoggedIn: ((value: boolean) => void) | null;
  var pendingNotificationNavigation: {
    screenName: string;
    params?: object;
    requiresAuth: boolean;
  } | null;
}

const Stack = createStackNavigator<RootStackParamList>();

interface CustomToastProps {
  type?: 'success' | 'error' | 'info';
  text1?: string;
  text2?: string;
}

const CustomToast: React.FC<CustomToastProps> = (props) => {
  const { type = 'success', text1, text2 } = props;

  const config = {
    success: {
      bgColor: 'rgba(0, 128, 0, 0.95)',
      iconName: 'check-circle',
    },
    error: {
      bgColor: 'rgba(220, 38, 38, 0.95)',
      iconName: 'error',
    },
    info: {
      bgColor: 'rgba(59, 130, 246, 0.95)',
      iconName: 'info',
    },
  };

  const currentConfig = config[type];

  return (
    <View style={[styles.toastContainer, { backgroundColor: currentConfig.bgColor }]}>
      <View style={styles.iconContainer}>
        <Icon
          name={currentConfig.iconName}
          size={24}
          color="white"
        />
      </View>
      <View style={styles.textContainer}>
        <Text
          style={styles.titleText}
        >
          {text1}
        </Text>
        {text2 && (
          <Text
            style={styles.messageText}
          >
            {text2}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    width: '90%',
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.15,
  },
  messageText: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 2,
    letterSpacing: 0.25,
  },
});

const toastConfig: ToastConfig = {
  success: (props) => <CustomToast {...props} type="success" />,
  error: (props) => <CustomToast {...props} type="error" />,
  info: (props) => <CustomToast {...props} type="info" />,
};

export default function App() {
  const navigationRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Para rastrear se o NavigationContainer já está pronto
  const isNavigationReady = useRef(false);

  // Configurar as referências globais
  useEffect(() => {
    // Definir a referência de navegação global
    global.navigationRef = navigationRef;

    // Definir funções globais para gerenciar o estado de login
    global.isUserLoggedIn = () => isLoggedIn;
    global.setUserLoggedIn = (value: boolean) => {
      setIsLoggedIn(value);
      // Persistir o estado de login
      AsyncStorage.setItem('isLoggedIn', value ? 'true' : 'false')
        .catch(err => console.error('Erro ao salvar estado de login:', err));
    };

    // Verificar se o usuário já está logado
    const checkLoginStatus = async () => {
      try {
        const value = await AsyncStorage.getItem('isLoggedIn');
        // Verificar também se existe um email e senha salvos
        const savedEmail = await AsyncStorage.getItem('userEmail');
        const savedPassword = await AsyncStorage.getItem('userPassword');

        setIsLoggedIn(value === 'true' && !!savedEmail && !!savedPassword);
      } catch (error) {
        console.error('Erro ao verificar estado de login:', error);
      } finally {
        setIsReady(true);
      }
    };

    checkLoginStatus();

    return () => {
      // Limpar referências globais ao desmontar
      global.navigationRef = null;
      global.isUserLoggedIn = null;
      global.setUserLoggedIn = null;
    };
  }, [isLoggedIn]);

  const onNavigationReady = () => {
    console.log('🚀 NavigationContainer is ready');
    isNavigationReady.current = true;

    // Configurar o handler de navegação para notificações
    setNotificationNavigationHandler((screenName, params) => {
      console.log('🧭 Notification navigation handler called:', screenName, params);

      // Verificar se o usuário está logado
      const userIsLoggedIn = global.isUserLoggedIn && global.isUserLoggedIn();

      if (userIsLoggedIn) {
        console.log('👤 User is logged in, navigating directly to:', screenName);
        if (navigationRef.current) {
          // Se logado, navegue diretamente para a tela
          navigationRef.current.navigate(screenName, params);
        }
      } else {
        console.log('🔒 User is not logged in, redirecting to Login screen');
        if (navigationRef.current) {
          // Se não logado, navegue para login com redirecionamento
          navigationRef.current.navigate('Login', {
            nextScreen: screenName,
            nextScreenParams: params
          });
        }
      }
    });

    // Processar qualquer navegação pendente
    if (global.pendingNotificationNavigation) {
      const { screenName, params, requiresAuth } = global.pendingNotificationNavigation;
      const userIsLoggedIn = global.isUserLoggedIn && global.isUserLoggedIn();

      console.log('📱 Processing pending navigation:', screenName);
      console.log('👤 User login status:', userIsLoggedIn ? 'Logged in' : 'Not logged in');

      setTimeout(() => {
        if ((!requiresAuth) || (requiresAuth && userIsLoggedIn)) {
          console.log('🚀 Navigating directly to:', screenName);
          // Navegação direta se não requer autenticação ou se já estiver autenticado
          navigationRef.current?.navigate(screenName, params);
        } else {
          console.log('🔒 Authentication required, redirecting to Login screen');
          // Navegação para login com parâmetros para redirecionamento
          navigationRef.current?.navigate('Login', {
            nextScreen: screenName,
            nextScreenParams: params
          });
        }
        global.pendingNotificationNavigation = null;
      }, 300);
    }
  };

  // Não renderize nada até que estejamos prontos
  if (!isReady) {
    return null;
  }

  return (
    <UserProvider>
      <BackgroundSyncProvider>
        <NavigationContainer
          ref={navigationRef}
          onReady={onNavigationReady}
        >
          <NetworkProvider>
            <Stack.Navigator initialRouteName="Home">
              {/* LOGIN */}
              <Stack.Screen
                name="Login"
                component={LoginScreen as React.ComponentType<any>}
                options={{ headerShown: false }}
              />
              <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
              <Stack.Screen name="ForgotPass" component={ForgotPasswordScreen} options={{ headerShown: false }} />

              {/* ADM */}
              <Stack.Screen name="UsersEdit" component={EditUserAccessScreen} options={{ headerShown: false }} />

              <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="NewP" component={FormularioOcorrencia} options={{ headerShown: false }} />
              <Stack.Screen name="List" component={RelatorioOcorrenciaList} options={{ headerShown: false }} />

              {/* Perfil */}
              <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Acessos" component={MyAccessScreen} options={{ headerShown: false }} />

              {/* Lavagem */}
              <Stack.Screen name="LavagemScreen" component={LavagemScreen} options={{ headerShown: false }} />
              <Stack.Screen name="LavagemForm" component={NovaLavagem} options={{ headerShown: false }} />
              <Stack.Screen name="LavagemAgend" component={AgendamentoLavagem} options={{ headerShown: false }} />
              <Stack.Screen name="LavagemHist" component={HistoricoLavagem} options={{ headerShown: false }} />
              <Stack.Screen name="LavagemEstoq" component={ControleEstoque} options={{ headerShown: false }} />
              <Stack.Screen name="LavagemRelat" component={RelatorioLavagens} options={{ headerShown: false }} />

              {/* Compostagem */}
              <Stack.Screen name="CompostagemScreen" component={CompostagemScreen} options={{ headerShown: false }} />
              <Stack.Screen name="CompostagemForm" component={CompostagemForm} options={{ headerShown: false }} />
              <Stack.Screen name="CompostagemHistory" component={CompostagemHistory} options={{ headerShown: false }} />
              <Stack.Screen name="CompostagemRelat" component={RelatorioCompostagem} options={{ headerShown: false }} />

              {/* Logistica */}
              <Stack.Screen name="LogisticaScreen" component={LogisticaScreen} options={{ headerShown: false }} />
              <Stack.Screen name="LogisticaProgram" component={FormularioProgramacao} options={{ headerShown: false }} />
              <Stack.Screen name="LogisticaHist" component={HistoricoOperacoes} options={{ headerShown: false }} />
              <Stack.Screen name="RdoForm" component={RdoForm} options={{ headerShown: false }} />
              <Stack.Screen name="RdoHist" component={HistoricoRdo} options={{ headerShown: false }} />

              {/* Operacao */}
              <Stack.Screen name="OperacaoScreen" component={OperacaoScreen} options={{ headerShown: false }} />
              <Stack.Screen name="OperacaoProgram" component={ListaProgramacoes} options={{ headerShown: false }} />

              {/* Contatos */}
              <Stack.Screen name="Contatos" component={ContatosScreen} options={{ headerShown: false }} />
            </Stack.Navigator>
            <Toast config={toastConfig} position='top' />
            <FlashMessage position="top" />
          </NetworkProvider>
        </NavigationContainer>
      </BackgroundSyncProvider>
    </UserProvider>
  )
};