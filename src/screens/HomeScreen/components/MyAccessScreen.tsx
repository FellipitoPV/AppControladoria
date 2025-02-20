import React from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUser } from '../../../contexts/userContext';
import { customTheme } from '../../../theme/theme';
import { AcessoInterface, AcessosType } from '../../Adm/components/admTypes';
import ModernHeader from '../../../assets/components/ModernHeader';
import { NavigationProp, useNavigation } from '@react-navigation/native';

// Componente para item de acesso
interface AccessItemProps {
    access: AcessoInterface;
}

const AccessItem: React.FC<AccessItemProps> = ({ access }) => {
    return (
        <View style={styles.accessItem}>
            <View style={styles.accessHeader}>
                <View style={styles.iconContainer}>
                    <MaterialIcons
                        name={access.icon}
                        size={24}
                        color={customTheme.colors.primary}
                    />
                </View>
                <Text style={styles.accessName}>{access.label}</Text>
            </View>
            <Text style={styles.accessDescription}>{access.description}</Text>
        </View>
    );
};

// Primeiro, vamos criar um componente especial para a mensagem de admin
const AdminAccessMessage: React.FC = () => {
    return (
        <View style={styles.adminContainer}>
            <View style={styles.adminIconRow}>
                <MaterialIcons name="crown" size={32} color="#FFD700" />
                <MaterialIcons name="shield-star" size={32} color={customTheme.colors.primary} />
                <MaterialIcons name="key-variant" size={32} color="#4CAF50" />
            </View>

            <Text style={styles.adminTitle}>🎉 Modo Super Admin Ativado! 🎉</Text>

            <Text style={styles.adminDescription}>
                Uau! Você é um Administrador!
                Com grandes poderes vêm grandes... ah, você já conhece o resto! 😎
            </Text>

            <View style={styles.adminBadgeContainer}>
                <MaterialIcons name="security" size={24} color="#FFD700" />
                <Text style={styles.adminBadgeText}>Passe Livre em Todas as Áreas</Text>
            </View>

            <View style={styles.adminIconGrid}>
                <MaterialIcons name="database-lock" size={24} color="#FF5722" />
                <MaterialIcons name="shield-check" size={24} color="#2196F3" />
                <MaterialIcons name="cog" size={24} color="#9C27B0" />
                <MaterialIcons name="lightning-bolt" size={24} color="#FF9800" />
            </View>
        </View>
    );
};

export default function MyAccessScreen() {
    const { userInfo } = useUser();
    const navigation = useNavigation();

    // Função para encontrar as informações completas do acesso
    const getAccessInfo = (accessId: string): AcessoInterface => {
        const accessInfo = AcessosType.find(access => access.id === accessId);
        if (!accessInfo) {
            // Fallback para acessos que não estão na lista
            return {
                id: accessId,
                label: accessId.charAt(0).toUpperCase() + accessId.slice(1),
                icon: 'lock',
                description: `Acesso ao módulo ${accessId}`
            };
        }
        return accessInfo;
    };

    if (!userInfo) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={customTheme.colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <ModernHeader
                title="Meus Acessos"
                iconName="shield-key"
                onBackPress={() => navigation?.goBack()}
            />

            {/* Mensagem especial para administradores */}
            {userInfo?.cargo === 'Administrador' && <AdminAccessMessage />}

            {/* Resumo - vamos modificar para admins */}
            <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>
                    {userInfo?.cargo === 'Administrador'
                        ? '🌟 Acesso Total ao Sistema'
                        : `Você possui ${userInfo.acesso?.length || 0} níveis de acesso`
                    }
                </Text>
                <Text style={styles.summarySubtitle}>
                    {userInfo?.cargo === 'Administrador'
                        ? 'Você tem permissões administrativas completas'
                        : 'Estes são seus privilégios de acesso no sistema'
                    }
                </Text>
            </View>

            {/* Lista de Acessos */}
            <View style={styles.accessContainer}>
                {userInfo.acesso?.map((accessId) => (
                    <AccessItem
                        key={accessId}
                        access={getAccessInfo(accessId)}
                    />
                ))}
                {(!userInfo.acesso || userInfo.acesso.length === 0) && (
                    <View style={styles.noAccessContainer}>
                        <MaterialIcons
                            name="lock-outline"
                            size={48}
                            color={customTheme.colors.error}
                        />
                        <Text style={styles.noAccessText}>
                            Você não possui nenhum acesso cadastrado
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    adminContainer: {
        margin: 20,
        padding: 20,
        backgroundColor: '#FFF',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: customTheme.colors.primary,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    adminIconRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 16,
    },
    adminTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: customTheme.colors.primary,
        textAlign: 'center',
        marginBottom: 8,
    },
    adminDescription: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 22,
    },
    adminBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${customTheme.colors.primary}15`,
        padding: 12,
        borderRadius: 12,
        gap: 8,
        marginBottom: 16,
    },
    adminBadgeText: {
        fontSize: 16,
        color: customTheme.colors.primary,
        fontWeight: '600',
    },
    adminIconGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 8,
    },
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: customTheme.colors.primary,
    },
    summaryContainer: {
        padding: 20,
        backgroundColor: `${customTheme.colors.primary}10`,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.primary,
    },
    summarySubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    accessContainer: {
        padding: 20,
        gap: 16,
    },
    accessItem: {
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
    },
    accessHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${customTheme.colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    accessName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    accessDescription: {
        fontSize: 14,
        color: '#666',
        marginLeft: 52,
    },
    noAccessContainer: {
        alignItems: 'center',
        padding: 32,
        gap: 16,
    },
    noAccessText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
});