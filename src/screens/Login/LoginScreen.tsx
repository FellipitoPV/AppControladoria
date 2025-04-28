import {
    ActivityIndicator,
    BackHandler,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { Text, TextInput } from 'react-native-paper';

import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import SaveButton from '../../assets/components/SaveButton';
import { StackNavigationProp } from '@react-navigation/stack';
import WelcomeScreen from './WelcomeScreen';
import { auth } from '../../../firebase';
import { customTheme } from '../../theme/theme';
import { showGlobalToast } from '../../helpers/GlobalApi';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useUser } from '../../contexts/userContext';

const inputTheme = {
    colors: {
        onSurface: "black",
        onSurfaceVariant: customTheme.colors.primary,
        primary: customTheme.colors.primary,
    }
};

type RootStackParamList = {
    Login: {
        nextScreen?: string;
        nextScreenParams?: object;
    };
    Home: undefined;
    ForgotPass: undefined;
    Register: undefined;
};

type LoginScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'Login'>;
    route?: RouteProp<RootStackParamList, 'Login'>;
};

const LoginScreen: React.FC<LoginScreenProps> = ({
    navigation,
    route
}) => {
    const { updateUserInfo } = useUser();
    const [email, setEmail] = useState('');
    const [welcomeIsOpen, setWelcomeIsOpen] = useState<boolean>(true);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useFocusEffect(
        React.useCallback(() => {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                if (!welcomeIsOpen) {
                    setWelcomeIsOpen(true);
                    return true; // Previne o comportamento padrão
                }
                return false; // Permite o comportamento padrão
            });

            return () => backHandler.remove();
        }, [welcomeIsOpen])
    );

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            if (!welcomeIsOpen && e.data.action.type !== 'REPLACE') {
                e.preventDefault();
                setWelcomeIsOpen(true);
            }
        });

        return unsubscribe;
    }, [navigation, welcomeIsOpen]);

    const handleLogin = async (
        loginEmail: string,
        loginPassword: string,
        isAutoLogin = false,
        nextScreen?: string,
        nextScreenParams?: object
    ) => {
        setIsLoading(true);

        try {
            // Valida o email
            if (!loginEmail || typeof loginEmail !== 'string' || loginEmail.trim() === '') {
                console.error('Email inválido:', loginEmail);
                throw new Error('Por favor, forneça um email válido');
            }

            // Valida a senha
            if (!loginPassword || typeof loginPassword !== 'string' || loginPassword.trim() === '') {
                console.error('Senha inválida:', loginPassword);
                throw new Error('Por favor, forneça uma senha válida');
            }

            console.log('Tentando login com:', { email: loginEmail.toLowerCase(), password: loginPassword });

            // Autenticação no Firebase
            const userCredential = await signInWithEmailAndPassword(
                auth(),
                loginEmail.toLowerCase(),
                loginPassword
            );
            console.log('Usuário autenticado:', userCredential.user.uid);

            // Salva as credenciais apenas se não for login automático
            if (!isAutoLogin) {
                await AsyncStorage.setItem('userEmail', loginEmail);
                await AsyncStorage.setItem('userPassword', loginPassword);
                console.log('Credenciais salvas no AsyncStorage:', { email: loginEmail.toLowerCase(), password: loginPassword });
            }

            // Atualiza as informações do usuário
            await updateUserInfo();
            console.log('updateUserInfo chamado com sucesso');

            // Verifica se userInfo foi salvo no AsyncStorage
            const savedUserInfo = await AsyncStorage.getItem('@UserInfo');
            if (!savedUserInfo) {
                console.warn('Nenhuma informação de usuário salva em @UserInfo');
                throw new Error('Falha ao carregar informações do usuário');
            }
            console.log('userInfo salvo:', savedUserInfo);

            // Navega para a próxima tela
            setWelcomeIsOpen(false);
            setTimeout(() => {
                if (nextScreen) {
                    navigation.replace(nextScreen as keyof RootStackParamList, nextScreenParams);
                } else {
                    navigation.replace('Home');
                }
            }, 100);

            if (!isAutoLogin) {
                showGlobalToast('success', 'Login realizado com sucesso!', '', 2000);
            }
        } catch (error: any) {
            console.error('Erro no login:', error);
            if (!isAutoLogin) {
                let errorMessage = 'Erro ao fazer login';
                if (error.code === 'auth/user-not-found') {
                    errorMessage = 'Usuário não encontrado';
                } else if (error.code === 'auth/wrong-password') {
                    errorMessage = 'Senha incorreta';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Email inválido';
                } else if (error.message === 'Falha ao carregar informações do usuário') {
                    errorMessage = 'Não foi possível carregar suas informações';
                } else if (error.message === 'Por favor, forneça um email válido') {
                    errorMessage = 'Por favor, forneça um email válido';
                } else if (error.message === 'Por favor, forneça uma senha válida') {
                    errorMessage = 'Por favor, forneça uma senha válida';
                }
                showGlobalToast('error', 'Erro no login', errorMessage, 4000);
            }
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const checkAuthentication = async () => {
        try {
            const savedEmail = await AsyncStorage.getItem('userEmail');
            const savedPassword = await AsyncStorage.getItem('userPassword');
            console.log('Credenciais encontradas no AsyncStorage:', { savedEmail, savedPassword });

            // Limpa credenciais inválidas
            if (savedEmail === null || savedPassword === null) {
                console.log('Credenciais inválidas encontradas, limpando AsyncStorage');
                await AsyncStorage.removeItem('userEmail');
                await AsyncStorage.removeItem('userPassword');
            } else if (savedEmail && savedPassword) {
                console.log('Tentando login automático');
                await handleLogin(savedEmail, savedPassword, true, route?.params?.nextScreen, route?.params?.nextScreenParams);
            } else {
                console.log('Nenhuma credencial salva encontrada');
            }
        } catch (error) {
            console.error('Erro na verificação de autenticação:', error);
        } finally {
            setIsCheckingAuth(false);
        }
    };

    useEffect(() => {
        checkAuthentication();
    }, []);

    // Log para verificar o estado do email no momento do login manual
    const handleManualLogin = () => {
        console.log('Estado atual do formulário:', { email, password });
        handleLogin(email, password);
    };

    if (isCheckingAuth) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={customTheme.colors.primary} />
            </View>
        );
    }

    if (welcomeIsOpen) {
        return <WelcomeScreen
            onClose={() => setWelcomeIsOpen(false)}
            navigation={navigation}
        />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => setWelcomeIsOpen(true)}
                        style={styles.backButton}
                    >
                        <MaterialIcon
                            name="arrow-back-ios"
                            size={24}
                            color="#333"
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.welcomeContainer}>
                    <Text variant="headlineMedium" style={styles.welcomeText}>
                        Bem-vindo de volta!
                    </Text>
                    <Text variant="bodyLarge" style={styles.welcomeSubtext}>
                        Que bom ver você novamente.
                    </Text>
                </View>

                <View style={styles.formContainer}>
                    <TextInput
                        mode="flat"
                        label="Email"
                        value={email}
                        onChangeText={(text) => {
                            console.log('Email input alterado:', text);
                            setEmail(text);
                        }}
                        style={styles.input}
                        theme={inputTheme}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <TextInput
                        mode="flat"
                        label="Senha"
                        value={password}
                        onChangeText={(text) => {
                            console.log('Senha input alterado:', text);
                            setPassword(text);
                        }}
                        secureTextEntry={!showPassword}
                        right={
                            <TextInput.Icon
                                icon={showPassword ? "eye-off" : "eye"}
                                onPress={() => setShowPassword(!showPassword)}
                            />
                        }
                        style={styles.input}
                        theme={inputTheme}
                    />

                    <TouchableOpacity
                        onPress={() => navigation.navigate('ForgotPass')}
                        style={styles.forgotPasswordContainer}
                    >
                        <Text style={styles.forgotPasswordText}>
                            Esqueceu a senha?
                        </Text>
                    </TouchableOpacity>

                    <SaveButton
                        onPress={handleManualLogin}
                        text="Login"
                        iconName="login"
                        loading={isLoading}
                        disabled={!email || !password}
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Não tem uma conta?{' '}
                        <Text
                            style={styles.registerLink}
                            onPress={() => navigation.navigate('Register')}
                        >
                            Registre-se agora
                        </Text>
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    header: {
        paddingTop: 16,
        paddingBottom: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    welcomeContainer: {
        marginBottom: 40,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
    },
    welcomeSubtext: {
        color: '#666',
        fontSize: 16,
    },
    formContainer: {
        gap: 20,
    },
    input: {
        backgroundColor: 'transparent',
        fontSize: 16,
    },
    forgotPasswordContainer: {
        alignSelf: 'flex-end',
        marginTop: -10,
    },
    forgotPasswordText: {
        color: customTheme.colors.primary,
        fontSize: 14,
    },
    footer: {
        position: 'absolute',
        bottom: 32,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 15,
        color: '#666',
    },
    registerLink: {
        color: customTheme.colors.primary,
        fontWeight: '600',
    },
});

export default LoginScreen;