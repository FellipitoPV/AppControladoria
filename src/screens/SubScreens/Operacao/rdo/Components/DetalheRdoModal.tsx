import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import {Surface, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {customTheme} from '../../../../../theme/theme';
import {
  FormDataInterface,
  MATERIAIS,
  CONDICOES_TEMPO,
  DIAS_SEMANA,
  Photo,
} from '../Types/rdoTypes';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import FullScreenImage from '../../../../../assets/components/FullScreenImage';
import {hasAccess} from '../../../../Adm/types/admTypes';
import {useUser} from '../../../../../contexts/userContext';
import {
  showGlobalToast,
  verificarConectividadeAPI,
} from '../../../../../helpers/GlobalApi';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {ref, set, onValue, off} from 'firebase/database';
import {doc, updateDoc, serverTimestamp} from 'firebase/firestore';
import storage from '@react-native-firebase/storage';
import {db, dbRealTime} from '../../../../../../firebase';

interface DetalheRdoModalProps {
  visible: boolean;
  onClose: () => void;
  refresh: () => void;
  relatorio: FormDataInterface;
}

const sanitizeObject = (obj: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value === undefined) {
        sanitized[key] = null;
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = sanitizeObject(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          item && typeof item === 'object' ? sanitizeObject(item) : item,
        );
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
};

const DetalheRdoModal: React.FC<DetalheRdoModalProps> = ({
  visible,
  onClose,
  relatorio,
  refresh,
}) => {
  const {userInfo} = useUser();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const [loadingPhotos, setLoadingPhotos] = useState<{[key: string]: boolean}>(
    {},
  );
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>({
    uri: '',
    id: '',
  });
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);

  const [isPdfAtualizado, setIsPdfAtualizado] = useState<boolean>(false);

  const canEdit = () => userInfo && hasAccess(userInfo, 'operacao', 2);

  // Animação de slide
  const screenHeight = Dimensions.get('screen').height;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    const podeEdit = canEdit();
    // console.log("Usuario pode editar? ", podeEdit);

    if (visible) {
      // Animar entrada
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      // Animar saída
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, screenHeight]);

  function getPrimeiroNome(nomeCompleto: string): string {
    if (!nomeCompleto) return 'Cliente';

    // Divide o nome nos espaços e pega o primeiro elemento
    const nomes = nomeCompleto.trim().split(' ');
    return nomes[0];
  }

  const handleDismiss = () => {
    Animated.spring(slideAnim, {
      toValue: 1200,
      bounciness: 2,
      speed: 20,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      onClose();
    }, 50);
  };

  const getTempoLabel = (tempo: string) => {
    if (!tempo) return 'Não informado';
    const tempoItem = CONDICOES_TEMPO.find(item => item.value === tempo);
    return tempoItem ? tempoItem.label : tempo;
  };

  const getMaterialLabel = () => {
    if (!relatorio.material) return 'Não informado';
    const materialItem = MATERIAIS.find(
      item => item.value === relatorio.material,
    );
    return materialItem ? materialItem.label : relatorio.material;
  };

  const getDiaSemanaLabel = () => {
    if (!relatorio.diaSemana) return 'Não informado';
    const diaItem = DIAS_SEMANA.find(
      item => item.value === relatorio.diaSemana,
    );
    return diaItem ? diaItem.label : relatorio.diaSemana;
  };

  const handleGeneratePdf = async () => {
    try {
      setIsPdfLoading(true);

      // Gerar o PDF
      const response = await fetch(
        'https://geradorrdo-708827138368.europe-west1.run.app/gerar-relatorio-rdo',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(relatorio),
        },
      );

      if (!response.ok) {
        throw new Error('Erro ao gerar PDF');
      }

      const blob = await response.blob();
      const clienteNome = getPrimeiroNome(
        relatorio?.clienteNome ? relatorio.clienteNome : '',
      );
      const numeroRdo = relatorio.numeroRdo;
      const fileName = `${numeroRdo}.pdf`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      // Converter blob para base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);

      reader.onloadend = async () => {
        const base64data = reader.result?.toString().split(',')[1];
        if (base64data) {
          // Salvar localmente
          await RNFS.writeFile(filePath, base64data, 'base64');

          // Upload para Firebase Storage
          const storageRef = storage().ref(`RelatoriosRDO/${fileName}`);
          await storageRef.putFile(filePath);

          // Pegar URL de download
          const pdfUrl = await storageRef.getDownloadURL();

          // Atualizar Firestore
          const rdoDocRef = doc(db(), 'relatoriosRDO', relatorio.id);
          await updateDoc(rdoDocRef, {
            pdfUrl: pdfUrl,
            lastPdfGenerated: serverTimestamp(),
          });

          // Compartilhar PDF
          await Share.open({
            url: `file://${filePath}`,
            type: 'application/pdf',
            filename: `${clienteNome}-${numeroRdo}.pdf`,
          });

          await RNFS.unlink(filePath);
          showGlobalToast('success', 'Sucesso', 'PDF gerado e salvo!', 4000);
          refresh(); // Atualiza a lista
        }
      };

      setIsPdfLoading(false);
      onClose();
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showGlobalToast('error', 'Erro', 'Falha ao gerar PDF', 4000);
      setIsPdfLoading(false);
    }
  };

  const handleOpenPhoto = (photo: Photo) => {
    setSelectedPhoto(photo);
    setIsPhotoModalVisible(true);
  };

  // Adicione a função para fechar a modal de foto
  const handleClosePhoto = () => {
    setIsPhotoModalVisible(false);
    setSelectedPhoto(null);
  };

  // Verifique durante o carregamento do componente
  useEffect(() => {
    if (relatorio?.pdfUrl) {
      const lastPdfGenerated = relatorio.lastPdfGenerated
        ? new Date(relatorio.lastPdfGenerated.seconds * 1000)
        : null;

      const lastUpdated = relatorio.updatedAt
        ? new Date(relatorio.updatedAt.seconds * 1000)
        : relatorio.createdAt
        ? new Date(relatorio.createdAt.seconds * 1000)
        : null;

      console.log('===== DEBUG DATAS PDF =====');
      console.log('PDF URL:', relatorio.pdfUrl);
      console.log('lastPdfGenerated (raw):', relatorio.lastPdfGenerated);
      console.log('lastPdfGenerated (date):', lastPdfGenerated);
      console.log('updatedAt (raw):', relatorio.updatedAt);
      console.log('createdAt (raw):', relatorio.createdAt);
      console.log('lastUpdated (date):', lastUpdated);
      console.log(
        'Comparação:',
        lastPdfGenerated && lastUpdated
          ? lastPdfGenerated > lastUpdated
          : 'Dados insuficientes',
      );
      console.log(
        'PDF atualizado?',
        !!(lastPdfGenerated && lastUpdated && lastPdfGenerated > lastUpdated),
      );
      console.log('========================');

      setIsPdfAtualizado(
        !!(lastPdfGenerated && lastUpdated && lastPdfGenerated > lastUpdated),
      );
    } else {
      console.log('Sem PDF URL disponível');
      setIsPdfAtualizado(false);
    }
  }, [relatorio]);

  // Item de informação simples
  const InfoItem: React.FC<{icon: string; label: string; value: string}> = ({
    icon,
    label,
    value,
  }) => (
    <View style={styles.infoItem}>
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={customTheme.colors.primary}
        style={styles.infoIcon}
      />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Não informado'}</Text>
      </View>
    </View>
  );

  // Cabeçalho de seção
  const SectionHeader: React.FC<{icon: string; title: string}> = ({
    icon,
    title,
  }) => (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={customTheme.colors.primary}
      />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  if (!relatorio) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}>
      <FullScreenImage
        visible={isPhotoModalVisible}
        photo={selectedPhoto}
        onClose={handleClosePhoto}
      />
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [
                {
                  translateY: slideAnim,
                },
              ],
            },
          ]}>
          <Surface style={styles.modalContent}>
            <ScrollView>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderContent}>
                  <MaterialCommunityIcons
                    name="clipboard-text"
                    size={24}
                    color={customTheme.colors.primary}
                  />
                  <Text variant="titleLarge">Detalhes do RDO</Text>
                </View>

                <View style={styles.headerActions}>
                  <TouchableOpacity
                    onPress={handleGeneratePdf}
                    style={styles.pdfButton}
                    activeOpacity={0.7}
                    disabled={isPdfLoading}>
                    {isPdfLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={customTheme.colors.primary}
                      />
                    ) : isPdfAtualizado ? (
                      <MaterialCommunityIcons
                        name="file-download"
                        size={24}
                        color={customTheme.colors.primary}
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name="file-cog"
                        size={24}
                        color={customTheme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={async () => {
                      setIsEditLoading(true);
                      try {
                        await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for smooth transition
                        navigation.navigate('RdoForm', {
                          mode: 'edit',
                          relatorioData: relatorio,
                          cliente: relatorio.cliente,
                          servico: relatorio.servico,
                          onGoBack: refresh,
                        });
                      } catch (error) {
                        console.error('Error navigating to edit form:', error);
                      } finally {
                        setIsEditLoading(false);
                        onClose();
                      }
                    }}
                    style={styles.editButton}
                    activeOpacity={0.7}
                    disabled={isEditLoading}>
                    {isEditLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={customTheme.colors.primary}
                      />
                    ) : (
                      canEdit() && (
                        <MaterialCommunityIcons
                          name="pencil"
                          size={24}
                          color={customTheme.colors.primary}
                        />
                      )
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleDismiss}
                    style={styles.closeButton}
                    activeOpacity={0.7}>
                    <MaterialCommunityIcons
                      name="close"
                      size={24}
                      color={customTheme.colors.error}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Conteúdo formatado como Card de informações */}
              <View style={styles.contentWrapper}>
                {/* Informações Básicas */}
                <View style={styles.sectionContainer}>
                  <SectionHeader
                    icon="information"
                    title="Informações Básicas"
                  />
                  <InfoItem
                    icon="pound"
                    label="Número do RDO"
                    value={relatorio.numeroRdo}
                  />
                  <InfoItem
                    icon="domain"
                    label="Cliente"
                    value={relatorio.clienteNome || relatorio.cliente}
                  />

                  <InfoItem
                    icon="account"
                    label="Responsável"
                    value={relatorio.responsavel}
                  />
                  <InfoItem
                    icon="account-hard-hat"
                    label="Função"
                    value={relatorio.funcao}
                  />
                  <InfoItem
                    icon="calendar"
                    label="Data"
                    value={relatorio.data}
                  />
                  <InfoItem
                    icon="calendar-week"
                    label="Dia da Semana"
                    value={getDiaSemanaLabel()}
                  />
                </View>

                {/* Detalhes da Operação */}
                <View style={styles.sectionContainer}>
                  <SectionHeader icon="clock" title="Detalhes da Operação" />
                  <InfoItem
                    icon="hammer-wrench"
                    label="Serviço"
                    value={relatorio.servico}
                  />
                  <InfoItem
                    icon="package-variant"
                    label="Material"
                    value={getMaterialLabel()}
                  />
                  <InfoItem
                    icon="clock-start"
                    label="Início da Operação"
                    value={relatorio.inicioOperacao}
                  />
                  <InfoItem
                    icon="clock-end"
                    label="Término da Operação"
                    value={relatorio.terminoOperacao}
                  />
                </View>

                {/* Condições do Tempo */}
                {relatorio.condicaoTempo && (
                  <View style={styles.sectionContainer}>
                    <SectionHeader
                      icon="weather-partly-cloudy"
                      title="Condições do Tempo"
                    />
                    <View style={styles.tempoContainer}>
                      <View style={styles.tempoItem}>
                        <MaterialCommunityIcons
                          name="weather-sunset-up"
                          size={28}
                          color={customTheme.colors.primary}
                        />
                        <Text style={styles.tempoLabel}>Manhã</Text>
                        <Text style={styles.tempoValue}>
                          {getTempoLabel(relatorio.condicaoTempo.manha)}
                        </Text>
                      </View>
                      <View style={styles.tempoItem}>
                        <MaterialCommunityIcons
                          name="weather-sunny"
                          size={28}
                          color={customTheme.colors.primary}
                        />
                        <Text style={styles.tempoLabel}>Tarde</Text>
                        <Text style={styles.tempoValue}>
                          {getTempoLabel(relatorio.condicaoTempo.tarde)}
                        </Text>
                      </View>
                      <View style={styles.tempoItem}>
                        <MaterialCommunityIcons
                          name="weather-night"
                          size={28}
                          color={customTheme.colors.primary}
                        />
                        <Text style={styles.tempoLabel}>Noite</Text>
                        <Text style={styles.tempoValue}>
                          {getTempoLabel(relatorio.condicaoTempo.noite)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Profissionais */}
                {Array.isArray(relatorio.profissionais) &&
                  relatorio.profissionais.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <SectionHeader
                        icon="account-group"
                        title="Profissionais"
                      />
                      {relatorio.profissionais.map((prof, index) => (
                        <View key={`prof-${index}`} style={styles.listItem}>
                          <MaterialCommunityIcons
                            name="account-hard-hat"
                            size={20}
                            color={customTheme.colors.primary}
                            style={styles.listItemIcon}
                          />
                          <Text style={styles.listItemText}>
                            {prof.tipo} - {prof.quantidade} profissional
                            {parseInt(prof.quantidade) > 1 ? 'is' : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                {/* Equipamentos */}
                {Array.isArray(relatorio.equipamentos) &&
                  relatorio.equipamentos.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <SectionHeader icon="tools" title="Equipamentos" />
                      {relatorio.equipamentos.map((equip, index) => (
                        <View key={`equip-${index}`} style={styles.listItem}>
                          <MaterialCommunityIcons
                            name="wrench"
                            size={20}
                            color={customTheme.colors.primary}
                            style={styles.listItemIcon}
                          />
                          <Text style={styles.listItemText}>
                            {equip.tipo} - {equip.quantidade} unidade
                            {parseInt(equip.quantidade) > 1 ? 's' : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                {/* Atividades */}
                {Array.isArray(relatorio.atividades) &&
                  relatorio.atividades.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <SectionHeader icon="clipboard-list" title="Atividades" />
                      {relatorio.atividades.map((ativ, index) => (
                        <View key={`ativ-${index}`} style={styles.detailCard}>
                          <Text style={styles.detailTitle}>
                            {ativ.descricao}
                          </Text>
                          {ativ.observacao && (
                            <View style={styles.observationContainer}>
                              <MaterialCommunityIcons
                                name="information-outline"
                                size={16}
                                color={customTheme.colors.primary}
                              />
                              <Text style={styles.observationText}>
                                {ativ.observacao}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                {/* Ocorrências */}
                {Array.isArray(relatorio.ocorrencias) &&
                  relatorio.ocorrencias.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <SectionHeader icon="alert-circle" title="Ocorrências" />
                      {relatorio.ocorrencias.map((ocor, index) => (
                        <View key={`ocor-${index}`} style={styles.detailCard}>
                          <View style={styles.ocorrenciaHeader}>
                            <MaterialCommunityIcons
                              name="alert"
                              size={18}
                              color={customTheme.colors.error}
                            />
                            <Text style={styles.ocorrenciaTipo}>
                              {ocor.tipo}
                            </Text>
                          </View>
                          <Text style={styles.ocorrenciaDescricao}>
                            {ocor.descricao}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                {/* Comentários Gerais */}
                {relatorio.comentarioGeral && (
                  <View style={styles.sectionContainer}>
                    <SectionHeader
                      icon="comment-text"
                      title="Comentários Gerais"
                    />
                    <View style={styles.commentCard}>
                      <Text style={styles.commentText}>
                        {relatorio.comentarioGeral}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Fotos */}
                {Array.isArray(relatorio.photos) &&
                  relatorio.photos.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <SectionHeader icon="image" title="Fotos" />
                      <View style={styles.photosGrid}>
                        {relatorio.photos.map((photo, index) => (
                          <View
                            key={`photo-${photo.id || index}`}
                            style={styles.photoItemContainer}>
                            <TouchableOpacity
                              style={styles.photoItem}
                              onPress={() => handleOpenPhoto(photo)}
                              activeOpacity={0.8}>
                              <Image
                                source={{uri: photo.uri}}
                                style={styles.photoThumbnail}
                                resizeMode="cover"
                                onLoadStart={() =>
                                  setLoadingPhotos(prevState => ({
                                    ...prevState,
                                    [photo.id || index]: true,
                                  }))
                                }
                                onLoadEnd={() =>
                                  setLoadingPhotos(prevState => ({
                                    ...prevState,
                                    [photo.id || index]: false,
                                  }))
                                }
                              />
                              {loadingPhotos[photo.id || index] && (
                                <View style={styles.loadingOverlay}>
                                  <ActivityIndicator
                                    size="large"
                                    color={customTheme.colors.primary}
                                  />
                                </View>
                              )}
                              <View style={styles.photoOverlay}>
                                <MaterialCommunityIcons
                                  name="magnify-plus"
                                  size={20}
                                  color="#FFFFFF"
                                />
                              </View>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
              </View>
            </ScrollView>
          </Surface>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pdfButton: {
    padding: 8,
    marginRight: 8,
  },
  photoItemContainer: {
    width: '33.3%',
    aspectRatio: 1,
    padding: 4,
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 10,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  photoItem: {
    width: '100%',
    aspectRatio: 1,
    padding: 4,
    position: 'relative',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: customTheme.colors.surfaceVariant,
  },
  photoOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  closeButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    maxHeight: '95%',
  },
  modalContent: {
    backgroundColor: customTheme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '100%',
  },
  contentWrapper: {
    paddingBottom: 20,
    maxHeight: '90%',
  },
  sectionContainer: {
    backgroundColor: customTheme.colors.surfaceVariant,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: customTheme.colors.primary,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: customTheme.colors.onSurfaceVariant,
  },
  infoValue: {
    fontSize: 16,
    color: customTheme.colors.onSurface,
    fontWeight: '500',
  },
  tempoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: customTheme.colors.surface,
    borderRadius: 10,
    padding: 16,
  },
  tempoItem: {
    alignItems: 'center',
    flex: 1,
  },
  tempoLabel: {
    fontSize: 12,
    color: customTheme.colors.onSurfaceVariant,
    marginTop: 6,
  },
  tempoValue: {
    fontSize: 14,
    color: customTheme.colors.onSurface,
    fontWeight: '500',
    marginTop: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: customTheme.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  listItemIcon: {
    marginRight: 10,
  },
  listItemText: {
    fontSize: 14,
    color: customTheme.colors.onSurface,
    flex: 1,
  },
  detailCard: {
    backgroundColor: customTheme.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: customTheme.colors.onSurface,
  },
  observationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  observationText: {
    fontSize: 13,
    color: customTheme.colors.onSurfaceVariant,
    marginLeft: 6,
    flex: 1,
  },
  ocorrenciaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ocorrenciaTipo: {
    fontSize: 14,
    fontWeight: '500',
    color: customTheme.colors.error,
    marginLeft: 6,
  },
  ocorrenciaDescricao: {
    fontSize: 14,
    color: customTheme.colors.onSurface,
  },
  commentCard: {
    backgroundColor: customTheme.colors.surface,
    borderRadius: 8,
    padding: 14,
  },
  commentText: {
    fontSize: 14,
    color: customTheme.colors.onSurface,
    lineHeight: 20,
  },
});

export default DetalheRdoModal;
