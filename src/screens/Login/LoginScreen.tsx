import React, { useState, useEffect } from 'react';
import {
    View,
    Image,
    StyleSheet,
    Modal,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import { TextInput, Text, Button } from 'react-native-paper';
import auth from '@react-native-firebase/auth';
import { firebase } from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkInternetConnection, showGlobalToast } from '../../helpers/GlobalApi';
import { useUser } from '../../contexts/userContext';
import { User } from '../../helpers/Types';
import { customTheme } from '../../theme/theme';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import WelcomeScreen from './WelcomeScreen';


const inputTheme = {
    colors: {
        onSurface: "black",
        onSurfaceVariant: customTheme.colors.primary,
        primary: customTheme.colors.primary,
    }
};

export default function LoginScreen({ navigation }: any) {
    const { updateUserInfo } = useUser();
    const [email, setEmail] = useState('');
    const [welcomeIsOpen, setWelcomeIsOpen] = useState<boolean>(true);

    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Verificar autenticação ao iniciar
    useEffect(() => {
        checkAuthentication();
    }, []);

    const checkAuthentication = async () => {
        try {
            const savedEmail = await AsyncStorage.getItem('userEmail');
            const savedPassword = await AsyncStorage.getItem('userPassword');

            if (savedEmail && savedPassword) {
                await handleLogin(savedEmail, savedPassword, true);
            }
        } catch (error) {
            console.error('Erro na verificação de autenticação:', error);
        } finally {
            setIsCheckingAuth(false);
        }
    };

    const handleLogin = async (loginEmail: string, loginPassword: string, isAutoLogin = false) => {
        setIsLoading(true);
        try {
            // Autenticação no Firebase
            const userCredential = await auth().signInWithEmailAndPassword(
                loginEmail.toLowerCase(),
                loginPassword
            );

            // Primeiro salva as credenciais
            await AsyncStorage.setItem('userEmail', loginEmail.toLowerCase());
            await AsyncStorage.setItem('userPassword', loginPassword);

            // Depois atualiza as informações do usuário
            await updateUserInfo();

            // Salvar credenciais para auto-login
            await AsyncStorage.setItem('userEmail', loginEmail.toLowerCase());
            await AsyncStorage.setItem('userPassword', loginPassword);

            // Navegar para Home
            navigation.replace('Home');

            if (!isAutoLogin) {
                showGlobalToast(
                    'success',
                    'Login realizado com sucesso!',
                    '',
                    2000
                );
            }
        } catch (error: any) {
            if (!isAutoLogin) {
                let errorMessage = 'Erro ao fazer login';

                if (error.code === 'auth/user-not-found') {
                    errorMessage = 'Usuário não encontrado';
                } else if (error.code === 'auth/wrong-password') {
                    errorMessage = 'Senha incorreta';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Email inválido';
                }

                showGlobalToast(
                    'error',
                    'Erro no login',
                    errorMessage,
                    4000
                );
            }
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    if (isCheckingAuth) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={customTheme.colors.primary} />
            </View>
        );
    }

    if (welcomeIsOpen) {
        return <WelcomeScreen onClose={() => setWelcomeIsOpen(false)} />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                {/* Header com botão voltar */}
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

                {/* Área de boas-vindas */}
                <View style={styles.welcomeContainer}>
                    <Text variant="headlineMedium" style={styles.welcomeText}>
                        Bem-vindo de volta!
                    </Text>
                    <Text variant="bodyLarge" style={styles.welcomeSubtext}>
                        Que bom ver você novamente.
                    </Text>
                </View>

                {/* Formulário */}
                <View style={styles.formContainer}>
                    <TextInput
                        mode="flat"
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        theme={inputTheme}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <TextInput
                        mode="flat"
                        label="Senha"
                        value={password}
                        onChangeText={setPassword}
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
                        onPress={() => navigation.navigate('ForgotPassword')}
                        style={styles.forgotPasswordContainer}
                    >
                        <Text style={styles.forgotPasswordText}>
                            Esqueceu a senha?
                        </Text>
                    </TouchableOpacity>

                    <Button
                        mode="contained"
                        onPress={() => handleLogin(email, password)}
                        loading={isLoading}
                        disabled={isLoading}
                        style={styles.loginButton}
                    >
                        {isLoading ? 'Entrando...' : 'Login'}
                    </Button>
                </View>

                {/* Footer */}
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
}

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
    loginButton: {
        marginTop: 24,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: customTheme.colors.primary,
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
