import React, { useEffect, useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    Dimensions,
    TouchableOpacity,
    Pressable,
} from 'react-native';
import {
    Surface,
    Text,
    TextInput,
    Button,
    IconButton,
    useTheme,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { customTheme } from '../../../theme/theme';
import { useUser } from '../../../contexts/userContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { Dropdown } from 'react-native-element-dropdown';

const { width } = Dimensions.get('window');

export default function NovaLavagem({ navigation }: any) {
    const { userInfo } = useUser(); // Usando o contexto do usuário

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [veiculoSelecionado, setVeiculoSelecionado] = useState('');
    const [tipoVeiculo, setTipoVeiculo] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Exemplo de dados - substitua pelos seus dados reais
    const PLACAS_VEICULOS = [
        { value: 'ABC1234', tipo: 'Carro' },
        { value: 'XYZ9876', tipo: 'Caminhão' },
        // ... mais placas
    ];

    const EQUIPAMENTOS = [
        { value: 'EQ001', tipo: 'Trator' },
        { value: 'EQ002', tipo: 'Empilhadeira' },
        // ... mais equipamentos
    ];

    const formatarDadosDropdown = () => {
        const veiculos = PLACAS_VEICULOS.map(item => ({
            label: `${item.value} - ${item.tipo}`,
            value: item.value,
            icon: 'directions-car',
            tipo: 'veiculo'
        }));

        const equipamentos = EQUIPAMENTOS.map(item => ({
            label: `${item.value} - ${item.tipo}`,
            value: item.value,
            icon: 'build',
            tipo: 'equipamento'
        }));

        return [...veiculos, ...equipamentos];
    };

    const [formData, setFormData] = useState({
        responsavel: '',
        veiculo: '',
        tipoLavagem: '',
        observacoes: '',
    });

    // Efeito para definir o responsável quando o userInfo estiver disponível
    useEffect(() => {
        if (userInfo) {
            setFormData(prev => ({
                ...prev,
                responsavel: userInfo.user // Usando o nome do usuário logado
            }));
        }
    }, [userInfo]);

    const handleSave = () => {
        // Implementar lógica de salvamento
        navigation.goBack();
    };

    const handleDateChange = (event: any, date?: Date) => {
        setShowDatePicker(false);
        if (date) {
            // Mantém a hora atual ao mudar a data
            const newDate = new Date(date);
            newDate.setHours(selectedDate.getHours());
            newDate.setMinutes(selectedDate.getMinutes());
            setSelectedDate(newDate);
        }
    };

    const handleTimeChange = (event: any, date?: Date) => {
        setShowTimePicker(false);
        if (date) {
            // Mantém a data atual ao mudar a hora
            const newDate = new Date(selectedDate);
            newDate.setHours(date.getHours());
            newDate.setMinutes(date.getMinutes());
            setSelectedDate(newDate);
        }
    };

    // Função para formatar a data no formato brasileiro
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR');
    };

    // Função para formatar a hora
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <Surface style={styles.header}>
                <View style={styles.headerContent}>
                    <Icon
                        name="local-car-wash"
                        size={24}
                        color={customTheme.colors.primary}
                    />
                    <Text variant="titleLarge" style={styles.headerTitle}>
                        Nova Lavagem
                    </Text>
                </View>
                <Icon
                    onPress={() => navigation.goBack()}
                    name="close"
                    size={24}
                    color={customTheme.colors.primary}
                />
            </Surface>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {/* Form Container */}
                <Surface style={styles.formContainer}>
                    {/* Informações Gerais */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="info"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Informações Gerais
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <TextInput
                                mode="outlined"
                                placeholder="Responsável"
                                value={formData.responsavel}
                                disabled={!!userInfo} // Desabilita se houver usuário logado
                                onChangeText={(text) =>
                                    setFormData({ ...formData, responsavel: text })
                                }
                                left={<TextInput.Icon icon={() => (
                                    <Icon name="account-circle" size={24} color={customTheme.colors.primary} />
                                )} />}
                                style={[
                                    styles.input,
                                    !!userInfo && styles.disabledInput // Aplica estilo adicional se estiver desabilitado
                                ]}
                            />

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
                                            <Icon name="calendar-today" size={24} color={customTheme.colors.primary} />
                                        )} />}
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.dateTimeContainer}
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <TextInput
                                        mode="outlined"
                                        label="Hora"
                                        value={formatTime(selectedDate)}
                                        editable={false}
                                        style={[styles.input, styles.rowInput]}
                                        left={<TextInput.Icon icon={() => (
                                            <Icon name="access-time" size={24} color={customTheme.colors.primary} />
                                        )} />}
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

                                {showTimePicker && (
                                    <DateTimePicker
                                        value={selectedDate}
                                        mode="time"
                                        is24Hour={true}
                                        display="default"
                                        onChange={handleTimeChange}
                                    />
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Seção de Veículo */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="directions-car"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Veículo
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Dropdown
                                style={styles.dropdown}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                inputSearchStyle={styles.inputSearchStyle}
                                iconStyle={styles.iconStyle}
                                data={formatarDadosDropdown()}
                                search
                                maxHeight={300}
                                labelField="label"
                                valueField="value"
                                placeholder="Selecione um veículo ou equipamento"
                                searchPlaceholder="Buscar..."
                                value={veiculoSelecionado}
                                onChange={item => {
                                    setVeiculoSelecionado(item.value);
                                    setTipoVeiculo(item.tipo);
                                }}
                                renderLeftIcon={() => (
                                    <Icon
                                        style={styles.dropdownIcon}
                                        name={tipoVeiculo === 'equipamento' ? 'build' : 'directions-car'}
                                        size={20}
                                        color={customTheme.colors.primary}
                                    />
                                )}
                                renderItem={item => (
                                    <View style={styles.dropdownItem}>
                                        <Icon
                                            name={item.icon}
                                            size={20}
                                            color={item.tipo === 'equipamento' ? customTheme.colors.secondary : customTheme.colors.primary}
                                        />
                                        <Text style={styles.dropdownLabel}>{item.label}</Text>
                                    </View>
                                )}
                            />
                        </View>
                    </View>


                    {/* Tipo de Lavagem */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="local-car-wash"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Tipo de Lavagem
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <TextInput
                                mode="outlined"
                                label="Selecione o tipo"
                                value={formData.tipoLavagem}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, tipoLavagem: text })
                                }
                                left={<TextInput.Icon icon={() => (
                                    <Icon name="local-car-wash" size={24} color={customTheme.colors.primary} />
                                )} />}
                                style={styles.input}
                            />
                        </View>
                    </View>

                    {/* Observações */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="note"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Observações
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <TextInput
                                mode="outlined"
                                label="Observações"
                                value={formData.observacoes}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, observacoes: text })
                                }
                                left={<TextInput.Icon icon={() => (
                                    <Icon name="note" size={24} color={customTheme.colors.primary} />
                                )} />}
                                multiline
                                numberOfLines={4}
                                style={styles.input}
                            />
                        </View>
                    </View>

                    {/* Save Button */}
                    <View style={styles.buttonContainer}>
                        <Button
                            mode="contained"
                            onPress={handleSave}
                            style={styles.button}
                            contentStyle={styles.buttonContent}
                        >
                            Salvar Lavagem
                        </Button>
                    </View>
                </Surface>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    dropdown: {
        height: 50,
        borderColor: customTheme.colors.outline,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: customTheme.colors.surface,
    },
    dropdownIcon: {
        marginRight: 12,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
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
    },
    inputSearchStyle: {
        height: 44,
        fontSize: 16,
        borderRadius: 8,
    },
    iconStyle: {
        width: 20,
        height: 20,
    },
    suggestionItemPressed: {
        backgroundColor: customTheme.colors.surfaceVariant,
        opacity: 0.8,
    },
    noMatchItemPressed: {
        opacity: 0.7,
    },
    autocompleteContainer: {
        position: 'relative',
        zIndex: 1,
    },
    suggestionsList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        maxHeight: 250,
        marginTop: 4,
        borderRadius: 8,
        backgroundColor: customTheme.colors.surface,
        overflow: 'hidden',
    },
    suggestionsScroll: {
        flex: 1,
    },
    suggestionsSection: {
        paddingVertical: 8,
    },
    suggestionsSectionTitle: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 12,
        color: customTheme.colors.primary,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    suggestionContent: {
        flex: 1,
    },
    suggestionTitle: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    suggestionSubtitle: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    noMatchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        backgroundColor: customTheme.colors.errorContainer,
    },
    noMatchText: {
        flex: 1,
        fontSize: 14,
        color: customTheme.colors.error,
    },
    dateTimeContainer: {
        flex: 1,
    },
    disabledInput: {
        opacity: 0.7,
        backgroundColor: customTheme.colors.surfaceDisabled,
    },
    safeArea: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: customTheme.colors.surface,
        elevation: 2,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        color: customTheme.colors.onSurface,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    formContainer: {
        margin: 16,
        padding: 16,
        borderRadius: 12,
        backgroundColor: customTheme.colors.surface,
        elevation: 2,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    inputGroup: {
        gap: 12,
    },
    input: {
        backgroundColor: customTheme.colors.surface,
    },
    rowInputs: {
        flexDirection: 'row',
        gap: 12,
    },
    rowInput: {
        flex: 1,
    },
    buttonContainer: {
        marginTop: 8,
    },
    button: {
        borderRadius: 8,
    },
    buttonContent: {
        height: 48,
        paddingHorizontal: 24,
    },
});