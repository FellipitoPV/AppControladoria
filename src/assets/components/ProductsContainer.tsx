import React, { useState } from 'react';
import {
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Surface,
    Text
} from 'react-native-paper';

import { FormFieldConfig } from './Fomulario/FormularioConfig';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ProductSelectionModal } from '../../screens/SubScreens/Lavagem/Components/ProductSelectionModal';
import { ProdutoEstoque } from '../../contexts/backgroundSyncContext';
import { customTheme } from '../../theme/theme';

interface ProductsContainerProps {
    field: FormFieldConfig;
    value: ProdutoEstoque[];
    onChange: (name: string, value: ProdutoEstoque[]) => void;
}

const ProductsContainer: React.FC<ProductsContainerProps> = ({
    field,
    value,
    onChange,
}) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);

    const handleAddProduct = (produto: ProdutoEstoque) => {
        console.log('handleAddProduct chamado com produto:', produto);
        const newProducts = [...value, produto];
        onChange(field.name, newProducts);
        // Removido: field.products?.onAddProduct?.(produto);
    };

    const handleRemoveProduct = (index: number) => {
        console.log('handleRemoveProduct chamado com index:', index);
        const newProducts = value.filter((_, idx) => idx !== index);
        onChange(field.name, newProducts);
        field.products?.onRemoveProduct?.(index);
    };

    const handleUpdateProduct = (index: number, produto: ProdutoEstoque) => {
        console.log('handleUpdateProduct chamado com index:', index, 'produto:', produto);
        const newProducts = [...value];
        newProducts[index] = produto;
        onChange(field.name, newProducts);
        field.products?.onUpdateProduct?.(index, produto);
    };

    const handleEditProduct = (index: number) => {
        console.log('handleEditProduct chamado com index:', index);
        setEditingProductIndex(index);
        setIsModalVisible(true);
    };

    const handleModalConfirm = (produto: ProdutoEstoque) => {
        console.log('handleModalConfirm chamado com produto:', produto);
        if (editingProductIndex !== null) {
            handleUpdateProduct(editingProductIndex, produto);
        } else {
            handleAddProduct(produto);
        }
        setIsModalVisible(false);
        setEditingProductIndex(null);
    };

    return (
        <View style={styles.section}>

            <View style={styles.inputGroup}>
                {value.map((item, index) => (
                    <View key={`produto-${index}`} style={styles.produtoRow}>
                        <TouchableOpacity
                            style={styles.productButton}
                            onPress={() => handleEditProduct(index)}
                        >
                            <View style={styles.productButtonContent}>
                                <MaterialCommunityIcons
                                    name="package-variant"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <View style={styles.productTextContainer}>
                                    <Text style={styles.productNameText}>{item.nome}</Text>
                                    <Text style={styles.productQuantityText}>
                                        Quantidade: {item.quantidade} {item.unidadeMedida || ''}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => handleRemoveProduct(index)}
                                style={styles.removeButton}
                            >
                                <MaterialCommunityIcons
                                    name="delete-outline"
                                    size={24}
                                    color={customTheme.colors.error}
                                />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity
                    style={styles.addProductButton}
                    onPress={() => {
                        console.log('Abrindo modal para adicionar produto');
                        setEditingProductIndex(null);
                        setIsModalVisible(true);
                    }}
                >
                    <MaterialCommunityIcons
                        name="plus"
                        size={24}
                        color={customTheme.colors.primary}
                    />
                    <Text style={styles.addProductButtonText}>
                        Adicionar {field.label}
                    </Text>
                </TouchableOpacity>
            </View>

            <ProductSelectionModal
                visible={isModalVisible}
                onClose={() => {
                    setIsModalVisible(false);
                    setEditingProductIndex(null);
                }}
                onConfirm={handleModalConfirm}
                availableProducts={field.products?.availableProducts || []}
                selectedProducts={value}
                initialProduct={
                    editingProductIndex !== null ? value[editingProductIndex] : undefined
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
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
    produtoRow: {
        marginBottom: 8,
    },
    productButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        padding: 12,
        elevation: 1,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    productButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    productTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    productNameText: {
        fontSize: 16,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    productQuantityText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    removeButton: {
        padding: 8,
    },
    addProductButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: customTheme.colors.primary,
        borderStyle: 'dashed',
        borderRadius: 8,
        paddingVertical: 12,
        marginTop: 8,
    },
    addProductButtonText: {
        marginLeft: 8,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
});

export { ProductsContainer };
