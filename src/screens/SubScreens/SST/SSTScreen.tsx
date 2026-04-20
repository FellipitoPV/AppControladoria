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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../theme/theme';
import ModernHeader from '../../../assets/components/ModernHeader';
import { useUser } from '../../../contexts/userContext';
import { hasAccess } from '../../Adm/types/admTypes';
import ActionButton from '../../../assets/components/ActionButton';

interface CategoryCardProps {
    title: string;
    icon: string;
    color: string;
    children: React.ReactNode;
    noGrid?: boolean;
}

const CategoryCard = ({ title, icon, color, children, noGrid }: CategoryCardProps) => (
    <View style={styles.categoryCard}>
        <View style={[styles.categoryHeader, { borderLeftColor: color }]}> 
            <View style={styles.categoryTitleContainer}>
                <Icon name={icon} size={24} color={color} />
                <Text style={styles.categoryTitle}>{title}</Text>
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: `${color}18` }]}>
                <Text style={[styles.categoryBadgeText, { color }]}>
                    {React.Children.count(children)} item(ns)
                </Text>
            </View>
        </View>
        <View style={styles.categoryContent}>
            {noGrid ? children : (
                <View style={styles.actionsGrid}>
                    {React.Children.map(children, child => {
                        if (!React.isValidElement(child)) return child;

                        return React.cloneElement(child as React.ReactElement<any>, {
                            style: [styles.gridActionButton, child.props.style],
                        });
                    })}
                </View>
            )}
        </View>
    </View>
);

export default function QSMSScreen({ navigation }: any) {
    const { userInfo } = useUser();

    // Funções de verificação de acesso
    const canAccessSST = () => {
        if (!userInfo) return false;
        return hasAccess(userInfo, 'sst', 1);
    };

    const canAccessMeioAmbiente = () => {
        if (!userInfo) return false;
        return hasAccess(userInfo, 'sst', 1); // Ajustar permissão se necessário
    };

    const canAccessQualidade = () => {
        if (!userInfo) return false;
        return hasAccess(userInfo, 'sst', 1); // Ajustar permissão se necessário
    };

    return (
        <Surface style={styles.container}>
            <ModernHeader
                title="QSMS"
                iconName="shield-check"
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Card SST - Segurança e Saúde no Trabalho */}
                <CategoryCard
                    title="Saúde e Segurança do Trabalho"
                    icon="shield-account"
                    color="#E53935"
                >
                    <ActionButton
                        icon="account-group"
                        text="DDS"
                        onPress={() => navigation.navigate('DDSScreen')}
                        disabled={!canAccessSST()}
                        disabledText="Requer acesso à SST nível 1"
                    />
                    <ActionButton
                        icon="clipboard-check-outline"
                        text="Checklist"
                        onPress={() => navigation.navigate('ChecklistScreen')}
                        disabled={!canAccessSST()}
                        disabledText="Requer acesso à SST nível 1"
                    />
                    <ActionButton
                        icon="clipboard-list-outline"
                        text="OCP"
                        onPress={() => navigation.navigate('ChecklistScreen', {
                            category: 'OCP',
                            title: 'Checklists OCP',
                            headerIcon: 'clipboard-list-outline',
                            reportVariant: 'sst',
                        })}
                        disabled={!canAccessSST()}
                        disabledText="Requer acesso à SST nível 1"
                    />
                    <ActionButton
                        icon="flask-outline"
                        text="Toxicológico"
                        onPress={() => navigation.navigate('ToxicologicoScreen')}
                        disabled={!canAccessSST()}
                        disabledText="Requer acesso à SST nível 1"
                    />
                     <ActionButton
                         icon="fire-extinguisher"
                         text="Extintores"
                         onPress={() => navigation.navigate('ExtintoresScreen')}
                         disabled={!canAccessSST()}
                         disabledText="Requer acesso à SST nível 1"
                     />
                </CategoryCard>

                {/* Card Meio Ambiente */}
                <CategoryCard
                    title="Meio Ambiente"
                    icon="leaf"
                    color="#43A047"
                >
                    <ActionButton
                        icon="clipboard-check-outline"
                        text="Checklist"
                        onPress={() => navigation.navigate('ChecklistScreen', {
                            category: 'QSMS - Meio Ambiente',
                            title: 'Checklist Meio Ambiente',
                            headerIcon: 'leaf',
                            reportVariant: 'meioambiente',
                        })}
                        disabled={!canAccessMeioAmbiente()}
                        disabledText="Requer acesso nível 1"
                    />
                </CategoryCard>

                {/* Card ESG */}
                <CategoryCard
                    title="ESG"
                    icon="earth"
                    color="#1E88E5"
                    noGrid
                >
                    <View style={styles.comingSoonContainer}>
                        <Icon name="hammer-wrench" size={32} color={customTheme.colors.onSurfaceVariant} />
                        <Text style={styles.comingSoonText}>Em desenvolvimento</Text>
                        <Text style={styles.comingSoonSubtext}>Novas funcionalidades em breve</Text>
                    </View>
                </CategoryCard>

                {/* Card Atendimento ao Cliente */}
                <CategoryCard
                    title="Atendimento ao Cliente"
                    icon="account-heart"
                    color="#8E24AA"
                    noGrid
                >
                    <View style={styles.comingSoonContainer}>
                        <Icon name="hammer-wrench" size={32} color={customTheme.colors.onSurfaceVariant} />
                        <Text style={styles.comingSoonText}>Em desenvolvimento</Text>
                        <Text style={styles.comingSoonSubtext}>Novas funcionalidades em breve</Text>
                    </View>
                </CategoryCard>

                {/* Card Qualidade */}
                <CategoryCard
                    title="Qualidade"
                    icon="certificate"
                    color="#FB8C00"
                >
                    <ActionButton
                        icon="clipboard-text-search-outline"
                        text="Checklist"
                        onPress={() => navigation.navigate('ChecklistScreen', {
                            category: 'QSMS - Qualidade',
                            title: 'Checklist Qualidade',
                            headerIcon: 'clipboard-text-search',
                            reportVariant: 'qualidade',
                        })}
                        disabled={!canAccessQualidade()}
                        disabledText="Requer acesso nível 1"
                    />
                </CategoryCard>

                {/* Card Documentos Legais */}
                <CategoryCard
                    title="Documentos Legais"
                    icon="file-document-multiple-outline"
                    color="#546E7A"
                >
                    <ActionButton
                        icon="file-document-outline"
                        text="Documentos"
                        onPress={() => navigation.navigate('ControleDocumentosScreen')}
                        disabled={!canAccessSST()}
                        disabledText="Requer acesso à SST nível 1"
                    />
                </CategoryCard>

                {/* Espaço extra no final */}
                <View style={{ height: 24 }} />
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
    categoryCard: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        overflow: 'hidden',
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderLeftWidth: 4,
        paddingBottom: 12,
    },
    categoryTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    categoryBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    categoryContent: {
        padding: 16,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.surfaceVariant,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'stretch',
        justifyContent: 'space-between',
    },
    gridActionButton: {
        width: '30.5%',
        minHeight: 116,
        paddingHorizontal: 10,
    },
    comingSoonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    comingSoonText: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 12,
    },
    comingSoonSubtext: {
        fontSize: 13,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 4,
        opacity: 0.7,
    },
});
