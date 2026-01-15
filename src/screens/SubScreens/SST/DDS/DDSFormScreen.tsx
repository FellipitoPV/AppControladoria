import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    TouchableOpacity,
} from 'react-native';
import {
    Text,
    TextInput,
    Button,
    Surface,
    Chip,
    Portal,
    Modal,
    List,
    Divider,
    IconButton,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../../firebase';
import {
    DDSInterface,
    DDSFormData,
    DDSStatus,
    STATUS_OPTIONS,
    getStatusColor,
    Participante,
} from './DDSTypes';
import ModernHeader from '../../../../assets/components/ModernHeader';
import SaveButton from '../../../../assets/components/SaveButton';
import { customTheme } from '../../../../theme/theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const LISTA_PRESENCA_API = 'https://lista-presenca-dds-708827138368.europe-west1.run.app';

type RootStackParamList = {
    DDSScreen: undefined;
    DDSFormScreen: { dds?: DDSInterface; mode: 'create' | 'edit' | 'view' };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DDSFormScreen'>;
type RoutePropType = RouteProp<RootStackParamList, 'DDSFormScreen'>;

const formatTimeValue = (time: Timestamp | string | any): string => {
    if (!time) return '08:00';

    // Se já for string no formato HH:mm, retorna direto
    if (typeof time === 'string' && /^\d{2}:\d{2}$/.test(time)) {
        return time;
    }

    // Se for Timestamp do Firebase
    if (time instanceof Timestamp) {
        const dateObj = time.toDate();
        const hours = dateObj.getHours().toString().padStart(2, '0');
        const minutes = dateObj.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Se for objeto com seconds (Timestamp serializado)
    if (time && typeof time === 'object' && 'seconds' in time) {
        const dateObj = new Date(time.seconds * 1000);
        const hours = dateObj.getHours().toString().padStart(2, '0');
        const minutes = dateObj.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Se for string de data ISO
    if (typeof time === 'string') {
        const dateObj = new Date(time);
        if (!isNaN(dateObj.getTime())) {
            const hours = dateObj.getHours().toString().padStart(2, '0');
            const minutes = dateObj.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        }
    }

    return '08:00';
};

const DDSFormScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<RoutePropType>();
    const { dds, mode } = route.params || { mode: 'create' };

    const isViewMode = mode === 'view';
    const isEditMode = mode === 'edit';

    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [downloadLoading, setDownloadLoading] = useState(false);

    // Form fields
    const [titulo, setTitulo] = useState('');
    const [instrutor, setInstrutor] = useState('');
    const [funcao, setFuncao] = useState('');
    const [dataRealizacao, setDataRealizacao] = useState(new Date());
    const [horaInicio, setHoraInicio] = useState('08:00');
    const [horaFim, setHoraFim] = useState('08:30');
    const [status, setStatus] = useState<DDSStatus>('Planejado');
    const [local, setLocal] = useState('');
    const [assunto, setAssunto] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [participantes, setParticipantes] = useState<Participante[]>([]);

    // Pickers
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimeStartPicker, setShowTimeStartPicker] = useState(false);
    const [showTimeEndPicker, setShowTimeEndPicker] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showParticipantesModal, setShowParticipantesModal] = useState(false);

    useEffect(() => {
        if (dds) {
            setTitulo(dds.titulo || '');
            setInstrutor(dds.instrutor || '');
            setFuncao(dds.funcao || '');
            setLocal(dds.local || '');
            setAssunto(dds.assunto || '');
            setObservacoes(dds.observacoes || '');
            setStatus(dds.status || 'Planejado');
            setHoraInicio(formatTimeValue(dds.horaInicio));
            setHoraFim(formatTimeValue(dds.horaFim));
            setParticipantes(dds.participantes || []);

            if (dds.dataRealizacao) {
                if (dds.dataRealizacao instanceof Timestamp) {
                    setDataRealizacao(dds.dataRealizacao.toDate());
                } else if (typeof dds.dataRealizacao === 'string') {
                    setDataRealizacao(new Date(dds.dataRealizacao));
                }
            }
        }
    }, [dds]);

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDataRealizacao(selectedDate);
        }
    };

    const handleTimeStartChange = (event: any, selectedTime?: Date) => {
        setShowTimeStartPicker(false);
        if (selectedTime) {
            const hours = selectedTime.getHours().toString().padStart(2, '0');
            const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
            setHoraInicio(`${hours}:${minutes}`);
        }
    };

    const handleTimeEndChange = (event: any, selectedTime?: Date) => {
        setShowTimeEndPicker(false);
        if (selectedTime) {
            const hours = selectedTime.getHours().toString().padStart(2, '0');
            const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
            setHoraFim(`${hours}:${minutes}`);
        }
    };

    const parseTime = (timeStr: string): Date => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    const validateForm = (): boolean => {
        if (!titulo.trim()) {
            showGlobalToast('error', 'Erro', 'Informe o título do DDS');
            return false;
        }
        if (!instrutor.trim()) {
            showGlobalToast('error', 'Erro', 'Informe o instrutor');
            return false;
        }
        if (!local.trim()) {
            showGlobalToast('error', 'Erro', 'Informe o local');
            return false;
        }
        if (!assunto.trim()) {
            showGlobalToast('error', 'Erro', 'Informe o assunto');
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setLoading(true);

        try {
            const ddsData: Omit<DDSInterface, 'id'> = {
                titulo: titulo.trim(),
                instrutor: instrutor.trim(),
                funcao: funcao.trim(),
                dataRealizacao: Timestamp.fromDate(dataRealizacao),
                horaInicio,
                horaFim,
                status,
                local: local.trim(),
                assunto: assunto.trim(),
                observacoes: observacoes.trim(),
                participantes,
                dataCriacao: isEditMode && dds?.dataCriacao
                    ? dds.dataCriacao
                    : Timestamp.now(),
            };

            if (isEditMode && dds?.id) {
                const docRef = doc(db(), 'dds', dds.id);
                await updateDoc(docRef, ddsData);
                showGlobalToast('success', 'Sucesso', 'DDS atualizado com sucesso!');
            } else {
                await addDoc(collection(db(), 'dds'), ddsData);
                showGlobalToast('success', 'Sucesso', 'DDS criado com sucesso!');
            }

            navigation.goBack();
        } catch (error) {
            console.error('Erro ao salvar DDS:', error);
            showGlobalToast('error', 'Erro', 'Erro ao salvar DDS. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Excluir DDS',
            'Tem certeza que deseja excluir este DDS? Esta ação não pode ser desfeita.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        if (!dds?.id) return;

                        setDeleteLoading(true);
                        try {
                            await deleteDoc(doc(db(), 'dds', dds.id));
                            showGlobalToast('success', 'Sucesso', 'DDS excluído com sucesso!');
                            navigation.goBack();
                        } catch (error) {
                            console.error('Erro ao excluir DDS:', error);
                            showGlobalToast('error', 'Erro', 'Erro ao excluir DDS.');
                        } finally {
                            setDeleteLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleEdit = () => {
        navigation.setParams({ mode: 'edit' });
    };

    const handleDownloadListaPresenca = async () => {
        if (!dds) return;

        setDownloadLoading(true);
        showGlobalToast('info', 'Aguarde', 'Gerando lista de presença...');

        try {
            const response = await fetch(`${LISTA_PRESENCA_API}/generate-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dds: {
                        titulo: dds.titulo,
                        instrutor: dds.instrutor,
                        funcao: dds.funcao,
                        local: dds.local,
                        dataRealizacao: dds.dataRealizacao,
                        horaInicio: dds.horaInicio,
                        horaFim: dds.horaFim,
                        participantes: dds.participantes || [],
                    }
                })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Erro ao gerar PDF');
            }

            const { fileBase64, fileName, mimeType } = result;

            // Salvar arquivo
            const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
            await RNFS.writeFile(filePath, fileBase64, 'base64');

            showGlobalToast('success', 'Sucesso', 'Lista de presença gerada!');

            // Compartilhar arquivo
            await Share.open({
                url: `file://${filePath}`,
                type: mimeType,
                title: fileName,
                filename: fileName,
            });

        } catch (error: any) {
            console.error('Erro ao baixar lista de presença:', error);
            showGlobalToast('error', 'Erro', error.message || 'Erro ao gerar lista de presença');
        } finally {
            setDownloadLoading(false);
        }
    };

    const getHeaderTitle = (): string => {
        if (isViewMode) return 'Detalhes do DDS';
        if (isEditMode) return 'Editar DDS';
        return 'Novo DDS';
    };

    return (
        <View style={styles.container}>
            <ModernHeader
                title={getHeaderTitle()}
                iconName="account-group"
                onBackPress={() => navigation.goBack()}
                rightButton={
                    isViewMode
                        ? { icon: 'pencil', onPress: handleEdit }
                        : undefined
                }
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Status */}
                    <Surface style={styles.section}>
                        <Text style={styles.sectionTitle}>Status</Text>
                        <TouchableOpacity
                            style={styles.statusSelector}
                            onPress={() => !isViewMode && setShowStatusModal(true)}
                            disabled={isViewMode}
                        >
                            <Chip
                                style={[
                                    styles.statusChip,
                                    { backgroundColor: getStatusColor(status) },
                                ]}
                                textStyle={styles.statusChipText}
                            >
                                {status}
                            </Chip>
                            {!isViewMode && (
                                <MaterialCommunityIcons
                                    name="chevron-down"
                                    size={24}
                                    color={customTheme.colors.outline}
                                />
                            )}
                        </TouchableOpacity>
                    </Surface>

                    {/* Informações Básicas */}
                    <Surface style={styles.section}>
                        <Text style={styles.sectionTitle}>Informações Básicas</Text>

                        <TextInput
                            label="Título do DDS *"
                            value={titulo}
                            onChangeText={setTitulo}
                            mode="outlined"
                            style={styles.input}
                            disabled={isViewMode}
                            left={<TextInput.Icon icon="format-title" />}
                        />

                        <TextInput
                            label="Instrutor *"
                            value={instrutor}
                            onChangeText={setInstrutor}
                            mode="outlined"
                            style={styles.input}
                            disabled={isViewMode}
                            left={<TextInput.Icon icon="account-tie" />}
                        />

                        <TextInput
                            label="Função"
                            value={funcao}
                            onChangeText={setFuncao}
                            mode="outlined"
                            style={styles.input}
                            disabled={isViewMode}
                            left={<TextInput.Icon icon="briefcase" />}
                        />

                        <TextInput
                            label="Local *"
                            value={local}
                            onChangeText={setLocal}
                            mode="outlined"
                            style={styles.input}
                            disabled={isViewMode}
                            left={<TextInput.Icon icon="map-marker" />}
                        />
                    </Surface>

                    {/* Data e Hora */}
                    <Surface style={styles.section}>
                        <Text style={styles.sectionTitle}>Data e Hora</Text>

                        <TouchableOpacity
                            style={styles.dateTimeButton}
                            onPress={() => !isViewMode && setShowDatePicker(true)}
                            disabled={isViewMode}
                        >
                            <MaterialCommunityIcons
                                name="calendar"
                                size={24}
                                color={customTheme.colors.primary}
                            />
                            <View style={styles.dateTimeContent}>
                                <Text style={styles.dateTimeLabel}>Data de Realização</Text>
                                <Text style={styles.dateTimeValue}>{formatDate(dataRealizacao)}</Text>
                            </View>
                            {!isViewMode && (
                                <MaterialCommunityIcons
                                    name="chevron-right"
                                    size={24}
                                    color={customTheme.colors.outline}
                                />
                            )}
                        </TouchableOpacity>

                        <View style={styles.timeRow}>
                            <TouchableOpacity
                                style={[styles.dateTimeButton, styles.timeButton]}
                                onPress={() => !isViewMode && setShowTimeStartPicker(true)}
                                disabled={isViewMode}
                            >
                                <MaterialCommunityIcons
                                    name="clock-start"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <View style={styles.dateTimeContent}>
                                    <Text style={styles.dateTimeLabel}>Início</Text>
                                    <Text style={styles.dateTimeValue}>{horaInicio}</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.dateTimeButton, styles.timeButton]}
                                onPress={() => !isViewMode && setShowTimeEndPicker(true)}
                                disabled={isViewMode}
                            >
                                <MaterialCommunityIcons
                                    name="clock-end"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                                <View style={styles.dateTimeContent}>
                                    <Text style={styles.dateTimeLabel}>Fim</Text>
                                    <Text style={styles.dateTimeValue}>{horaFim}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </Surface>

                    {/* Assunto */}
                    <Surface style={styles.section}>
                        <Text style={styles.sectionTitle}>Assunto do DDS</Text>

                        <TextInput
                            label="Assunto *"
                            value={assunto}
                            onChangeText={setAssunto}
                            mode="outlined"
                            style={styles.input}
                            multiline
                            numberOfLines={4}
                            disabled={isViewMode}
                            left={<TextInput.Icon icon="text-box-outline" />}
                        />

                        <TextInput
                            label="Observações"
                            value={observacoes}
                            onChangeText={setObservacoes}
                            mode="outlined"
                            style={styles.input}
                            multiline
                            numberOfLines={3}
                            disabled={isViewMode}
                            left={<TextInput.Icon icon="note-text" />}
                        />
                    </Surface>

                    {/* Participantes */}
                    <Surface style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Participantes</Text>
                            <Chip
                                style={styles.participantCountChip}
                                textStyle={styles.participantCountText}
                            >
                                {participantes.length}
                            </Chip>
                        </View>

                        {participantes.length > 0 ? (
                            <View style={styles.participantesList}>
                                {participantes.map((p, index) => (
                                    <View key={index} style={styles.participanteItem}>
                                        <MaterialCommunityIcons
                                            name="account"
                                            size={20}
                                            color={customTheme.colors.primary}
                                        />
                                        <View style={styles.participanteInfo}>
                                            <Text style={styles.participanteName}>{p.nome}</Text>
                                            <Text style={styles.participanteCargo}>{p.cargo}</Text>
                                        </View>
                                        {p.signatureUrl && (
                                            <MaterialCommunityIcons
                                                name="check-circle"
                                                size={20}
                                                color={customTheme.colors.primary}
                                            />
                                        )}
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.noParticipantes}>
                                <MaterialCommunityIcons
                                    name="account-off"
                                    size={32}
                                    color={customTheme.colors.outline}
                                />
                                <Text style={styles.noParticipantesText}>
                                    Nenhum participante registrado
                                </Text>
                            </View>
                        )}
                    </Surface>

                    {/* Botão Download Lista de Presença - Apenas no modo view */}
                    {isViewMode && (
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.downloadButton}
                                onPress={handleDownloadListaPresenca}
                                disabled={downloadLoading}
                            >
                                <MaterialCommunityIcons
                                    name={downloadLoading ? 'loading' : 'file-pdf-box'}
                                    size={24}
                                    color={customTheme.colors.onPrimary}
                                />
                                <Text style={styles.downloadButtonText}>
                                    {downloadLoading ? 'Gerando PDF...' : 'Baixar Lista de Presença'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Botões de Ação */}
                    {!isViewMode && (
                        <View style={styles.buttonContainer}>
                            <SaveButton
                                onPress={handleSave}
                                text={isEditMode ? 'Salvar Alterações' : 'Criar DDS'}
                                iconName="content-save"
                                loading={loading}
                                disabled={loading}
                            />

                            {isEditMode && (
                                <Button
                                    mode="outlined"
                                    onPress={handleDelete}
                                    style={styles.deleteButton}
                                    textColor={customTheme.colors.error}
                                    icon="delete"
                                    loading={deleteLoading}
                                    disabled={deleteLoading}
                                >
                                    Excluir DDS
                                </Button>
                            )}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Date Picker */}
            {showDatePicker && (
                <DateTimePicker
                    value={dataRealizacao}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    locale="pt-BR"
                />
            )}

            {/* Time Start Picker */}
            {showTimeStartPicker && (
                <DateTimePicker
                    value={parseTime(horaInicio)}
                    mode="time"
                    display="default"
                    onChange={handleTimeStartChange}
                    is24Hour={true}
                />
            )}

            {/* Time End Picker */}
            {showTimeEndPicker && (
                <DateTimePicker
                    value={parseTime(horaFim)}
                    mode="time"
                    display="default"
                    onChange={handleTimeEndChange}
                    is24Hour={true}
                />
            )}

            {/* Status Modal */}
            <Portal>
                <Modal
                    visible={showStatusModal}
                    onDismiss={() => setShowStatusModal(false)}
                    contentContainerStyle={styles.modal}
                >
                    <Text style={styles.modalTitle}>Selecione o Status</Text>
                    {STATUS_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.statusOption,
                                status === option.value && styles.statusOptionSelected,
                            ]}
                            onPress={() => {
                                setStatus(option.value);
                                setShowStatusModal(false);
                            }}
                        >
                            <View
                                style={[
                                    styles.statusDot,
                                    { backgroundColor: getStatusColor(option.value) },
                                ]}
                            />
                            <Text
                                style={[
                                    styles.statusOptionText,
                                    status === option.value && styles.statusOptionTextSelected,
                                ]}
                            >
                                {option.label}
                            </Text>
                            {status === option.value && (
                                <MaterialCommunityIcons
                                    name="check"
                                    size={24}
                                    color={customTheme.colors.primary}
                                />
                            )}
                        </TouchableOpacity>
                    ))}
                </Modal>
            </Portal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    section: {
        padding: 16,
        marginBottom: 16,
        borderRadius: 12,
        backgroundColor: customTheme.colors.surface,
        elevation: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginBottom: 12,
    },
    input: {
        marginBottom: 12,
        backgroundColor: customTheme.colors.surface,
    },
    statusSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusChip: {
        height: 32,
    },
    statusChipText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    dateTimeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 8,
        marginBottom: 12,
    },
    dateTimeContent: {
        flex: 1,
        marginLeft: 12,
    },
    dateTimeLabel: {
        fontSize: 12,
        color: customTheme.colors.outline,
    },
    dateTimeValue: {
        fontSize: 16,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    timeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    timeButton: {
        flex: 1,
    },
    participantCountChip: {
        backgroundColor: customTheme.colors.primaryContainer,
        marginBottom: 12,
    },
    participantCountText: {
        color: customTheme.colors.primary,
        fontWeight: '600',
    },
    participantesList: {
        marginTop: 8,
    },
    participanteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 8,
        marginBottom: 8,
    },
    participanteInfo: {
        flex: 1,
        marginLeft: 12,
    },
    participanteName: {
        fontSize: 14,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    participanteCargo: {
        fontSize: 12,
        color: customTheme.colors.outline,
    },
    noParticipantes: {
        alignItems: 'center',
        padding: 24,
    },
    noParticipantesText: {
        fontSize: 14,
        color: customTheme.colors.outline,
        marginTop: 8,
    },
    buttonContainer: {
        marginTop: 8,
    },
    deleteButton: {
        marginTop: 12,
        borderColor: customTheme.colors.error,
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: customTheme.colors.primary,
        padding: 16,
        borderRadius: 8,
        gap: 10,
    },
    downloadButtonText: {
        color: customTheme.colors.onPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    modal: {
        backgroundColor: customTheme.colors.surface,
        margin: 20,
        padding: 20,
        borderRadius: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginBottom: 16,
    },
    statusOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
    },
    statusOptionSelected: {
        backgroundColor: customTheme.colors.primaryContainer,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    statusOptionText: {
        flex: 1,
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    statusOptionTextSelected: {
        fontWeight: '600',
        color: customTheme.colors.primary,
    },
});

export default DDSFormScreen;
