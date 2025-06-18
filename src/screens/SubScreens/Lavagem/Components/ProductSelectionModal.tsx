import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Button,
    Surface,
    Text,
    TextInput
} from 'react-native-paper';
import React, { useEffect, useRef, useState } from 'react';

import { Dropdown } from 'react-native-element-dropdown';
import { DropdownRef } from '../../../../helpers/Types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ProdutoEstoque } from './lavagemTypes';
import { customTheme } from '../../../../theme/theme';
import dayjs from 'dayjs';
import { showGlobalToast } from '../../../../helpers/GlobalApi';

interface ProductSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (ProdutoEstoque: ProdutoEstoque) => void;
    availableProducts: Array<ProdutoEstoque>;
    selectedProducts: Array<ProdutoEstoque>; // Adicione essa linha
    initialProduct?: ProdutoEstoque;
}


const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({
    visible,
    onClose,
    onConfirm,
    availableProducts,
    selectedProducts,
    initialProduct
}) => {
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState('1');

    // Animation setup
    const screenHeight = Dimensions.get('screen').height;
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;
    const productRef = useRef<DropdownRef>(null);

    const availableOptions = availableProducts.filter(produto =>
        !selectedProducts.some(sel => sel.nome === produto.nome) ||
        (initialProduct && initialProduct.nome === produto.nome) // Mantém o produto caso esteja em edição
    );

    // Reset state when modal opens or initial ProdutoEstoque changes
    useEffect(() => {
        if (visible) {
            // Slide in animation
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            }).start();

            // Set initial values if editing an existing ProdutoEstoque
            if (initialProduct) {
                setSelectedProduct(initialProduct.nome);
                setQuantity(initialProduct.quantidade || '1');
            } else {
                // Reset to defaults if adding new ProdutoEstoque
                setSelectedProduct('');
                setQuantity('1');
            }
        } else {
            // Slide out animation
            Animated.timing(slideAnim, {
                toValue: screenHeight,
                duration: 300,
                useNativeDriver: true
            }).start();
        }
    }, [visible, initialProduct, screenHeight]);

    const handleConfirm = () => {
        console.log('Selected Product:', selectedProduct);
        console.log('Quantity:', quantity);
        
        if (!selectedProduct) {
            showGlobalToast('error', 'Erro', 'Selecione um produto', 2000);
            return;
        }

        const produtoSelecionado = availableProducts.find(p => p.nome === selectedProduct);
        const quantidadeEstoque = parseInt(produtoSelecionado?.quantidade || '0');
        const quantidadeDigitada = parseInt(quantity);

        if (quantidadeDigitada > quantidadeEstoque) {
            showGlobalToast(
                'info',
                'Quantidade Excedida',
                `Quantidade máxima disponível: ${quantidadeEstoque}`,
                3000
            );
            setQuantity(quantidadeEstoque.toString());
            return;
        }

        onConfirm({
            nome: selectedProduct,
            quantidade: quantity,
            unidadeMedida: produtoSelecionado?.unidadeMedida || 'litro',
            quantidadeMinima: produtoSelecionado?.quantidadeMinima || '0',
            photoUrl: produtoSelecionado?.photoUrl || '',
            createdAt: produtoSelecionado?.createdAt || dayjs().toISOString(),
            updatedAt: produtoSelecionado?.updatedAt || dayjs().toISOString(),
        });

        // Reset states and close
        setSelectedProduct('');
        setQuantity('1');
        onClose();
    };

    const handleDismiss = () => {
        Animated.spring(slideAnim, {
            toValue: screenHeight,
            bounciness: 2,
            speed: 20,
            useNativeDriver: true
        }).start();

        setTimeout(onClose, 50);
    };

    const handleQuantityChange = (text: string) => {
        // Remove qualquer caractere não numérico, mas permite string vazia
        const numericText = text.replace(/[^0-9]/g, '');

        // Se estiver vazio, define como string vazia
        if (numericText === '') {
            setQuantity('');
            return;
        }

        // Get the current ProdutoEstoque's available stock
        const produtoSelecionado = availableProducts.find(p => p.nome === selectedProduct);
        const quantidadeEstoque = parseInt(produtoSelecionado?.quantidade || '0');

        let quantidadeDigitada = parseInt(numericText);

        // Se excedeu o estoque, limita na quantidade máxima
        if (quantidadeDigitada > quantidadeEstoque) {
            quantidadeDigitada = quantidadeEstoque;
            showGlobalToast(
                'info',
                'Quantidade Excedida',
                `Quantidade máxima disponível: ${quantidadeEstoque}`,
                3000
            );
        }

        setQuantity(quantidadeDigitada.toString());
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleDismiss}
        >
            <View style={styles.modalOverlay}>
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{
                                translateY: slideAnim
                            }]
                        }
                    ]}
                >
                    <Surface style={styles.modalContent}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderContent}>
                                <MaterialCommunityIcons
                                    name="package"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <Text variant="titleLarge">
                                    {initialProduct ? 'Editar Produto' : 'Adicionar Produto'}
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={handleDismiss}
                                style={styles.closeButton}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons
                                    name="close"
                                    size={24}
                                    color={customTheme.colors.error}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Modal Content */}
                        <View style={styles.modalContentInner}>

                            {/* ProdutoEstoque Dropdown */}
                            <TouchableOpacity
                                style={styles.dropdownContainer}
                                activeOpacity={0.7}
                                onPress={() => productRef.current?.open()}
                            >
                                <Dropdown
                                    ref={productRef}
                                    style={styles.dropdown}
                                    placeholderStyle={styles.placeholderStyle}
                                    selectedTextStyle={styles.selectedTextStyle}
                                    data={availableOptions}
                                    labelField="nome"
                                    valueField="nome"
                                    placeholder="Selecione o produto"
                                    value={selectedProduct}
                                    onChange={item => {
                                        setSelectedProduct(item.nome);
                                        const produtoSelecionado = availableProducts.find(p => p.nome === item.nome);
                                        const quantidadeEstoque = parseInt(produtoSelecionado?.quantidade || '0');
                                        setQuantity(Math.min(1, quantidadeEstoque).toString());
                                    }}
                                    renderLeftIcon={() => (
                                        <MaterialCommunityIcons
                                            name="package-variant"
                                            size={20}
                                            color={customTheme.colors.primary}
                                            style={styles.dropdownIcon}
                                        />
                                    )}
                                    renderItem={item => (
                                        <View style={styles.dropdownItem}>
                                            <MaterialCommunityIcons
                                                name="package-variant"
                                                size={20}
                                                color={customTheme.colors.primary}
                                            />
                                            <Text style={styles.dropdownLabel}>
                                                {item.nome} {`(${item.quantidade} ${item.unidadeMedida}${item.quantidade <= 1 ? '' : 's'} ${item.quantidade <= 1 ? 'disponível' : 'disponíveis'})`}
                                            </Text>
                                        </View>
                                    )}
                                />

                            </TouchableOpacity>

                            {/* Quantity Input */}
                            <TextInput
                                mode="outlined"
                                label="Quantidade"
                                value={quantity}
                                onChangeText={handleQuantityChange}
                                keyboardType="numeric"
                                style={styles.quantityInput}
                                left={
                                    <TextInput.Icon
                                        icon={() => (
                                            <MaterialCommunityIcons
                                                name="numeric"
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                        )}
                                    />
                                }
                            />

                            {/* Confirm Button */}
                            <Button
                                mode="contained"
                                onPress={handleConfirm}
                                style={styles.confirmButton}
                                disabled={!selectedProduct || !quantity} // Adicione || !quantity aqui
                            >
                                {initialProduct ? 'Atualizar' : 'Adicionar'}
                            </Button>
                        </View>
                    </Surface>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        width: '100%',
        maxHeight: '95%',
    },
    modalContent: {
        backgroundColor: customTheme.colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '100%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    closeButton: {
        padding: 8,
    },
    modalContentInner: {
        paddingVertical: 16,
        gap: 16,
    },
    dropdownContainer: {
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
    },
    dropdown: {
        height: 56,
        paddingHorizontal: 16,
    },
    dropdownIcon: {
        marginRight: 12,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    dropdownLabel: {
        flex: 1,
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    placeholderStyle: {
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
    },
    selectedTextStyle: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    quantityInput: {
        backgroundColor: '#FFFFFF',
    },
    confirmButton: {
        marginTop: 8,
    },
});

export { ProductSelectionModal };