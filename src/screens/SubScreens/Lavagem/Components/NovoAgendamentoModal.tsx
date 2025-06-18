import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    TouchableOpacity,
    Modal,
    Animated,
    Dimensions,
    StyleSheet,
} from 'react-native';
import { Surface, Button, Text, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DropdownRef } from '../../../../helpers/Types';
import { customTheme } from '../../../../theme/theme';
import { PLACAS_VEICULOS, EQUIPAMENTOS, TIPOS_LAVAGEM } from './lavagemTypes';

interface NovoAgendamentoModalProps {
    visible: boolean;
    onDismiss: () => void;
    onAgendar: (data: {
        placaSelecionada: string;
        tipoLavagemSelecionado: string;
        dataSelecionada: Date;
        isEquipamento: boolean;
        numeroEquipamento?: string;
    }) => void;
}

const NovoAgendamentoModal: React.FC<NovoAgendamentoModalProps> = ({
    visible,
    onDismiss,
    onAgendar
}) => {
    const [placaSelecionada, setPlacaSelecionada] = useState('');
    const [tipoLavagemSelecionado, setTipoLavagemSelecionado] = useState('');
    const [dataSelecionada, setDataSelecionada] = useState(new Date());
    const [isEquipamento, setIsEquipamento] = useState(false);
    const [numeroEquipamento, setNumeroEquipamento] = useState('');
    const [mostrarDatePicker, setMostrarDatePicker] = useState(false);

    // Refs para dropdowns
    const veiculoRef = useRef<DropdownRef>(null);
    const tipoLavagemRef = useRef<DropdownRef>(null);

    // Formatando os dados para os dropdowns
    const placasItems = [...PLACAS_VEICULOS, ...EQUIPAMENTOS].map(item => ({
        label: item.value,
        value: item.value
    }));

    const tiposLavagemItems = TIPOS_LAVAGEM.map(item => ({
        label: item.label,
        value: item.value
    }));

    // Animação de slide
    const screenHeight = Dimensions.get('screen').height;
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;

    useEffect(() => {
        if (visible) {
            // Animar entrada
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            }).start();
        } else {
            // Animar saída
            Animated.timing(slideAnim, {
                toValue: screenHeight,
                duration: 300,
                useNativeDriver: true
            }).start();
        }
    }, [visible]);

    const handleDismiss = () => {
        Animated.spring(slideAnim, {
            toValue: 800,
            bounciness: 2,
            speed: 20,
            useNativeDriver: true
        }).start();

        // Definir um timeout um pouco menor que a duração esperada da animação
        setTimeout(() => {
            onDismiss();
            resetForm()
        }, 50); // 300ms é geralmente suficiente para a animação com esses parâmetros
    };

    const resetForm = () => {
        setPlacaSelecionada('');
        setTipoLavagemSelecionado('');
        setDataSelecionada(new Date());
        setNumeroEquipamento('');
        setIsEquipamento(false);
    };

    const handleAgendar = () => {
        // Validações
        if (!placaSelecionada || !tipoLavagemSelecionado || (isEquipamento && !numeroEquipamento)) {
            return;
        }

        onAgendar({
            placaSelecionada,
            tipoLavagemSelecionado,
            dataSelecionada,
            isEquipamento,
            numeroEquipamento: isEquipamento ? numeroEquipamento : undefined
        });

        // Fecha o modal
        handleDismiss();
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
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderContent}>
                                <Icon
                                    name="plus-circle"
                                    size={28}
                                    color={customTheme.colors.primary}
                                />
                                <Text variant="titleLarge">Novo Agendamento</Text>
                            </View>

                            <TouchableOpacity
                                onPress={handleDismiss}
                                style={styles.closeButton}
                            >
                                <Icon
                                    name="close"
                                    size={24}
                                    color={customTheme.colors.onSurfaceVariant}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Formulário */}
                        <View style={styles.formContainer}>
                            {/* Veículo/Equipamento */}
                            <View style={styles.inputSection}>
                                <Text variant="titleSmall" style={styles.sectionTitle}>
                                    <Icon name="truck" size={18} color={customTheme.colors.primary} />
                                    Veículo/Equipamento
                                </Text>

                                <TouchableOpacity
                                    style={styles.dropdownContainer}
                                    activeOpacity={0.7}
                                    onPress={() => veiculoRef.current?.open()}
                                >
                                    <Dropdown
                                        ref={veiculoRef}
                                        style={styles.dropdown}
                                        placeholderStyle={styles.placeholderStyle}
                                        selectedTextStyle={styles.selectedTextStyle}
                                        inputSearchStyle={{ color: customTheme.colors.onSurface }}
                                        data={placasItems}
                                        search
                                        maxHeight={300}
                                        labelField="label"
                                        valueField="value"
                                        placeholder="Selecione a placa ou equipamento"
                                        searchPlaceholder="Digite para buscar..."
                                        value={placaSelecionada}
                                        onChange={item => {
                                            setPlacaSelecionada(item.value);
                                            setIsEquipamento(EQUIPAMENTOS.some(equip => equip.value === item.value));
                                        }}
                                        renderLeftIcon={() => (
                                            <Icon
                                                style={styles.dropdownIcon}
                                                name={isEquipamento ? 'wrench' : 'truck'}
                                                size={20}
                                                color={customTheme.colors.primary}
                                            />
                                        )}
                                        renderItem={item => (
                                            <View style={styles.dropdownItemContainer}>
                                                <Icon
                                                    name={EQUIPAMENTOS.some(equip => equip.value === item.value) ? 'wrench' : 'truck'}
                                                    size={20}
                                                    color={customTheme.colors.primary}
                                                />
                                                <Text style={styles.dropdownItemText}>
                                                    {item.label}
                                                </Text>
                                            </View>
                                        )}
                                    />
                                </TouchableOpacity>

                                {isEquipamento && (
                                    <TextInput
                                        mode="outlined"
                                        label="Número do Equipamento"
                                        value={numeroEquipamento}
                                        onChangeText={setNumeroEquipamento}
                                        keyboardType="numeric"
                                        style={styles.input}
                                        left={<TextInput.Icon icon="numeric" />}
                                    />
                                )}
                            </View>

                            {/* Tipo de Lavagem */}
                            <View style={styles.inputSection}>
                                <Text variant="titleSmall" style={styles.sectionTitle}>
                                    <Icon name="car-wash" size={18} color={customTheme.colors.primary} />
                                    Tipo de Lavagem
                                </Text>

                                <TouchableOpacity
                                    style={styles.dropdownContainer}
                                    activeOpacity={0.7}
                                    onPress={() => tipoLavagemRef.current?.open()}
                                >
                                    <Dropdown
                                        ref={tipoLavagemRef}
                                        style={styles.dropdown}
                                        placeholderStyle={styles.placeholderStyle}
                                        selectedTextStyle={styles.selectedTextStyle}
                                        data={tiposLavagemItems}
                                        maxHeight={300}
                                        labelField="label"
                                        valueField="value"
                                        placeholder="Selecione o tipo de lavagem"
                                        value={tipoLavagemSelecionado}
                                        onChange={item => {
                                            setTipoLavagemSelecionado(item.value);
                                        }}
                                        renderLeftIcon={() => (
                                            <Icon
                                                style={styles.dropdownIcon}
                                                name="car-wash"
                                                size={20}
                                                color={customTheme.colors.primary}
                                            />
                                        )}
                                        renderItem={item => (
                                            <View style={styles.dropdownItemContainer}>
                                                <Icon
                                                    name="car-wash"
                                                    size={20}
                                                    color={customTheme.colors.primary}
                                                />
                                                <Text style={styles.dropdownItemText}>
                                                    {item.label}
                                                </Text>
                                            </View>
                                        )}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Data do Agendamento */}
                            <View style={styles.inputSection}>
                                <Text variant="titleSmall" style={styles.sectionTitle}>
                                    <Icon name="calendar-blank-outline" size={18} color={customTheme.colors.primary} />
                                    Data do Agendamento
                                </Text>

                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => setMostrarDatePicker(true)}
                                >
                                    <Icon
                                        name="calendar-month"
                                        size={20}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text style={styles.dateText}>
                                        {dataSelecionada.toLocaleDateString()}
                                    </Text>
                                    <Icon
                                        name="gesture-tap"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                </TouchableOpacity>

                                {mostrarDatePicker && (
                                    <DateTimePicker
                                        value={dataSelecionada}
                                        mode="date"
                                        display="default"
                                        onChange={(event, selectedDate) => {
                                            setMostrarDatePicker(false);
                                            if (selectedDate) {
                                                setDataSelecionada(selectedDate);
                                            }
                                        }}
                                    />
                                )}
                            </View>
                        </View>

                        {/* Botões de Ação */}
                        <View style={styles.actionButtonsContainer}>
                            <Button
                                mode="outlined"
                                onPress={handleDismiss}
                                style={styles.actionButton}
                            >
                                Cancelar
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleAgendar}
                                style={styles.actionButton}
                                disabled={
                                    !placaSelecionada ||
                                    !tipoLavagemSelecionado ||
                                    (isEquipamento && !numeroEquipamento)
                                }
                            >
                                Agendar Lavagem
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
    },
    modalContent: {
        backgroundColor: customTheme.colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
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
        borderRadius: 20,
        backgroundColor: `${customTheme.colors.onSurfaceVariant}10`,
    },
    formContainer: {
        gap: 16,
        marginBottom: 20,
    },
    inputSection: {
        gap: 8,
    },
    sectionTitle: {
        color: customTheme.colors.onSurfaceVariant,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dropdownContainer: {
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 10,
        backgroundColor: customTheme.colors.surface,
    },
    dropdown: {
        height: 56,
        paddingHorizontal: 16,
    },
    dropdownIcon: {
        marginRight: 12,
    },
    dropdownItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    dropdownItemText: {
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
    },
    input: {
        backgroundColor: customTheme.colors.surface,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 10,
        padding: 12,
        backgroundColor: customTheme.colors.surface,
        height: 56,
    },
    dateText: {
        flex: 1,
        marginLeft: 12,
        color: customTheme.colors.onSurface,
        fontSize: 16,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    actionButton: {
        flex: 1,
    }
});

export default NovoAgendamentoModal;