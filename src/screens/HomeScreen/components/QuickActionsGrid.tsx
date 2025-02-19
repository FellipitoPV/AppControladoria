// QuickActionsGrid.js
import React, { useCallback, useState } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../theme/theme';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { useUser } from '../../../contexts/userContext';

interface QuickAction {
    id: string;
    title: string;
    icon: string;
    color: string;
    route: string;
    acesso?: string;
    adminView?: boolean;
}


const QuickActionsGrid = () => {
    const [currentPage, setCurrentPage] = useState(0);
    const navigation = useNavigation<NavigationProp<ParamListBase>>();
    const { userInfo } = useUser(); // Importando userInfo do contexto

    const quickActions = React.useMemo((): QuickAction[] => [
        {
            id: '1',
            title: 'Lavagem',
            icon: 'car-wash',
            color: customTheme.colors.primary,
            route: 'LavagemScreen',
            acesso: 'lavagem' // Ação restrita
        },
        {
            id: '2',
            title: 'Compostagem',
            icon: 'sprout',
            color: '#8b79f2',
            route: 'CompostagemScreen',
            acesso: 'compostagem' // Ação restrita
        },
        {
            id: '3',
            title: 'Logística',
            icon: 'clipboard',
            color: '#e679f2',
            route: 'LogisticaScreen',
            acesso: 'logistica' // Ação restrita
        },
        {
            id: '99',
            title: 'Contatos',
            icon: 'phone',
            color: '#79a2f2',
            route: 'Contatos'
            // Sem acesso = público
        },
    ], []);

    const { width } = Dimensions.get('window');

    // Mova a criação das páginas para depois do filteredActions
    const filteredActions = React.useMemo(() => {
        const isAdmin = userInfo?.cargo === 'Administrador';
        console.log('\n=== DIAGNÓSTICO DE ACESSOS ===');
        console.log('Acessos do usuário:', userInfo?.acesso || 'Nenhum acesso definido');
        console.log('Cargo:', userInfo?.cargo);
        console.log('É administrador:', isAdmin);

        const acoesPermitidas = quickActions.filter(action => {
            // Se é admin, permite todos os acessos
            if (isAdmin) return true;

            // Lógica original para não-admins
            if (!action.acesso) return true;
            if (!userInfo?.acesso || userInfo.acesso.length === 0) return false;
            return userInfo.acesso.includes(action.acesso);
        });

        // Adiciona flag para identificar atalhos que o admin não teria acesso normalmente
        return acoesPermitidas.map(action => ({
            ...action,
            adminView: isAdmin && action.acesso ? !userInfo?.acesso?.includes(action.acesso) : undefined
        }));
    }, [quickActions, userInfo?.acesso, userInfo?.cargo]);

    // Agora use filteredActions para criar as páginas
    const pages = React.useMemo(() => {
        return filteredActions.reduce((acc, item, index) => {
            const pageIndex = Math.floor(index / 4);
            if (!acc[pageIndex]) {
                acc[pageIndex] = [];
            }
            acc[pageIndex].push(item);
            return acc;
        }, [] as QuickAction[][]); // Aqui mudamos para array de arrays de QuickAction
    }, [filteredActions]);

    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const page = Math.round(offsetX / width);
        setCurrentPage(page);
    };

    const handleNavigation = useCallback((route: string) => {
        try {
            navigation.navigate(route as never);
        } catch (error) {
            console.error('Navigation error:', error);
        }
    }, [navigation]);


    return (
        <View style={styles.container}>
            {filteredActions.length > 0 ? (
                <>
                    <View style={styles.header}>
                        <Text style={styles.sectionTitle}>Atalhos</Text>
                        <Text style={styles.pageIndicator}>
                            {currentPage + 1}/{pages.length}
                        </Text>
                    </View>

                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={handleScroll}
                        decelerationRate="fast"
                        snapToInterval={width}
                    >
                        {pages.map((page, pageIndex) => (
                            <View
                                key={`page-${pageIndex}`}
                                style={[styles.page, { width }]}
                            >
                                <View style={styles.gridContainer}>
                                    {page.map((action) => (
                                        <TouchableOpacity
                                            key={action.id}
                                            style={styles.actionButton}
                                            onPress={() => handleNavigation(action.route)}
                                        >
                                            <View style={styles.iconWrapper}>
                                                <View
                                                    style={[
                                                        styles.iconContainer,
                                                        { backgroundColor: `${action.color}20` }
                                                    ]}
                                                >
                                                    <Icon
                                                        name={action.icon}
                                                        size={24}
                                                        color={action.color}
                                                    />
                                                </View>
                                                {action.adminView && (
                                                    <View style={styles.adminBadge}>
                                                        <Icon
                                                            name="shield-crown"
                                                            size={12}
                                                            color={customTheme.colors.primary}
                                                        />
                                                    </View>
                                                )}
                                            </View>
                                            <Text
                                                style={[
                                                    styles.actionText,
                                                    action.adminView && styles.adminText
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {action.title}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.paginationDots}>
                        {pages.map((_, index) => (
                            <View
                                key={`dot-${index}`}
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor: currentPage === index
                                            ? customTheme.colors.primary
                                            : customTheme.colors.surfaceVariant
                                    }
                                ]}
                            />
                        ))}
                    </View>
                </>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    iconWrapper: {
        position: 'relative',
    },
    adminBadge: {
        position: 'absolute',
        right: 0,
        backgroundColor: customTheme.colors.primaryContainer,
        borderRadius: 12,
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: customTheme.colors.primary,
    },
    adminText: {
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    container: {
        marginVertical: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.onBackground,
    },
    pageIndicator: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    page: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 16,
    },
    actionButton: {
        width: 72,
        alignItems: 'center',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionText: {
        fontSize: 12,
        color: customTheme.colors.onSurface,
        textAlign: 'center',
    },
    paginationDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        gap: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
});

export default QuickActionsGrid;