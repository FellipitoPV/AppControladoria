import React, { useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity
} from 'react-native';
import {
    Text,
    Surface
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../../theme/theme';
import { ProductSelectionModal } from './ProductSelectionModal';
import { ProdutoEstoque } from './lavagemTypes';


export interface ProductsContainerProps {
    produtos: ProdutoEstoque[];
    selectedProducts: ProdutoEstoque[];
    onAddProduct: (produto: ProdutoEstoque) => void;
    onRemoveProduct: (index: number) => void;
    onUpdateProduct: (index: number, produto: ProdutoEstoque) => void;
}

const ProductsContainer: React.FC<ProductsContainerProps> = ({
    produtos,
    selectedProducts,
    onAddProduct,
    onRemoveProduct,
    onUpdateProduct
}) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);

    // useEffect(() => {
    //     console.log("Produto incial:", selectedProducts)

    // }, []);

    const handleEditProduct = (index: number) => {
        setEditingProductIndex(index);
        setIsModalVisible(true);
    };

    const handleModalConfirm = (ProdutoEstoque: ProdutoEstoque) => {
        if (editingProductIndex !== null) {
            // Editing existing ProdutoEstoque
            onUpdateProduct(editingProductIndex, ProdutoEstoque);
        } else {
            // Adding new ProdutoEstoque
            onAddProduct(ProdutoEstoque);
        }
        setIsModalVisible(false);
        setEditingProductIndex(null);
    };

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                    name="package"
                    size={20}
                    color={customTheme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Produtos Utilizados
                </Text>
            </View>

            <View style={styles.inputGroup}>
                {selectedProducts.map((item, index) => (
                    <View key={`produto-${index}`} style={styles.produtoRow}>
                        <TouchableOpacity
                            style={styles.productButton}
                            onPress={() => {
                                handleEditProduct(index)
                            }}
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
                                        Quantidade: {item.quantidade}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => onRemoveProduct(index)}
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
                        Adicionar Produto
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
                availableProducts={produtos}
                selectedProducts={selectedProducts} // Adicione esta linha
                initialProduct={
                    editingProductIndex !== null
                        ? selectedProducts[editingProductIndex]
                        : undefined
                }
            />

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