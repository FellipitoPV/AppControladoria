import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import { CONDICOES_TEMPO, DropdownRef, FormDataInterface, GeneralInfoProps } from '../Types/rdoTypes';
import { customTheme } from '../../../../../theme/theme';

const WeatherConditions: React.FC<GeneralInfoProps> = ({
    formData,
    saveFormData
}) => {
    // Refs for dropdowns
    const tempoManhaRef = useRef<DropdownRef>(null);
    const tempoTardeRef = useRef<DropdownRef>(null);
    const tempoNoiteRef = useRef<DropdownRef>(null);

    const updateWeatherCondition = (period: 'manha' | 'tarde' | 'noite', value: string) => {
        saveFormData({
            condicaoTempo: {
                ...formData.condicaoTempo,
                [period]: value
            }
        });
    };

    // Adicione esta função antes do return no seu componente
    const getWeatherIcon = (value: string): string | undefined => {
        if (!value) return undefined;
        const selectedCondition = CONDICOES_TEMPO.find(item => item.value === value);
        return selectedCondition?.icon;
    };

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                    name="weather-partly-cloudy"
                    size={20}
                    color={customTheme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Condições do Tempo
                </Text>
            </View>

            <View style={styles.inputGroup}>
                {/* Tempo pela Manhã */}
                <View style={styles.periodContainer}>
                    <View style={styles.periodLabel}>
                        <MaterialCommunityIcons
                            name="weather-sunset-up"
                            size={18}
                            color={customTheme.colors.primary}
                        />
                        <Text style={styles.periodText}>Manhã</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.dropdownContainer}
                        activeOpacity={0.7}
                        onPress={() => tempoManhaRef.current?.open()}
                    >
                        <Dropdown
                            ref={tempoManhaRef}
                            style={styles.dropdown}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            iconStyle={styles.iconStyle}
                            data={CONDICOES_TEMPO}
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            placeholder="Selecione a condição"
                            value={formData.condicaoTempo.manha}
                            onChange={item => updateWeatherCondition('manha', item.value)}
                            renderLeftIcon={() => (
                                <MaterialCommunityIcons
                                    style={styles.dropdownIcon}
                                    name={getWeatherIcon(formData.condicaoTempo.manha) || "weather-sunset-up"}
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

                {/* Tempo pela Tarde */}
                <View style={styles.periodContainer}>
                    <View style={styles.periodLabel}>
                        <MaterialCommunityIcons
                            name="weather-sunny"
                            size={18}
                            color={customTheme.colors.primary}
                        />
                        <Text style={styles.periodText}>Tarde</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.dropdownContainer}
                        activeOpacity={0.7}
                        onPress={() => tempoTardeRef.current?.open()}
                    >
                        <Dropdown
                            ref={tempoTardeRef}
                            style={styles.dropdown}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            iconStyle={styles.iconStyle}
                            data={CONDICOES_TEMPO}
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            placeholder="Selecione a condição"
                            value={formData.condicaoTempo.tarde}
                            onChange={item => updateWeatherCondition('tarde', item.value)}
                            renderLeftIcon={() => (
                                <MaterialCommunityIcons
                                    style={styles.dropdownIcon}
                                    name={getWeatherIcon(formData.condicaoTempo.tarde) || "weather-sunny"}
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

                {/* Tempo pela Noite */}
                <View style={styles.periodContainer}>
                    <View style={styles.periodLabel}>
                        <MaterialCommunityIcons
                            name="weather-night"
                            size={18}
                            color={customTheme.colors.primary}
                        />
                        <Text style={styles.periodText}>Noite</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.dropdownContainer}
                        activeOpacity={0.7}
                        onPress={() => tempoNoiteRef.current?.open()}
                    >
                        <Dropdown
                            ref={tempoNoiteRef}
                            style={styles.dropdown}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            iconStyle={styles.iconStyle}
                            data={CONDICOES_TEMPO}
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            placeholder="Selecione a condição"
                            value={formData.condicaoTempo.noite}
                            onChange={item => updateWeatherCondition('noite', item.value)}
                            renderLeftIcon={() => (
                                <MaterialCommunityIcons
                                    style={styles.dropdownIcon}
                                    name={getWeatherIcon(formData.condicaoTempo.noite) || "weather-night"}
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
        gap: 16,
    },
    periodContainer: {
        width: '100%',
    },
    periodLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingLeft: 4,
        gap: 6,
    },
    periodText: {
        fontSize: 14,
        fontWeight: '500',
        color: customTheme.colors.primary,
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
        color: customTheme.colors.onSurfaceVariant,
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

export default WeatherConditions;