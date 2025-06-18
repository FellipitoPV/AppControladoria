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
import { auth, db } from '../../../firebase';
import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import SaveButton from '../../assets/components/SaveButton';
import { createUserWithEmailAndPassword } from 'firebase/auth';
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
            // Verificar se já existe um usuário com este email
            const userSnapshot = await getDocs(
                query(
                    collection(db(), 'users'),
                    where('email', '==', email.toLowerCase())
                )
            );
    
            if (!userSnapshot.empty) {
                showGlobalToast(
                    'info',
                    'Atenção',
                    'Este email já está registrado no sistema',
                    3000
                );
                return;
            }
    
            // Criar usuário no Authentication
            const userCredential = await createUserWithEmailAndPassword(
                auth(),
                email.toLowerCase(),
                senha
            );
    
            // Normalizar nome para ID
            const normalizeNameForId = (name: string) => {
                return name
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^_|_$/g, '');
            };
    
            // Formatar o nome com primeiras letras maiúsculas
            const formattedName = formatName(nome);
            const customUserId = normalizeNameForId(formattedName);
    
            // Criar documento do usuário
            await setDoc(doc(db(), 'users', customUserId), {
                user: formattedName,
                email: email.toLowerCase(),
                cargo: area === 'Administrativo' ? 'Administrativo' : 'Operacional',
                area: area,
                createdAt: serverTimestamp(),
                authUid: userCredential.user.uid,
                acesso: area === 'Operacional' ? [
                    {
                        moduleId: 'operacao',
                        level: 1
                    }
                ] : []
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
            let errorMessage = 'Erro ao criar conta';
    
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Este email já está em uso';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Email inválido';
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = 'Operação não permitida';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Senha muito fraca';
            }
    
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