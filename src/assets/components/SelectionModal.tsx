import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Button,
    Surface,
    Text,
    TextInput,
} from 'react-native-paper';
import React, { useEffect, useRef, useState } from 'react';

import { Dropdown } from 'react-native-element-dropdown';
import { DropdownRef } from '../../helpers/Types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SelectableItem } from '../../screens/SubScreens/Lavagem/Components/lavagemTypes';
import { customTheme } from '../../theme/theme';
import { showGlobalToast } from '../../helpers/GlobalApi';

interface SelectionModalProps<T extends SelectableItem> {
    visible: boolean;
    onClose: () => void;
    onConfirm: (item: T) => void;
    availableItems: T[];
    selectedItems: T[];
    initialItem?: T;
    title: string;
    icon: string;
    placeholder: string;
    extraFields?: (item: Partial<T>) => JSX.Element;
    validateItem?: (item: Partial<T>) => boolean;
    createCustomItem?: (input: string) => T;
}

const SelectionModal = <T extends SelectableItem>({
    visible,
    onClose,
    onConfirm,
    availableItems,
    selectedItems,
    initialItem,
    title,
    icon,
    placeholder,
    extraFields,
    validateItem,
    createCustomItem,
}: SelectionModalProps<T>) => {
    const [selectedItem, setSelectedItem] = useState<string>('');
    const [customInput, setCustomInput] = useState<string>('');
    const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
    const [extraData, setExtraData] = useState<Partial<T>>({});

    // Animation setup
    const screenHeight = Dimensions.get('screen').height;
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;
    const itemRef = useRef<DropdownRef>(null);

    const availableOptions = isCustomMode
        ? []
        : availableItems.filter(
            (item) =>
                !selectedItems.some((sel) => sel.nome === item.nome) ||
                (initialItem && initialItem.nome === item.nome)
        );

    // Reset state when modal opens or initial item changes
    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();

            if (initialItem) {
                setSelectedItem(initialItem.nome);
                setExtraData(initialItem);
                setIsCustomMode(false);
            } else {
                setSelectedItem('');
                setCustomInput('');
                setExtraData({});
                setIsCustomMode(false);
            }
        } else {
            Animated.timing(slideAnim, {
                toValue: screenHeight,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, initialItem, screenHeight]);

    const handleConfirm = () => {
        console.log('handleConfirm chamado - selectedItem:', selectedItem, 'customInput:', customInput, 'extraData:', extraData);

        if (!selectedItem && !customInput) {
            showGlobalToast('error', 'Erro', 'Selecione ou digite um item', 2000);
            return;
        }

        let item: T;
        if (isCustomMode && customInput && createCustomItem) {
            item = createCustomItem(customInput);
            item = { ...item, ...extraData };
        } else {
            const selected = availableItems.find((p) => p.nome === selectedItem);
            if (!selected) {
                showGlobalToast('error', 'Erro', 'Item não encontrado', 2000);
                return;
            }
            item = { ...selected, ...extraData };
        }

        if (validateItem && !validateItem(item)) {
            showGlobalToast('error', 'Erro', 'Item inválido', 2000);
            return;
        }

        console.log('onConfirm chamado com item:', item);
        onConfirm(item);

        setSelectedItem('');
        setCustomInput('');
        setExtraData({});
        setIsCustomMode(false);
        onClose();
    };

    const handleDismiss = () => {
        Animated.spring(slideAnim, {
            toValue: screenHeight,
            bounciness: 2,
            speed: 20,
            useNativeDriver: true,
        }).start();
        setTimeout(onClose, 50);
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
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <Surface style={styles.modalContent}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderContent}>
                                <MaterialCommunityIcons
                                    name={icon}
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <Text variant="titleLarge">{title}</Text>
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
                            {isCustomMode ? (
                                <TextInput
                                    mode="outlined"
                                    label={placeholder}
                                    value={customInput}
                                    onChangeText={setCustomInput}
                                    style={styles.input}
                                    left={
                                        <TextInput.Icon
                                            icon={() => (
                                                <MaterialCommunityIcons
                                                    name={icon}
                                                    size={24}
                                                    color={customTheme.colors.primary}
                                                />
                                            )}
                                        />
                                    }
                                />
                            ) : (
                                <TouchableOpacity
                                    style={styles.dropdownContainer}
                                    activeOpacity={0.7}
                                    onPress={() => itemRef.current?.open()}
                                >
                                    <Dropdown
                                        ref={itemRef}
                                        style={styles.dropdown}
                                        placeholderStyle={styles.placeholderStyle}
                                        selectedTextStyle={styles.selectedTextStyle}
                                        data={availableOptions}
                                        labelField="nome"
                                        valueField="nome"
                                        mode='modal'
                                        autoScroll={false}
                                        placeholder={placeholder}
                                        value={selectedItem}
                                        onChange={(item) => {
                                            console.log('Dropdown onChange chamado - item:', item.nome);
                                            setSelectedItem(item.nome);
                                            setExtraData(availableItems.find((p) => p.nome === item.nome) || {});
                                        }}
                                        renderLeftIcon={() => (
                                            <MaterialCommunityIcons
                                                name={icon}
                                                size={20}
                                                color={customTheme.colors.primary}
                                                style={styles.dropdownIcon}
                                            />
                                        )}
                                        renderItem={(item) => (
                                            <View style={styles.dropdownItem}>
                                                <MaterialCommunityIcons
                                                    name={item.tipo === 'veiculo' ? 'car' : item.tipo === 'equipamento' ? 'wrench' : 'shape'}
                                                    size={20}
                                                    color={customTheme.colors.primary}
                                                />
                                                <Text style={styles.dropdownLabel}>
                                                    {item.nome} {item.tipo ? `(${item.tipo})` : ''}
                                                </Text>
                                            </View>
                                        )}
                                    />
                                </TouchableOpacity>
                            )}

                            {/* Botão para alternar entre seleção e entrada personalizada */}
                            {createCustomItem && (
                                <Button
                                    mode="text"
                                    onPress={() => setIsCustomMode(!isCustomMode)}
                                    style={styles.toggleButton}
                                >
                                    {isCustomMode ? 'Selecionar da lista' : 'Adicionar item personalizado'}
                                </Button>
                            )}

                            {/* Campos adicionais */}
                            {extraFields && extraFields(extraData)}

                            {/* Confirm Button */}
                            <Button
                                mode="contained"
                                onPress={handleConfirm}
                                style={styles.confirmButton}
                                disabled={(!selectedItem && !customInput) || (isCustomMode && !customInput)}
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        width: '100%',
        maxHeight: '100%',
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
    input: {
        backgroundColor: '#FFFFFF',
    },
    toggleButton: {
        alignSelf: 'center',
    },
    confirmButton: {
        marginTop: 8,
    },
});

export { SelectionModal };