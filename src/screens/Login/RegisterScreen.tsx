import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import React, { useState } from 'react';
import { Text, TextInput } from 'react-native-paper';

import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import SaveButton from '../../assets/components/SaveButton';
import { ecoApi, ecoAuth } from '../../api/ecoApi';
import { customTheme } from '../../theme/theme';
import { showGlobalToast } from '../../helpers/GlobalApi';

const inputTheme = {
    colors: {
        onSurface: "black",
        onSurfaceVariant: customTheme.colors.primary,
        primary: customTheme.colors.primary,
    }
};

export default function RegisterScreen({ navigation }: any) {
    const [loading, setLoading] = useState(false);
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [area, setArea] = useState<'Operacional' | 'Administrativo' | ''>('');
    const [showPassword, setShowPassword] = useState(false);
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const formatName = (name: string) => {
        return name
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const handleRegister = async () => {
        // Validações
        if (!nome || !email || !senha || !confirmarSenha || !area) {
            showGlobalToast(
                'info',
                'Atenção',
                'Preencha todos os campos obrigatórios',
                3000
            );
            return;
        }
    
        if (senha !== confirmarSenha) {
            showGlobalToast(
                'error',
                'Erro',
                'As senhas não coincidem',
                3000
            );
            return;
        }
    
        if (senha.length < 6) {
            showGlobalToast(
                'info',
                'Atenção',
                'A senha deve ter pelo menos 6 caracteres',
                3000
            );
            return;
        }
    
        setLoading(true);

        try {
            const formattedName = formatName(nome);

            // 1. Criar conta de autenticação
            await ecoAuth.register(email.toLowerCase(), senha);

            // 2. Fazer login para obter o token
            const { token } = await ecoAuth.login(email.toLowerCase(), senha);
            await AsyncStorage.setItem('@authToken', token);
            await AsyncStorage.setItem('userEmail', email.toLowerCase());

            // 3. Criar documento do usuário
            await ecoApi.create('users', {
                user: formattedName,
                email: email.toLowerCase(),
                cargo: area === 'Administrativo' ? 'Administrativo' : 'Operacional',
                area: area,
                createdAt: new Date().toISOString(),
                acesso: area === 'Operacional' ? [
                    { moduleId: 'operacao', level: 1 }
                ] : [],
            });

            showGlobalToast(
                'success',
                'Sucesso',
                'Conta criada com sucesso!',
                3000
            );

            // Voltar para a tela de login
            navigation.goBack();

        } catch (error: any) {
            console.error('Erro ao registrar:', error);
            const errorMessage = error.message || 'Erro ao criar conta';
            showGlobalToast(
                'error',
                'Erro',
                errorMessage,
                3000
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                {/* Header com botão voltar */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
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
                        Criar nova conta
                    </Text>
                    <Text variant="bodyLarge" style={styles.welcomeSubtext}>
                        Informe seus dados para criar sua conta
                    </Text>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollView}
                >
                    {/* Formulário */}
                    <View style={styles.formContainer}>
                        <TextInput
                            mode="flat"
                            label="Nome Completo*"
                            value={nome}
                            onChangeText={setNome}
                            style={styles.input}
                            theme={inputTheme}
                        />

                        <TextInput
                            mode="flat"
                            label="Email*"
                            value={email}
                            onChangeText={setEmail}
                            style={styles.input}
                            theme={inputTheme}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <TextInput
                            mode="flat"
                            label="Senha*"
                            value={senha}
                            onChangeText={setSenha}
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

                        <TextInput
                            mode="flat"
                            label="Confirmar Senha*"
                            value={confirmarSenha}
                            onChangeText={setConfirmarSenha}
                            secureTextEntry={!showConfirmPassword}
                            right={
                                <TextInput.Icon
                                    icon={showConfirmPassword ? "eye-off" : "eye"}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                />
                            }
                            style={styles.input}
                            theme={inputTheme}
                        />

                        <Text style={styles.sectionTitle}>Área*</Text>
                        <View style={styles.areaContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.areaButton,
                                    area === 'Operacional' && styles.areaButtonSelected
                                ]}
                                onPress={() => setArea('Operacional')}
                            >
                                <MaterialIcon
                                    name="engineering"
                                    size={24}
                                    color={area === 'Operacional' ?
                                        customTheme.colors.onPrimary :
                                        customTheme.colors.primary
                                    }
                                />
                                <Text style={[
                                    styles.areaButtonText,
                                    area === 'Operacional' && styles.areaButtonTextSelected
                                ]}>
                                    Operacional
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.areaButton,
                                    area === 'Administrativo' && styles.areaButtonSelected
                                ]}
                                onPress={() => setArea('Administrativo')}
                            >
                                <MaterialIcon
                                    name="business"
                                    size={24}
                                    color={area === 'Administrativo' ?
                                        customTheme.colors.onPrimary :
                                        customTheme.colors.primary
                                    }
                                />
                                <Text style={[
                                    styles.areaButtonText,
                                    area === 'Administrativo' && styles.areaButtonTextSelected
                                ]}>
                                    Administrativo
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <SaveButton
                            onPress={handleRegister}
                            text="Criar Conta"
                            iconName="account-plus"
                            loading={loading}
                            disabled={loading}
                        />

                    </View>
                </ScrollView>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
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
        marginBottom: 32,
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
    scrollView: {
        flex: 1,
    },
    formContainer: {
        gap: 20,
        paddingBottom: 40,
    },
    input: {
        backgroundColor: 'transparent',
        fontSize: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    areaContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    areaButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: customTheme.colors.primary,
    },
    areaButtonSelected: {
        backgroundColor: customTheme.colors.primary,
    },
    areaButtonText: {
        fontSize: 16,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    areaButtonTextSelected: {
        color: customTheme.colors.onPrimary,
    },
});