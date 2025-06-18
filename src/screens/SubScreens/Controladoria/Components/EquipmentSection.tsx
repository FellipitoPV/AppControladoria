import React, { useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Modal,
    Animated
} from 'react-native';
import {
    Text,
    Surface,
    TextInput,
    Button
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import { customTheme } from '../../../../theme/theme';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import { Container, Equipment } from '../types/logisticTypes';
import { DropdownRef } from '../../Operacao/rdo/Types/rdoTypes';

interface EquipmentSectionProps {
    equipamentosSelecionados: Equipment[];
    containersSelecionados: any[];
    onAddEquipment: (item: Equipment) => void;
    onRemoveEquipment: (id: string) => void;
    onUpdateEquipmentQuantity: (id: string, quantity: number) => void;
    onAddContainer: (item: Container) => void;
    onRemoveContainer: (id: string) => void;
    onUpdateContainerQuantity: (id: string, quantity: number) => void;
    listaTiposEquipamentos: any[];
    listaTiposContainers: any[];
    equipamentoError: boolean;
}

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
    equipamentoError
}) => {
    // Modal state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isContainerModal, setIsContainerModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingType, setEditingType] = useState<'equipment' | 'container'>('equipment');

    // Get the icon for a specific equipment or container type
    const getIcon = (tipoLabel: string, isContainer: boolean): string => {
        if (isContainer) {
            const container = listaTiposContainers.find(c => c.label === tipoLabel || c.tipo === tipoLabel);
            return container?.icon || 'package-variant-closed';
        } else {
            const equipment = listaTiposEquipamentos.find(e => e.label === tipoLabel || e.tipo === tipoLabel);
            return equipment?.icon || 'wrench';
        }
    };

    // Handle editing an equipment
    const handleEditEquipment = (index: number) => {
        setEditingIndex(index);
        setEditingType('equipment');
        setIsContainerModal(false);
        setIsModalVisible(true);
    };

    // Handle editing a container
    const handleEditContainer = (index: number) => {
        setEditingIndex(index);
        setEditingType('container');
        setIsContainerModal(true);
        setIsModalVisible(true);
    };

    // Handle adding a new equipment
    const handleAddEquipment = () => {
        setEditingIndex(null);
        setEditingType('equipment');
        setIsContainerModal(false);
        setIsModalVisible(true);
    };

    // Handle adding a new container
    const handleAddContainer = () => {
        setEditingIndex(null);
        setEditingType('container');
        setIsContainerModal(true);
        setIsModalVisible(true);
    };

    // Handle closing the modal
    const handleModalClose = () => {
        setIsModalVisible(false);
        setEditingIndex(null);
    };

    return (
        <View style={styles.container}>
            {/* Equipment Section */}
            <View style={styles.sectionContainer}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Equipamentos
                </Text>

                {/* Render selected equipment list */}
                <View style={styles.itemsList}>
                    {equipamentosSelecionados.map((item, index) => (
                        <View key={`equipment-${item.id || index}`} style={styles.itemRow}>
                            <TouchableOpacity
                                style={styles.itemButton}
                                onPress={() => handleEditEquipment(index)}
                            >
                                <View style={styles.itemButtonContent}>
                                    <Icon
                                        name={getIcon(item.label, false)}
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                    <View style={styles.itemTextContainer}>
                                        <Text style={styles.itemNameText}>
                                            {item.tipo || "Selecione um equipamento"}
                                        </Text>
                                        <Text style={styles.itemQuantityText}>
                                            Quantidade: {item.quantidade || "1"}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => onRemoveEquipment(item.id)}
                                    style={styles.removeButton}
                                    disabled={equipamentosSelecionados.length <= 0}
                                >
                                    <Icon
                                        name="delete-outline"
                                        size={24}
                                        color={equipamentosSelecionados.length <= 0 ?
                                            customTheme.colors.surfaceDisabled :
                                            customTheme.colors.error}
                                    />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </View>
                    ))}

                    {/* Add equipment button */}
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleAddEquipment}
                    >
                        <Icon
                            name="plus"
                            size={24}
                            color={customTheme.colors.primary}
                        />
                        <Text style={styles.addButtonText}>
                            Adicionar Equipamento
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Container Section */}
            <View style={styles.sectionContainer}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Containers
                </Text>

                {/* Render selected containers list */}
                <View style={styles.itemsList}>
                    {containersSelecionados.map((item, index) => (
                        <View key={`container-${item.id || index}`} style={styles.itemRow}>
                            <TouchableOpacity
                                style={styles.itemButton}
                                onPress={() => handleEditContainer(index)}
                            >
                                <View style={styles.itemButtonContent}>
                                    <Icon
                                        name={getIcon(item.tipo, true)}
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                    <View style={styles.itemTextContainer}>
                                        <Text style={styles.itemNameText}>
                                            {item.tipo} {item.capacidade ? `(${item.capacidade})` : ''}
                                        </Text>
                                        <Text style={styles.itemQuantityText}>
                                            Quantidade: {item.quantidade || "1"}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => onRemoveContainer(item.id)}
                                    style={styles.removeButton}
                                    disabled={containersSelecionados.length <= 0}
                                >
                                    <Icon
                                        name="delete-outline"
                                        size={24}
                                        color={containersSelecionados.length <= 0 ?
                                            customTheme.colors.surfaceDisabled :
                                            customTheme.colors.error}
                                    />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </View>
                    ))}

                    {/* Add container button */}
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleAddContainer}
                    >
                        <Icon
                            name="plus"
                            size={24}
                            color={customTheme.colors.primary}
                        />
                        <Text style={styles.addButtonText}>
                            Adicionar Container
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Selection Modal */}
            <SelectionModal
                visible={isModalVisible}
                onClose={handleModalClose}
                isContainer={isContainerModal}
                editingIndex={editingIndex}
                equipmentsList={listaTiposEquipamentos}
                containersList={listaTiposContainers}
                selectedEquipments={equipamentosSelecionados}
                selectedContainers={containersSelecionados}
                onAddEquipment={onAddEquipment}
                onUpdateEquipment={onUpdateEquipmentQuantity}
                onAddContainer={onAddContainer}
                onUpdateContainer={onUpdateContainerQuantity}
            />
        </View>
    );
};

interface SelectionModalProps {
    visible: boolean;
    onClose: () => void;
    isContainer: boolean;
    editingIndex: number | null;
    equipmentsList: any[];
    containersList: any[];
    selectedEquipments: any[];
    selectedContainers: any[];
    onAddEquipment: (item: Equipment) => void;
    onUpdateEquipment: (id: string, quantity: number) => void;
    onAddContainer: (item: Container) => void;
    onUpdateContainer: (id: string, quantity: number) => void;
}

const SelectionModal: React.FC<SelectionModalProps> = ({
    visible,
    onClose,
    isContainer,
    editingIndex,
    equipmentsList,
    containersList,
    selectedEquipments,
    selectedContainers,
    onAddEquipment,
    onUpdateEquipment,
    onAddContainer,
    onUpdateContainer
}) => {
    // State for selected item and quantity
    const [selectedItem, setSelectedItem] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [selectedItemLabel, setSelectedItemLabel] = useState('');
    const [selectedCapacity, setSelectedCapacity] = useState('');

    // Animation setup
    const screenHeight = Dimensions.get('screen').height;
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;
    
    // Refs
    const dropdownRef = useRef<DropdownRef>(null);

    // Initial items for editing
    const initialItem = React.useMemo(() => {
        if (editingIndex === null) return undefined;
        
        return isContainer
            ? (selectedContainers[editingIndex] || undefined)
            : (selectedEquipments[editingIndex] || undefined);
    }, [editingIndex, isContainer, selectedContainers, selectedEquipments]);

    // Get filtered list of available items
    const getFilteredItems = React.useMemo(() => {
        const selectedItems = isContainer ? selectedContainers : selectedEquipments;
        
        // Transform lists to dropdown format if needed
        const formattedList = (isContainer ? containersList : equipmentsList).map(item => {
            // Se o item já tiver label e value, use-os
            if (item.label && item.value) {
                return item;
            }
            // Caso contrário, crie propriedades label e value com base no tipo e id
            return {
                ...item,
                label: item.label || item.tipo,
                value: item.value || item.id
            };
        });
        
        return formattedList.filter(item => {
            // If we're editing, allow the current item
            if (initialItem && initialItem.id === item.id) {
                return true;
            }
            
            // Filter out already selected items
            const alreadyExists = selectedItems.some(
                selected => selected.id === item.id
            );
            
            return !alreadyExists;
        });
    }, [isContainer, containersList, equipmentsList, selectedContainers, selectedEquipments, initialItem]);

    // Handle quantity change
    const handleQuantityChange = (text: string) => {
        // Remove any non-numeric characters
        const numericText = text.replace(/[^0-9]/g, '');
        
        // Permitir que o campo fique vazio durante a digitação
        setQuantity(numericText);
    };

    // Handle confirm action
    const handleConfirm = () => {
        if (!selectedItem) {
            showGlobalToast('error', 'Erro', `Selecione um ${isContainer ? 'container' : 'equipamento'}`, 2000);
            return;
        }

        if (!quantity || quantity.trim() === '' || parseInt(quantity) < 1) {
            showGlobalToast('error', 'Erro', 'Quantidade inválida', 2000);
            return;
        }

        const quantityNumber = parseInt(quantity);

        if (isContainer) {
            // Handle container selection
            if (initialItem && editingIndex !== null) {
                // Update existing container
                onUpdateContainer(initialItem.id, quantityNumber);
            } else {
                // Add new container from the filtered list
                const selectedContainerItem = getFilteredItems.find(item => item.value === selectedItem);
                if (selectedContainerItem) {
                    onAddContainer({
                        id: Date.now().toString(),
                        tipo: selectedContainerItem.label || selectedContainerItem.tipo,
                        capacidade: selectedContainerItem.capacidade || selectedCapacity,
                        status: 'disponivel',
                        quantidade: quantityNumber
                    });
                }
            }
        } else {
            // Handle equipment selection
            if (initialItem && editingIndex !== null) {
                // Update existing equipment
                onUpdateEquipment(initialItem.id, quantityNumber);
            } else {
                // Add new equipment from the filtered list
                const selectedEquipmentItem = getFilteredItems.find(item => item.value === selectedItem);
                if (selectedEquipmentItem) {
                    onAddEquipment({
                        id: Date.now().toString(),
                        label: selectedEquipmentItem.label || selectedEquipmentItem.tipo,
                        status: 'disponivel',
                        quantidade: quantityNumber
                    });
                }
            }
        }

        onClose();
    };

    // Handle dismiss
    const handleDismiss = () => {
        Animated.spring(slideAnim, {
            toValue: screenHeight,
            bounciness: 2,
            speed: 20,
            useNativeDriver: true
        }).start();

        setTimeout(onClose, 50);
    };

    // Reset modal state and animate when visibility changes
    React.useEffect(() => {
        if (visible) {
            // Animate the modal in when it becomes visible
            Animated.spring(slideAnim, {
                toValue: 0,
                bounciness: 2,
                speed: 20,
                useNativeDriver: true
            }).start();

            if (initialItem) {
                // Set values for editing mode
                const itemList = isContainer ? containersList : equipmentsList;
                const itemFound = itemList.find(item => item.tipo === initialItem.tipo);
                
                setSelectedItem(itemFound?.id || '');
                setSelectedItemLabel(initialItem.tipo || '');
                setSelectedCapacity(initialItem.capacidade || '');
                setQuantity(initialItem.quantidade?.toString() || '1');
            } else {
                // Reset for new entry
                setSelectedItem('');
                setSelectedItemLabel('');
                setSelectedCapacity('');
                setQuantity('1');
            }
        } else {
            // Reset the animation when modal closes
            slideAnim.setValue(screenHeight);
        }
    }, [visible, initialItem, isContainer, containersList, equipmentsList]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
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
                                <Icon
                                    name={isContainer ? "package-variant-closed" : "tools"}
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <Text variant="titleLarge">
                                    {initialItem 
                                        ? `Editar ${isContainer ? 'Container' : 'Equipamento'}`
                                        : `Adicionar ${isContainer ? 'Container' : 'Equipamento'}`
                                    }
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={handleDismiss}
                                style={styles.closeButton}
                                activeOpacity={0.7}
                            >
                                <Icon
                                    name="close"
                                    size={24}
                                    color={customTheme.colors.error}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Modal Content */}
                        <View style={styles.modalContentInner}>

                            {/* Item Dropdown */}
                            <TouchableOpacity
                                style={styles.dropdownContainer}
                                activeOpacity={0.7}
                                onPress={() => dropdownRef.current?.open()}
                            >
                                <Dropdown
                                    ref={dropdownRef}
                                    style={styles.dropdown}
                                    placeholderStyle={styles.placeholderStyle}
                                    selectedTextStyle={styles.selectedTextStyle}
                                    data={getFilteredItems}
                                    labelField="label"
                                    valueField="value"
                                    placeholder={`Selecione o ${isContainer ? 'container' : 'equipamento'}`}
                                    value={selectedItem}
                                    onChange={item => {
                                        setSelectedItem(item.value);
                                        setSelectedItemLabel(item.label || item.tipo);
                                        if (isContainer && item.capacidade) {
                                            setSelectedCapacity(item.capacidade);
                                        }
                                    }}
                                    renderLeftIcon={() => (
                                        <Icon
                                            name={isContainer ? "package-variant-closed" : "wrench"}
                                            size={20}
                                            color={customTheme.colors.primary}
                                            style={styles.dropdownIcon}
                                        />
                                    )}
                                    renderItem={item => (
                                        <View style={styles.dropdownItem}>
                                            <Icon
                                                name={item.icon || (isContainer ? "package-variant-closed" : "wrench")}
                                                size={20}
                                                color={customTheme.colors.primary}
                                            />
                                            <Text style={styles.dropdownLabel}>
                                                {item.label} {item.capacidade ? `(${item.capacidade})` : ''}
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
                                            <Icon
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
                                disabled={!selectedItem || !quantity || quantity.trim() === '' || parseInt(quantity) < 1}
                            >
                                {initialItem ? 'Atualizar' : 'Adicionar'}
                            </Button>
                        </View>
                    </Surface>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 24,
    },
    sectionContainer: {
        backgroundColor: customTheme.colors.surface,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        padding: 16,
    },
    sectionTitle: {
        color: customTheme.colors.onSurface,
        fontWeight: '600',
        fontSize: 18,
        marginBottom: 16,
    },
    itemsList: {
        gap: 10,
    },
    itemRow: {
        marginBottom: 8,
    },
    itemButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        padding: 12,
        elevation: 1,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    itemButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    itemTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    itemNameText: {
        fontSize: 16,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    itemQuantityText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    removeButton: {
        padding: 8,
    },
    addButton: {
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
    addButtonText: {
        marginLeft: 8,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
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

export default EquipmentSection;