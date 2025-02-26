import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';
import { customTheme } from '../../../../../theme/theme';
import { clientes } from '../../Components/logisticTypes';
import { DropdownRef, DIAS_SEMANA, MATERIAIS, FormDataInterface } from '../Types/rdoTypes';
import { formatDate } from '../Utils/formUtils';

interface GeneralInfoProps {
    formData: FormDataInterface;
    setFormData: React.Dispatch<React.SetStateAction<FormDataInterface>>;
    userInfo: any;
    numeroRdo: string;
    selectedDate: Date;
    setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
    clienteSelecionado: string;
    setClienteSelecionado: React.Dispatch<React.SetStateAction<string>>;
    servicoSelecionado: string;
    setServicoSelecionado: React.Dispatch<React.SetStateAction<string>>;
    materialSelecionado: string;
    setMaterialSelecionado: React.Dispatch<React.SetStateAction<string>>;
    diaSemanaSelecionado: string;
    setDiaSemanaSelecionado: React.Dispatch<React.SetStateAction<string>>;
    isClienteDisabled: boolean;
    isServicoDisabled: boolean;
}

const GeneralInfo: React.FC<GeneralInfoProps> = ({
    formData,
    setFormData,
    userInfo,
    numeroRdo,
    selectedDate,
    setSelectedDate,
    clienteSelecionado,
    setClienteSelecionado,
    servicoSelecionado,
    setServicoSelecionado,
    materialSelecionado,
    setMaterialSelecionado,
    diaSemanaSelecionado,
    setDiaSemanaSelecionado,
    isClienteDisabled,
    isServicoDisabled
}) => {
    const [showDatePicker, setShowDatePicker] = React.useState(false);

    // Refs for dropdowns
    const clienteRef = useRef<DropdownRef>(null);
    const servicoRef = useRef<DropdownRef>(null);
    const diaSemanaRef = useRef<DropdownRef>(null);
    const materialRef = useRef<DropdownRef>(null);

    // Cliente dropdown data
    const clientesDropdown = clientes.map((cliente) => ({
        label: cliente.razaoSocial,
        value: cliente.cnpjCpf,
        icon: 'domain',
        endereco: cliente.endereco,
    }));

    // Serviços dropdown data
    const servicos = [
        { label: 'Desmantelamento', value: 'desmantelamento', icon: 'hammer-wrench' },
        { label: 'Descaracterização', value: 'descaracterização', icon: 'hammer-wrench' },
        { label: 'Repetro', value: 'repetro', icon: 'hammer-wrench' }
    ];

    // Handle date change
    const handleDateChange = (event: any, date?: Date) => {
        setShowDatePicker(false);
        if (date) {
            setSelectedDate(date);
            setFormData(prev => ({ ...prev, data: formatDate(date) }));
        }
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
                    onChangeText={(text) =>
                        setFormData({ ...formData, responsavel: text })
                    }
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
                    onChangeText={(text) =>
                        setFormData({ ...formData, funcao: text })
                    }
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
                        style={styles.dateTimeContainer}
                        activeOpacity={0.7}
                        onPress={() => diaSemanaRef.current?.open()}
                    >
                        <Dropdown
                            ref={diaSemanaRef}
                            style={[styles.dropdown, styles.rowInput]}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            iconStyle={styles.iconStyle}
                            data={DIAS_SEMANA}
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            placeholder="Dia da semana"
                            value={diaSemanaSelecionado}
                            onChange={item => {
                                setDiaSemanaSelecionado(item.value);
                                setFormData(prev => ({ ...prev, diaSemana: item.value }));
                            }}
                            renderLeftIcon={() => (
                                <MaterialCommunityIcons
                                    style={styles.dropdownIcon}
                                    name="calendar-week"
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
                    onPress={!isClienteDisabled ? () => clienteRef.current?.open() : undefined}
                >
                    <Dropdown
                        ref={clienteRef}
                        style={[
                            styles.dropdown,
                            isClienteDisabled && styles.disabledDropdown
                        ]}
                        placeholderStyle={[
                            styles.placeholderStyle,
                            isClienteDisabled && styles.disabledPlaceholderStyle
                        ]}
                        selectedTextStyle={[
                            styles.selectedTextStyle,
                            isClienteDisabled && styles.disabledSelectedTextStyle
                        ]}
                        inputSearchStyle={{ color: customTheme.colors.onSurface }}
                        iconStyle={styles.iconStyle}
                        data={clientesDropdown}
                        disable={isClienteDisabled}
                        search
                        searchPlaceholder="Buscar cliente..."
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder="Selecione o cliente"
                        value={clienteSelecionado}
                        onChange={item => {
                            setClienteSelecionado(item.value);
                            setFormData(prev => ({
                                ...prev,
                                cliente: item.value,
                                clienteNome: item.label
                            }));
                        }}
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
                    onPress={!isServicoDisabled ? () => servicoRef.current?.open() : undefined}
                >
                    <Dropdown
                        ref={servicoRef}
                        style={[
                            styles.dropdown,
                            isServicoDisabled && styles.disabledDropdown
                        ]}
                        placeholderStyle={[
                            styles.placeholderStyle,
                            isServicoDisabled && styles.disabledPlaceholderStyle
                        ]}
                        selectedTextStyle={[
                            styles.selectedTextStyle,
                            isServicoDisabled && styles.disabledSelectedTextStyle
                        ]}
                        iconStyle={styles.iconStyle}
                        data={servicos}
                        disable={isServicoDisabled}
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder="Selecione o serviço"
                        value={servicoSelecionado}
                        onChange={item => {
                            setServicoSelecionado(item.value);
                            setFormData(prev => ({ ...prev, servico: item.value }));
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
                        style={styles.dropdown}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                        iconStyle={styles.iconStyle}
                        data={MATERIAIS}
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder="Selecione o material"
                        value={materialSelecionado}
                        onChange={item => {
                            setMaterialSelecionado(item.value);
                            setFormData(prev => ({ ...prev, material: item.value }));
                        }}
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
    disabledDropdown: {
        backgroundColor: customTheme.colors.surfaceDisabled,
        opacity: 0.7,
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
    disabledPlaceholderStyle: {
        color: customTheme.colors.onSurfaceVariant,
        opacity: 0.7,
    },
    selectedTextStyle: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    disabledSelectedTextStyle: {
        color: customTheme.colors.onSurfaceVariant,
        opacity: 0.7,
    },
    iconStyle: {
        width: 24,
        height: 24,
    },
});

export default GeneralInfo;