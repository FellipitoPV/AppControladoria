import React from 'react';
import { StyleSheet, View, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
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
    /** Estilo customizado para o container do header */
    style?: StyleProp<ViewStyle>;
}

const ModernHeader: React.FC<ModernHeaderProps> = ({
    title,
    iconName,
    onBackPress,
    showBackButton = true,
    rightAction,
    rightIcon = 'close-circle', // Ícone padrão corrigido
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

    return (
        <Surface style={[styles.header, style]}>
            <View style={styles.headerContent}>
                {showBackButton && (
                    <TouchableOpacity
                        onPress={onBackPress}
                        style={[styles.icon, styles.iconContainer]}
                    >
                        <Icon
                            name="arrow-left" // Nome correto do ícone de voltar
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
            {rightAction && (
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
            )}
        </Surface>
    );
};

export default ModernHeader;