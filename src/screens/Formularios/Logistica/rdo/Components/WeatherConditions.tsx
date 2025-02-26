import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import { CONDICOES_TEMPO, DropdownRef, FormDataInterface } from '../Types/rdoTypes';
import { customTheme } from '../../../../../theme/theme';

interface WeatherConditionsProps {
    tempoManha: string;
    setTempoManha: React.Dispatch<React.SetStateAction<string>>;
    tempoTarde: string;
    setTempoTarde: React.Dispatch<React.SetStateAction<string>>;
    tempoNoite: string;
    setTempoNoite: React.Dispatch<React.SetStateAction<string>>;
    formData: FormDataInterface;
    setFormData: React.Dispatch<React.SetStateAction<FormDataInterface>>;
}

const WeatherConditions: React.FC<WeatherConditionsProps> = ({
    tempoManha,
    setTempoManha,
    tempoTarde,
    setTempoTarde,
    tempoNoite,
    setTempoNoite,
    formData,
    setFormData
}) => {
    // Refs for dropdowns
    const tempoManhaRef = useRef<DropdownRef>(null);
    const tempoTardeRef = useRef<DropdownRef>(null);
    const tempoNoiteRef = useRef<DropdownRef>(null);

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
                        placeholder="Condição do tempo pela manhã"
                        value={tempoManha}
                        onChange={item => {
                            setTempoManha(item.value);
                            setFormData(prev => ({ ...prev, condicaoTempoManha: item.value }));
                        }}
                        renderLeftIcon={() => (
                            <MaterialCommunityIcons
                                style={styles.dropdownIcon}
                                name="weather-sunset-up"
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

                {/* Tempo pela Tarde */}
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
                        placeholder="Condição do tempo pela tarde"
                        value={tempoTarde}
                        onChange={item => {
                            setTempoTarde(item.value);
                            setFormData(prev => ({ ...prev, condicaoTempoTarde: item.value }));
                        }}
                        renderLeftIcon={() => (
                            <MaterialCommunityIcons
                                style={styles.dropdownIcon}
                                name="weather-sunny"
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

                {/* Tempo pela Noite */}
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
                        placeholder="Condição do tempo pela noite"
                        value={tempoNoite}
                        onChange={item => {
                            setTempoNoite(item.value);
                            setFormData(prev => ({ ...prev, condicaoTempoNoite: item.value }));
                        }}
                        renderLeftIcon={() => (
                            <MaterialCommunityIcons
                                style={styles.dropdownIcon}
                                name="weather-night"
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