import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';
import { customTheme } from '../../../../../theme/theme';
import { DropdownRef, DIAS_SEMANA, MATERIAIS, FormDataInterface, SERVICOS } from '../Types/rdoTypes';
import { formatDate } from '../Utils/formUtils';
import { clientes } from '../../../../../helpers/Types';

interface GeneralInfoProps {
    formData: FormDataInterface;
    setFormData: React.Dispatch<React.SetStateAction<FormDataInterface>>;
    userInfo: any;
    numeroRdo: string;
    mode?: string;
}

const GeneralInfo: React.FC<GeneralInfoProps> = ({
    formData,
    setFormData,
    userInfo,
    numeroRdo,
    mode
}) => {
    // Single state for date
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Refs for dropdowns
    const clienteRef = useRef<DropdownRef>(null);
    const servicoRef = useRef<DropdownRef>(null);
    const diaSemanaRef = useRef<DropdownRef>(null);
    const materialRef = useRef<DropdownRef>(null);

    // Dropdown data
    const clientesDropdown = clientes.map((cliente) => ({
        label: cliente.razaoSocial,
        value: cliente.cnpjCpf,
        icon: 'domain',
        // endereco: cliente.,
    }));

    // Consolidated save method
    const saveGeneralInfo = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        console.log("Atualizando o:", field, "para o valor:", value)
    };

    // Handle date change
    const handleDateChange = (event: any, date?: Date) => {
        setShowDatePicker(false);
        if (date) {
            setSelectedDate(date);
            saveGeneralInfo('data', formatDate(date));
        }
    };

    // Simplified dropdown handlers
    const handleClienteChange = (item: any) => {
        saveGeneralInfo('cliente', item.value);
        saveGeneralInfo('clienteNome', item.label);
    };

    // Updated handleServicoChange method
    const handleServicoChange = (item: { label: string; value?: string; icon?: string }) => {
        saveGeneralInfo('servico', item.label);
    };

    const handleMaterialChange = (item: any) => {
        saveGeneralInfo('material', item.value);
    };

    const handleDiaSemanaChange = (item: any) => {
        saveGeneralInfo('diaSemana', item.value);
    };

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                    name="information-outline"
                    size={20}
                    color={customTheme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Informações Gerais
                </Text>
            </View>

            <View style={styles.inputGroup}>
                {/* Número do RDO (Não Editável) */}
                <TextInput
                    mode="outlined"
                    label="Número RDO"
                    value={numeroRdo}
                    disabled={true}
                    style={[styles.input, styles.disabledInput]}
                    left={<TextInput.Icon icon={() => (
                        <MaterialCommunityIcons name="tag" size={24} color={customTheme.colors.primary} />
                    )} />}
                />

                {/* Responsável */}
                <TextInput
                    mode="outlined"
                    label="Responsável"
                    value={formData.responsavel}
                    disabled={!!userInfo}
                    onChangeText={(text) => saveGeneralInfo('responsavel', text)}
                    style={[
                        styles.input,
                        !!userInfo && styles.disabledInput
                    ]}
                    left={<TextInput.Icon icon={() => (
                        <MaterialCommunityIcons name="account-circle" size={24} color={customTheme.colors.primary} />
                    )} />}
                />

                {/* Função - preenchida automaticamente */}
                <TextInput
                    mode="outlined"
                    label="Função"
                    value={userInfo?.cargo || ''}
                    disabled={!!userInfo}
                    onChangeText={(text) => saveGeneralInfo('funcao', text)}
                    style={[
                        styles.input,
                        !!userInfo && styles.disabledInput
                    ]}
                    left={<TextInput.Icon icon={() => (
                        <MaterialCommunityIcons name="briefcase" size={24} color={customTheme.colors.primary} />
                    )} />}
                />

                {/* Data e Dia da Semana */}
                <View style={styles.rowInputs}>
                    <TouchableOpacity
                        style={styles.dateTimeContainer}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <TextInput
                            mode="outlined"
                            label="Data"
                            value={formatDate(selectedDate)}
                            editable={false}
                            style={[styles.input, styles.rowInput]}
                            left={<TextInput.Icon icon={() => (
                                <MaterialCommunityIcons name="calendar" size={24} color={customTheme.colors.primary} />
                            )} />}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.dateTimeContainer, styles.dropdownContainer]}
                        activeOpacity={0.7}
                        onPress={() => diaSemanaRef.current?.open()}
                    >
                        <Dropdown
                            ref={diaSemanaRef}
                            autoScroll={false}
                            style={[styles.dropdown, styles.rowInput, { top: 7 }]}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            iconStyle={styles.iconStyle}
                            data={DIAS_SEMANA}
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            placeholder="Dia da semana"
                            value={formData.diaSemana}
                            onChange={handleDiaSemanaChange}
                            renderLeftIcon={() => (
                                <MaterialCommunityIcons
                                    style={styles.dropdownIcon}
                                    name="calendar-week"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                            )}
                            renderItem={item => (
                                <View style={styles.dropdownItem}>
                                    <MaterialCommunityIcons
                                        name={item.icon}
                                        size={20}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text style={styles.dropdownLabel}>
                                        {item.label}
                                    </Text>
                                </View>
                            )}
                        />
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            is24Hour={true}
                            display="default"
                            onChange={handleDateChange}
                        />
                    )}
                </View>

                {/* Cliente */}
                <TouchableOpacity
                    style={styles.dropdownContainer}
                    activeOpacity={0.7}
                    onPress={() => clienteRef.current?.open()}
                >
                    <Dropdown
                        ref={clienteRef}
                        autoScroll={false}
                        style={styles.dropdown}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                        inputSearchStyle={{ color: customTheme.colors.onSurface }}
                        iconStyle={styles.iconStyle}
                        data={clientesDropdown}
                        search
                        searchPlaceholder="Buscar cliente..."
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder="Selecione o cliente"
                        value={formData.cliente}
                        onChange={handleClienteChange}
                        renderLeftIcon={() => (
                            <MaterialCommunityIcons
                                style={styles.dropdownIcon}
                                name="domain"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                        )}
                        renderItem={item => (
                            <View style={styles.dropdownItem}>
                                <MaterialCommunityIcons
                                    name={item.icon}
                                    size={20}
                                    color={customTheme.colors.primary}
                                />
                                <Text style={styles.dropdownLabel}>
                                    {item.label}
                                </Text>
                            </View>
                        )}
                    />
                </TouchableOpacity>

                {/* Serviço */}
                <TouchableOpacity
                    style={styles.dropdownContainer}
                    activeOpacity={0.7}
                    onPress={() => servicoRef.current?.open()}
                >
                    <Dropdown
                        ref={servicoRef}
                        autoScroll={false}
                        style={styles.dropdown}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                        iconStyle={styles.iconStyle}
                        data={SERVICOS}
                        maxHeight={300}
                        labelField="label"
                        valueField="label"  // Change valueField to 'label'
                        placeholder="Selecione o serviço"
                        value={formData.servico}
                        onChange={(item) => {
                            // Ensure the entire item is passed and used consistently
                            handleServicoChange(item);
                        }}
                        renderLeftIcon={() => (
                            <MaterialCommunityIcons
                                style={styles.dropdownIcon}
                                name="hammer-wrench"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                        )}
                        renderItem={item => (
                            <View style={styles.dropdownItem}>
                                <MaterialCommunityIcons
                                    name={item.icon}
                                    size={20}
                                    color={customTheme.colors.primary}
                                />
                                <Text style={styles.dropdownLabel}>
                                    {item.label}
                                </Text>
                            </View>
                        )}
                    />
                </TouchableOpacity>

                {/* Material */}
                <TouchableOpacity
                    style={styles.dropdownContainer}
                    activeOpacity={0.7}
                    onPress={() => materialRef.current?.open()}
                >
                    <Dropdown
                        ref={materialRef}
                        autoScroll={false}
                        style={styles.dropdown}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                        iconStyle={styles.iconStyle}
                        data={MATERIAIS}
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder="Selecione o material"
                        value={formData.material}
                        onChange={handleMaterialChange}
                        renderLeftIcon={() => (
                            <MaterialCommunityIcons
                                style={styles.dropdownIcon}
                                name="package-variant-closed"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                        )}
                        renderItem={item => (
                            <View style={styles.dropdownItem}>
                                <MaterialCommunityIcons
                                    name={item.icon}
                                    size={20}
                                    color={customTheme.colors.primary}
                                />
                                <Text style={styles.dropdownLabel}>
                                    {item.label}
                                </Text>
                            </View>
                        )}
                    />
                </TouchableOpacity>
            </View>
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
    input: {
        backgroundColor: '#FFFFFF',
        height: 56,
    },
    disabledInput: {
        opacity: 0.7,
        backgroundColor: customTheme.colors.surfaceDisabled,
    },
    rowInputs: {
        flexDirection: 'row',
        gap: 16,
    },
    rowInput: {
        flex: 1,
    },
    dateTimeContainer: {
        flex: 1,
    },
    dropdownContainer: {
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        height: 56,
    },
    dropdown: {
        height: 56,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
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
        color: "gray",
    },
    selectedTextStyle: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    iconStyle: {
        width: 24,
        height: 24,
    },
});

export default GeneralInfo;