import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    TextInput,
    StyleSheet,
    Modal,
    StyleProp,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { customTheme } from '../../theme/theme';

interface DropdownProps {
    items: string[];
    onSelect: (item: string) => void;
    placeholder?: string;
    searchable?: boolean;
    style?: StyleProp<ViewStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
}

export const Dropdown: React.FC<DropdownProps> = ({
    items,
    onSelect,
    placeholder = 'Selecione um item',
    searchable = false,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedItem, setSelectedItem] = useState<string | null>(null);

    const filteredItems = searchable
        ? items.filter(item =>
            item.toLowerCase().includes(searchText.toLowerCase()))
        : items;

    const handleSelect = (item: string) => {
        setSelectedItem(item);
        onSelect(item);
        setIsVisible(false);
    };

    return (
        <View style={[styles.container]}>
            <TouchableOpacity
                style={[styles.dropdownButton]}
                onPress={() => setIsVisible(true)}
            >
                <Text style={[styles.dropdownButtonText]}>
                    {selectedItem || placeholder}
                </Text>
            </TouchableOpacity>

            <Modal visible={isVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {searchable && (
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar"
                                placeholderTextColor={customTheme.colors.onSecondary}
                                value={searchText}
                                onChangeText={setSearchText}
                                autoCorrect={false}
                            />
                        )}

                        <FlatList
                            data={filteredItems}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.itemContainer}
                                    onPress={() => handleSelect(item)}
                                >
                                    <Text style={styles.itemText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            style={styles.list}
                        />

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setIsVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 20,
    },
    dropdownButton: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    dropdownButtonText: {
        fontSize: 16,
        color: '#333',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: customTheme.colors.surface,
        width: '90%',
        maxHeight: '80%',
        borderRadius: 12,
        padding: 16,
    },
    searchInput: {
        backgroundColor: customTheme.colors.secondary,
        color: customTheme.colors.onSecondary,
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        fontSize: 16,
    },
    list: {
        maxHeight: 500,
    },
    itemContainer: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    itemText: {
        fontSize: 16,
        color: '#333',
    },
    closeButton: {
        marginTop: 12,
        padding: 12,
        backgroundColor: customTheme.colors.primary,
        borderRadius: 8,
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        color: customTheme.colors.onPrimary,
        fontWeight: '500',
    },
});