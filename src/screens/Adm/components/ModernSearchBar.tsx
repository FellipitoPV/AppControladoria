import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Platform,
} from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../theme/theme';

interface SearchBarProps {
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    onClear?: () => void;
}

const ModernSearchBar: React.FC<SearchBarProps> = ({
    placeholder = "Buscar usuário...",
    value,
    onChangeText,
    onClear,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const animatedValue = new Animated.Value(0);

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: isFocused ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [isFocused]);

    const handleClear = () => {
        onChangeText('');
        if (onClear) onClear();
    };

    // Animações aprimoradas
    const inputScale = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.02],
    });

    const elevation = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [3, 8],
    });

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ scale: inputScale }],
                    elevation: elevation,
                    shadowOpacity: isFocused ? 0.25 : 0.15,
                    shadowRadius: isFocused ? 8 : 4,
                    borderColor: isFocused ? customTheme.colors.primary : 'transparent',
                    backgroundColor: isFocused ? '#ffffff' : '#f8f8f8',
                }
            ]}
        >
            <View style={styles.searchRow}>
                <Icon
                    name="account-search"
                    size={22}
                    color={isFocused ? customTheme.colors.primary : '#888'}
                    style={styles.searchIcon}
                />
                <TextInput
                    placeholder={placeholder}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={styles.input}
                    placeholderTextColor={isFocused ? '#999' : '#aaa'}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    selectionColor={customTheme.colors.primary}
                    theme={{
                        colors: {
                            primary: 'transparent',
                            background: 'transparent'
                        }
                    }}
                    dense
                />
                {value.length > 0 && (
                    <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                        <Icon name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </View>
            {isFocused && (
                <Animated.View
                    style={[
                        styles.focusIndicator,
                        {
                            backgroundColor: customTheme.colors.primary,
                            width: animatedValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            })
                        }
                    ]}
                />
            )}
        </Animated.View>
    );
};

// Novo componente para adicionar no seu SearchContainer
const EnhancedSearchContainer: React.FC<{
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    resultCount?: number;
}> = ({ searchQuery, setSearchQuery, resultCount }) => {
    return (
        <View style={enhancedStyles.searchContainer}>
            <ModernSearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar por nome, email ou cargo..."
            />
            {resultCount !== undefined && searchQuery.length > 0 && (
                <View style={enhancedStyles.resultStats}>
                    <Text style={enhancedStyles.resultStatsText}>
                        {resultCount} {resultCount === 1 ? 'usuário encontrado' : 'usuários encontrados'}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        borderWidth: 1.5,
        overflow: 'hidden',
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    searchIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: Platform.OS === 'ios' ? 42 : 46,
        paddingVertical: 0,
        backgroundColor: 'transparent',
        fontSize: 15,
    },
    clearButton: {
        padding: 8,
    },
    focusIndicator: {
        height: 3,
        alignSelf: 'center',
    },
});

const enhancedStyles = StyleSheet.create({
    searchContainer: {
        padding: 16,
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    resultStats: {
        marginTop: 4,
        paddingHorizontal: 8,
    },
    resultStatsText: {
        fontSize: 12,
        color: customTheme.colors.primary,
        fontWeight: '500',
    }
});

export { ModernSearchBar, EnhancedSearchContainer };