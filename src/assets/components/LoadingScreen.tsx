import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import React from 'react';
import { customTheme } from '../../theme/theme'; // Importe o tema existente para consistência

const LoadingScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={customTheme.colors.primary} />
            <Text style={styles.loadingText}>Verificando autenticação...</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '500',
        color: '#333',
        textAlign: 'center',
    },
});

export default LoadingScreen;