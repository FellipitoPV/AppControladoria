// TestNotificationButtons.tsx

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { customTheme } from '../../../theme/theme';
import { 
  createRepeatingNotification, 
  removeRepeatingNotification, 
  createNotificationChannel,
  configureNotificationListeners,
  setNotificationNavigationHandler,
  setNotificationStateCallback
} from '../../../helpers/notificationChannel';

const NOTIFICATION_ID = 1001;

const TestNotificationButtons = () => {
    const [isRepeatingNotificationRunning, setIsRepeatingNotificationRunning] = useState(false);
    const navigation = useNavigation();

    // Configurar o canal e os listeners quando o componente for montado
    useEffect(() => {
        // Criar o canal de notificação
        createNotificationChannel();
        
        // Configurar os listeners de notificação
        configureNotificationListeners();
        
        // Configurar o handler de navegação
        setNotificationNavigationHandler((screenName, params) => {
            console.log(`🧭 Navigating to ${screenName}`, params);
            // @ts-ignore - ignorar erro de tipo já que não sabemos os parâmetros exatos
            navigation.navigate(screenName, params);
        });
        
        // Configurar o callback de estado da notificação
        setNotificationStateCallback((isRunning) => {
            setIsRepeatingNotificationRunning(isRunning);
        });
        
        return () => {
            // Cleanup (opcional)
            if (isRepeatingNotificationRunning) {
                removeRepeatingNotification(NOTIFICATION_ID);
            }
        };
    }, []);

    const handleCreateRepeatingNotification = () => {
        createRepeatingNotification({
            id: NOTIFICATION_ID,
            title: "Serviço em Execução",
            message: "Toque para abrir o aplicativo",
            interval: 5000, // 5 segundos
            smallIconName: 'ic_notification',
            screen: 'OperacaoScreen', // Nome da tela para navegar
            params: { id: 123, source: 'notification' } // Parâmetros opcionais para a tela
        });
        setIsRepeatingNotificationRunning(true);
    };

    const handleRemoveRepeatingNotification = () => {
        removeRepeatingNotification(NOTIFICATION_ID);
        setIsRepeatingNotificationRunning(false);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[
                    styles.button,
                    styles.createButton,
                    isRepeatingNotificationRunning && styles.disabledButton
                ]}
                onPress={handleCreateRepeatingNotification}
                disabled={isRepeatingNotificationRunning}
            >
                <Icon name="bell-plus" size={20} color="#FFF" />
                <Text style={styles.buttonText}>
                    {isRepeatingNotificationRunning ? 'Notificação Ativa' : 'Criar Notificação Repetida'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.button, 
                    styles.removeButton,
                    !isRepeatingNotificationRunning && styles.disabledButton
                ]}
                onPress={handleRemoveRepeatingNotification}
                disabled={!isRepeatingNotificationRunning}
            >
                <Icon name="bell-off" size={20} color="#FFF" />
                <Text style={styles.buttonText}>Remover Notificação</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    // Seus estilos permanecem os mesmos
    container: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 8,
    },
    createButton: {
        backgroundColor: customTheme.colors.primary,
    },
    removeButton: {
        backgroundColor: customTheme.colors.error,
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
});

export default TestNotificationButtons;