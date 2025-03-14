import React, { useEffect, useRef, useState } from 'react';
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
import firestore from '@react-native-firebase/firestore';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import { customTheme } from '../../../../theme/theme';
import { PLACAS_VEICULOS, TIPOS_LAVAGEM } from './lavagemTypes';

interface EditLavagemModalProps {
    visible: boolean;
    lavagem: any;
    onDismiss: () => void;
    onSave: () => void;
}

const EditLavagemModal: React.FC<EditLavagemModalProps> = ({
    visible,
    lavagem,
    onDismiss,
    onSave
}) => {
    const [loading, setLoading] = useState(false);
    const [selectedDateTime, setSelectedDateTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [formData, setFormData] = useState({
        tipoLavagem: lavagem?.tipoLavagem || '',
        observacoes: lavagem?.observacoes || ''
    });

    // Animação de slide
    const screenHeight = Dimensions.get('screen').height;
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;

    // Configurar data inicial baseada na lavagem
    useEffect(() => {
        if (lavagem) {
            const [dia, mes, ano] = lavagem.data.split('/');
            const [hora, minuto] = lavagem.hora.split(':');
            const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
            data.setHours(parseInt(hora), parseInt(minuto));
            setSelectedDateTime(data);
        }
    }, [lavagem]);

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

    const handleSaveEdit = async () => {
        try {
            setLoading(true);

            // Verifica se é um registro novo (tem createdBy) ou antigo (tem responsavel)
            const isFormatoNovo = 'createdBy' in lavagem;

            // Formatar data e hora
            const formattedDate = selectedDateTime.toLocaleDateString('pt-BR');
            const formattedTime = selectedDateTime.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Base comum de dados atualizados
            const dadosBase = {
                data: formattedDate,
                hora: formattedTime,
                tipoLavagem: formData.tipoLavagem,
                observacoes: formData.observacoes,
                fotos: lavagem.fotos,
                status: lavagem.status,
            };

            // Prepara dados específicos baseado no formato
            let dadosAtualizados;
            if (isFormatoNovo) {
                dadosAtualizados = {
                    ...dadosBase,
                    createdBy: lavagem.createdBy,
                    createdAt: lavagem.createdAt,
                    agendamentoId: lavagem.agendamentoId || null,
                    veiculo: lavagem.veiculo
                };
            } else {
                dadosAtualizados = {
                    ...dadosBase,
                    responsavel: lavagem.responsavel,
                    createdAt: lavagem.createdAt,
                    placaVeiculo: lavagem.veiculo.placa,
                    produtos: lavagem.produtos || []
                };
            }

            // Determina a coleção correta
            const colecao = isFormatoNovo ? 'lavagens' : 'registroLavagens';

            // Atualizar no Firestore
            await firestore()
                .collection(colecao)
                .doc(lavagem.id)
                .update(dadosAtualizados);

            showGlobalToast('success', 'Sucesso', 'Lavagem atualizada com sucesso', 4000);
            onSave();
        } catch (error) {
            console.error('Erro ao atualizar lavagem:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível atualizar a lavagem', 4000);
        } finally {
            setLoading(false);
        }
    };

    // Helper function to get vehicle display info
    const getVehicleDisplayInfo = (veiculo: {
        placa: string;
        tipo: string;
        numeroEquipamento?: string;
    }) => {
        if (!veiculo) return null;

        const isEquipment = veiculo.tipo === 'equipamento';
        const isValidVehicle = PLACAS_VEICULOS.some(item => item.value === veiculo.placa);

        // Define icon and label based on conditions
        let icon = 'help-circle-outline'; // Default icon for unknown/other
        let label = 'Outros';

        if (isEquipment) {
            icon = 'cog';
            label = 'Equipamento';
        } else if (isValidVehicle) {
            icon = 'car';
            label = 'Veículo';
        }

        return {
            icon,
            label,
            displayValue: veiculo.placa + (veiculo.numeroEquipamento ? ` (#${veiculo.numeroEquipamento})` : '')
        };
    };

    const handleDismiss = () => {
        Animated.spring(slideAnim, {
            toValue: 700,
            bounciness: 2,
            speed: 20,
            useNativeDriver: true
        }).start();

        // Definir um timeout um pouco menor que a duração esperada da animação
        setTimeout(() => {
            onDismiss();
        }, 50); // 300ms é geralmente suficiente para a animação com esses parâmetros
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
                                    name="pencil"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <Text variant="titleLarge">Editar Lavagem</Text>
                            </View>

                            <TouchableOpacity
                                onPress={handleDismiss}
                                style={styles.closeButton}
                            >
                                <Icon
                                    name="close"
                                    size={24}
                                    color={customTheme.colors.error}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Informações Não Editáveis */}
                        <View style={styles.infoContainer}>
                            {/* Responsável */}
                            <View style={styles.infoRow}>
                                <Icon
                                    name="account"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <View style={styles.infoTextContainer}>
                                    <Text style={styles.infoLabel}>Responsável</Text>
                                    <Text style={styles.infoValue}>
                                        {lavagem?.responsavel || 'Não informado'}
                                    </Text>
                                </View>
                            </View>

                            {/* Veículo/Equipamento */}
                            {lavagem?.veiculo && (() => {
                                const vehicleInfo = getVehicleDisplayInfo(lavagem.veiculo);
                                if (!vehicleInfo) return null;

                                return (
                                    <View style={styles.infoRow}>
                                        <Icon
                                            name={vehicleInfo.icon}
                                            size={24}
                                            color={customTheme.colors.primary}
                                        />
                                        <View style={styles.infoTextContainer}>
                                            <Text style={styles.infoLabel}>
                                                {vehicleInfo.label}
                                            </Text>
                                            <Text style={styles.infoValue}>
                                                {vehicleInfo.displayValue}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })()}
                        </View>

                        {/* Campos Editáveis */}
                        <View style={styles.editContainer}>
                            {/* Data e Hora */}
                            <View style={styles.dateTimeContainer}>
                                <TouchableOpacity
                                    style={styles.dateTimeButton}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Icon
                                        name="calendar"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                    <View style={styles.dateTimeTextContainer}>
                                        <Text style={styles.dateTimeLabel}>Data</Text>
                                        <Text style={styles.dateTimeValue}>
                                            {selectedDateTime.toLocaleDateString('pt-BR')}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.dateTimeButton}
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Icon
                                        name="clock"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                    <View style={styles.dateTimeTextContainer}>
                                        <Text style={styles.dateTimeLabel}>Hora</Text>
                                        <Text style={styles.dateTimeValue}>
                                            {selectedDateTime.toLocaleTimeString('pt-BR', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Tipo de Lavagem (Dropdown) */}
                            <View style={styles.dropdownWrapper}>
                                <Dropdown
                                    style={styles.dropdown}
                                    placeholderStyle={styles.dropdownPlaceholder}
                                    selectedTextStyle={styles.dropdownSelectedText}
                                    itemTextStyle={{color: customTheme.colors.onSurface}}
                                    data={TIPOS_LAVAGEM}
                                    labelField="label"
                                    valueField="value"
                                    placeholder="Selecione o tipo de lavagem"
                                    value={formData.tipoLavagem}
                                    onChange={item => setFormData({
                                        ...formData,
                                        tipoLavagem: item.value
                                    })}
                                    renderLeftIcon={() => (
                                        <Icon
                                            name="car-wash"
                                            size={20}
                                            color={customTheme.colors.primary}
                                            style={styles.dropdownIcon}
                                        />
                                    )}
                                />
                            </View>

                            {/* Observações */}
                            <TextInput
                                mode="outlined"
                                label="Observações"
                                value={formData.observacoes}
                                onChangeText={(text) => setFormData({ ...formData, observacoes: text })}
                                multiline
                                numberOfLines={4}
                                style={styles.observacoesInput}
                                left={<TextInput.Icon icon="comment-text" />}
                            />
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
                                onPress={handleSaveEdit}
                                loading={loading}
                                style={styles.actionButton}
                            >
                                Salvar
                            </Button>
                        </View>
                    </Surface>
                </Animated.View>
            </View>

            {/* Date Picker */}
            {showDatePicker && (
                <DateTimePicker
                    value={selectedDateTime}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        const currentDate = selectedDate || selectedDateTime;
                        setShowDatePicker(false);
                        setSelectedDateTime(currentDate);
                    }}
                />
            )}

            {/* Time Picker */}
            {showTimePicker && (
                <DateTimePicker
                    value={selectedDateTime}
                    mode="time"
                    display="default"
                    onChange={(event, selectedTime) => {
                        const currentTime = selectedTime || selectedDateTime;
                        setShowTimePicker(false);
                        setSelectedDateTime(currentTime);
                    }}
                />
            )}
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
    },
    infoContainer: {
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    infoValue: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    editContainer: {
        gap: 16,
        marginBottom: 20,
    },
    dateTimeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    dateTimeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        gap: 12,
    },
    dateTimeTextContainer: {
        flex: 1,
    },
    dateTimeLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    dateTimeValue: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    dropdownWrapper: {
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 10,
    },
    dropdown: {
        height: 56,
        paddingHorizontal: 16,
    },
    dropdownPlaceholder: {
        color: customTheme.colors.onSurfaceVariant,
    },
    dropdownSelectedText: {
        color: customTheme.colors.onSurface,
    },
    dropdownIcon: {
        marginRight: 12,
    },
    observacoesInput: {
        height: 120,
        color: customTheme.colors.onSurface,
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

export default EditLavagemModal;