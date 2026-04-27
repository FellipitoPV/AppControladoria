import React, { useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    Button,
    Divider,
    HelperText,
    Surface,
    Text,
    TextInput,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { Dropdown } from 'react-native-element-dropdown';
import ModernHeader from '../../../../assets/components/ModernHeader';
import SaveButton from '../../../../assets/components/SaveButton';
import { ecoApi } from '../../../../api/ecoApi';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import { customTheme } from '../../../../theme/theme';
import {
    defaultExtintoresConfig,
    emptyExtintor,
    EquipamentoTipo,
    ExtintorInterface,
    ExtintoresConfig,
    formatMonthYear,
    formatYear,
    getEquipamentoTipo,
    logLocations,
    unidadeOptions,
} from './ExtintoresTypes';

type RootStackParamList = {
    ExtintoresScreen: undefined;
    ExtintoresFormScreen: {
        assetType?: EquipamentoTipo;
        extintor?: ExtintorInterface;
        config?: ExtintoresConfig;
        mode: 'create' | 'edit';
    };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExtintoresFormScreen'>;
type RoutePropType = RouteProp<RootStackParamList, 'ExtintoresFormScreen'>;
type DateField = 'dataRecarga' | 'dataTesteHidrostatico' | null;

const formatDateInput = (date: Date) => dayjs(date).format('YYYY-MM-DD');

const ExtintoresFormScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<RoutePropType>();
    const { extintor, mode, config = defaultExtintoresConfig, assetType = 'Extintor' } = route.params || {
        mode: 'create',
        config: defaultExtintoresConfig,
        assetType: 'Extintor' as EquipamentoTipo,
    };

    const isEditMode = mode === 'edit';
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<ExtintorInterface>(extintor || emptyExtintor(config, assetType));
    const [showDatePicker, setShowDatePicker] = useState<DateField>(null);
    const currentAssetType = getEquipamentoTipo(form);

    const availableLocations = useMemo(
        () => (form.unidadeEcologika === 'LOG' ? logLocations : config.localizacoes || []),
        [config.localizacoes, form.unidadeEcologika],
    );

    const updateField = (field: keyof ExtintorInterface, value: string | number | boolean) => {
        setForm(prev => {
            if (field === 'unidadeEcologika') {
                const nextLocations = value === 'LOG' ? logLocations : config.localizacoes || [];

                return {
                    ...prev,
                    [field]: value,
                    localizacao: nextLocations.includes(prev.localizacao) ? prev.localizacao : '',
                };
            }

            if (field === 'categoriaEquipamento') {
                return {
                    ...prev,
                    categoriaEquipamento: value as EquipamentoTipo,
                };
            }

            return { ...prev, [field]: value };
        });
    };

    const validateForm = () => {
        if (!form.categoriaEquipamento?.trim()) {
            showGlobalToast('error', 'Erro', 'Informe o tipo de equipamento');
            return false;
        }
        if (!form.numero.trim()) {
            showGlobalToast('error', 'Erro', 'Informe o numero do equipamento');
            return false;
        }
        if (!form.tipo.trim()) {
            showGlobalToast('error', 'Erro', 'Informe o tipo do equipamento');
            return false;
        }
        if (!form.carga.trim()) {
            showGlobalToast('error', 'Erro', 'Informe a carga do equipamento');
            return false;
        }
        if (!form.unidadeEcologika.trim()) {
            showGlobalToast('error', 'Erro', 'Informe a unidade Ecologika');
            return false;
        }
        if (!form.localizacao.trim()) {
            showGlobalToast('error', 'Erro', 'Informe a localizacao do equipamento');
            return false;
        }
        if (!form.dataRecarga) {
            showGlobalToast('error', 'Erro', 'Informe a data da ultima recarga');
            return false;
        }
        if (!form.dataTesteHidrostatico) {
            showGlobalToast('error', 'Erro', 'Informe a data do teste hidrostatico');
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...form,
                categoriaEquipamento: currentAssetType,
                validadeMeses: Number(form.validadeMeses || config.validade || 12),
            };

            if (isEditMode && (form.hidranteId || form.id)) {
                await ecoApi.update('hidrantes', form.hidranteId || form.id || '', payload);
                showGlobalToast('success', 'Sucesso', `${currentAssetType} atualizado com sucesso!`);
            } else {
                await ecoApi.create('hidrantes', payload);
                showGlobalToast('success', 'Sucesso', `${currentAssetType} cadastrado com sucesso!`);
            }

            navigation.navigate('ExtintoresScreen');
        } catch (error) {
            console.error(`Erro ao salvar ${currentAssetType.toLowerCase()}:`, error);
            showGlobalToast('error', 'Erro', `Nao foi possivel salvar o ${currentAssetType.toLowerCase()}`);
        } finally {
            setLoading(false);
        }
    };

    const buildDropdownData = (values: string[], currentValue: string) => {
        const uniqueValues = [...values];
        if (currentValue && !uniqueValues.includes(currentValue)) {
            uniqueValues.unshift(currentValue);
        }

        return uniqueValues.map(value => ({ label: value, value }));
    };

    const renderDropdownField = (
        label: string,
        values: string[],
        selectedValue: string,
        onSelect: (value: string) => void,
        searchPlaceholder: string,
        fallbackInputLabel: string,
        allowCustomValue = false,
    ) => {
        if (!values.length) {
            return (
                <TextInput
                    label={fallbackInputLabel}
                    mode="outlined"
                    value={selectedValue}
                    onChangeText={onSelect}
                    style={styles.input}
                    dense
                />
            );
        }

        const data = buildDropdownData(values, selectedValue);

        return (
            <View style={styles.dropdownContainer}>
                <Text style={styles.dropdownLabel}>{label}</Text>
                <Dropdown
                    style={styles.dropdown}
                    containerStyle={styles.dropdownList}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelectedText}
                    inputSearchStyle={styles.dropdownSearchInput}
                    itemTextStyle={styles.dropdownItemText}
                    data={data}
                    search
                    maxHeight={320}
                    labelField="label"
                    valueField="value"
                    placeholder={`Selecione ${label.toLowerCase()}`}
                    searchPlaceholder={searchPlaceholder}
                    activeColor="transparent"
                    value={selectedValue || null}
                    onChange={item => onSelect(item.value)}
                />
                {allowCustomValue && (
                    <TextInput
                        label={`Ou digite ${label.toLowerCase()}`}
                        mode="outlined"
                        value={selectedValue}
                        onChangeText={onSelect}
                        style={styles.freeSoloInput}
                        dense
                    />
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <ModernHeader
                title={isEditMode ? `Editar ${currentAssetType}` : `Novo ${currentAssetType}`}
                iconName="fire-extinguisher"
                onBackPress={() => navigation.goBack()}
            />

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <Surface style={styles.section} elevation={2}>
                        <View style={styles.sectionBar} />
                        <Text style={styles.sectionTitle}>Identificacao</Text>
                        {renderDropdownField('Tipo de equipamento', ['Extintor', 'Hidrante'], currentAssetType, value => updateField('categoriaEquipamento', value), 'Buscar tipo...', 'Tipo de equipamento')}
                        <TextInput
                            label={`Numero do ${currentAssetType.toLowerCase()}`}
                            mode="outlined"
                            value={form.numero}
                            onChangeText={value => updateField('numero', value)}
                            style={styles.input}
                            dense
                        />
                        {renderDropdownField('Tipo', config.tipos, form.tipo, value => updateField('tipo', value), 'Buscar tipo...', 'Tipo')}
                        {renderDropdownField('Carga', config.capacidade, form.carga, value => updateField('carga', value), 'Buscar carga...', 'Carga')}
                    </Surface>

                    <Surface style={styles.section} elevation={2}>
                        <View style={styles.sectionBar} />
                        <Text style={styles.sectionTitle}>Localizacao</Text>
                        {renderDropdownField('Unidade', unidadeOptions, form.unidadeEcologika, value => updateField('unidadeEcologika', value), 'Buscar unidade...', 'Unidade Ecologika')}
                        {renderDropdownField(`Local do ${currentAssetType.toLowerCase()}`, availableLocations, form.localizacao, value => updateField('localizacao', value), 'Buscar localizacao...', 'Localizacao', true)}
                    </Surface>

                    <Surface style={styles.section} elevation={2}>
                        <View style={styles.sectionBar} />
                        <Text style={styles.sectionTitle}>Manutencao</Text>
                        <Button mode="outlined" onPress={() => setShowDatePicker('dataRecarga')} style={styles.dateButton}>
                            Data da ultima recarga: {form.dataRecarga ? dayjs(form.dataRecarga).format('DD/MM/YYYY') : 'Selecionar'}
                        </Button>
                        <TextInput
                            label="Validade em meses"
                            mode="outlined"
                            value={String(form.validadeMeses || '')}
                            onChangeText={value => updateField('validadeMeses', Number(value.replace(/[^0-9]/g, '')) || 0)}
                            keyboardType="numeric"
                            style={styles.input}
                            dense
                        />
                        <HelperText type="info" visible>
                            Proxima recarga: {formatMonthYear(form.dataRecarga, Number(form.validadeMeses || 0))}
                        </HelperText>
                        <Divider style={styles.divider} />
                        <Button mode="outlined" onPress={() => setShowDatePicker('dataTesteHidrostatico')} style={styles.dateButton}>
                            Data do teste hidrostatico: {form.dataTesteHidrostatico ? dayjs(form.dataTesteHidrostatico).format('DD/MM/YYYY') : 'Selecionar'}
                        </Button>
                        <HelperText type="info" visible>
                            Proximo teste: {formatYear(form.dataTesteHidrostatico, config.validadeHidrostatico)}
                        </HelperText>
                        <View style={styles.chipsSection}>
                            {renderDropdownField(
                                'Status do teste',
                                ['Aprovado', 'Reprovado'],
                                form.statusTesteHidrostatico,
                                value => updateField('statusTesteHidrostatico', value),
                                'Buscar status...',
                                'Status do teste',
                            )}
                        </View>
                    </Surface>

                    <Surface style={styles.section} elevation={2}>
                        <View style={styles.sectionBar} />
                        <Text style={styles.sectionTitle}>Observacoes</Text>
                        <TextInput
                            label="Observacoes"
                            mode="outlined"
                            value={form.observacoes}
                            onChangeText={value => updateField('observacoes', value)}
                            multiline
                            numberOfLines={4}
                            style={styles.input}
                        />
                    </Surface>
                </ScrollView>

                <SaveButton
                    onPress={handleSave}
                    loading={loading}
                    disabled={loading}
                    text={isEditMode ? 'Salvar alteracoes' : `Cadastrar ${currentAssetType.toLowerCase()}`}
                    iconName="content-save"
                />
            </KeyboardAvoidingView>

            {showDatePicker && (
                <DateTimePicker
                    value={
                        form[showDatePicker]
                            ? dayjs(form[showDatePicker] as string).toDate()
                            : new Date()
                    }
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, selectedDate) => {
                        if (Platform.OS !== 'ios') {
                            setShowDatePicker(null);
                        }

                        if (selectedDate && showDatePicker) {
                            updateField(showDatePicker, formatDateInput(selectedDate));
                        }
                    }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    content: {
        padding: 16,
        paddingBottom: 90,
        gap: 12,
    },
    section: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: customTheme.colors.surfaceVariant,
        backgroundColor: customTheme.colors.surface,
        overflow: 'hidden',
    },
    sectionBar: {
        height: 4,
        backgroundColor: customTheme.colors.primary,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginBottom: 10,
        paddingTop: 12,
        paddingHorizontal: 14,
    },
    input: {
        marginBottom: 8,
        marginHorizontal: 14,
        backgroundColor: customTheme.colors.surface,
    },
    chipsSection: {
        marginBottom: 8,
        paddingHorizontal: 14,
    },
    dropdownContainer: {
        marginBottom: 8,
        paddingHorizontal: 14,
    },
    freeSoloInput: {
        marginTop: 8,
        backgroundColor: customTheme.colors.surface,
    },
    dropdownLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 6,
    },
    dropdown: {
        height: 46,
        borderColor: customTheme.colors.outline,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: customTheme.colors.surface,
    },
    dropdownList: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customTheme.colors.outlineVariant,
        backgroundColor: customTheme.colors.surface,
        elevation: 3,
    },
    dropdownPlaceholder: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    dropdownSelectedText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    dropdownSearchInput: {
        height: 40,
        borderColor: customTheme.colors.outlineVariant,
        borderRadius: 6,
        color: customTheme.colors.onSurface,
        fontSize: 14,
    },
    dropdownItemText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    dateButton: {
        marginBottom: 6,
        marginHorizontal: 14,
        borderColor: customTheme.colors.outlineVariant,
    },
    divider: {
        marginVertical: 8,
        marginHorizontal: 14,
    },
});

export default ExtintoresFormScreen;
