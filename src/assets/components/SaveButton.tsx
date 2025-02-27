import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../theme/theme';

interface SaveButtonProps {
    onPress: () => void;
    text: string;
    iconName: string;
    loading?: boolean;
    disabled?: boolean;
    style?: any;
    textStyle?: any;
}

const SaveButton: React.FC<SaveButtonProps> = ({
    onPress,
    text,
    iconName,
    loading = false,
    disabled = false,
    style,
    textStyle
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.saveButton,
                (loading || disabled) && styles.saveButtonDisabled,
                style
            ]}
            onPress={onPress}
            disabled={loading || disabled}
        >
            <View style={styles.saveButtonContent}>
                <MaterialCommunityIcons
                    name={iconName}
                    size={24}
                    color={
                        loading || disabled
                            ? customTheme.colors.onSurfaceDisabled
                            : customTheme.colors.onPrimary
                    }
                />
                <Text
                    style={[
                        styles.saveButtonText,
                        (loading || disabled) && styles.saveButtonTextDisabled,
                        textStyle
                    ]}
                >
                    {loading ? 'Carregando...' : text}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    saveButton: {
        backgroundColor: customTheme.colors.primary,
        borderRadius: 8,
        padding: 16,
        elevation: 3,
        minHeight: 56,
    },
    saveButtonDisabled: {
        backgroundColor: customTheme.colors.surfaceDisabled,
        elevation: 0,
    },
    saveButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    saveButtonText: {
        color: customTheme.colors.onPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    saveButtonTextDisabled: {
        color: customTheme.colors.onSurfaceDisabled,
    }
});

export default SaveButton;