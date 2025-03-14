import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { customTheme } from '../../../../../theme/theme';
import { FormDataInterface } from '../Types/rdoTypes';
import { formatTime } from '../Utils/formUtils';

interface OperationHoursProps {
    horaInicio: Date;
    setHoraInicio: React.Dispatch<React.SetStateAction<Date>>;
    horaTermino: Date;
    setHoraTermino: React.Dispatch<React.SetStateAction<Date>>;
    formData: FormDataInterface;
    setFormData: React.Dispatch<React.SetStateAction<FormDataInterface>>;
    isEditing?: string;
}

const OperationHours: React.FC<OperationHoursProps> = ({
    horaInicio,
    setHoraInicio,
    horaTermino,
    setHoraTermino,
    formData,
    setFormData,
    isEditing
}) => {
    const [showInicioTimePicker, setShowInicioTimePicker] = useState(false);
    const [showTerminoTimePicker, setShowTerminoTimePicker] = useState(false);
    
    const isEditMode = isEditing === 'edit';

    const handleInicioTimeChange = (event: any, time?: Date) => {
        setShowInicioTimePicker(false);
        if (time) {
            setHoraInicio(time);
            setFormData(prev => ({ ...prev, inicioOperacao: formatTime(time) }));
        }
    };

    const handleTerminoTimeChange = (event: any, time?: Date) => {
        setShowTerminoTimePicker(false);
        if (time) {
            setHoraTermino(time);
            setFormData(prev => ({ ...prev, terminoOperacao: formatTime(time) }));
        }
    };

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                    name="clock"
                    size={20}
                    color={customTheme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    {isEditMode ? "Horários de Operação" : "Início da Operação"}
                </Text>
            </View>

            {isEditMode ? (
                // Modo de edição - mostrar ambos os horários
                <View style={styles.rowInputs}>
                    <TouchableOpacity
                        style={styles.dateTimeContainer}
                        onPress={() => setShowInicioTimePicker(true)}
                    >
                        <TextInput
                            mode="outlined"
                            label="Início da Operação"
                            value={formatTime(horaInicio)}
                            editable={false}
                            style={[styles.input, styles.rowInput]}
                            left={<TextInput.Icon icon={() => (
                                <MaterialCommunityIcons name="play" size={24} color={customTheme.colors.primary} />
                            )} />}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.dateTimeContainer}
                        onPress={() => setShowTerminoTimePicker(true)}
                    >
                        <TextInput
                            mode="outlined"
                            label="Término da Operação"
                            value={formatTime(horaTermino)}
                            editable={false}
                            style={[styles.input, styles.rowInput]}
                            left={<TextInput.Icon icon={() => (
                                <MaterialCommunityIcons name="stop" size={24} color={customTheme.colors.primary} />
                            )} />}
                        />
                    </TouchableOpacity>
                </View>
            ) : (
                // Modo de criação - mostrar apenas o horário de início
                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={styles.dateTimeContainer}
                        onPress={() => setShowInicioTimePicker(true)}
                    >
                        <TextInput
                            mode="outlined"
                            label="Início da Operação"
                            value={formatTime(horaInicio)}
                            editable={false}
                            style={styles.input}
                            left={<TextInput.Icon icon={() => (
                                <MaterialCommunityIcons name="play" size={24} color={customTheme.colors.primary} />
                            )} />}
                        />
                    </TouchableOpacity>
                </View>
            )}

            {showInicioTimePicker && (
                <DateTimePicker
                    value={horaInicio}
                    mode="time"
                    is24Hour={true}
                    display="default"
                    onChange={handleInicioTimeChange}
                />
            )}

            {showTerminoTimePicker && (
                <DateTimePicker
                    value={horaTermino}
                    mode="time"
                    is24Hour={true}
                    display="default"
                    onChange={handleTerminoTimeChange}
                />
            )}
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
    rowInputs: {
        flexDirection: 'row',
        gap: 16,
    },
    inputContainer: {
        width: '100%',
    },
    dateTimeContainer: {
        flex: 1,
    },
    input: {
        backgroundColor: '#FFFFFF',
        height: 56,
    },
    rowInput: {
        flex: 1,
    },
});

export default OperationHours;