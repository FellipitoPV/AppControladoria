import { Button, Surface, Text, TextInput } from 'react-native-paper';
import { FormConfig, FormFieldConfig, FormValues } from './FormularioConfig';
import {
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import dayjs, { Dayjs } from 'dayjs';

import DateTimePicker from '@react-native-community/datetimepicker';
import FullScreenImage from '../../../assets/components/FullScreenImage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../../assets/components/ModernHeader';
import PhotoGallery from '../../../screens/SubScreens/Lavagem/Components/PhotoGallery';
import { ProductsContainer } from '../ProductsContainer';
import { ProdutoEstoque } from '../../../contexts/backgroundSyncContext';
import React from 'react';
import { SelectionModal } from '../SelectionModal';
import { customTheme } from '../../../theme/theme';

interface FormularioComponentProps {
    config: FormConfig;
    values: FormValues;
    errors: { [key: string]: string };
    onChange: (name: string, value: any) => void;
    onSubmit: () => void;
    navigation: any;
    isSubmitting: boolean;
    title: string;
    iconName: string;
    rightIcon: string;
    rightAction: () => void;
    photos: { uri: string; id: string }[];
    onPhotoPress: (photo: { uri: string; id: string }) => void;
    onDeletePhoto: (photoId: string) => void;
    tirarFoto: () => void;
    selecionarDaGaleria: () => void;
    selectedPhoto: { uri: string; id: string } | null;
    isFullScreenVisible: boolean;
    setIsFullScreenVisible: (visible: boolean) => void;
}

const FormularioComponent: React.FC<FormularioComponentProps> = ({
    config,
    values,
    errors,
    onChange,
    onSubmit,
    navigation,
    isSubmitting,
    title,
    iconName,
    rightIcon,
    rightAction,
    photos,
    onPhotoPress,
    onDeletePhoto,
    tirarFoto,
    selecionarDaGaleria,
    selectedPhoto,
    isFullScreenVisible,
    setIsFullScreenVisible,
}) => {
    const [showDatePicker, setShowDatePicker] = React.useState<string | null>(null);
    const [showSelectionModal, setShowSelectionModal] = React.useState<string | null>(null);
    const [showTimePicker, setShowTimePicker] = React.useState<string | null>(null);
    const [tempDate, setTempDate] = React.useState<Date | null>(null);

    const renderField = (field: FormFieldConfig) => {
        const value = values[field.name];
        const error = errors[field.name];

        switch (field.type) {
            case 'text':
            case 'number':
            case 'textarea':
                return (
                    <View style={styles.inputWrapper}>
                        <TextInput
                            mode="outlined"
                            label={field.label}
                            value={typeof value === 'string' ? value : ''}
                            onChangeText={(text) => onChange(field.name, text)}
                            keyboardType={field.keyboardType || 'default'}
                            multiline={field.multiline}
                            numberOfLines={field.multiline ? 4 : 1}
                            style={[styles.input, field.multiline && styles.textArea]}
                            error={!!error}
                            left={
                                field.icon && (
                                    <TextInput.Icon
                                        icon={() => (
                                            <Icon name={field.icon as string} size={24} color={customTheme.colors.primary} />
                                        )}
                                    />
                                )
                            }
                        />
                        {field.infoText && (
                            <View style={styles.inputInfo}>
                                <Icon name="information" size={16} color={customTheme.colors.primary} />
                                <Text style={styles.infoText}>{field.infoText}</Text>
                            </View>
                        )}
                        {/* {error && (
                            <View style={styles.errorContainer}>
                                <Icon name="alert-circle" size={16} color={customTheme.colors.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )} */}
                    </View>
                );

            case 'datetime':
                return (
                    <TouchableOpacity
                        style={styles.dateTimeContainer}
                        onPress={() => {
                            setShowDatePicker(field.name);
                            setTempDate((value as Dayjs)?.toDate() || new Date());
                        }}
                    >
                        <TextInput
                            mode="outlined"
                            label={field.label}
                            value={
                                value instanceof dayjs
                                    ? `${(value as Dayjs).format('DD/MM/YYYY')} às ${(value as Dayjs).format('HH:mm')}`
                                    : ''
                            }
                            editable={false}
                            style={[styles.input, error && styles.inputError]}
                            error={!!error}
                            left={
                                field.icon && (
                                    <TextInput.Icon
                                        icon={() => (
                                            <Icon name={field.icon as string} size={24} color={customTheme.colors.primary} />
                                        )}
                                    />
                                )
                            }
                        />
                        {showDatePicker === field.name && (
                            <DateTimePicker
                                value={tempDate || new Date()}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    if (selectedDate) {
                                        setTempDate(selectedDate);
                                        setShowDatePicker(null);
                                        if (Platform.OS === 'android') {
                                            setShowTimePicker(field.name);
                                        } else {
                                            onChange(field.name, dayjs(selectedDate));
                                        }
                                    } else {
                                        setShowDatePicker(null);
                                    }
                                }}
                            />
                        )}
                        {showTimePicker === field.name && Platform.OS === 'android' && (
                            <DateTimePicker
                                value={tempDate || new Date()}
                                mode="time"
                                display="default"
                                onChange={(event, selectedTime) => {
                                    setShowTimePicker(null);
                                    if (selectedTime && tempDate) {
                                        const finalDate = new Date(
                                            tempDate.getFullYear(),
                                            tempDate.getMonth(),
                                            tempDate.getDate(),
                                            selectedTime.getHours(),
                                            selectedTime.getMinutes()
                                        );
                                        onChange(field.name, dayjs(finalDate));
                                    }
                                }}
                            />
                        )}
                        {error && (
                            <View style={styles.errorContainer}>
                                <Icon name="alert-circle" size={16} color={customTheme.colors.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                );
                return (
                    <TouchableOpacity
                        style={styles.dateTimeContainer}
                        onPress={() => setShowDatePicker(field.name)}
                    >
                        <TextInput
                            mode="outlined"
                            label={field.label}
                            value={
                                value instanceof dayjs
                                    ? `${(value as Dayjs).format('DD/MM/YYYY')} às ${(value as Dayjs).format('HH:mm')}`
                                    : ''
                            }
                            editable={false}
                            style={[styles.input, error && styles.inputError]}
                            error={!!error}
                            left={
                                field.icon && (
                                    <TextInput.Icon
                                        icon={() => (
                                            <Icon name={field.icon as string} size={24} color={customTheme.colors.primary} />
                                        )}
                                    />
                                )
                            }
                        />
                        {showDatePicker === field.name && (
                            <DateTimePicker
                                value={(value as Dayjs)?.toDate() || new Date()}
                                mode="time"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(null);
                                    if (selectedDate) {
                                        onChange(field.name, dayjs(selectedDate));
                                    }
                                }}
                            />
                        )}
                        {error && (
                            <View style={styles.errorContainer}>
                                <Icon name="alert-circle" size={16} color={customTheme.colors.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                );

            case 'dropdown':
                return (
                    <View style={styles.dropdownContainer}>
                        <TouchableOpacity
                            onPress={() => setShowSelectionModal(field.name)}
                            style={[styles.dropdown]}
                        >
                            <TextInput
                                mode="outlined"
                                label={field.label}
                                value={value as string}
                                editable={false}
                                style={[styles.input, error && styles.inputError]}
                                left={
                                    field.icon && (
                                        <TextInput.Icon
                                            icon={() => (
                                                <Icon name={field.icon as string} size={24} color={customTheme.colors.primary} />
                                            )}
                                        />
                                    )
                                }
                            />
                        </TouchableOpacity>
                        <SelectionModal
                            visible={showSelectionModal === field.name}
                            onClose={() => setShowSelectionModal(null)}
                            onConfirm={(item) => {
                                onChange(field.name, item.value);
                                setShowSelectionModal(null);
                            }}
                            availableItems={
                                field.options?.map((opt) => ({
                                    nome: opt.label,
                                    value: opt.value,
                                    tipo: opt.tipo,
                                    icon: opt.icon,
                                })) || []
                            }
                            selectedItems={value ? [{ nome: value as string, value: value as string, tipo: undefined, icon: undefined }] : []}
                            title={field.label}
                            icon={field.icon as string}
                            placeholder={field.searchPlaceholder || field.label}
                            createCustomItem={
                                field.onAddCustom
                                    ? (input: string) => ({
                                        nome: input,
                                        value: input,
                                        tipo: undefined,
                                        icon: field.icon as string | undefined,
                                    })
                                    : undefined
                            }
                        />
                        {/* {error && (
                            <View style={styles.errorContainer}>
                                <Icon name="alert-circle" size={16} color={customTheme.colors.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )} */}
                    </View>
                );

            case 'products':
                return (
                    <ProductsContainer
                        field={field}
                        value={value as ProdutoEstoque[]}
                        onChange={onChange}
                    />
                );

            case 'photos':
                return (
                    <View>
                        <View style={styles.photoButtonsContainer}>
                            <TouchableOpacity style={styles.photoButtonWrapper} onPress={tirarFoto}>
                                <View style={styles.photoButton}>
                                    <Icon name="camera" size={24} color={customTheme.colors.primary} />
                                    <Text style={styles.photoButtonText}>Tirar Foto</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.photoButtonWrapper} onPress={selecionarDaGaleria}>
                                <View style={styles.photoButton}>
                                    <Icon name="image" size={24} color={customTheme.colors.primary} />
                                    <Text style={styles.photoButtonText}>Galeria</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.photoGalleryContainer}>
                            <PhotoGallery
                                photos={photos}
                                onDeletePhoto={onDeletePhoto}
                                onPhotoPress={() => onPhotoPress}
                            />
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ModernHeader
                title={title}
                iconName={iconName}
                onBackPress={() => navigation.goBack()}
                rightAction={rightAction}
                rightIcon={rightIcon}
            />
            <FullScreenImage
                visible={isFullScreenVisible}
                photo={selectedPhoto}
                onClose={() => setIsFullScreenVisible(false)}
            />
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <Surface style={styles.formContainer}>
                    {config.sections.map((section, index) => (
                        <View key={index} style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Icon name={section.icon as string} size={20} color={customTheme.colors.primary} />
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    {section.title}
                                </Text>
                            </View>
                            <View style={styles.inputGroup}>
                                {section.fields.map((field) => (
                                    <View key={field.name}>{renderField(field)}</View>
                                ))}
                            </View>
                        </View>
                    ))}
                    <View style={styles.buttonContainer}>
                        {Object.keys(errors).length > 0 && (
                            <View style={styles.errorContainer}>
                                {Object.entries(errors).map(([key, error]) => (
                                    <View key={key} style={styles.errorItem}>
                                        <Icon name="alert-circle" size={16} color={customTheme.colors.error} />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        <Button
                            mode="contained"
                            onPress={onSubmit}
                            style={[styles.saveButton, (Object.keys(errors).length > 0 || isSubmitting) && styles.saveButtonDisabled]}
                            contentStyle={styles.buttonContent}
                            loading={isSubmitting}
                            disabled={Object.keys(errors).length > 0 || isSubmitting}
                            icon="content-save"
                        >
                            <Text
                                style={[
                                    styles.buttonText,
                                    (Object.keys(errors).length > 0 || isSubmitting) && styles.buttonTextDisabled,
                                ]}
                            >
                                Salvar {title}
                            </Text>
                        </Button>
                    </View>
                </Surface>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollView: { flex: 1 },
    formContainer: { padding: 16, backgroundColor: customTheme.colors.surface, elevation: 2 },
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    sectionTitle: { color: customTheme.colors.onSurface, fontWeight: '600', fontSize: 18 },
    inputGroup: { gap: 16 },
    input: { backgroundColor: '#FFFFFF', height: 56 },
    textArea: { minHeight: 120, textAlignVertical: 'top', paddingTop: 12, paddingBottom: 12 },
    inputError: {},
    inputWrapper: { gap: 4 },
    inputInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
    infoText: { fontSize: 12, color: customTheme.colors.primary, opacity: 0.8 },
    dateTimeContainer: { flex: 1 },
    dropdownContainer: {
        backgroundColor: '#FFFFFF',
    },
    dropdown: {
        height: 60,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
    },
    dropdownIcon: { marginRight: 12 },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    placeholderStyle: { fontSize: 16, color: customTheme.colors.onSurfaceVariant },
    selectedTextStyle: { fontSize: 16, color: customTheme.colors.onSurface, fontWeight: '500' },
    inputSearchStyle: { height: 48, fontSize: 16, borderRadius: 8, color: customTheme.colors.onSurface },
    iconStyle: { width: 24, height: 24 },
    dropdownLabel: { flex: 1, fontSize: 16, color: customTheme.colors.onSurface },
    photoButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16,
    },
    photoButtonWrapper: {
        width: '45%',
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
    },
    photoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 16,
        height: 56,
    },
    photoButtonText: { fontSize: 16, color: customTheme.colors.primary, fontWeight: '500' },
    photoGalleryContainer: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        padding: 16,
        backgroundColor: '#FFFFFF',
    },
    buttonContainer: { marginTop: 32, marginBottom: 24, gap: 16 },
    saveButton: { borderRadius: 8, backgroundColor: customTheme.colors.primary, elevation: 2 },
    saveButtonDisabled: { backgroundColor: customTheme.colors.surfaceDisabled, elevation: 0 },
    buttonContent: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
    buttonText: { color: customTheme.colors.onPrimary, fontSize: 16, fontWeight: '600' },
    buttonTextDisabled: { color: customTheme.colors.onSurfaceDisabled },
    errorContainer: { marginTop: 5, padding: 12, backgroundColor: customTheme.colors.errorContainer, borderRadius: 8, gap: 8 },
    errorItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    errorText: { color: customTheme.colors.error, fontSize: 14, flex: 1 },
});

export default FormularioComponent;