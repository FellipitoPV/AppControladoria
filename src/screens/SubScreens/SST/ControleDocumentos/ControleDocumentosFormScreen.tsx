import React, { useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ecoApi } from '../../../../api/ecoApi';
import {
    ControleDocumento,
    AreaDocumento,
    AlertaVencimento,
    AREAS,
    AREA_COLORS,
    AREA_ICONS,
    ALERTA_OPTIONS,
    getStatusDocumento,
    STATUS_COLORS,
    STATUS_LABELS,
    STATUS_ICONS,
    formatDate,
} from './ControleDocumentosTypes';
import { customTheme } from '../../../../theme/theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import ModernHeader from '../../../../assets/components/ModernHeader';
import SaveButton from '../../../../assets/components/SaveButton';
import { showGlobalToast } from '../../../../helpers/GlobalApi';

type RootStackParamList = {
    ControleDocumentosFormScreen: {
        item?: ControleDocumento;
        mode: 'create' | 'edit' | 'view';
    };
};

type FormRouteProp = RouteProp<RootStackParamList, 'ControleDocumentosFormScreen'>;

type FormMode = 'create' | 'edit' | 'view';

const withAlpha = (hex: string, alpha: number): string => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return `${hex}${a}`;
};

const ControleDocumentosFormScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<FormRouteProp>();
    const { item, mode: initialMode } = route.params;

    const [mode, setMode] = useState<FormMode>(initialMode);
    const isReadOnly = mode === 'view';

    const [form, setForm] = useState({
        tipoPrograma: item?.tipoPrograma || '',
        responsavel: item?.responsavel || '',
        dataAtualizacao: item?.dataAtualizacao || '',
        vencimento: item?.vencimento || '',
        alertaVencimento: (item?.alertaVencimento || '3meses') as AlertaVencimento,
        area: item?.area as AreaDocumento | undefined,
    });

    const [saving, setSaving] = useState(false);
    const [areaModalVisible, setAreaModalVisible] = useState(false);
    const [alertaModalVisible, setAlertaModalVisible] = useState(false);
    const [datePicker, setDatePicker] = useState<{
        visible: boolean;
        field: 'dataAtualizacao' | 'vencimento';
    }>({ visible: false, field: 'dataAtualizacao' });

    const handleSave = async () => {
        if (!form.tipoPrograma.trim()) {
            showGlobalToast('error', 'Campo obrigatório', 'Informe o tipo ou nome do programa.');
            return;
        }
        if (!form.responsavel.trim()) {
            showGlobalToast('error', 'Campo obrigatório', 'Informe o responsável pelo documento.');
            return;
        }

        setSaving(true);
        try {
            if (item?.id) {
                await ecoApi.update('controleDocumentos', item.id, { ...form });
                showGlobalToast('success', 'Sucesso', 'Documento atualizado com sucesso!');
            } else {
                await ecoApi.create('controleDocumentos', {
                    ...form,
                    dataCriacao: new Date().toISOString(),
                });
                showGlobalToast('success', 'Sucesso', 'Documento cadastrado com sucesso!');
            }
            navigation.goBack();
        } catch (error) {
            console.error('Erro ao salvar documento:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível salvar o documento. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!item?.id) return;
        ecoApi.delete('controleDocumentos', item.id)
            .then(() => {
                showGlobalToast('success', 'Sucesso', 'Documento excluído com sucesso!');
                navigation.goBack();
            })
            .catch(error => {
                console.error('Erro ao excluir:', error);
                showGlobalToast('error', 'Erro', 'Não foi possível excluir o documento.');
            });
    };

    const onDateChange = (_: any, date?: Date) => {
        setDatePicker(prev => ({ ...prev, visible: false }));
        if (date) {
            const isoDate = date.toISOString().split('T')[0];
            setForm(prev => ({ ...prev, [datePicker.field]: isoDate }));
        }
    };

    const currentStatus =
        form.vencimento
            ? getStatusDocumento(form.vencimento, form.alertaVencimento)
            : null;

    const headerTitle =
        mode === 'create'
            ? 'Novo Documento'
            : mode === 'edit'
            ? 'Editar Documento'
            : 'Documento Legal';

    return (
        <Surface style={styles.container}>
            <ModernHeader
                title={headerTitle}
                iconName="file-document-outline"
                onBackPress={() => navigation.goBack()}
                rightButton={mode === 'view' ? {
                    icon: 'pencil-outline',
                    onPress: () => setMode('edit'),
                } : undefined}
            />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Status chip quando tem vencimento */}
                {currentStatus && (
                    <View
                        style={[
                            styles.statusBanner,
                            { backgroundColor: withAlpha(STATUS_COLORS[currentStatus], 0.12) },
                        ]}
                    >
                        <MaterialCommunityIcons
                            name={STATUS_ICONS[currentStatus]}
                            size={20}
                            color={STATUS_COLORS[currentStatus]}
                        />
                        <Text
                            style={[
                                styles.statusBannerText,
                                { color: STATUS_COLORS[currentStatus] },
                            ]}
                        >
                            {STATUS_LABELS[currentStatus]}
                        </Text>
                    </View>
                )}

                {mode === 'edit' && item?.id && (
                    <TouchableOpacity style={styles.deleteAction} onPress={handleDelete}>
                        <MaterialCommunityIcons
                            name="trash-can-outline"
                            size={18}
                            color={customTheme.colors.error}
                        />
                        <Text style={styles.deleteActionText}>Excluir documento</Text>
                    </TouchableOpacity>
                )}

                <Surface style={styles.section} elevation={2}>
                    <View style={styles.sectionBar} />
                    <Text style={styles.sectionTitle}>
                        Informações do Documento
                    </Text>

                    {/* Tipo / Programa */}
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Tipo / Programa *</Text>
                        <TextInput
                            style={[styles.input, isReadOnly && styles.inputReadOnly]}
                            value={form.tipoPrograma}
                            onChangeText={v => setForm(prev => ({ ...prev, tipoPrograma: v }))}
                            placeholder="Ex: PPRA, PCMSO, LTCAT..."
                            placeholderTextColor={customTheme.colors.outline}
                            editable={!isReadOnly}
                        />
                    </View>

                    {/* Responsável */}
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Responsável *</Text>
                        <TextInput
                            style={[styles.input, isReadOnly && styles.inputReadOnly]}
                            value={form.responsavel}
                            onChangeText={v => setForm(prev => ({ ...prev, responsavel: v }))}
                            placeholder="Nome do responsável"
                            placeholderTextColor={customTheme.colors.outline}
                            editable={!isReadOnly}
                        />
                    </View>

                    {/* Área */}
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Área</Text>
                        <TouchableOpacity
                            style={[styles.selectorButton, isReadOnly && styles.inputReadOnly]}
                            onPress={() => !isReadOnly && setAreaModalVisible(true)}
                            disabled={isReadOnly}
                        >
                            {form.area ? (
                                <View style={styles.selectorContent}>
                                    <MaterialCommunityIcons
                                        name={AREA_ICONS[form.area]}
                                        size={18}
                                        color={AREA_COLORS[form.area]}
                                    />
                                    <Text style={[styles.selectorValue, { color: AREA_COLORS[form.area] }]}>
                                        {form.area}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.selectorPlaceholder}>Selecionar área...</Text>
                            )}
                            {!isReadOnly && (
                                <MaterialCommunityIcons
                                    name="chevron-down"
                                    size={20}
                                    color={customTheme.colors.outline}
                                />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Alerta de vencimento */}
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Alertar com antecedência de</Text>
                        <TouchableOpacity
                            style={[styles.selectorButton, isReadOnly && styles.inputReadOnly]}
                            onPress={() => !isReadOnly && setAlertaModalVisible(true)}
                            disabled={isReadOnly}
                        >
                            <MaterialCommunityIcons
                                name="clock-alert-outline"
                                size={18}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.selectorValue}>
                                {ALERTA_OPTIONS.find(o => o.value === form.alertaVencimento)?.label || ''}
                            </Text>
                            {!isReadOnly && (
                                <MaterialCommunityIcons
                                    name="chevron-down"
                                    size={20}
                                    color={customTheme.colors.outline}
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                </Surface>

                <Surface style={styles.section} elevation={2}>
                    <View style={styles.sectionBar} />
                    <Text style={styles.sectionTitle}>Datas</Text>

                    {/* Data de Atualização */}
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Data de Atualização</Text>
                        <TouchableOpacity
                            style={[styles.selectorButton, isReadOnly && styles.inputReadOnly]}
                            onPress={() =>
                                !isReadOnly &&
                                setDatePicker({ visible: true, field: 'dataAtualizacao' })
                            }
                            disabled={isReadOnly}
                        >
                            <MaterialCommunityIcons
                                name="calendar-edit"
                                size={18}
                                color={customTheme.colors.outline}
                            />
                            <Text
                                style={
                                    form.dataAtualizacao
                                        ? styles.selectorValue
                                        : styles.selectorPlaceholder
                                }
                            >
                                {form.dataAtualizacao
                                    ? formatDate(form.dataAtualizacao)
                                    : 'Selecionar data...'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Data de Vencimento */}
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Data de Vencimento</Text>
                        <TouchableOpacity
                            style={[styles.selectorButton, isReadOnly && styles.inputReadOnly]}
                            onPress={() =>
                                !isReadOnly &&
                                setDatePicker({ visible: true, field: 'vencimento' })
                            }
                            disabled={isReadOnly}
                        >
                            <MaterialCommunityIcons
                                name="calendar-clock"
                                size={18}
                                color={customTheme.colors.outline}
                            />
                            <Text
                                style={
                                    form.vencimento
                                        ? styles.selectorValue
                                        : styles.selectorPlaceholder
                                }
                            >
                                {form.vencimento
                                    ? formatDate(form.vencimento)
                                    : 'Selecionar data...'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Surface>
            </ScrollView>

            {(mode === 'create' || mode === 'edit') && (
                <SaveButton
                    onPress={handleSave}
                    text="Salvar"
                    iconName="content-save"
                    loading={saving}
                    disabled={saving}
                    style={styles.saveButton}
                />
            )}

            {/* DateTimePicker */}
            {datePicker.visible && (
                <DateTimePicker
                    value={
                        form[datePicker.field]
                            ? new Date(form[datePicker.field] + 'T12:00:00')
                            : new Date()
                    }
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}

            {/* Modal de Área */}
            <Modal
                visible={areaModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAreaModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalBar} />
                        <View style={styles.modalInner}>
                            <Text style={styles.modalTitle}>Selecionar Área</Text>
                            {AREAS.map(area => (
                                <TouchableOpacity
                                    key={area}
                                    style={[
                                        styles.modalOption,
                                        form.area === area && {
                                            backgroundColor: withAlpha(AREA_COLORS[area], 0.12),
                                        },
                                    ]}
                                    onPress={() => {
                                        setForm(prev => ({ ...prev, area }));
                                        setAreaModalVisible(false);
                                    }}
                                >
                                    <MaterialCommunityIcons
                                        name={AREA_ICONS[area]}
                                        size={22}
                                        color={AREA_COLORS[area]}
                                    />
                                    <Text
                                        style={[styles.modalOptionText, { color: AREA_COLORS[area] }]}
                                    >
                                        {area}
                                    </Text>
                                    {form.area === area && (
                                        <MaterialCommunityIcons
                                            name="check"
                                            size={20}
                                            color={AREA_COLORS[area]}
                                            style={styles.modalCheck}
                                        />
                                    )}
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setAreaModalVisible(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal de Alerta */}
            <Modal
                visible={alertaModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAlertaModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalBar} />
                        <View style={styles.modalInner}>
                            <Text style={styles.modalTitle}>Alerta de Vencimento</Text>
                            {ALERTA_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.modalOption,
                                        form.alertaVencimento === opt.value && {
                                            backgroundColor: withAlpha(customTheme.colors.primary, 0.12),
                                        },
                                    ]}
                                    onPress={() => {
                                        setForm(prev => ({ ...prev, alertaVencimento: opt.value }));
                                        setAlertaModalVisible(false);
                                    }}
                                >
                                    <MaterialCommunityIcons
                                        name="clock-alert-outline"
                                        size={22}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text style={styles.modalOptionText}>{opt.label} antes do vencimento</Text>
                                    {form.alertaVencimento === opt.value && (
                                        <MaterialCommunityIcons
                                            name="check"
                                            size={20}
                                            color={customTheme.colors.primary}
                                            style={styles.modalCheck}
                                        />
                                    )}
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setAlertaModalVisible(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </Surface>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 96,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    statusBannerText: {
        fontSize: 14,
        fontWeight: '600',
    },
    section: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: customTheme.colors.surfaceVariant,
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
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingTop: 14,
    },
    field: {
        marginBottom: 14,
        paddingHorizontal: 16,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: customTheme.colors.onSurface,
        backgroundColor: customTheme.colors.surface,
    },
    inputReadOnly: {
        backgroundColor: customTheme.colors.surfaceVariant,
        borderColor: customTheme.colors.surfaceVariant,
    },
    selectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 8,
        backgroundColor: customTheme.colors.surface,
    },
    selectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    selectorValue: {
        fontSize: 15,
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    selectorPlaceholder: {
        fontSize: 15,
        color: customTheme.colors.outline,
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: customTheme.colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    modalBar: {
        height: 4,
        backgroundColor: customTheme.colors.primary,
    },
    modalInner: {
        padding: 20,
        paddingBottom: 40,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: customTheme.colors.onSurface,
        marginBottom: 16,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 4,
    },
    modalOptionText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    modalCheck: {
        marginLeft: 'auto' as any,
    },
    modalCancelButton: {
        alignItems: 'center',
        paddingVertical: 14,
        marginTop: 8,
    },
    modalCancelText: {
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
    },
    deleteAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customTheme.colors.error,
        backgroundColor: withAlpha(customTheme.colors.error, 0.06),
    },
    deleteActionText: {
        color: customTheme.colors.error,
        fontSize: 14,
        fontWeight: '600',
    },
    saveButton: {
        marginHorizontal: 16,
        marginBottom: 16,
    },
});

export default ControleDocumentosFormScreen;
