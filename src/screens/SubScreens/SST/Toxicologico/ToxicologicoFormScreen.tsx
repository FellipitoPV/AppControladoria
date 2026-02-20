import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Image,
    TouchableOpacity,
} from 'react-native';
import {
    Text,
    TextInput,
    Button,
    Surface,
    Portal,
    Modal,
    List,
    Divider,
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
    ToxicologicoInterface,
    AssinaturaField,
    TipoTeste,
    ResultadoTeste,
    SituacaoRecusa,
    TIPO_TESTE_OPTIONS,
    RESULTADO_OPTIONS,
    RECUSA_OPTIONS,
    getResultadoColor,
    getResultadoIcon,
} from './ToxicologicoTypes';
import ModernHeader from '../../../../assets/components/ModernHeader';
import SaveButton from '../../../../assets/components/SaveButton';
import { customTheme } from '../../../../theme/theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import SignatureCaptureModal from '../../../../components/SignatureCapture';
import { useUser } from '../../../../contexts/userContext';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const TOXICOLOGICO_API = 'https://relatorio-checklist-708827138368.europe-west1.run.app';

type RootStackParamList = {
    ToxicologicoScreen: undefined;
    ToxicologicoFormScreen: {
        item?: ToxicologicoInterface;
        mode: 'create' | 'edit' | 'view';
    };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ToxicologicoFormScreen'>;
type RoutePropType = RouteProp<RootStackParamList, 'ToxicologicoFormScreen'>;

// ── Componente de bloco de assinatura ──────────────────────────────────────
interface AssinaturaBlocoProps {
    titulo: string;
    campo: AssinaturaField;
    disabled: boolean;
    onNomeChange: (nome: string) => void;
    onAssinar: () => void;
    onRemover: () => void;
}

const AssinaturaBloco: React.FC<AssinaturaBlocoProps> = ({
    titulo,
    campo,
    disabled,
    onNomeChange,
    onAssinar,
    onRemover,
}) => (
    <View style={assinaturaStyles.bloco}>
        <Text style={assinaturaStyles.titulo}>{titulo}</Text>
        <TextInput
            label="Nome"
            value={campo.nome}
            onChangeText={onNomeChange}
            mode="outlined"
            style={assinaturaStyles.nomeInput}
            disabled={disabled}
            left={<TextInput.Icon icon="account" />}
        />
        {campo.assinatura ? (
            <View style={assinaturaStyles.assinaturaContainer}>
                <Image
                    source={{ uri: campo.assinatura }}
                    style={assinaturaStyles.assinaturaImage}
                    resizeMode="contain"
                />
                {!disabled && (
                    <Button
                        mode="outlined"
                        onPress={onRemover}
                        icon="delete-outline"
                        textColor={customTheme.colors.error}
                        style={assinaturaStyles.removerBtn}
                        compact
                    >
                        Remover assinatura
                    </Button>
                )}
            </View>
        ) : (
            <TouchableOpacity
                style={[
                    assinaturaStyles.placeholder,
                    disabled && assinaturaStyles.placeholderDisabled,
                ]}
                onPress={onAssinar}
                disabled={disabled}
                activeOpacity={0.7}
            >
                <MaterialCommunityIcons
                    name="draw-pen"
                    size={28}
                    color={disabled ? customTheme.colors.outline : customTheme.colors.primary}
                />
                <Text style={[
                    assinaturaStyles.placeholderText,
                    disabled && { color: customTheme.colors.outline },
                ]}>
                    {disabled ? 'Sem assinatura registrada' : 'Toque para assinar'}
                </Text>
            </TouchableOpacity>
        )}
    </View>
);

const assinaturaStyles = StyleSheet.create({
    bloco: {
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outlineVariant,
        paddingTop: 14,
        marginTop: 4,
    },
    titulo: {
        fontSize: 13,
        fontWeight: '600',
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    nomeInput: {
        marginBottom: 10,
        backgroundColor: customTheme.colors.surface,
    },
    assinaturaContainer: { gap: 8 },
    assinaturaImage: {
        width: '100%',
        height: 100,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
    },
    removerBtn: {
        borderColor: customTheme.colors.error,
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        borderWidth: 1.5,
        borderColor: customTheme.colors.primary,
        borderStyle: 'dashed',
        borderRadius: 8,
        gap: 6,
    },
    placeholderDisabled: {
        borderColor: customTheme.colors.outline,
    },
    placeholderText: {
        fontSize: 13,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
});

// ── Tela principal ──────────────────────────────────────────────────────────
const ToxicologicoFormScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<RoutePropType>();
    const { item, mode } = route.params || { mode: 'create' };
    const { userInfo } = useUser();

    const isViewMode = mode === 'view';
    const isEditMode = mode === 'edit';

    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    // Modais de seleção
    const [showTipoModal, setShowTipoModal] = useState(false);
    const [showResultadoModal, setShowResultadoModal] = useState(false);
    const [showRecusaModal, setShowRecusaModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Modal de assinatura ativo
    type AssinaturaAlvo = 'responsavel' | 'colaborador' | 'testemunha' | null;
    const [assinaturaAlvo, setAssinaturaAlvo] = useState<AssinaturaAlvo>(null);

    // ── Campos ──────────────────────────────────────────────────────────────
    // Identificação
    const [colaborador, setColaborador] = useState('');
    const [encarregado, setEncarregado] = useState('');
    const [data, setData] = useState(new Date());
    const [hora, setHora] = useState(() => {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    });

    // Tipo de Teste
    const [tipoTeste, setTipoTeste] = useState<TipoTeste>('Programada');
    const [embasamento, setEmbasamento] = useState('');

    // Resultado mg/L
    const [resultadoMgL, setResultadoMgL] = useState('');

    // Observação
    const [observacao, setObservacao] = useState('');

    // Resultado final
    const [resultado, setResultado] = useState<ResultadoTeste>('Negativo');
    const [houveRecusa, setHouveRecusa] = useState<SituacaoRecusa>('Não houve recusa');
    const [descricaoRecusa, setDescricaoRecusa] = useState('');

    // Assinaturas
    const [assinaturaResponsavel, setAssinaturaResponsavel] = useState<AssinaturaField>({ nome: '' });
    const [assinaturaColaborador, setAssinaturaColaborador] = useState<AssinaturaField>({ nome: '' });
    const [assinaturaTestemunha, setAssinaturaTestemunha] = useState<AssinaturaField>({ nome: '' });

    const temRecusa = houveRecusa === 'Houve recusa injustificada';

    // ── Preencher em modo edição/visualização ────────────────────────────────
    useEffect(() => {
        if (!item) return;
        setColaborador(item.colaborador || '');
        setEncarregado(item.encarregado || '');
        setHora(item.hora || '');
        setTipoTeste(item.tipoTeste || 'Programada');
        setEmbasamento(item.embasamento || '');
        setResultadoMgL(item.resultadoMgL || '');
        setObservacao(item.observacao || '');
        setResultado(item.resultado || 'Negativo');
        setHouveRecusa(item.houveRecusa || 'Não houve recusa');
        setDescricaoRecusa(item.descricaoRecusa || '');
        setAssinaturaResponsavel(item.assinaturaResponsavel || { nome: '' });
        setAssinaturaColaborador(item.assinaturaColaborador || { nome: '' });
        setAssinaturaTestemunha(item.assinaturaTestemunha || { nome: '' });

        if (item.data) {
            if (item.data instanceof Timestamp) {
                setData(item.data.toDate());
            } else if (item.data && typeof item.data === 'object' && 'seconds' in item.data) {
                setData(new Date(item.data.seconds * 1000));
            } else if (typeof item.data === 'string') {
                setData(new Date(item.data));
            }
        }
    }, [item]);

    // ── Formatações ──────────────────────────────────────────────────────────
    const formatDate = (d: Date) =>
        d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const handleTimeChange = (_: any, selected?: Date) => {
        setShowTimePicker(false);
        if (selected) {
            setHora(`${selected.getHours().toString().padStart(2, '0')}:${selected.getMinutes().toString().padStart(2, '0')}`);
        }
    };

    const parseHora = (h: string): Date => {
        const [hh, mm] = h.split(':').map(Number);
        const d = new Date();
        d.setHours(hh || 0, mm || 0, 0, 0);
        return d;
    };

    // ── Assinatura ───────────────────────────────────────────────────────────
    const handleAssinaturaSalva = (base64: string) => {
        if (assinaturaAlvo === 'responsavel') {
            setAssinaturaResponsavel(prev => ({ ...prev, assinatura: base64 }));
        } else if (assinaturaAlvo === 'colaborador') {
            setAssinaturaColaborador(prev => ({ ...prev, assinatura: base64 }));
        } else if (assinaturaAlvo === 'testemunha') {
            setAssinaturaTestemunha(prev => ({ ...prev, assinatura: base64 }));
        }
        setAssinaturaAlvo(null);
    };

    // ── Validação ────────────────────────────────────────────────────────────
    const validateForm = (): boolean => {
        if (!colaborador.trim()) {
            showGlobalToast('error', 'Erro', 'Informe o nome do colaborador');
            return false;
        }
        if (!encarregado.trim()) {
            showGlobalToast('error', 'Erro', 'Informe o encarregado/líder/supervisor');
            return false;
        }
        return true;
    };

    // ── Salvar ───────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!validateForm()) return;
        setLoading(true);
        try {
            const docData: Omit<ToxicologicoInterface, 'id'> = {
                colaborador: colaborador.trim(),
                encarregado: encarregado.trim(),
                data: Timestamp.fromDate(data),
                hora,
                tipoTeste,
                embasamento: embasamento.trim(),
                resultadoMgL: resultadoMgL.trim(),
                observacao: observacao.trim(),
                resultado,
                houveRecusa,
                descricaoRecusa: descricaoRecusa.trim(),
                assinaturaResponsavel,
                assinaturaColaborador,
                ...(temRecusa ? { assinaturaTestemunha } : {}),
                dataCriacao: isEditMode && item?.dataCriacao ? item.dataCriacao : Timestamp.now(),
                criadoPor: userInfo?.user || '',
            };

            if (isEditMode && item?.id) {
                await updateDoc(doc(db(), 'toxicologico', item.id), docData);
                showGlobalToast('success', 'Sucesso', 'Exame atualizado com sucesso!');
            } else {
                await addDoc(collection(db(), 'toxicologico'), docData);
                showGlobalToast('success', 'Sucesso', 'Exame salvo com sucesso!');
            }
            navigation.goBack();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            showGlobalToast('error', 'Erro', 'Erro ao salvar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // ── Excluir ──────────────────────────────────────────────────────────────
    const handleDelete = () => {
        Alert.alert(
            'Excluir Exame',
            'Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        if (!item?.id) return;
                        setDeleteLoading(true);
                        try {
                            await deleteDoc(doc(db(), 'toxicologico', item.id));
                            showGlobalToast('success', 'Sucesso', 'Exame excluído!');
                            navigation.goBack();
                        } catch {
                            showGlobalToast('error', 'Erro', 'Erro ao excluir.');
                        } finally {
                            setDeleteLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const resultadoColor = getResultadoColor(resultado);
    const resultadoIcon = getResultadoIcon(resultado);

    const handleGerarPdf = async () => {
        setPdfLoading(true);
        showGlobalToast('info', 'Aguarde', 'Gerando relatório PDF...');
        try {
            const payload = {
                colaborador,
                encarregado,
                data: data.toISOString(),
                hora,
                tipoTeste,
                embasamento,
                resultadoMgL,
                observacao,
                resultado,
                houveRecusa,
                descricaoRecusa,
                assinaturaResponsavel,
                assinaturaColaborador,
                ...(temRecusa ? { assinaturaTestemunha } : {}),
            };

            const response = await fetch(`${TOXICOLOGICO_API}/generate-toxicologico`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: payload }),
            });

            if (!response.ok) {
                throw new Error(`Erro do servidor: ${response.status}`);
            }

            // Converte resposta binária (PDF direto) → base64 para salvar com RNFS
            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            const base64Data = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
            });

            const slug = colaborador.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
            const dateStr = data.toLocaleDateString('pt-BR').replace(/\//g, '-');
            const fileName = `Toxicologico_${slug}_${dateStr}.pdf`;
            const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

            await RNFS.writeFile(filePath, base64Data, 'base64');
            showGlobalToast('success', 'Sucesso', 'Relatório gerado!');

            await Share.open({
                url: `file://${filePath}`,
                type: 'application/pdf',
                title: fileName,
                filename: fileName,
            });
        } catch (error: any) {
            console.error('Erro ao gerar PDF toxicológico:', error);
            showGlobalToast('error', 'Erro', error.message || 'Erro ao gerar PDF.');
        } finally {
            setPdfLoading(false);
        }
    };

    const getHeaderTitle = () => {
        if (isViewMode) return 'Detalhes do Exame';
        if (isEditMode) return 'Editar Exame';
        return 'Novo Exame Toxicológico';
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <ModernHeader
                title={getHeaderTitle()}
                iconName="flask-outline"
                onBackPress={() => navigation.goBack()}
                rightButton={
                    isViewMode
                        ? { icon: 'pencil', onPress: () => navigation.setParams({ mode: 'edit' }) }
                        : undefined
                }
            />

            {/* ── Botão PDF fixo no topo (somente visualização) ── */}
            {isViewMode && (
                <TouchableOpacity
                    style={[styles.pdfButton, pdfLoading && { opacity: 0.7 }]}
                    onPress={handleGerarPdf}
                    activeOpacity={0.8}
                    disabled={pdfLoading}
                >
                    <MaterialCommunityIcons
                        name={pdfLoading ? 'loading' : 'file-pdf-box'}
                        size={20}
                        color="#fff"
                    />
                    <Text style={styles.pdfButtonText}>
                        {pdfLoading ? 'Gerando PDF...' : 'Gerar PDF'}
                    </Text>
                </TouchableOpacity>
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >

                    {/* ── 1. IDENTIFICAÇÃO ── */}
                    <Surface style={styles.section}>
                        <SectionHeader icon="card-account-details-outline" title="Identificação" />

                        <TextInput
                            label="Colaborador *"
                            value={colaborador}
                            onChangeText={setColaborador}
                            mode="outlined"
                            style={styles.input}
                            disabled={isViewMode}
                            left={<TextInput.Icon icon="account" />}
                        />

                        <TextInput
                            label="Encarregado / Líder / Supervisor / Coordenador *"
                            value={encarregado}
                            onChangeText={setEncarregado}
                            mode="outlined"
                            style={styles.input}
                            disabled={isViewMode}
                            left={<TextInput.Icon icon="account-tie" />}
                        />

                        {/* Data */}
                        <TouchableOpacity
                            style={styles.selectorButton}
                            onPress={() => !isViewMode && setShowDatePicker(true)}
                            disabled={isViewMode}
                        >
                            <MaterialCommunityIcons name="calendar" size={22} color={customTheme.colors.primary} />
                            <View style={styles.selectorContent}>
                                <Text style={styles.selectorLabel}>Data</Text>
                                <Text style={styles.selectorValue}>{formatDate(data)}</Text>
                            </View>
                            {!isViewMode && (
                                <MaterialCommunityIcons name="chevron-right" size={20} color={customTheme.colors.outline} />
                            )}
                        </TouchableOpacity>

                        {/* Hora */}
                        <TouchableOpacity
                            style={styles.selectorButton}
                            onPress={() => !isViewMode && setShowTimePicker(true)}
                            disabled={isViewMode}
                        >
                            <MaterialCommunityIcons name="clock-outline" size={22} color={customTheme.colors.primary} />
                            <View style={styles.selectorContent}>
                                <Text style={styles.selectorLabel}>Hora</Text>
                                <Text style={styles.selectorValue}>{hora}</Text>
                            </View>
                            {!isViewMode && (
                                <MaterialCommunityIcons name="chevron-right" size={20} color={customTheme.colors.outline} />
                            )}
                        </TouchableOpacity>
                    </Surface>

                    {/* ── 2. TIPO DE TESTE ── */}
                    <Surface style={styles.section}>
                        <SectionHeader icon="clipboard-list-outline" title="Tipo de Teste" />

                        <TouchableOpacity
                            style={styles.selectorButton}
                            onPress={() => !isViewMode && setShowTipoModal(true)}
                            disabled={isViewMode}
                        >
                            <MaterialCommunityIcons name="format-list-bulleted" size={22} color={customTheme.colors.primary} />
                            <View style={styles.selectorContent}>
                                <Text style={styles.selectorLabel}>Tipo de teste</Text>
                                <Text style={styles.selectorValue}>{tipoTeste}</Text>
                            </View>
                            {!isViewMode && (
                                <MaterialCommunityIcons name="chevron-right" size={20} color={customTheme.colors.outline} />
                            )}
                        </TouchableOpacity>

                        <TextInput
                            label="Embasamento"
                            value={embasamento}
                            onChangeText={setEmbasamento}
                            mode="outlined"
                            style={styles.input}
                            multiline
                            numberOfLines={3}
                            disabled={isViewMode}
                            left={<TextInput.Icon icon="text-box-outline" />}
                        />
                    </Surface>

                    {/* ── 3. RESULTADO mg/L ── */}
                    <Surface style={styles.section}>
                        <SectionHeader icon="gauge" title="Resultado" />

                        <TextInput
                            label="Resultado (mg/L)"
                            value={resultadoMgL}
                            onChangeText={setResultadoMgL}
                            mode="outlined"
                            style={styles.input}
                            keyboardType="decimal-pad"
                            disabled={isViewMode}
                            left={<TextInput.Icon icon="gauge" />}
                            right={<TextInput.Affix text="mg/L" />}
                        />
                    </Surface>

                    {/* ── 4. OBSERVAÇÃO ── */}
                    <Surface style={styles.section}>
                        <SectionHeader icon="note-text-outline" title="Observação" />

                        <TextInput
                            label="Observação"
                            value={observacao}
                            onChangeText={setObservacao}
                            mode="outlined"
                            style={styles.input}
                            multiline
                            numberOfLines={4}
                            disabled={isViewMode}
                            left={<TextInput.Icon icon="note-text-outline" />}
                        />
                    </Surface>

                    {/* ── 5. RESULTADO FINAL & RECUSA ── */}
                    <Surface style={styles.section}>
                        <SectionHeader icon="check-decagram-outline" title="Resultado Final" />

                        {/* Negativo / Positivo */}
                        <TouchableOpacity
                            style={styles.selectorButton}
                            onPress={() => !isViewMode && setShowResultadoModal(true)}
                            disabled={isViewMode}
                        >
                            <MaterialCommunityIcons
                                name={resultadoIcon}
                                size={22}
                                color={resultadoColor}
                            />
                            <View style={styles.selectorContent}>
                                <Text style={styles.selectorLabel}>Resultado do exame</Text>
                                <Text style={[styles.selectorValue, { color: resultadoColor, fontWeight: '700' }]}>
                                    {resultado}
                                </Text>
                            </View>
                            {!isViewMode && (
                                <MaterialCommunityIcons name="chevron-right" size={20} color={customTheme.colors.outline} />
                            )}
                        </TouchableOpacity>

                        {/* Houve Recusa */}
                        <TouchableOpacity
                            style={styles.selectorButton}
                            onPress={() => !isViewMode && setShowRecusaModal(true)}
                            disabled={isViewMode}
                        >
                            <MaterialCommunityIcons
                                name={temRecusa ? 'alert' : 'check-circle-outline'}
                                size={22}
                                color={temRecusa ? '#FB8C00' : customTheme.colors.secondary}
                            />
                            <View style={styles.selectorContent}>
                                <Text style={styles.selectorLabel}>Houve Recusa?</Text>
                                <Text style={[
                                    styles.selectorValue,
                                    temRecusa && { color: '#FB8C00', fontWeight: '600' },
                                ]}>
                                    {houveRecusa}
                                </Text>
                            </View>
                            {!isViewMode && (
                                <MaterialCommunityIcons name="chevron-right" size={20} color={customTheme.colors.outline} />
                            )}
                        </TouchableOpacity>

                        {/* Descrição (se aplicável) */}
                        <TextInput
                            label="Descrição (se aplicável)"
                            value={descricaoRecusa}
                            onChangeText={setDescricaoRecusa}
                            mode="outlined"
                            style={styles.input}
                            multiline
                            numberOfLines={3}
                            disabled={isViewMode}
                            left={<TextInput.Icon icon="text" />}
                        />
                    </Surface>

                    {/* ── 6. ASSINATURAS ── */}
                    <Surface style={styles.section}>
                        <SectionHeader icon="draw-pen" title="Assinaturas" />

                        <AssinaturaBloco
                            titulo="Responsável pela aplicação"
                            campo={assinaturaResponsavel}
                            disabled={isViewMode}
                            onNomeChange={nome => setAssinaturaResponsavel(prev => ({ ...prev, nome }))}
                            onAssinar={() => { setAssinaturaAlvo('responsavel'); }}
                            onRemover={() => setAssinaturaResponsavel(prev => ({ ...prev, assinatura: undefined }))}
                        />

                        <AssinaturaBloco
                            titulo="Colaborador"
                            campo={assinaturaColaborador}
                            disabled={isViewMode}
                            onNomeChange={nome => setAssinaturaColaborador(prev => ({ ...prev, nome }))}
                            onAssinar={() => { setAssinaturaAlvo('colaborador'); }}
                            onRemover={() => setAssinaturaColaborador(prev => ({ ...prev, assinatura: undefined }))}
                        />

                        {/* Testemunha — apenas se houveRecusa */}
                        {temRecusa && (
                            <AssinaturaBloco
                                titulo="Testemunha (em caso de recusa)"
                                campo={assinaturaTestemunha}
                                disabled={isViewMode}
                                onNomeChange={nome => setAssinaturaTestemunha(prev => ({ ...prev, nome }))}
                                onAssinar={() => { setAssinaturaAlvo('testemunha'); }}
                                onRemover={() => setAssinaturaTestemunha(prev => ({ ...prev, assinatura: undefined }))}
                            />
                        )}
                    </Surface>

                    {/* ── Botões ── */}
                    {!isViewMode && (
                        <View style={styles.buttonContainer}>
                            <SaveButton
                                onPress={handleSave}
                                text={isEditMode ? 'Salvar Alterações' : 'Salvar Exame'}
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
                                    Excluir Exame
                                </Button>
                            )}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── DateTimePickers ── */}
            {showDatePicker && (
                <DateTimePicker
                    value={data}
                    mode="date"
                    display="default"
                    onChange={(_: any, d?: Date) => {
                        setShowDatePicker(false);
                        if (d) setData(d);
                    }}
                    locale="pt-BR"
                />
            )}
            {showTimePicker && (
                <DateTimePicker
                    value={parseHora(hora)}
                    mode="time"
                    display="default"
                    is24Hour
                    onChange={handleTimeChange}
                />
            )}

            {/* ── Modal: Tipo de Teste ── */}
            <Portal>
                <Modal
                    visible={showTipoModal}
                    onDismiss={() => setShowTipoModal(false)}
                    contentContainerStyle={styles.modal}
                >
                    <Text style={styles.modalTitle}>Tipo de Teste</Text>
                    {TIPO_TESTE_OPTIONS.map((tipo, i) => (
                        <React.Fragment key={tipo}>
                            <List.Item
                                title={tipo}
                                onPress={() => { setTipoTeste(tipo); setShowTipoModal(false); }}
                                left={() => (
                                    <MaterialCommunityIcons
                                        name={tipoTeste === tipo ? 'radiobox-marked' : 'radiobox-blank'}
                                        size={22}
                                        color={customTheme.colors.primary}
                                        style={{ alignSelf: 'center', marginLeft: 8 }}
                                    />
                                )}
                                titleStyle={tipoTeste === tipo ? styles.selectedOption : undefined}
                            />
                            {i < TIPO_TESTE_OPTIONS.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </Modal>
            </Portal>

            {/* ── Modal: Resultado ── */}
            <Portal>
                <Modal
                    visible={showResultadoModal}
                    onDismiss={() => setShowResultadoModal(false)}
                    contentContainerStyle={styles.modal}
                >
                    <Text style={styles.modalTitle}>Resultado do Exame</Text>
                    {RESULTADO_OPTIONS.map((res, i) => {
                        const color = getResultadoColor(res);
                        const icon = getResultadoIcon(res);
                        return (
                            <React.Fragment key={res}>
                                <TouchableOpacity
                                    style={[
                                        styles.resultadoOption,
                                        resultado === res && { backgroundColor: color + '18' },
                                    ]}
                                    onPress={() => { setResultado(res); setShowResultadoModal(false); }}
                                >
                                    <MaterialCommunityIcons name={icon} size={22} color={color} />
                                    <Text style={[styles.resultadoOptionText, { color }]}>{res}</Text>
                                    {resultado === res && (
                                        <MaterialCommunityIcons
                                            name="check"
                                            size={20}
                                            color={color}
                                            style={{ marginLeft: 'auto' }}
                                        />
                                    )}
                                </TouchableOpacity>
                                {i < RESULTADO_OPTIONS.length - 1 && <Divider />}
                            </React.Fragment>
                        );
                    })}
                </Modal>
            </Portal>

            {/* ── Modal: Houve Recusa ── */}
            <Portal>
                <Modal
                    visible={showRecusaModal}
                    onDismiss={() => setShowRecusaModal(false)}
                    contentContainerStyle={styles.modal}
                >
                    <Text style={styles.modalTitle}>Houve Recusa?</Text>
                    {RECUSA_OPTIONS.map((op, i) => (
                        <React.Fragment key={op}>
                            <List.Item
                                title={op}
                                onPress={() => { setHouveRecusa(op); setShowRecusaModal(false); }}
                                left={() => (
                                    <MaterialCommunityIcons
                                        name={houveRecusa === op ? 'radiobox-marked' : 'radiobox-blank'}
                                        size={22}
                                        color={customTheme.colors.primary}
                                        style={{ alignSelf: 'center', marginLeft: 8 }}
                                    />
                                )}
                                titleStyle={houveRecusa === op ? styles.selectedOption : undefined}
                            />
                            {i < RECUSA_OPTIONS.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </Modal>
            </Portal>

            {/* ── Modal: Assinatura ── */}
            <SignatureCaptureModal
                visible={assinaturaAlvo !== null}
                onClose={() => setAssinaturaAlvo(null)}
                onSave={handleAssinaturaSalva}
                title={
                    assinaturaAlvo === 'responsavel' ? 'Assinatura do Responsável' :
                    assinaturaAlvo === 'colaborador' ? 'Assinatura do Colaborador' :
                    'Assinatura da Testemunha'
                }
            />
        </View>
    );
};

// ── Cabeçalho de seção ───────────────────────────────────────────────────────
const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
    <View style={sectionHeaderStyles.container}>
        <MaterialCommunityIcons name={icon} size={18} color={customTheme.colors.primary} />
        <Text style={sectionHeaderStyles.title}>{title}</Text>
    </View>
);

const sectionHeaderStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
});

// ── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    section: {
        padding: 16,
        marginBottom: 14,
        borderRadius: 12,
        backgroundColor: customTheme.colors.surface,
        elevation: 1,
    },
    input: {
        marginBottom: 12,
        backgroundColor: customTheme.colors.surface,
    },
    selectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 8,
        marginBottom: 12,
        gap: 12,
    },
    selectorContent: {
        flex: 1,
    },
    selectorLabel: {
        fontSize: 12,
        color: customTheme.colors.outline,
    },
    selectorValue: {
        fontSize: 15,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
        marginTop: 2,
    },
    buttonContainer: {
        marginTop: 8,
        gap: 12,
    },
    deleteButton: {
        borderColor: customTheme.colors.error,
    },
    pdfButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#D32F2F',
        paddingVertical: 12,
        gap: 8,
        elevation: 2,
    },
    pdfButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    modal: {
        backgroundColor: customTheme.colors.surface,
        margin: 24,
        borderRadius: 12,
        padding: 16,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginBottom: 8,
    },
    selectedOption: {
        fontWeight: '600',
        color: customTheme.colors.primary,
    },
    resultadoOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 8,
        gap: 12,
    },
    resultadoOptionText: {
        fontSize: 15,
        fontWeight: '500',
    },
});

export default ToxicologicoFormScreen;
