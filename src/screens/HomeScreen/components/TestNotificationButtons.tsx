import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../theme/theme';
import { createRepeatingNotification, removeRepeatingNotification } from '../../../helpers/notificationChannel';

const TestNotificationButtons = () => {
    const [isRepeatingNotificationRunning, setIsRepeatingNotificationRunning] = useState(false);

    const handleCreateRepeatingNotification = () => {
        createRepeatingNotification();
        setIsRepeatingNotificationRunning(true);
    };

    const handleRemoveRepeatingNotification = () => {
        removeRepeatingNotification();
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
                style={[styles.button, styles.removeButton]}
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