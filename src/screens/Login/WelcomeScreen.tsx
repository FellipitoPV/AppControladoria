import React from 'react';
import {
    View,
    Image,
    StyleSheet,
    SafeAreaView,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { customTheme } from '../../theme/theme';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
    onClose: () => void;
    navigation: any; // Idealmente você deveria usar o tipo correto do react-navigation
}

export default function WelcomeScreen({ onClose, navigation }: WelcomeScreenProps) {

    return (
        <SafeAreaView style={styles.container}>
            {/* Área da Imagem */}
            <View style={styles.imageContainer}>
                <Image
                    source={require('../../assets/image/welcome.jpg')}
                    style={styles.image}
                    resizeMode="cover"
                />
            </View>

            {/* Área dos Botões */}
            <View style={styles.buttonContainer}>
                <Text variant="headlineMedium" style={styles.welcomeText}>
                    Bem-vindo ao Sistema Integrado de Gestão da Ecologika
                </Text>

                <TouchableOpacity
                    style={styles.loginButton}
                    onPress={() => onClose()}
                >
                    <Text style={styles.loginText}>
                        Login
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.registerButton}
                    onPress={() => navigation.navigate('Register')}
                >
                    <Text style={styles.registerText}>
                        Registrar
                    </Text>
                </TouchableOpacity>

            </View>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    imageContainer: {
        height: height * 0.5, // 50% da altura da tela
        width: width,
        backgroundColor: '#f5f5f5', // cor de fallback enquanto a imagem carrega
    },
    image: {
        width: '100%',
        height: '100%',
    },
    buttonContainer: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
        justifyContent: 'flex-start',
        gap: 16,
    },
    welcomeText: {
        textAlign: 'center',
        marginBottom: 32,
        fontWeight: '600',
        color: customTheme.colors.primary,
    },
    loginButton: {
        paddingVertical: 20,
        borderRadius: 12,
        backgroundColor: customTheme.colors.primary,
    },
    loginText: {
        textAlign: 'center',
        color: customTheme.colors.onPrimary,
    },
    registerButton: {
        paddingVertical: 20,
        borderRadius: 12,
        backgroundColor: customTheme.colors.surface,
        borderWidth: 1
    },
    registerText: {
        textAlign: 'center',
        color: customTheme.colors.onSurface,
    },
    guestButton: {
        marginTop: 8,
    },
    guestText: {
        textAlign: 'center',
        color: customTheme.colors.primary,
    },
});