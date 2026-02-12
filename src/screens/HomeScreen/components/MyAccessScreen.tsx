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
import { UserAccess, getLevelLabel } from '../../Adm/types/admTypes';
import ModernHeader from '../../../assets/components/ModernHeader';
import { useNavigation } from '@react-navigation/native';

const AccessItem: React.FC<{ access: UserAccess }> = ({ access }) => {
    const levelLabel = getLevelLabel(access.level);

    return (
        <View style={styles.accessItem}>
            <View style={styles.accessHeader}>
                <View style={styles.iconContainer}>
                    <MaterialIcons
                        name="key-variant"
                        size={24}
                        color={customTheme.colors.primary}
                    />
                </View>
                <View style={styles.accessTitleContainer}>
                    <Text style={styles.accessName}>{access.moduleId}</Text>
                    <View style={[
                        styles.levelBadge,
                        { backgroundColor: access.level === 3 ? customTheme.colors.primary : access.level === 2 ? customTheme.colors.secondary : customTheme.colors.tertiary }
                    ]}>
                        <Text style={styles.levelText}>
                            Nível {access.level} - {levelLabel}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const AdminAccessMessage: React.FC = () => {
    return (
        <View style={styles.adminContainer}>
            <View style={styles.adminIconRow}>
                <MaterialIcons name="crown" size={32} color="#FFD700" />
                <MaterialIcons name="shield-star" size={32} color={customTheme.colors.primary} />
                <MaterialIcons name="key-variant" size={32} color="#4CAF50" />
            </View>

            <Text style={styles.adminTitle}>Modo Super Admin Ativado!</Text>

            <Text style={styles.adminDescription}>
                Você é um Administrador com acesso total a todos os módulos.
            </Text>

            <View style={styles.adminBadgeContainer}>
                <MaterialIcons name="security" size={24} color="#FFD700" />
                <Text style={styles.adminBadgeText}>Passe Livre em Todas as Áreas</Text>
            </View>
        </View>
    );
};

export default function MyAccessScreen() {
    const { userInfo } = useUser();
    const navigation = useNavigation();

    const getAccessSummary = () => {
        if (userInfo?.cargo === 'Administrador') {
            return { total: 'Acesso Total', description: 'Você tem permissões administrativas completas' };
        }

        const totalAcessos = userInfo?.acesso?.length || 0;
        const acessosNivel3 = userInfo?.acesso?.filter(a => a.level === 3).length || 0;
        const acessosNivel2 = userInfo?.acesso?.filter(a => a.level === 2).length || 0;
        const acessosNivel1 = userInfo?.acesso?.filter(a => a.level === 1).length || 0;

        return {
            total: `${totalAcessos} ${totalAcessos === 1 ? 'módulo' : 'módulos'} de acesso`,
            description: `${acessosNivel3} admin, ${acessosNivel2} avançado, ${acessosNivel1} básico`
        };
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
            <ModernHeader
                title="Meus Acessos"
                iconName="shield-key"
                onBackPress={() => navigation?.goBack()}
            />

            {userInfo?.cargo === 'Administrador' && <AdminAccessMessage />}

            <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>
                    {getAccessSummary().total}
                </Text>
                <Text style={styles.summarySubtitle}>
                    {getAccessSummary().description}
                </Text>
            </View>

            <View style={styles.accessContainer}>
                {userInfo?.acesso?.map((userAccess) => (
                    <AccessItem
                        key={userAccess.moduleId}
                        access={userAccess}
                    />
                ))}
                {(!userInfo?.acesso || userInfo.acesso.length === 0) && (
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
    accessItem: {
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.25)',
    },
    accessHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${customTheme.colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    accessTitleContainer: {
        flex: 1,
        gap: 4,
    },
    accessName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    levelBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    levelText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500',
    },
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
    },
    adminBadgeText: {
        fontSize: 16,
        color: customTheme.colors.primary,
        fontWeight: '600',
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
