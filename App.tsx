import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Toast, {ToastConfig} from 'react-native-toast-message';

import AgendamentoLavagem from './src/screens/SubScreens/Lavagem/AgendamentoLavagem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './src/api/ecoApi';
import {BackgroundSyncProvider} from './src/contexts/backgroundSyncContext';
import CompostagemForm from './src/screens/SubScreens/Compostagem/CompostagemForm';
import CompostagemHistory from './src/screens/SubScreens/Compostagem/CompostagemHistory';
import CompostagemScreen from './src/screens/SubScreens/Compostagem/CompostagemScreen';
import ContatosScreen from './src/screens/Contatos/ContatosScreen';
import ControladoriaScreen from './src/screens/SubScreens/Controladoria/ControladoriaScreen';
import ControleEstoque from './src/screens/SubScreens/Lavagem/ControleEstoque';
import EditUserAccessScreen from './src/screens/Adm/EditUserAccessScreen';
import FlashMessage from 'react-native-flash-message';
import FormularioOcorrencia from './src/screens/SubScreens/ocorrencia/FormularioOcorrencia';
import FormularioProgramacao from './src/screens/SubScreens/Controladoria/FormularioProgramacao/FormularioProgramacao';
import HistoricoLavagem from './src/screens/SubScreens/Lavagem/HistoricoLavagem';
import HistoricoOperacoes from './src/screens/SubScreens/Controladoria/HistoricoOperacoes';
import HistoricoRdo from './src/screens/SubScreens/Operacao/rdo/HistoricoRdo';
import HomeScreen from './src/screens/HomeScreen/HomeScreen';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LavagemScreen from './src/screens/SubScreens/Lavagem/LavagemScreen';
import ListaProgramacoes from './src/screens/SubScreens/Controladoria/ListaProgramacoes';
import LoadingScreen from './src/assets/components/LoadingScreen';
import LoginScreen from './src/screens/Login/LoginScreen';
import LogisticaScreen from './src/screens/SubScreens/Logistica/LogisticaScreen';
import MyAccessScreen from './src/screens/HomeScreen/components/MyAccessScreen';
import {NavigationContainer} from '@react-navigation/native';
import {NetworkProvider} from './src/contexts/NetworkContext';
import NovaLavagem from './src/screens/SubScreens/Lavagem/LavagemForm';
import OperacaoScreen from './src/screens/SubScreens/Operacao/OperacaoScreen';
import ProfileScreen from './src/screens/HomeScreen/components/ProfileScreen';
import RdoForm from './src/screens/SubScreens/Operacao/rdo/RdoForm';
import RegisterScreen from './src/screens/Login/RegisterScreen';
import RelatorioCompostagem from './src/screens/SubScreens/Compostagem/RelatorioCompostagem';
import RelatorioLavagens from './src/screens/SubScreens/Lavagem/RelatorioLavagens';
import RelatorioOcorrenciaList from './src/screens/SubScreens/ocorrencia/RelatoriosLista';
import ReuniaoComponent from './src/screens/Reuniao/MeetingsScreen';
import {UserProvider} from './src/contexts/userContext';
import {createStackNavigator} from '@react-navigation/stack';
import {setNotificationNavigationHandler} from './src/helpers/notificationChannel';
import ChecklistScreen from './src/components/CheckList/ChecklistScreen';
import ChecklistFormScreen from './src/components/CheckList/components/ChecklistFormScreen';
import {ChecklistSyncProvider} from './src/contexts/ChecklistSyncContext';
import QSMSScreen from './src/screens/SubScreens/SST/SSTScreen';
import DDSScreen from './src/screens/SubScreens/SST/DDS/DDSScreen';
import DDSFormScreen from './src/screens/SubScreens/SST/DDS/DDSFormScreen';
import ContaminadosScreen from './src/screens/Contaminados/ContaminadosScreen';
import ToxicologicoScreen from './src/screens/SubScreens/SST/Toxicologico/ToxicologicoScreen';
import ToxicologicoFormScreen from './src/screens/SubScreens/SST/Toxicologico/ToxicologicoFormScreen';
import ControleDocumentosScreen from './src/screens/SubScreens/SST/ControleDocumentos/ControleDocumentosScreen';
import ControleDocumentosFormScreen from './src/screens/SubScreens/SST/ControleDocumentos/ControleDocumentosFormScreen';
import DevGuideScreen from './src/screens/DevGuide/DevGuideScreen';

// Defina os tipos das rotas para o seu navegador
interface RootStackParamList {
  Login: {nextScreen?: string; nextScreenParams?: object};
  Home: undefined;
  Register: undefined;
  [key: string]: object | undefined;
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

const CustomToast: React.FC<CustomToastProps> = props => {
  const {type = 'success', text1, text2} = props;

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
    <View
      style={[styles.toastContainer, {backgroundColor: currentConfig.bgColor}]}>
      <View style={styles.iconContainer}>
        <Icon name={currentConfig.iconName} size={24} color="white" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>{text1}</Text>
        {text2 && <Text style={styles.messageText}>{text2}</Text>}
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
    shadowOffset: {width: 0, height: 3},
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
  success: props => <CustomToast {...props} type="success" />,
  error: props => <CustomToast {...props} type="error" />,
  info: props => <CustomToast {...props} type="info" />,
};

export default function App() {
  const navigationRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isNavigationReady = useRef(false);

  // Verificar autenticação e decidir a tela inicial
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('@authToken');
        if (!token) {
          setIsLoggedIn(false);
          return;
        }

        // Valida o token contra a API — se inválido (401/erro), limpa e manda pro Login
        const res = await fetch(`${BASE_URL}/api/users`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          await AsyncStorage.multiRemove(['@authToken', 'userEmail', '@UserInfo', 'userName', 'rememberMe']);
          setIsLoggedIn(false);
        } else {
          setIsLoggedIn(true);
        }
      } catch {
        setIsLoggedIn(false);
      } finally {
        setIsReady(true);
      }
    };

    checkAuth();
  }, []);

  // Configurar referências globais e notificações
  useEffect(() => {
    global.navigationRef = navigationRef;
    global.isUserLoggedIn = () => isLoggedIn;
    global.setUserLoggedIn = (value: boolean) => {
      setIsLoggedIn(value);
      AsyncStorage.setItem('isLoggedIn', value ? 'true' : 'false').catch(err =>
        console.error('Erro ao salvar estado de login:', err),
      );
    };

    return () => {
      global.navigationRef = null;
      global.isUserLoggedIn = null;
      global.setUserLoggedIn = null;
    };
  }, [isLoggedIn]);

  const onNavigationReady = () => {
    // console.log('🚀 NavigationContainer is ready');
    isNavigationReady.current = true;

    setNotificationNavigationHandler((screenName, params) => {
      console.log(
        '🧭 Notification navigation handler called:',
        screenName,
        params,
      );
      const userIsLoggedIn = global.isUserLoggedIn && global.isUserLoggedIn();

      if (userIsLoggedIn) {
        console.log(
          '👤 User is logged in, navigating directly to:',
          screenName,
        );
        navigationRef.current?.navigate(screenName, params);
      } else {
        console.log('🔒 User is not logged in, redirecting to Login screen');
        navigationRef.current?.navigate('Login', {
          nextScreen: screenName,
          nextScreenParams: params,
        });
      }
    });

    if (global.pendingNotificationNavigation) {
      const {screenName, params, requiresAuth} =
        global.pendingNotificationNavigation;
      const userIsLoggedIn = global.isUserLoggedIn && global.isUserLoggedIn();

      console.log('📱 Processing pending navigation:', screenName);
      setTimeout(() => {
        if (!requiresAuth || (requiresAuth && userIsLoggedIn)) {
          console.log('🚀 Navigating directly to:', screenName);
          navigationRef.current?.navigate(screenName, params);
        } else {
          console.log(
            '🔒 Authentication required, redirecting to Login screen',
          );
          navigationRef.current?.navigate('Login', {
            nextScreen: screenName,
            nextScreenParams: params,
          });
        }
        global.pendingNotificationNavigation = null;
      }, 300);
    }
  };

  // Não renderizar até que a verificação esteja completa
  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <UserProvider>
      <BackgroundSyncProvider>
        <ChecklistSyncProvider>
          <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
            <NetworkProvider>
              <Stack.Navigator initialRouteName={isLoggedIn ? 'Home' : 'Login'}>
                <Stack.Screen
                  name="Login"
                  component={LoginScreen as React.ComponentType<any>}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="Register"
                  component={RegisterScreen}
                  options={{headerShown: false}}
                />
<Stack.Screen
                  name="UsersEdit"
                  component={EditUserAccessScreen}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="Home"
                  component={HomeScreen}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="NewP"
                  component={FormularioOcorrencia}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="List"
                  component={RelatorioOcorrenciaList}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="Profile"
                  component={ProfileScreen}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="Acessos"
                  component={MyAccessScreen}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="LavagemScreen"
                  component={LavagemScreen}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="LavagemForm"
                  component={NovaLavagem}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="LavagemAgend"
                  component={AgendamentoLavagem}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="LavagemHist"
                  component={HistoricoLavagem}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="LavagemEstoq"
                  component={ControleEstoque}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="LavagemRelat"
                  component={RelatorioLavagens}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="CompostagemScreen"
                  component={CompostagemScreen}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="CompostagemForm"
                  component={CompostagemForm}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="CompostagemHistory"
                  component={CompostagemHistory}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="CompostagemRelat"
                  component={RelatorioCompostagem}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="LogisticaScreen"
                  component={LogisticaScreen}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="LogisticaProgram"
                  component={FormularioProgramacao}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="LogisticaHist"
                  component={HistoricoOperacoes}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="ControladoriaScreen"
                  component={ControladoriaScreen}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="OperacaoScreen"
                  component={OperacaoScreen}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="OperacaoProgram"
                  component={ListaProgramacoes}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="RdoForm"
                  component={RdoForm}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="RdoHist"
                  component={HistoricoRdo}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="Contatos"
                  component={ContatosScreen}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="Reuniao"
                  component={ReuniaoComponent}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="ChecklistForm"
                  component={ChecklistFormScreen}
                  options={{headerShown: false}}
                />

                {/* QSMS */}
                <Stack.Screen
                  name="QSMSScreen"
                  component={QSMSScreen}
                  options={{headerShown: false}}
                />

                <Stack.Screen
                  name="DDSScreen"
                  component={DDSScreen}
                  options={{headerShown: false}}
                />

                <Stack.Screen
                  name="DDSFormScreen"
                  component={DDSFormScreen}
                  options={{headerShown: false}}
                />

                <Stack.Screen
                  name="ChecklistScreen"
                  component={ChecklistScreen}
                  options={{headerShown: false}}
                />

                <Stack.Screen
                  name="ContaminadosScreen"
                  component={ContaminadosScreen}
                  options={{headerShown: false}}
                />

                <Stack.Screen
                  name="ToxicologicoScreen"
                  component={ToxicologicoScreen}
                  options={{headerShown: false}}
                />

                <Stack.Screen
                  name="ToxicologicoFormScreen"
                  component={ToxicologicoFormScreen}
                  options={{headerShown: false}}
                />

                <Stack.Screen
                  name="ControleDocumentosScreen"
                  component={ControleDocumentosScreen}
                  options={{headerShown: false}}
                />

                <Stack.Screen
                  name="ControleDocumentosFormScreen"
                  component={ControleDocumentosFormScreen}
                  options={{headerShown: false}}
                />

                <Stack.Screen
                  name="DevGuide"
                  component={DevGuideScreen}
                  options={{headerShown: false}}
                />

                {/* <Stack.Screen
                  name="AuditoriasScreen"
                  component={AuditoriasScreen}
                  options={{headerShown: false}}
                />

                <Stack.Screen
                  name="ExtintoresScreen"
                  component={ExtintoresScreen}
                  options={{headerShown: false}}
                /> */}
              </Stack.Navigator>
              <Toast config={toastConfig} position="top" />
              <FlashMessage position="top" />
            </NetworkProvider>
          </NavigationContainer>
        </ChecklistSyncProvider>
      </BackgroundSyncProvider>
    </UserProvider>
  );
}
