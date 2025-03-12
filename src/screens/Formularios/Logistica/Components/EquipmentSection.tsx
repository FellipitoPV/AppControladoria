import React from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Dropdown } from 'react-native-element-dropdown';
import { customTheme } from '../../../../theme/theme';
import { Equipment, Container } from './logisticTypes';


// Props do componente
interface EquipmentSectionProps {
    equipamentosSelecionados: Equipment[];
    containersSelecionados: Container[];
    onAddEquipment: (item: Equipment) => void;
    onRemoveEquipment: (id: string) => void;
    onUpdateEquipmentQuantity: (id: string, quantity: number) => void;
    onAddContainer: (item: Container) => void;
    onRemoveContainer: (id: string) => void;
    onUpdateContainerQuantity: (id: string, quantity: number) => void;
    listaTiposEquipamentos: Equipment[];
    listaTiposContainers: Container[];
    equipamentoError?: boolean;
}

// Helper functions com tipagem
const formatarTipoEquipamento = (equipment: Equipment): string => {
    // Implemente a lógica de formatação aqui
    return `${equipment.label}`;
};

const formatarTipoContainer = (container: Container): string => {
    let localTipo = container.tipo;

    if (container.tipo === "cacamba") {
        localTipo = "Caçamba";
    }

    if (container.residuo && container.capacidade) {
        return `${localTipo} ${container.capacidade} - ${container.residuo}`;
    }
    else if (container.capacidade) {
        return `${localTipo} ${container.capacidade}`;
    }

    return localTipo;
};

const EquipmentSection: React.FC<EquipmentSectionProps> = ({
    equipamentosSelecionados,
    containersSelecionados,
    onAddEquipment,
    onRemoveEquipment,
    onUpdateEquipmentQuantity,
    onAddContainer,
    onRemoveContainer,
    onUpdateContainerQuantity,
    listaTiposEquipamentos,
    listaTiposContainers,
    equipamentoError = false,
}) => {
    const renderQuantityControls = (
        item: Equipment | Container,
        quantidade: number,
        onUpdate: (id: string, quantity: number) => void
    ) => (
        <View style={styles.quantityControls}>
            <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: customTheme.colors.surfaceVariant }]}
                onPress={() => onUpdate(item.id, Math.max(1, quantidade - 1))}
            >
                <MaterialIcons name="remove" size={20} color={customTheme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantidade}</Text>
            <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: customTheme.colors.surfaceVariant }]}
                onPress={() => onUpdate(item.id, quantidade + 1)}
            >
                <MaterialIcons name="add" size={20} color={customTheme.colors.primary} />
            </TouchableOpacity>
        </View>
    );

    const renderSelectedItem = (
        item: Equipment | Container,
        index: number,
        isEquipment: boolean = true
    ) => (
        <Animated.View style={styles.selectedItemCard} key={item.id}>
            <Surface style={styles.itemSurface}>
                <View style={styles.itemHeader}>
                    <View style={styles.itemIconContainer}>
                        <MaterialIcons
                            name={isEquipment ? "local-shipping" : "inventory"}
                            size={24}
                            color={customTheme.colors.primary}
                        />
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle}>
                            {isEquipment
                                ? formatarTipoEquipamento(item as Equipment)
                                : formatarTipoContainer(item as Container)
                            }
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => isEquipment ? onRemoveEquipment(item.id) : onRemoveContainer(item.id)}
                    >
                        <MaterialIcons name="close" size={20} color={customTheme.colors.error} />
                    </TouchableOpacity>
                </View>

                <View style={styles.itemFooter}>
                    {renderQuantityControls(
                        item.tipo ? item : item,
                        item?.quantidade ?? 0,
                        isEquipment ? onUpdateEquipmentQuantity : onUpdateContainerQuantity
                    )}
                </View>
            </Surface>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            {/* Equipment Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MaterialIcons name="local-shipping" size={24} color={customTheme.colors.primary} />
                    <Text style={styles.sectionTitle}>Equipamentos</Text>
                </View>

                <Dropdown
                    style={[styles.dropdown, equipamentoError && styles.dropdownError]}
                    data={listaTiposEquipamentos.filter(e =>
                        !equipamentosSelecionados.some(se => se.id === e.id)
                    )}
                    labelField="placa"
                    valueField="id"
                    placeholder="Adicionar Equipamento"
                    placeholderStyle={{ color: customTheme.colors.onSurface }}
                    onChange={(item: Equipment) => onAddEquipment(item)}
                    renderRightIcon={() => (
                        <MaterialIcons
                            name="add-circle-outline"  // Você pode escolher entre vários ícones
                            size={24}
                            color={customTheme.colors.primary}
                        />
                    )}
                    renderItem={(item: Equipment) => (
                        <View style={styles.dropdownItem}>
                            <MaterialIcons
                                name="local-shipping"
                                size={24}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.dropdownItemText}>
                                {formatarTipoEquipamento(item)}
                            </Text>
                        </View>
                    )}
                />

                <View style={styles.selectedItemsList}>
                    {equipamentosSelecionados.map((item, index) =>
                        renderSelectedItem(item, index, true)
                    )}
                </View>
            </View>

            {/* Containers Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MaterialIcons name="inventory" size={24} color={customTheme.colors.primary} />
                    <Text style={styles.sectionTitle}>Containers</Text>
                </View>

                <Dropdown
                    style={styles.dropdown}
                    data={listaTiposContainers.filter(c =>
                        !containersSelecionados.some(sc => sc.id === c.id)
                    )}
                    labelField="numero"
                    valueField="id"
                    placeholder="Adicionar Container"
                    searchPlaceholder='Buscar container'
                    placeholderStyle={{ color: customTheme.colors.onSurface }}
                    onChange={(item: Container) => onAddContainer(item)}
                    renderRightIcon={() => (
                        <MaterialIcons
                            name="add-circle-outline"
                            size={24}
                            color={customTheme.colors.primary}
                        />
                    )}
                    renderItem={(item: Container) => (
                        <View style={styles.dropdownItem}>
                            <MaterialIcons
                                name="inventory"
                                size={24}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.dropdownItemText}>
                                {formatarTipoContainer(item)}
                            </Text>
                        </View>
                    )}
                />

                <View style={styles.selectedItemsList}>
                    {containersSelecionados.map((item, index) =>
                        renderSelectedItem(item, index, false)
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 24,
        marginBottom: 24,
    },
    section: {
        padding: 5,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
    dropdown: {
        height: 50,
        backgroundColor: customTheme.colors.surface,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    dropdownError: {
        borderColor: customTheme.colors.error,
        borderWidth: 2,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
    },
    dropdownItemText: {
        flex: 1,
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    selectedItemsList: {
        gap: 12,
    },
    selectedItemCard: {},
    itemSurface: {
        borderWidth: 1,
        borderColor: customTheme.colors.outlineVariant,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outlineVariant,
        gap: 12,
    },
    itemIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: customTheme.colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    itemFooter: {
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: customTheme.colors.outlineVariant,
    },
    quantityButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityText: {
        minWidth: 40,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    removeButton: {
        padding: 8,
    },
});

export default EquipmentSection;