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
import { AcessoInterface, AcessosType, UserAccess } from '../../Adm/types/admTypes';
import ModernHeader from '../../../assets/components/ModernHeader';
import { NavigationProp, useNavigation } from '@react-navigation/native';

// Primeiro, atualize a interface AccessItemProps
interface AccessItemProps {
    access: AcessoInterface;
    level: number;
}

// Componente AccessItem atualizado
const AccessItem: React.FC<AccessItemProps> = ({ access, level }) => {
    // Encontra o tipo de acesso completo no AcessosType
    const fullAccessInfo = AcessosType.find(a => a.id === access.id);

    // Encontra as informações do nível atual
    const levelInfo = fullAccessInfo?.levels.find(l => l.level === level);

    // Função para obter o label do nível
    const getLevelLabel = (level: number) => {
        switch (level) {
            case 3: return "Administrador";
            case 2: return "Avançado";
            case 1: return "Básico";
            default: return "Sem acesso";
        }
    };

    // Divide as capabilities em duas colunas
    const splitCapabilities = (capabilities: string[] = []) => {
        const mid = Math.ceil(capabilities.length / 2);
        return {
            col1: capabilities.slice(0, mid),
            col2: capabilities.slice(mid)
        };
    };

    const { col1, col2 } = splitCapabilities(levelInfo?.capabilities);

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
                <View style={styles.accessTitleContainer}>
                    <Text style={styles.accessName}>{access.label}</Text>
                    <View style={[
                        styles.levelBadge,
                        { backgroundColor: level === 3 ? customTheme.colors.primary: level === 2 ? customTheme.colors.secondary : customTheme.colors.tertiary }
                    ]}>
                        <Text style={styles.levelText}>{getLevelLabel(level)}</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.accessDescription}>{access.description}</Text>

            {levelInfo && (
                <View style={styles.levelInfoContainer}>
                    <Text style={styles.levelTitle}>{levelInfo.title}</Text>
                    <Text style={styles.levelDescription}>{levelInfo.description}</Text>

                    <Text style={styles.capabilitiesTitle}>O que você pode fazer:</Text>
                    <View style={styles.capabilitiesContainer}>
                        <View style={styles.capabilitiesColumn}>
                            {col1.map((capability, index) => (
                                <View key={index} style={styles.capabilityItem}>
                                    <MaterialIcons
                                        name="check-circle"
                                        size={16}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text style={styles.capabilityText}>{capability}</Text>
                                </View>
                            ))}
                        </View>
                        <View style={styles.capabilitiesColumn}>
                            {col2.map((capability, index) => (
                                <View key={index} style={styles.capabilityItem}>
                                    <MaterialIcons
                                        name="check-circle"
                                        size={16}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text style={styles.capabilityText}>{capability}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            )}
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
    const getAccessInfo = (userAccess: UserAccess): { accessInfo: AcessoInterface; level: number } => {
        const accessInfo = AcessosType.find(access => access.id === userAccess.moduleId);
        if (!accessInfo) {
            return {
                accessInfo: {
                    id: userAccess.moduleId,
                    label: userAccess.moduleId.charAt(0).toUpperCase() + userAccess.moduleId.slice(1),
                    icon: 'lock',
                    description: `Acesso ao módulo ${userAccess.moduleId}`,
                    levels: [] // Add an appropriate value for levels
                },
                level: userAccess.level
            };
        }
        return { accessInfo, level: userAccess.level };
    };

    // Atualize o resumo para mostrar informações por nível
    const getAccessSummary = () => {
        if (userInfo?.cargo === 'Administrador') {
            return { total: 'Acesso Total', description: 'Você tem permissões administrativas completas' };
        }

        const totalAcessos = userInfo?.acesso?.length || 0;
        const acessosNivel3 = userInfo?.acesso?.filter(a => a.level === 3).length || 0;
        const acessosNivel2 = userInfo?.acesso?.filter(a => a.level === 2).length || 0;
        const acessosNivel1 = userInfo?.acesso?.filter(a => a.level === 1).length || 0;

        return {
            total: `${totalAcessos} módulos de acesso`,
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
                {userInfo?.acesso?.map((userAccess) => {
                    const { accessInfo, level } = getAccessInfo(userAccess);
                    return (
                        <AccessItem
                            key={accessInfo.id}
                            access={accessInfo}
                            level={level}
                        />
                    );
                })}
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
    accessTitleContainer: {
        flex: 1,
        gap: 4,
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
        marginBottom: 16,
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
    levelInfoContainer: {
        marginTop: 8,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.05)',
    },
    levelTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    levelDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    capabilitiesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    capabilitiesContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    capabilitiesColumn: {
        flex: 1,
        gap: 8,
    },
    capabilityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    capabilityText: {
        flex: 1,
        fontSize: 13,
        color: '#666',
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