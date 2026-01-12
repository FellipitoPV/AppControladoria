// QuickActionsGrid.js

import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Text} from 'react-native-paper';
import {customTheme} from '../../../theme/theme';
import {useUser} from '../../../contexts/userContext';

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  route: string;
  access?: {
    moduleId: string;
    minLevel: number;
  };
}

const QuickActionsGrid = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const {userInfo} = useUser();
  const {width} = Dimensions.get('window');

  // Função auxiliar para verificar nível de acesso
  const getUserAccessLevel = (moduleId: string): number => {
    if (userInfo?.cargo === 'Administrador') return 3; // Administrador tem nível máximo
    const userAccess = userInfo?.acesso?.find(
      (access: {moduleId: string; level: number}) =>
        access.moduleId === moduleId,
    );
    return userAccess?.level || 0;
  };

  const quickActions = React.useMemo(
    (): QuickAction[] => [
      {
        id: '1',
        title: 'Lavagem',
        icon: 'car-wash',
        color: customTheme.colors.primary,
        route: 'LavagemScreen',
        access: {
          moduleId: 'lavagem',
          minLevel: 1, // Nível básico para acesso
        },
      },
      {
        id: '2',
        title: 'Compostagem',
        icon: 'sprout',
        color: customTheme.colors.primary,
        route: 'CompostagemScreen',
        access: {
          moduleId: 'compostagem',
          minLevel: 1, // Nível básico para acesso
        },
      },
      {
        id: '3',
        title: 'Gestão de Materiais',
        icon: 'package-variant-closed',
        color: customTheme.colors.primary,
        route: 'ControladoriaScreen',
        access: {
          moduleId: 'controladoria',
          minLevel: 1, // Nível básico para acesso
        },
      },
      {
        id: '4',
        title: 'Operacional',
        icon: 'clipboard-list',
        color: customTheme.colors.primary,
        route: 'OperacaoScreen',
        access: {
          moduleId: 'operacao',
          minLevel: 1, // Nível básico para acesso
        },
      },
      {
        id: '5',
        title: 'Logística',
        icon: 'truck-delivery',
        color: customTheme.colors.primary,
        route: 'LogisticaScreen',
        access: {
          moduleId: 'logistica',
          minLevel: 1, // Nível básico para acesso
        },
      },
      {
        id: '6',
        title: 'SST',
        icon: 'shield-account', // ou 'hard-hat' ou 'medical-bag'
        color: customTheme.colors.primary,
        route: 'SSTScreen',
        access: {
          moduleId: 'sst',
          minLevel: 1,
        },
      },
      {
        id: '97',
        title: 'Reuniao',
        icon: 'presentation',
        color: customTheme.colors.primary,
        route: 'Reuniao',
      },
      {
        id: '98',
        title: 'Acessos',
        icon: 'account-cog',
        color: customTheme.colors.primary,
        route: 'UsersEdit',
        access: {
          moduleId: 'system',
          minLevel: 3, // Apenas administradores
        },
      },
      {
        id: '99',
        title: 'Contatos',
        icon: 'contacts',
        color: customTheme.colors.primary,
        route: 'Contatos',
        // Sem access = público
      },
    ],
    [],
  );

  // Filtrar ações baseado nos níveis de acesso
  const filteredActions = React.useMemo(() => {
    const isAdmin = userInfo?.cargo === 'Administrador';

    return quickActions
      .filter(action => {
        // Se não requer acesso, permite
        if (!action.access) return true;

        // Verifica o nível de acesso do usuário para o módulo
        const userLevel = getUserAccessLevel(action.access.moduleId);
        return userLevel >= action.access.minLevel;
      })
      .map(action => ({
        ...action,
        // Adiciona flag para identificar atalhos que só administradores podem ver
        adminView: isAdmin && action.access?.minLevel === 3,
      }));
  }, [quickActions, userInfo]);

  // Agora use filteredActions para criar as páginas
  // Criar páginas com as ações filtradas
  const pages = React.useMemo(() => {
    return filteredActions.reduce((acc, item, index) => {
      const pageIndex = Math.floor(index / 4); // Mudou de 4 para 9
      if (!acc[pageIndex]) {
        acc[pageIndex] = [];
      }
      acc[pageIndex].push(item);
      return acc;
    }, [] as (QuickAction & {adminView?: boolean})[][]);
  }, [filteredActions]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / width);
    setCurrentPage(page);
  };

  const handleNavigation = useCallback(
    (route: string) => {
      try {
        navigation.navigate(route as never);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    },
    [navigation],
  );

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
            snapToInterval={width}>
            {pages.map((page, pageIndex) => (
              <View key={`page-${pageIndex}`} style={[styles.page, {width}]}>
                <View style={styles.gridContainer}>
                  {page.map((action: QuickAction & {adminView?: boolean}) => (
                    <TouchableOpacity
                      key={action.id}
                      style={styles.actionButton}
                      onPress={() => handleNavigation(action.route)}>
                      <View style={styles.iconWrapper}>
                        <View
                          style={[
                            styles.iconContainer,
                            {backgroundColor: `${action.color}20`},
                          ]}>
                          <Icon
                            name={action.icon}
                            size={28}
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
                          action.adminView && styles.adminText,
                        ]}
                        numberOfLines={2}>
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
                    backgroundColor:
                      currentPage === index
                        ? customTheme.colors.primary
                        : customTheme.colors.surfaceVariant,
                  },
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly', // Mudou de center
    gap: 12, // Reduzi um pouco o gap
    paddingHorizontal: 16,
    width: '100%',
  },
  actionButton: {
    width: '20%', // Define largura proporcional para 3 colunas
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 11, // Reduzi ligeiramente
    color: customTheme.colors.onSurface,
    textAlign: 'center',
    lineHeight: 14,
  },
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
