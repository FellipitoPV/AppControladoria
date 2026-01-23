import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  RadioButton,
  Divider,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {customTheme} from '../../../../theme/theme';
import SignatureCapture from '../../../../components/SignatureCapture';
import {useUser} from '../../../../contexts/userContext';

interface ChecklistItem {
  id: string;
  label: string;
  resultado?: 'C' | 'NC' | 'NA';
}

interface ReportData {
  titulo: string;
  local: string;
  lider: string;
  matricula: string;
  atividade: string;
  tipoInspecao: 'Rotineira' | 'Programada' | 'Ocasional';
  itens: ChecklistItem[];
  resultadoOpcao: 1 | 2 | 3 | 4;
  responsavelVerificacao: string;
  localResponsavel: string;
  assinaturaBase64?: string;
}

type ReportVariant = 'meioAmbiente' | 'sst';

interface ReportGeneratorModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (data: ReportData) => void;
  checklistTitle: string;
  locationName: string;
  itens: ChecklistItem[];
  mesAno: string;
  loading?: boolean;
  variant?: ReportVariant;
}

export default function ReportGeneratorModal({
  visible,
  onClose,
  onGenerate,
  checklistTitle,
  locationName,
  itens,
  mesAno,
  loading = false,
  variant = 'meioAmbiente',
}: ReportGeneratorModalProps) {
  const {userInfo} = useUser();
  const isSST = variant === 'sst';

  const [lider, setLider] = useState('');
  const [matricula, setMatricula] = useState('');
  const [atividade, setAtividade] = useState('');
  const [tipoInspecao, setTipoInspecao] = useState<
    'Rotineira' | 'Programada' | 'Ocasional'
  >('Rotineira');
  const [resultadoOpcao, setResultadoOpcao] = useState<1 | 2 | 3 | 4>(1);
  const [responsavelVerificacao, setResponsavelVerificacao] = useState('');
  const [localResponsavel, setLocalResponsavel] = useState('');

  // Estados da assinatura
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [assinaturaBase64, setAssinaturaBase64] = useState<string | null>(null);

  // Identifica itens com pendência
  const itensPendentes = itens
    .map((item, index) => ({...item, numero: index + 1}))
    .filter(item => item.resultado === 'NC' || item.resultado === 'NA');

  const temPendencias = itensPendentes.length > 0;
  const numerosPendentes = itensPendentes.map(i => i.numero).join(', ');

  // Reset quando abre o modal
  useEffect(() => {
    if (visible) {
      // Se não tem pendências, força resultado conforme
      if (!temPendencias) {
        setResultadoOpcao(1);
      }
      // Pré-preenche o nome do responsável com o usuário logado
      if (userInfo?.user) {
        setResponsavelVerificacao(userInfo.user);
      }
    } else {
      // Limpa os campos quando fecha o modal
      setAssinaturaBase64(null);
      setLider('');
      setMatricula('');
      setAtividade('');
      setTipoInspecao('Rotineira');
      setResultadoOpcao(1);
      setResponsavelVerificacao('');
      setLocalResponsavel('');
    }
  }, [visible, temPendencias, userInfo]);

  const handleGenerate = () => {
    // Para SST, só precisa do responsável e assinatura
    // Para Meio Ambiente, precisa também do líder
    if (isSST) {
      if (!responsavelVerificacao.trim() || !assinaturaBase64) {
        return;
      }
    } else {
      if (!lider.trim() || !responsavelVerificacao.trim() || !assinaturaBase64) {
        return;
      }
    }

    const data: ReportData = {
      titulo: checklistTitle,
      local: locationName,
      lider: lider.trim(),
      matricula: matricula.trim(),
      atividade: atividade.trim(),
      tipoInspecao,
      itens,
      resultadoOpcao,
      responsavelVerificacao: responsavelVerificacao.trim(),
      localResponsavel: localResponsavel.trim(),
      assinaturaBase64,
    };

    onGenerate(data);
  };

  const handleSignatureSave = (signature: string) => {
    setAssinaturaBase64(signature);
  };

  const handleClearSignature = () => {
    setAssinaturaBase64(null);
  };

  const getResultadoLabel = (opcao: number) => {
    switch (opcao) {
      case 1:
        return 'Conforme / Liberado';
      case 2:
        return 'Não conforme / Não liberado';
      case 3:
        return `Com pendências nos itens ${numerosPendentes} / Liberado`;
      case 4:
        return `Com pendências nos itens ${numerosPendentes} / Não liberado`;
      default:
        return '';
    }
  };

  const canGenerate = isSST
    ? responsavelVerificacao.trim() && assinaturaBase64 && !loading
    : lider.trim() && responsavelVerificacao.trim() && assinaturaBase64 && !loading;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <MaterialCommunityIcons
                  name="file-pdf-box"
                  size={24}
                  color={customTheme.colors.primary}
                />
                <Text style={styles.headerTitle}>Gerar Relatório</Text>
              </View>
              <IconButton icon="close" size={24} onPress={onClose} />
            </View>

            {/* Info do Checklist */}
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>{checklistTitle}</Text>
              <Text style={styles.infoValue}>
                {locationName} - {mesAno}
              </Text>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}>
              {/* Seção: Informações do Líder - Apenas para Meio Ambiente */}
              {!isSST && (
                <>
                  <Text style={styles.sectionTitle}>Informações do Líder</Text>

                  <TextInput
                    label="Nome do Líder *"
                    value={lider}
                    onChangeText={setLider}
                    mode="outlined"
                    style={styles.input}
                  />

                  <TextInput
                    label="Matrícula"
                    value={matricula}
                    onChangeText={setMatricula}
                    mode="outlined"
                    style={styles.input}
                  />

                  <Divider style={styles.divider} />

                  {/* Seção: Informações da Inspeção */}
                  <Text style={styles.sectionTitle}>Informações da Inspeção</Text>

                  <TextInput
                    label="Atividade"
                    value={atividade}
                    onChangeText={setAtividade}
                    mode="outlined"
                    style={styles.input}
                  />

                  <Text style={styles.fieldLabel}>Tipo de Inspeção</Text>
                  <RadioButton.Group
                    value={tipoInspecao}
                    onValueChange={value =>
                      setTipoInspecao(
                        value as 'Rotineira' | 'Programada' | 'Ocasional',
                      )
                    }>
                    <View style={styles.radioRow}>
                      <TouchableOpacity
                        style={styles.radioOption}
                        onPress={() => setTipoInspecao('Rotineira')}>
                        <RadioButton value="Rotineira" />
                        <Text>Rotineira</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.radioOption}
                        onPress={() => setTipoInspecao('Programada')}>
                        <RadioButton value="Programada" />
                        <Text>Programada</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.radioOption}
                        onPress={() => setTipoInspecao('Ocasional')}>
                        <RadioButton value="Ocasional" />
                        <Text>Ocasional</Text>
                      </TouchableOpacity>
                    </View>
                  </RadioButton.Group>

                  <Divider style={styles.divider} />

                  {/* Seção: Resultado */}
                  <Text style={styles.sectionTitle}>Resultado da Inspeção</Text>

                  {temPendencias && (
                    <View style={styles.warningBox}>
                      <MaterialCommunityIcons
                        name="alert-circle"
                        size={20}
                        color="#FF9800"
                      />
                      <Text style={styles.warningText}>
                        Itens com pendência: {numerosPendentes}
                      </Text>
                    </View>
                  )}

                  <RadioButton.Group
                    value={String(resultadoOpcao)}
                    onValueChange={value =>
                      setResultadoOpcao(Number(value) as 1 | 2 | 3 | 4)
                    }>
                    <TouchableOpacity
                      style={styles.resultOption}
                      onPress={() => setResultadoOpcao(1)}>
                      <RadioButton value="1" />
                      <Text style={styles.resultText}>{getResultadoLabel(1)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resultOption}
                      onPress={() => setResultadoOpcao(2)}>
                      <RadioButton value="2" />
                      <Text style={styles.resultText}>{getResultadoLabel(2)}</Text>
                    </TouchableOpacity>

                    {temPendencias && (
                      <>
                        <TouchableOpacity
                          style={styles.resultOption}
                          onPress={() => setResultadoOpcao(3)}>
                          <RadioButton value="3" />
                          <Text style={styles.resultText}>{getResultadoLabel(3)}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.resultOption}
                          onPress={() => setResultadoOpcao(4)}>
                          <RadioButton value="4" />
                          <Text style={styles.resultText}>{getResultadoLabel(4)}</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </RadioButton.Group>

                  <Divider style={styles.divider} />
                </>
              )}

              {/* Seção: Verificação */}
              <Text style={styles.sectionTitle}>Verificado por</Text>

              <TextInput
                label="Nome do Responsável *"
                value={responsavelVerificacao}
                onChangeText={setResponsavelVerificacao}
                mode="outlined"
                style={styles.input}
              />

              {/* Campo Setor/Área - Apenas para Meio Ambiente */}
              {!isSST && (
                <TextInput
                  label="Setor/Área"
                  value={localResponsavel}
                  onChangeText={setLocalResponsavel}
                  mode="outlined"
                  placeholder="Ex: QSMS, Engenharia..."
                  style={styles.input}
                />
              )}

              {/* Campo de assinatura */}
              <Text style={styles.fieldLabel}>Assinatura *</Text>
              {assinaturaBase64 ? (
                <View style={styles.signaturePreviewContainer}>
                  <Image
                    source={{uri: assinaturaBase64}}
                    style={styles.signaturePreview}
                    resizeMode="contain"
                  />
                  <View style={styles.signatureActions}>
                    <TouchableOpacity
                      style={styles.signatureActionButton}
                      onPress={() => setSignatureModalVisible(true)}>
                      <MaterialCommunityIcons
                        name="pencil"
                        size={20}
                        color={customTheme.colors.primary}
                      />
                      <Text style={styles.signatureActionText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.signatureActionButton}
                      onPress={handleClearSignature}>
                      <MaterialCommunityIcons
                        name="delete"
                        size={20}
                        color="#D32F2F"
                      />
                      <Text style={[styles.signatureActionText, {color: '#D32F2F'}]}>
                        Remover
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.signatureBox}
                  onPress={() => setSignatureModalVisible(true)}>
                  <MaterialCommunityIcons
                    name="draw"
                    size={32}
                    color={customTheme.colors.primary}
                  />
                  <Text style={styles.signatureText}>
                    Toque para adicionar assinatura
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Footer com botões */}
            <View style={styles.footer}>
              <Button
                mode="outlined"
                onPress={onClose}
                disabled={loading}
                style={styles.cancelButton}>
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleGenerate}
                disabled={!canGenerate}
                icon={loading ? undefined : 'file-pdf-box'}
                style={styles.generateButton}>
                {loading ? (
                  <View style={styles.loadingButton}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.loadingText}>Gerando...</Text>
                  </View>
                ) : (
                  'Gerar PDF'
                )}
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Assinatura */}
      <SignatureCapture
        visible={signatureModalVisible}
        onClose={() => setSignatureModalVisible(false)}
        onSave={handleSignatureSave}
        title="Assinatura do Responsável"
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: customTheme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.outline,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: customTheme.colors.onSurface,
  },
  infoBox: {
    backgroundColor: customTheme.colors.primaryContainer,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: customTheme.colors.onPrimaryContainer,
  },
  infoValue: {
    fontSize: 12,
    color: customTheme.colors.onPrimaryContainer,
    marginTop: 2,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: customTheme.colors.primary,
    marginBottom: 12,
    marginTop: 8,
  },
  input: {
    marginBottom: 12,
    backgroundColor: customTheme.colors.surface,
  },
  fieldLabel: {
    fontSize: 12,
    color: customTheme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  radioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
    flex: 1,
  },
  resultOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  resultText: {
    fontSize: 14,
    color: customTheme.colors.onSurface,
    flex: 1,
  },
  signatureBox: {
    borderWidth: 2,
    borderColor: customTheme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: customTheme.colors.surfaceVariant,
  },
  signatureText: {
    fontSize: 14,
    color: customTheme.colors.primary,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  signaturePreviewContainer: {
    borderWidth: 1,
    borderColor: customTheme.colors.outline,
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  signaturePreview: {
    width: '100%',
    height: 100,
    backgroundColor: '#FFFFFF',
  },
  signatureActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: customTheme.colors.outline,
  },
  signatureActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  signatureActionText: {
    fontSize: 14,
    color: customTheme.colors.primary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: customTheme.colors.outline,
  },
  cancelButton: {
    flex: 1,
  },
  generateButton: {
    flex: 2,
  },
  loadingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
  },
});
