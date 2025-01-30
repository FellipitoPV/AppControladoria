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
import { checkInternetConnection, showGlobalToast } from '../helpers/GlobalApi';
import { useUser } from '../contexts/userContext';
import { User } from '../helpers/Types';
import { customTheme } from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';


const inputTheme = {
    colors: {
        onSurface: "black",
        onSurfaceVariant: customTheme.colors.primary,
        primary: customTheme.colors.primary,
    }
};

export default function LoginScreen({ navigation }: any) {
    const { updateUserInfo, userInfo } = useUser();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isResetModalVisible, setIsResetModalVisible] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const [isCheckingCredentials, setIsCheckingCredentials] = useState(true);

    useEffect(() => {
        checkSavedCredentials();

        console.log(userInfo)
    }, []);

    const loadOfflineUser = async () => {
        try {
            const storedUserInfo = await AsyncStorage.getItem('@UserInfo');
            const userEmail = await AsyncStorage.getItem('userEmail');
            const userPass = await AsyncStorage.getItem('userPass');

            if (storedUserInfo && userEmail && userPass) {
                return {
                    credentials: {
                        email: userEmail.replace(/"/g, ""),
                        password: userPass.replace(/"/g, "")
                    },
                    userData: JSON.parse(storedUserInfo)
                };
            }
            return null;
        } catch (error) {
            console.error('Erro ao carregar dados offline:', error);
            return null;
        }
    };

    const checkSavedCredentials = async () => {
        try {
            setIsCheckingCredentials(true);
            const hasInternet = await checkInternetConnection();
            const offlineData = await loadOfflineUser();

            if (offlineData?.credentials?.email && offlineData?.credentials?.password) {
                if (hasInternet) {
                    try {
                        await auth().signInWithEmailAndPassword(
                            offlineData.credentials.email,
                            offlineData.credentials.password
                        );
                        await AsyncStorage.setItem('userEmail', offlineData.credentials.email);
                        await updateUserInfo();
                    } catch (error) {
                        showGlobalToast(
                            'info',
                            `Logado como ${userInfo?.user}!`,
                            '',
                            4000
                        );
                    }
                } else {
                    showGlobalToast(
                        'info',
                        'Modo Offline',
                        '',
                        4000
                    );
                }
                navigation.navigate('Home');
                return true;
            }

            return false;
        } catch (error) {
            console.error('Erro ao verificar credenciais:', error);
            return false;
        } finally {
            setIsCheckingCredentials(false);
        }
    };

    const loginUser = async () => {
        if (!email.trim() || !password.trim()) {
            showGlobalToast(
                'info',
                'Campos obrigatórios',
                'Preencha email e senha',
                4000
            );
            return;
        }

        setIsLoading(true);

        try {
            const hasInternet = await checkInternetConnection();

            if (!hasInternet) {
                const offlineData = await loadOfflineUser();

                if (offlineData &&
                    offlineData.credentials.email === email.toLowerCase() &&
                    offlineData.credentials.password === password) {
                    showGlobalToast(
                        'info',
                        'Modo Offline',
                        'Usando dados salvos localmente',
                        4000
                    );
                    navigation.navigate('Home');
                } else {
                    showGlobalToast(
                        'error',
                        'Sem conexão',
                        'Necessário internet para o primeiro login',
                        4000
                    );
                }
                setIsLoading(false);
                return;
            }

            await auth().signInWithEmailAndPassword(email.toLowerCase(), password);
            await AsyncStorage.setItem('userEmail', email.toLowerCase());

            try {
                await updateUserInfo();

                if (userInfo) {
                    await saveUserCredentials(email, password, userInfo);
                }

                navigation.navigate('Home');
            } catch (userError: any) {
                console.error('Erro na atualização de usuário:', userError);
                await AsyncStorage.removeItem('userEmail');
                throw new Error('Erro ao carregar informações do usuário. Tente novamente.');
            }

        } catch (error: any) {
            let message = 'Erro ao fazer login. Tente novamente.';

            if (error.code === 'auth/user-not-found') {
                message = 'Usuário não encontrado';
            } else if (error.code === 'auth/wrong-password') {
                message = 'Senha incorreta';
            } else if (error.message) {
                message = error.message;
            }

            showGlobalToast('error', 'Erro no login', message, 4000);
        } finally {
            setIsLoading(false);
        }
    };

    const saveUserCredentials = async (email: string, password: string, userData: User) => {
        try {
            await Promise.all([
                AsyncStorage.setItem('userEmail', email.toLowerCase()),
                AsyncStorage.setItem('userPass', password),
                AsyncStorage.setItem('@UserInfo', JSON.stringify(userData)),
                AsyncStorage.setItem('@firstLoginDone', 'true')
            ]);
        } catch (error) {
            console.error('Erro ao salvar credenciais:', error);
            throw error;
        }
    };

    const handleResetPassword = async () => {
        if (!resetEmail.trim()) {
            showGlobalToast(
                'info',
                'Email necessário',
                'Digite seu email para recuperar a senha',
                4000
            );
            return;
        }

        setIsResetting(true);
        try {
            await auth().sendPasswordResetEmail(resetEmail.trim());
            showGlobalToast(
                'success',
                'Email enviado',
                'Verifique sua caixa de entrada',
                4000
            );
            setIsResetModalVisible(false);
            setResetEmail('');
        } catch (error) {
            showGlobalToast(
                'error',
                'Não foi possível enviar o email de recuperação',
                '',
                4000
            );
        } finally {
            setIsResetting(false);
        }
    };

    const loginAsGuest = async () => {
        try {
            // Define informações básicas do usuário convidado
            const guestUser: User = {
                id: 'guest',
                email: 'guest@guest.com',
                user: 'Convidado',
                cargo: 'Convidado',
            };

            // Salva as informações do usuário convidado
            await AsyncStorage.setItem('@UserInfo', JSON.stringify(guestUser));
            await AsyncStorage.setItem('userEmail', 'guest@guest.com');

            // Navega para Home
            navigation.navigate('Home');
        } catch (error) {
            console.error('Erro ao entrar como convidado:', error);
            showGlobalToast(
                'error',
                'Erro',
                'Não foi possível entrar como convidado',
                4000
            );
        }
    };

    if (isCheckingCredentials) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Verificando credenciais...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={styles.headerContainer}>
                    <Image
                        source={require('../assets/image/logo.png')}
                        style={styles.logo}  // Adicionamos um estilo específico para a imagem
                    />

                    <Text variant="bodyLarge" style={styles.subtitle}>
                        Faça login para acessar o sistema 
                    </Text>
                </View>

                <View style={styles.formContainer}>
                    <TextInput
                        mode="outlined"
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        left={<TextInput.Icon
                            icon={() => <Icon name="email" size={24} color={customTheme.colors.primary} />}
                        />}
                        style={styles.input}
                        theme={inputTheme}
                    />

                    <TextInput
                        mode="outlined"
                        label="Senha"
                        value={password}
                        theme={inputTheme}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        left={<TextInput.Icon
                            icon={() => <Icon name="lock" size={24} color={customTheme.colors.primary} />}
                        />}
                        right={<TextInput.Icon
                            icon={() => (
                                <Icon
                                    name={showPassword ? "visibility-off" : "visibility"}
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                            )}
                            onPress={() => setShowPassword(!showPassword)}
                        />}
                        style={styles.input}
                    />

                    <Button
                        mode="contained"
                        onPress={loginUser}
                        loading={isLoading}
                        disabled={isLoading}
                        style={styles.loginButton}
                        icon="login"
                    >
                        <Text style={{ color: customTheme.colors.onPrimary }}>
                            {isLoading ? 'Entrando...' : 'Entrar'}
                        </Text>
                    </Button>

                    {/* Botão para entrar em uma conta */}
                    {/* <Button
                        mode="outlined"
                        onPress={loginAsGuest}
                        style={styles.guestButton}
                    >
                        <Text style={{ color: customTheme.colors.primary }}>
                            Entrar como Convidado
                        </Text>
                    </Button> */}
                </View>

                <TouchableOpacity
                    onPress={() => setIsResetModalVisible(true)}
                    style={styles.forgotPasswordButton}
                >
                    <Text style={styles.forgotPasswordText}>
                        Esqueci minha senha
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>

            <Modal
                visible={isResetModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsResetModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Recuperar Senha
                        </Text>

                        <Text style={styles.modalDescription}>
                            Digite seu email para receber as instruções de recuperação de senha
                        </Text>

                        <TextInput
                            mode="outlined"
                            label="Email"
                            value={resetEmail}
                            onChangeText={setResetEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            style={[styles.input, styles.modalInput]}
                            theme={inputTheme}
                        />

                        <View style={styles.modalButtons}>
                            <Button
                                mode="outlined"
                                onPress={() => setIsResetModalVisible(false)}
                                style={styles.modalButton}
                            >
                                Cancelar
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleResetPassword}
                                loading={isResetting}
                                disabled={isResetting}
                                style={styles.modalButton}
                            >
                                Enviar
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    guestButton: {
        marginTop: 8,
        borderRadius: 8,
        paddingVertical: 8,
        borderColor: customTheme.colors.primary,
    },
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logo: {
        width: '80%',           // A imagem ocupará 80% da largura do container
        height: undefined,      // Altura indefinida para manter proporção
        aspectRatio: 3 / 1,      // Ajuste essa proporção de acordo com sua imagem
        resizeMode: 'contain', // Mantém a proporção e garante que a imagem inteira seja visível
        margin: 20,
    },

    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    subtitle: {
        color: '#666',
        marginBottom: 8,
        fontWeight: "bold",
    },
    formContainer: {
        gap: 16,
    },
    input: {
        backgroundColor: customTheme.colors.surface,
    },
    createAccountButton: {
        marginTop: 8,
        borderRadius: 8,
    },
    loginButton: {
        marginTop: 8,
        borderRadius: 8,
        paddingVertical: 8,
        backgroundColor: customTheme.colors.primary,
        color: customTheme.colors.onPrimary,
    },
    forgotPasswordButton: {
        alignItems: 'center',
        marginTop: 24,
    },
    forgotPasswordText: {
        color: '#666',
        textDecorationLine: 'underline',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
    },
    modalTitle: {
        textAlign: 'center',
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
        color: customTheme.colors.primary,
    },
    modalDescription: {
        textAlign: 'center',
        marginBottom: 24,
        color: '#666',
    },
    modalInput: {
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButton: {
        minWidth: 100,
    },
});