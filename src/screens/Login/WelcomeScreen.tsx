import React from 'react';
import {
    View,
    Image,
    StyleSheet,
    SafeAreaView,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import { Text } from 'react-native-paper';
import { customTheme } from '../../theme/theme';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
    onClose: () => void;
    navigation: any;
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
                <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgb(255, 255, 255)']}
                    style={styles.gradient}
                    pointerEvents="none"
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
    imageContainer: {
        height: height * 0.5,
        width: width,
        backgroundColor: 'rgba(255, 255, 255, 0)',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 175,
    },
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
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