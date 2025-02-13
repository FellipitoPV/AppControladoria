import React from 'react';
import {
    View,
    Image,
    StyleSheet,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { customTheme } from '../../theme/theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ onClose }: { onClose: () => void }) {

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
                    Bem-vindo ao Sistema Integrado de Gestão Corporativa
                </Text>

                <Button
                    mode="contained"
                    style={styles.loginButton}
                    onPress={() => onClose()}
                >
                    Login
                </Button>

                <Button
                    mode="outlined"
                    style={styles.registerButton}
                    textColor={customTheme.colors.primary}
                    onPress={() => console.log('Register')}
                >
                    Registrar
                </Button>

                <Button
                    mode="text"
                    style={styles.guestButton}
                    textColor={customTheme.colors.primary}
                    onPress={() => console.log('GuestLogin')}
                >
                    Continuar como convidado
                </Button>
            </View>
        </SafeAreaView>
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
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: customTheme.colors.primary,
    },
    registerButton: {
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: customTheme.colors.primary,
    },
    guestButton: {
        marginTop: 8,
    },
});