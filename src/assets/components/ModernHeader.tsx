import React from 'react';
import { StyleSheet, View, TouchableOpacity, StyleProp, ViewStyle, ActivityIndicator } from 'react-native';
import { Surface, Text, useTheme, MD3Theme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../theme/theme';

interface ModernHeaderProps {
    /** Título a ser exibido no header */
    title: string;
    /** Nome do ícone do MaterialCommunityIcons (opcional) */
    iconName?: string;
    /** Função chamada ao pressionar o botão de voltar */
    onBackPress?: () => void;
    /** Controla a visibilidade do botão de voltar */
    showBackButton?: boolean;
    /** Função chamada ao pressionar o botão da direita */
    rightAction?: () => void;
    /** Nome do ícone do botão direito */
    rightIcon?: string;
    /** Botão direito com loading (sobrescreve rightAction/rightIcon) */
    rightButton?: {
        icon: string;
        onPress: () => void;
        loading?: boolean;
    };
    /** Estilo customizado para o container do header */
    style?: StyleProp<ViewStyle>;
}

const ModernHeader: React.FC<ModernHeaderProps> = ({
    title,
    iconName,
    onBackPress,
    showBackButton = true,
    rightAction,
    rightIcon = 'close-circle',
    rightButton,
    style,
}) => {

    const styles = StyleSheet.create({
        header: {
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            elevation: 2,
            backgroundColor: customTheme.colors.surface,
            borderBottomColor: customTheme.colors.surfaceVariant,
            borderColor: customTheme.colors.inverseSurface,
            borderBottomWidth: 1,
        },
        headerContent: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        headerTitle: {
            marginLeft: 12,
            color: customTheme.colors.onSurface,
            fontWeight: '600',
        },
        icon: {
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 20,
        },
        iconContainer: {
            marginRight: 8,
        },
        rightAction: {
            marginLeft: 16,
        }
    });

    const renderRightButton = () => {
        if (rightButton) {
            return (
                <TouchableOpacity
                    onPress={rightButton.onPress}
                    style={[styles.icon, styles.rightAction]}
                    disabled={rightButton.loading}
                >
                    {rightButton.loading ? (
                        <ActivityIndicator 
                            size="small" 
                            color={customTheme.colors.primary} 
                        />
                    ) : (
                        <Icon
                            name={rightButton.icon}
                            size={24}
                            color={customTheme.colors.primary}
                        />
                    )}
                </TouchableOpacity>
            );
        }

        if (rightAction) {
            return (
                <TouchableOpacity
                    onPress={rightAction}
                    style={[styles.icon, styles.rightAction]}
                >
                    <Icon
                        name={rightIcon}
                        size={24}
                        color={customTheme.colors.primary}
                    />
                </TouchableOpacity>
            );
        }

        return null;
    };

    return (
        <Surface style={[styles.header, style]}>
            <View style={styles.headerContent}>
                {showBackButton && (
                    <TouchableOpacity
                        onPress={onBackPress}
                        style={[styles.icon, styles.iconContainer]}
                    >
                        <Icon
                            name="arrow-left"
                            size={24}
                            color={customTheme.colors.primary}
                        />
                    </TouchableOpacity>
                )}
                {iconName && (
                    <View style={[styles.icon, { backgroundColor: customTheme.colors.primaryContainer }]}>
                        <Icon
                            name={iconName}
                            size={24}
                            color={customTheme.colors.primary}
                        />
                    </View>
                )}
                <Text variant="titleLarge" style={styles.headerTitle}>
                    {title}
                </Text>
            </View>
            {renderRightButton()}
        </Surface>
    );
};

export default ModernHeader;