import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    TextInput,
    StyleSheet,
    Modal,
} from 'react-native';

interface ClienteInterface {
    cnpjCpf: string;
    razaoSocial: string;
}

interface DropdownClientesProps {
    clientes: ClienteInterface[];
    onSelect: (cliente: ClienteInterface) => void;
    placeholder?: string;
}

export const DropdownClientes: React.FC<DropdownClientesProps> = ({
    clientes,
    onSelect,
    placeholder = 'Selecione um cliente',
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedCliente, setSelectedCliente] = useState<ClienteInterface | null>(null);

    const filteredClientes = clientes.filter((cliente) => {
        const search = searchText.toLowerCase();
        return (
            cliente.razaoSocial.toLowerCase().includes(search) ||
            cliente.cnpjCpf.replace(/[^\d]/g, '').includes(search)
        );
    });

    const handleSelect = (cliente: ClienteInterface) => {
        setSelectedCliente(cliente);
        onSelect(cliente);
        setIsVisible(false);
    };

    // Formata CNPJ/CPF para exibição
    const formatCnpjCpf = (value: string) => {
        const numbers = value.replace(/[^\d]/g, '');
        if (numbers.length === 11) {
            return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, '$1.$2.$3-$4');
        }
        return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, '$1.$2.$3/$4-$5');
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setIsVisible(true)}
            >
                <Text style={styles.dropdownButtonText}>
                    {selectedCliente
                        ? `${selectedCliente.razaoSocial} (${formatCnpjCpf(selectedCliente.cnpjCpf)})`
                        : placeholder}
                </Text>
            </TouchableOpacity>

            <Modal visible={isVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar por nome ou CNPJ/CPF"
                            value={searchText}
                            onChangeText={setSearchText}
                            autoCorrect={false}
                        />

                        <FlatList
                            data={filteredClientes}
                            keyExtractor={(item) => item.cnpjCpf}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.itemContainer}
                                    onPress={() => handleSelect(item)}
                                >
                                    <Text style={styles.itemName}>{item.razaoSocial}</Text>
                                    <Text style={styles.itemCnpj}>{formatCnpjCpf(item.cnpjCpf)}</Text>
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
        backgroundColor: '#fff',
        width: '90%',
        maxHeight: '80%',
        borderRadius: 12,
        padding: 16,
    },
    searchInput: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        fontSize: 16,
    },
    list: {
        maxHeight: 300,
    },
    itemContainer: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    itemName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    itemCnpj: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    closeButton: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
});