import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import FormularioMedicaoCompostagem from './src/screens/Formularios/ocorrencia/FormularioOcorrencia';
import FlashMessage from "react-native-flash-message";
import CompostagemList from './src/screens/Formularios/ocorrencia/RelatoriosLista';
import LoginScreen from './src/screens/Login/LoginScreen';
import Toast, { ToastConfig } from 'react-native-toast-message';
import { StyleSheet, Text, View } from 'react-native';
import { UserProvider } from './src/contexts/userContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import FormularioOcorrencia from './src/screens/Formularios/ocorrencia/FormularioOcorrencia';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RelatorioOcorrenciaList from './src/screens/Formularios/ocorrencia/RelatoriosLista';
import WelcomeScreen from './src/screens/Login/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen/HomeScreen';
import { BackgroundSyncProvider } from './src/contexts/backgroundSyncContext';
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

const Stack = createStackNavigator();

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
      iconName: 'check-circle',  // Mantém o mesmo nome
    },
    error: {
      bgColor: 'rgba(220, 38, 38, 0.95)',
      iconName: 'error',  // Mudou de alert-circle para error
    },
    info: {
      bgColor: 'rgba(59, 130, 246, 0.95)',
      iconName: 'info',  // Mudou de information para info
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
  return (
    <UserProvider>
      <BackgroundSyncProvider>
        <NavigationContainer>
          <NetworkProvider>
            <Stack.Navigator initialRouteName="Login">
              {/* LOGIN */}
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
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
  );
}