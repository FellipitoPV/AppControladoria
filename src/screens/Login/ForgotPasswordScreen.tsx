import {
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import React, { useState } from 'react';
import { Text, TextInput } from 'react-native-paper';

import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { auth } from '../../../firebase';
import { customTheme } from '../../theme/theme';
import { sendPasswordResetEmail } from 'firebase/auth';
import { showGlobalToast } from '../../helpers/GlobalApi';

const inputTheme = {
    colors: {
        onSurface: "black",
        onSurfaceVariant: customTheme.colors.primary,
        primary: customTheme.colors.primary,
    }
};

export default function ForgotPasswordScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleResetPassword = async () => {
        // Validate email
        if (!email.trim()) {
            showGlobalToast(
                'error',
                'Email Inválido',
                'Por favor, insira um endereço de email',
                5000
            );
            return;
        }
    
        setIsLoading(true);
    
        try {
            // Send password reset email using Firebase
            await sendPasswordResetEmail(auth(), email.toLowerCase());
    
            // Show success message
            showGlobalToast(
                'success',
                'Email Enviado',
                'Verifique sua caixa de entrada para redefinir sua senha',
                5000
            );
    
            // Navigate back to login screen
            navigation.goBack();
        } catch (error: any) {
            // Handle specific Firebase Auth errors
            let errorMessage = 'Erro ao enviar email de redefinição';
    
            if (error.code === 'auth/invalid-email') {
                errorMessage = 'Endereço de email inválido';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'Nenhum usuário encontrado com este email';
            }
    
            showGlobalToast(
                'error',
                'Erro',
                errorMessage,
                5000
            );
        } finally {
            setIsLoading(false);
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

                {/* Área de recuperação de senha */}
                <View style={styles.welcomeContainer}>
                    <Text variant="headlineMedium" style={styles.welcomeText}>
                        Recuperar Senha
                    </Text>
                    <Text variant="bodyLarge" style={styles.welcomeSubtext}>
                        Insira seu email para redefinir sua senha
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

                    <TouchableOpacity
                        style={styles.resetButton}
                        onPress={handleResetPassword}
                        disabled={isLoading}
                    >
                        <Text style={styles.resetText}>
                            {isLoading ? 'Enviando...' : 'Redefinir Senha'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const { width } = Dimensions.get('window');

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
    resetButton: {
        paddingVertical: 20,
        borderRadius: 12,
        backgroundColor: customTheme.colors.primary,
    },
    resetText: {
        textAlign: 'center',
        color: customTheme.colors.onPrimary,
    },
});