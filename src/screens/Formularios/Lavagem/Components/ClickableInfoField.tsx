// ClickableInfoField.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ClickableInfoFieldProps {
    icon: string;
    label: string;
    value: string;
    isClickable?: boolean;
    onPress?: () => void;
    colors: {
        primary: string;
        onSurface: string;
        onSurfaceVariant: string;
    };
}

const ClickableInfoField: React.FC<ClickableInfoFieldProps> = ({
    icon,
    label,
    value,
    isClickable = false,
    onPress,
    colors,
}) => {
    const ContentWrapper = isClickable ? TouchableOpacity : View;

    return (
        <ContentWrapper
            style={[
                styles.container,
                isClickable && styles.clickable
            ]}
            onPress={isClickable ? onPress : undefined}
            activeOpacity={0.7}
        >
            {/* Ícone */}
            <Icon
                name={icon}
                size={20}
                color={colors.primary}
                style={styles.icon}
            />

            {/* Conteúdo */}
            <View style={styles.content}>
                <Text
                    variant="bodySmall"
                    style={[styles.label, { color: colors.onSurfaceVariant }]}
                >
                    {label}
                </Text>
                <Text
                    variant="bodyLarge"
                    style={[styles.value, { color: colors.onSurface }]}
                >
                    {value}
                </Text>
            </View>

            {/* Ícone de seta para campos clicáveis */}
            {isClickable && (
                <Icon
                    name="chevron-right"
                    size={20}
                    color={colors.onSurfaceVariant}
                    style={styles.chevron}
                />
            )}
        </ContentWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    clickable: {
        backgroundColor: 'rgba(0, 0, 0, 0.03)', // Sutilmente mais escuro para indicar interatividade
    },
    icon: {
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    label: {
        marginBottom: 2,
    },
    value: {
        fontWeight: '500',
    },
    chevron: {
        marginLeft: 8,
    },
});

export default ClickableInfoField;