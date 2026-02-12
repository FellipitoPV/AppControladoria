// QuickActionsGrid.js

import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React, {useCallback} from 'react';

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
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const {userInfo} = useUser();

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
        title: 'QSMS',
        icon: 'shield-check',
        color: customTheme.colors.primary,
        route: 'QSMSScreen',
        access: {
          moduleId: 'sst',
          minLevel: 1,
        },
      },
      {
        id: '7',
        title: 'Contaminados',
        icon: 'biohazard',
        color: customTheme.colors.primary,
        route: 'ContaminadosScreen',
        access: {
          moduleId: 'contaminados',
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
          <Text style={styles.sectionTitle}>Módulos</Text>
          <View style={styles.gridContainer}>
            {filteredActions.map((action: QuickAction & {adminView?: boolean}) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionButton}
                onPress={() => handleNavigation(action.route)}>
                <View style={styles.iconWrapper}>
                  <View
                    style={[
                      styles.iconContainer,
                      {backgroundColor: `${action.color}15`},
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
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: customTheme.colors.onBackground,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  actionButton: {
    width: '25%', // 4 colunas
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrapper: {
    position: 'relative',
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
    fontSize: 11,
    color: customTheme.colors.onSurface,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 4,
  },
  adminBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: customTheme.colors.primaryContainer,
    borderRadius: 10,
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
});

export default QuickActionsGrid;
