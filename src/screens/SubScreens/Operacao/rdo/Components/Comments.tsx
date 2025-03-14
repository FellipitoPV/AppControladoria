import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../../../theme/theme';

interface CommentsProps {
    comentarioGeral: string;
    setComentarioGeral: React.Dispatch<React.SetStateAction<string>>;
}

const Comments: React.FC<CommentsProps> = ({
    comentarioGeral,
    setComentarioGeral
}) => {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                    name="comment-text"
                    size={20}
                    color={customTheme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Comentários Gerais
                </Text>
            </View>

            <View style={styles.inputGroup}>
                <TextInput
                    mode="outlined"
                    label="Comentários (Opcional)"
                    value={comentarioGeral}
                    onChangeText={setComentarioGeral}
                    style={[styles.input, styles.multilineInput]}
                    multiline={true}
                    numberOfLines={5}
                    left={<TextInput.Icon
                        icon={() => (
                            <MaterialCommunityIcons
                                name="chat"
                                size={24}
                                color={customTheme.colors.primary}
                            />
                        )}
                    />}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    sectionTitle: {
        color: customTheme.colors.onSurface,
        fontWeight: '600',
        fontSize: 18,
    },
    inputGroup: {
        gap: 10,
    },
    input: {
        backgroundColor: '#FFFFFF',
        height: 56,
    },
    multilineInput: {
        height: 120,
        textAlignVertical: 'top',
    },
});

export default Comments;