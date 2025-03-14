import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { Component } from 'react'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Surface, ProgressBar } from 'react-native-paper';
import { customTheme } from '../../../../theme/theme';
import { ProdutoEstoque } from './lavagemTypes';

interface LowStockAlertProps {
    produtos: ProdutoEstoque[];
}

export const LowStockAlert: React.FC<LowStockAlertProps> = ({ produtos }) => {
    const produtosBaixoEstoque = produtos?.filter(p =>
        parseInt(p.quantidade) <= parseInt(p.quantidadeMinima)
    ) || [];

    if (produtosBaixoEstoque.length === 0) return null;

    return (
        <Surface style={styles.container}>
            <View style={styles.header}>
                <Icon name="alert-octagon" size={18} color="#E57373" />
                <Text style={styles.title}>Estoque Baixo • {produtosBaixoEstoque.length} itens</Text>
            </View>

            {produtosBaixoEstoque.slice(0, 3).map((produto) => (
                <View key={produto.id} style={styles.itemRow}>
                    <Text numberOfLines={1} style={[styles.itemName, { color: '#333333' }]}>
                        {produto.nome || "Nome indisponível"}
                    </Text>
                    <View style={styles.quantityContainer}>
                        <Text style={styles.quantity}>
                            {produto.quantidade}/{produto.quantidadeMinima}
                        </Text>
                        <ProgressBar
                            progress={parseInt(produto.quantidade) / parseInt(produto.quantidadeMinima)}
                            color="#E57373"
                            style={styles.progressBar}
                        />
                    </View>
                </View>
            ))}

            {produtosBaixoEstoque.length > 3 && (
                <TouchableOpacity style={styles.viewMore}>
                    <Text style={styles.viewMoreText}>Ver mais {produtosBaixoEstoque.length - 3} itens</Text>
                    <Icon name="chevron-right" size={14} color={customTheme.colors.primary} />
                </TouchableOpacity>
            )}
        </Surface>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        borderRadius: 10,
        padding: 12,
        elevation: 1,
        borderLeftWidth: 3,
        borderLeftColor: "#E57373"
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: '#D32F2F',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    itemName: {
        fontSize: 13,
        flex: 1,
        marginRight: 8,
    },
    quantityContainer: {
        width: 80,
    },
    quantity: {
        fontSize: 12,
        color: '#D32F2F',
        textAlign: 'right',
        marginBottom: 2,
    },
    progressBar: {
        height: 3,
        borderRadius: 2,
    },
    viewMore: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
    },
    viewMoreText: {
        fontSize: 12,
        color: customTheme.colors.primary,
        marginRight: 2,
    }
});