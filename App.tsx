import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import FormularioMedicaoCompostagem from './src/screens/Pessagem/FormularioOcorrencia';
import FlashMessage from "react-native-flash-message";
import CompostagemList from './src/screens/Pessagem/CompostagemList';
import LoginScreen from './src/screens/LoginScreen';
import Toast, { ToastConfig } from 'react-native-toast-message';
import { StyleSheet, Text, View } from 'react-native';
import { UserProvider } from './src/contexts/userContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import CompostagemRotinaList from './src/screens/Pessagem/CompostagemRotinaList';
import FormularioOcorrencia from './src/screens/Pessagem/FormularioOcorrencia';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
    <NetworkProvider>
      <UserProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login">
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="NewP" component={FormularioOcorrencia} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="List" component={CompostagemList} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="RList" component={CompostagemRotinaList} options={{ headerShown: false, gestureEnabled: false }} />
          </Stack.Navigator>
        </NavigationContainer>
        <Toast config={toastConfig} position='top' />
        <FlashMessage position="top" />
      </UserProvider>
    </NetworkProvider>
  );
}