import React from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
} from 'react-native';
import {
    Surface,
    Text,
} from 'react-native-paper';
import { customTheme } from '../../../theme/theme';
import ModernHeader from '../../../assets/components/ModernHeader';
import { useUser } from '../../../contexts/userContext';
import { hasAccess } from '../../Adm/types/admTypes';
import ActionButton from '../../../assets/components/ActionButton';

export default function SSTScreen({ navigation }: any) {
    const { userInfo } = useUser();

    // Funções específicas de verificação de acesso
    const canAccessDDS = () => {
        if (!userInfo) return false;
        return hasAccess(userInfo, 'sst', 1);
    };

    const canAccessChecklist = () => {
        if (!userInfo) return false;
        return hasAccess(userInfo, 'sst', 1);
    };

    const canAccessAuditorias = () => {
        if (!userInfo) return false;
        return hasAccess(userInfo, 'sst', 1);
    };

    const canAccessExtintores = () => {
        if (!userInfo) return false;
        return hasAccess(userInfo, 'sst', 1);
    };

    return (
        <Surface style={styles.container}>
            {/* Header */}
            <ModernHeader
                title="SST"
                iconName="shield-account"
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Ações com verificação de acesso */}
                <View style={styles.actionsContainer}>
                    <Text style={styles.sectionTitle}>Ações</Text>
                    <View style={styles.actionsGrid}>

                        <ActionButton
                            icon="account-group"
                            text="DDS"
                            onPress={() => navigation.navigate('DDSScreen')}
                            disabled={true}
                            disabledText="Chegando na próxima atualização"
                        />

                        <ActionButton
                            icon="clipboard-check-outline"
                            text="Checklist"
                            onPress={() => navigation.navigate('SSTChecklistScreen')}
                            disabled={!canAccessChecklist}
                            disabledText="Requer acesso à SST nível 1"
                        />

                        <ActionButton
                            icon="file-search-outline"
                            text="Auditorias"
                            onPress={() => navigation.navigate('AuditoriasScreen')}
                            disabled={true}
                            disabledText="Chegando na próxima atualização"
                        />

                        <ActionButton
                            icon="fire-extinguisher"
                            text="Extintores"
                            onPress={() => navigation.navigate('ExtintoresScreen')}
                            disabled={true}
                            disabledText="Chegando na próxima atualização"
                        />

                    </View>
                </View>
            </ScrollView>
        </Surface>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'stretch',
    },
    actionsContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginBottom: 16,
    },
});