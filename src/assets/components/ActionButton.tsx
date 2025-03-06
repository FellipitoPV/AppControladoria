import React from 'react';
import {
    TouchableOpacity,
    View,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../theme/theme'; // Ajuste o caminho conforme sua estrutura

interface ActionButtonProps {
    icon: string;
    text: string;
    onPress: () => void;
    badge?: number;
    noticeText?: string;
    noticeColor?: string;
    disabled?: boolean;
    disabledText?: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
    noticeStyle?: TextStyle;
    iconContainerStyle?: ViewStyle;
}

const ActionButton: React.FC<ActionButtonProps> = ({
    icon,
    text,
    onPress,
    badge,
    noticeText,
    noticeColor,
    disabled = false,
    disabledText,
    style,
    textStyle,
    noticeStyle,
    iconContainerStyle
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.actionButton,
                disabled && styles.actionButtonDisabled,
                style
            ]}
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
        >
            <View style={styles.actionIconContainer}>
                <View style={[
                    styles.actionIcon,
                    disabled
                        ? { backgroundColor: customTheme.colors.surfaceDisabled }
                        : { backgroundColor: customTheme.colors.primaryContainer },
                    iconContainerStyle
                ]}>
                    {disabled ? (
                        <MaterialCommunityIcons
                            name="lock"
                            size={24}
                            color={customTheme.colors.onSurfaceDisabled}
                        />
                    ) : (
                        <MaterialCommunityIcons
                            name={icon}
                            size={24}
                            color={customTheme.colors.primary}
                        />
                    )}
                </View>

                {!disabled && badge !== undefined && badge > 0 && (
                    <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>
                            {badge > 99 ? '99+' : badge}
                        </Text>
                    </View>
                )}
            </View>

            <Text style={[
                styles.actionText,
                disabled && styles.actionTextDisabled,
                textStyle
            ]}>
                {text}
            </Text>

            {/* Texto de aviso/notificação abaixo do botão */}
            {!disabled && noticeText && (
                <Text style={[
                    styles.noticeText,
                    { color: noticeColor || customTheme.colors.primary },
                    noticeStyle
                ]}>
                    {noticeText}
                </Text>
            )}

            {/* Texto de acesso necessário quando desabilitado */}
            {disabled && disabledText && (
                <Text style={styles.disabledText}>
                    {disabledText}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    actionButton: {
        width: '48%', // Define uma largura padrão que pode ser sobrescrita
        height: 120,
        padding: 16,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
        elevation: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonDisabled: {
        opacity: 0.7,
        backgroundColor: customTheme.colors.surfaceDisabled,
    },
    actionIconContainer: {
        position: 'relative',
        marginBottom: 8,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
        textAlign: 'center',
    },
    actionTextDisabled: {
        color: customTheme.colors.onSurfaceDisabled,
    },
    badgeContainer: {
        position: 'absolute',
        top: -8,
        right: -8,
        borderRadius: 10,
        backgroundColor: customTheme.colors.error,
        padding: 4,
        borderWidth: 1.5,
        borderColor: customTheme.colors.surface,
    },
    badgeText: {
        color: customTheme.colors.onError,
        fontWeight: 'bold',
        fontSize: 10,
    },
    noticeText: {
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
        textAlign: 'center',
    },
    disabledText: {
        fontSize: 10,
        color: customTheme.colors.error,
        textAlign: 'center',
        marginTop: 4,
    }
});

export default ActionButton;