import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Button, Chip, Text, TextInput} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import {ref, uploadBytes, getDownloadURL, deleteObject} from 'firebase/storage';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {useNavigation} from '@react-navigation/native';

import ModernHeader from '../../assets/components/ModernHeader';
import {showGlobalToast} from '../../helpers/GlobalApi';
import {useNetwork} from '../../contexts/NetworkContext';
import {useUser} from '../../contexts/userContext';
import {customTheme} from '../../theme/theme';
import {db, dbStorage} from '../../../firebase';
import {Contaminado, ContaminadoStatus} from './types/contaminadoTypes';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type FilterType = 'Todos' | 'Aguardando' | 'Destinado';

const ContaminadosScreen = () => {
  const navigation = useNavigation();
  const {isOnline} = useNetwork();
  const {userInfo} = useUser();

  const userLevel = (() => {
    if (userInfo?.cargo === 'Administrador') return 3;
    const access = userInfo?.acesso?.find(
      (a: {moduleId: string; level: number}) => a.moduleId === 'contaminados',
    );
    return access?.level || 0;
  })();

  // Data
  const [contaminados, setContaminados] = useState<Contaminado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('Todos');
  const [imageErrors, setImageErrors] = useState<{[id: string]: boolean}>({});

  // New modal
  const [newModalVisible, setNewModalVisible] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState('');
  const [data, setData] = useState('');
  const [mtr, setMtr] = useState('');
  const [pesagem, setPesagem] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const newSlideAnim = useRef(new Animated.Value(500)).current;

  // Detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Contaminado | null>(null);
  const [editMtr, setEditMtr] = useState('');
  const [editPesagem, setEditPesagem] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editPhotoUri, setEditPhotoUri] = useState<string | null>(null);
  const detailSlideAnim = useRef(new Animated.Value(500)).current;

  // Real-time listener
  useEffect(() => {
    const q = query(
      collection(db(), 'contaminados'),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const items: Contaminado[] = [];
        snapshot.forEach(docSnap => {
          items.push({
            id: docSnap.id,
            ...docSnap.data(),
          } as Contaminado);
        });
        setContaminados(items);
        setLoading(false);
      },
      error => {
        console.error('Erro ao carregar contaminados:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Sort: Aguardando first, then by date desc
  const sortedAndFiltered = useCallback(() => {
    let items = [...contaminados];

    if (filter !== 'Todos') {
      items = items.filter(item => item.status === filter);
    }

    items.sort((a, b) => {
      if (a.status === 'Aguardando' && b.status !== 'Aguardando') return -1;
      if (a.status !== 'Aguardando' && b.status === 'Aguardando') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return items;
  }, [contaminados, filter]);

  // ==================== NEW MODAL ====================

  useEffect(() => {
    if (newModalVisible) {
      Animated.spring(newSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 5,
      }).start();
    } else {
      newSlideAnim.setValue(500);
    }
  }, [newModalVisible]);

  const closeNewModal = () => {
    Animated.spring(newSlideAnim, {
      toValue: 800,
      speed: 20,
      bounciness: 2,
      useNativeDriver: true,
      overshootClamping: true,
    }).start();

    setTimeout(() => {
      setNewModalVisible(false);
      resetNewForm();
    }, 150);
  };

  const resetNewForm = () => {
    setPhotoUri(null);
    setEmpresa('');
    setData('');
    setMtr('');
    setPesagem('');
  };

  const openNewModal = () => {
    resetNewForm();
    // Default date to today
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    setData(`${dd}/${mm}/${yyyy}`);
    setNewModalVisible(true);
  };

  // ==================== DETAIL MODAL ====================

  useEffect(() => {
    if (detailModalVisible) {
      Animated.spring(detailSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 5,
      }).start();
    } else {
      detailSlideAnim.setValue(500);
    }
  }, [detailModalVisible]);

  const closeDetailModal = () => {
    Animated.spring(detailSlideAnim, {
      toValue: 800,
      speed: 20,
      bounciness: 2,
      useNativeDriver: true,
      overshootClamping: true,
    }).start();

    setTimeout(() => {
      setDetailModalVisible(false);
      setSelectedItem(null);
      setEditPhotoUri(null);
    }, 150);
  };

  const openDetailModal = (item: Contaminado) => {
    setSelectedItem(item);
    setEditMtr(item.mtr || '');
    setEditPesagem(item.pesagem || '');
    setEditPhotoUri(null);
    setDetailModalVisible(true);
  };

  // ==================== IMAGE PICKER ====================

  const showImagePicker = (onSelect: (uri: string) => void) => {
    Alert.alert('Selecionar Foto', 'Escolha uma opção', [
      {
        text: 'Câmera',
        onPress: () => {
          launchCamera({mediaType: 'photo', quality: 0.7}, response => {
            if (
              !response.didCancel &&
              !response.errorCode &&
              response.assets?.[0]?.uri
            ) {
              onSelect(response.assets[0].uri);
            }
          });
        },
      },
      {
        text: 'Galeria',
        onPress: () => {
          launchImageLibrary({mediaType: 'photo', quality: 0.7}, response => {
            if (
              !response.didCancel &&
              !response.errorCode &&
              response.assets?.[0]?.uri
            ) {
              onSelect(response.assets[0].uri);
            }
          });
        },
      },
      {text: 'Cancelar', style: 'cancel'},
    ]);
  };

  // ==================== UPLOAD IMAGE ====================

  const uploadImage = async (
    uri: string,
    empresaName: string,
  ): Promise<string> => {
    const timestamp = Date.now();
    const sanitized = empresaName.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const storagePath = `contaminados/${timestamp}_${sanitized}.jpg`;
    const storageRef = ref(dbStorage(), storagePath);

    const response = await fetch(uri);
    const blob = await response.blob();
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  // ==================== SAVE NEW ====================

  const handleSave = async () => {
    if (!isOnline) {
      showGlobalToast(
        'info',
        'Modo Offline',
        'É necessário estar online para salvar',
        4000,
      );
      return;
    }

    if (!photoUri) {
      showGlobalToast('error', 'Foto obrigatória', 'Tire uma foto do resíduo', 4000);
      return;
    }
    if (!empresa.trim()) {
      showGlobalToast('error', 'Empresa obrigatória', 'Informe o nome da empresa', 4000);
      return;
    }
    if (!data.trim()) {
      showGlobalToast('error', 'Data obrigatória', 'Informe a data de chegada', 4000);
      return;
    }

    setIsSaving(true);
    try {
      const photoUrl = await uploadImage(photoUri, empresa);
      const now = new Date().toISOString();

      const newItem: Omit<Contaminado, 'id'> = {
        photoUrl,
        data: data.trim(),
        empresa: empresa.trim(),
        mtr: mtr.trim(),
        pesagem: pesagem.trim(),
        status: mtr.trim() && pesagem.trim() ? 'Destinado' : 'Aguardando',
        createdAt: now,
        updatedAt: now,
      };

      await addDoc(collection(db(), 'contaminados'), newItem);
      showGlobalToast('success', 'Registro salvo', '', 4000);
      closeNewModal();
    } catch (error) {
      console.error('Erro ao salvar contaminado:', error);
      showGlobalToast('error', 'Erro ao salvar', 'Tente novamente', 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== UPDATE ====================

  const handleUpdate = async () => {
    if (!isOnline) {
      showGlobalToast('info', 'Modo Offline', 'É necessário estar online', 4000);
      return;
    }
    if (!selectedItem?.id) return;

    setIsUpdating(true);
    try {
      let photoUrl = selectedItem.photoUrl;

      if (editPhotoUri) {
        photoUrl = await uploadImage(editPhotoUri, selectedItem.empresa);
      }

      const updates: Partial<Contaminado> = {
        mtr: editMtr.trim(),
        pesagem: editPesagem.trim(),
        photoUrl,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db(), 'contaminados', selectedItem.id), updates);
      showGlobalToast('success', 'Atualizado com sucesso', '', 4000);
      closeDetailModal();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      showGlobalToast('error', 'Erro ao atualizar', 'Tente novamente', 4000);
    } finally {
      setIsUpdating(false);
    }
  };

  // ==================== MARK AS DESTINADO ====================

  const handleMarkDestinado = async () => {
    if (!isOnline) {
      showGlobalToast('info', 'Modo Offline', 'É necessário estar online', 4000);
      return;
    }
    if (!selectedItem?.id) return;

    if (!editMtr.trim() || !editPesagem.trim()) {
      showGlobalToast(
        'error',
        'Campos obrigatórios',
        'Preencha MTR e Pesagem antes de destinar',
        4000,
      );
      return;
    }

    setIsUpdating(true);
    try {
      let photoUrl = selectedItem.photoUrl;

      if (editPhotoUri) {
        photoUrl = await uploadImage(editPhotoUri, selectedItem.empresa);
      }

      await updateDoc(doc(db(), 'contaminados', selectedItem.id), {
        status: 'Destinado',
        mtr: editMtr.trim(),
        pesagem: editPesagem.trim(),
        photoUrl,
        updatedAt: new Date().toISOString(),
      });

      showGlobalToast('success', 'Marcado como Destinado', '', 4000);
      closeDetailModal();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showGlobalToast('error', 'Erro ao atualizar', 'Tente novamente', 4000);
    } finally {
      setIsUpdating(false);
    }
  };

  // ==================== DELETE ====================

  const handleDelete = () => {
    if (!selectedItem?.id) return;

    Alert.alert(
      'Confirmar Exclusão',
      `Deseja excluir o registro de "${selectedItem.empresa}"?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (!isOnline) {
              showGlobalToast(
                'info',
                'Modo Offline',
                'É necessário estar online',
                4000,
              );
              return;
            }

            setIsDeleting(true);
            try {
              await deleteDoc(doc(db(), 'contaminados', selectedItem.id!));

              // Try to delete storage image
              if (selectedItem.photoUrl) {
                try {
                  const imageRef = ref(dbStorage(), selectedItem.photoUrl);
                  await deleteObject(imageRef);
                } catch {
                  // Image may not exist anymore
                }
              }

              showGlobalToast('success', 'Registro excluído', '', 4000);
              closeDetailModal();
            } catch (error) {
              console.error('Erro ao excluir:', error);
              showGlobalToast('error', 'Erro ao excluir', 'Tente novamente', 4000);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  // ==================== DATE MASK ====================

  const handleDataChange = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);

    if (cleaned.length >= 5) {
      setData(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`);
    } else if (cleaned.length >= 3) {
      setData(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
    } else {
      setData(cleaned);
    }
  };

  // ==================== RENDER CARD ====================

  const renderCard = ({item}: {item: Contaminado}) => {
    const isAguardando = item.status === 'Aguardando';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openDetailModal(item)}
        activeOpacity={0.7}>
        <View style={styles.cardRow}>
          {/* Thumbnail */}
          {item.photoUrl && !imageErrors[item.id || ''] ? (
            <Image
              source={{uri: item.photoUrl}}
              style={styles.thumbnail}
              onError={() => {
                if (item.id) {
                  setImageErrors(prev => ({...prev, [item.id!]: true}));
                }
              }}
            />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Icon
                name="image-off"
                size={24}
                color={customTheme.colors.onSurfaceVariant}
              />
            </View>
          )}

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardEmpresa} numberOfLines={1}>
              {item.empresa}
            </Text>
            <Text style={styles.cardData}>{item.data}</Text>

            {item.mtr ? (
              <Text style={styles.cardDetail}>MTR: {item.mtr}</Text>
            ) : null}
            {item.pesagem ? (
              <Text style={styles.cardDetail}>Pesagem: {item.pesagem} kg</Text>
            ) : null}
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isAguardando
                  ? '#FFF3E0'
                  : '#E8F5E9',
              },
            ]}>
            <Text
              style={[
                styles.statusText,
                {
                  color: isAguardando ? '#E65100' : '#2E7D32',
                },
              ]}>
              {item.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ==================== RENDER ====================

  const filteredItems = sortedAndFiltered();

  return (
    <SafeAreaView style={styles.container}>
      <ModernHeader
        title="Contaminados"
        iconName="biohazard"
        onBackPress={() => navigation.goBack()}
        rightIcon="plus-box"
        rightAction={openNewModal}
      />

      {/* Filters */}
      <View style={styles.filterRow}>
        {(['Todos', 'Aguardando', 'Destinado'] as FilterType[]).map(f => (
          <Chip
            key={f}
            selected={filter === f}
            onPress={() => setFilter(f)}
            style={[
              styles.chip,
              filter === f && styles.chipSelected,
            ]}
            textStyle={[
              styles.chipText,
              filter === f && styles.chipTextSelected,
            ]}>
            {f}
          </Chip>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={customTheme.colors.primary} />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.centerContainer}>
          <Icon
            name="flask-empty-off-outline"
            size={64}
            color={customTheme.colors.onSurfaceVariant}
          />
          <Text style={styles.emptyText}>Nenhum registro encontrado</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderCard}
          keyExtractor={item => item.id || item.createdAt}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ==================== NEW MODAL ==================== */}
      <Modal visible={newModalVisible} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.backdrop} onPress={closeNewModal} />
          <Animated.View
            style={[
              styles.modalContainer,
              {transform: [{translateY: newSlideAnim}]},
            ]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Novo Contaminado</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}>
              {/* Photo */}
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => showImagePicker(uri => setPhotoUri(uri))}>
                {photoUri ? (
                  <Image source={{uri: photoUri}} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Icon
                      name="camera-plus"
                      size={40}
                      color={customTheme.colors.primary}
                    />
                    <Text style={styles.photoPlaceholderText}>
                      Tirar foto *
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Empresa */}
              <TextInput
                label="Empresa *"
                value={empresa}
                onChangeText={setEmpresa}
                mode="outlined"
                style={styles.input}
                outlineColor={customTheme.colors.onSurfaceVariant}
                activeOutlineColor={customTheme.colors.primary}
              />

              {/* Data */}
              <TextInput
                label="Data de Chegada *"
                value={data}
                onChangeText={handleDataChange}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                placeholder="DD/MM/AAAA"
                maxLength={10}
                outlineColor={customTheme.colors.onSurfaceVariant}
                activeOutlineColor={customTheme.colors.primary}
              />

              {/* MTR (optional) */}
              <TextInput
                label="MTR (opcional)"
                value={mtr}
                onChangeText={setMtr}
                mode="outlined"
                style={styles.input}
                outlineColor={customTheme.colors.onSurfaceVariant}
                activeOutlineColor={customTheme.colors.primary}
              />

              {/* Pesagem (optional) */}
              <TextInput
                label="Pesagem em kg (opcional)"
                value={pesagem}
                onChangeText={setPesagem}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                right={<TextInput.Affix text="kg" />}
                outlineColor={customTheme.colors.onSurfaceVariant}
                activeOutlineColor={customTheme.colors.primary}
              />

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={closeNewModal}
                  style={styles.cancelButton}
                  textColor={customTheme.colors.onSurface}>
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  loading={isSaving}
                  disabled={isSaving}
                  style={styles.saveButton}
                  buttonColor={customTheme.colors.primary}>
                  Salvar
                </Button>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* ==================== DETAIL MODAL ==================== */}
      <Modal visible={detailModalVisible} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            onPress={closeDetailModal}
          />
          <Animated.View
            style={[
              styles.modalContainer,
              styles.detailModalContainer,
              {transform: [{translateY: detailSlideAnim}]},
            ]}>
            <View style={styles.modalHandle} />

            {selectedItem && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalScroll}>
                {/* Header with delete */}
                <View style={styles.detailHeader}>
                  <Text style={styles.modalTitle}>Detalhes</Text>
                  {userLevel >= 2 && (
                    <TouchableOpacity
                      onPress={handleDelete}
                      disabled={isDeleting}>
                      {isDeleting ? (
                        <ActivityIndicator
                          size="small"
                          color={customTheme.colors.error}
                        />
                      ) : (
                        <Icon
                          name="delete-outline"
                          size={24}
                          color={customTheme.colors.error}
                        />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Photo */}
                <TouchableOpacity
                  style={styles.detailPhotoContainer}
                  onPress={() =>
                    showImagePicker(uri => setEditPhotoUri(uri))
                  }>
                  <Image
                    source={{
                      uri: editPhotoUri || selectedItem.photoUrl,
                    }}
                    style={styles.detailPhoto}
                  />
                  <View style={styles.editPhotoOverlay}>
                    <Icon name="camera" size={20} color="#FFF" />
                  </View>
                </TouchableOpacity>

                {/* Empresa + Data (read-only) */}
                <View style={styles.detailInfoRow}>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailLabel}>Empresa</Text>
                    <Text style={styles.detailValue}>
                      {selectedItem.empresa}
                    </Text>
                  </View>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailLabel}>Data</Text>
                    <Text style={styles.detailValue}>{selectedItem.data}</Text>
                  </View>
                </View>

                {/* Status */}
                <View style={styles.detailInfoRow}>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            selectedItem.status === 'Aguardando'
                              ? '#FFF3E0'
                              : '#E8F5E9',
                          alignSelf: 'flex-start',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              selectedItem.status === 'Aguardando'
                                ? '#E65100'
                                : '#2E7D32',
                          },
                        ]}>
                        {selectedItem.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Editable fields */}
                <TextInput
                  label="MTR"
                  value={editMtr}
                  onChangeText={setEditMtr}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={customTheme.colors.onSurfaceVariant}
                  activeOutlineColor={customTheme.colors.primary}
                />

                <TextInput
                  label="Pesagem em kg"
                  value={editPesagem}
                  onChangeText={setEditPesagem}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                  right={<TextInput.Affix text="kg" />}
                  outlineColor={customTheme.colors.onSurfaceVariant}
                  activeOutlineColor={customTheme.colors.primary}
                />

                {/* Action buttons */}
                <View style={styles.modalButtons}>
                  <Button
                    mode="outlined"
                    onPress={handleUpdate}
                    loading={isUpdating}
                    disabled={isUpdating || isDeleting}
                    style={styles.cancelButton}
                    textColor={customTheme.colors.primary}>
                    Salvar Alterações
                  </Button>

                  {selectedItem.status === 'Aguardando' && (
                    <Button
                      mode="contained"
                      onPress={handleMarkDestinado}
                      loading={isUpdating}
                      disabled={isUpdating || isDeleting}
                      style={styles.saveButton}
                      buttonColor={customTheme.colors.primary}
                      icon="check-circle">
                      Destinado
                    </Button>
                  )}
                </View>
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: customTheme.colors.background,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: customTheme.colors.surface,
    borderColor: customTheme.colors.onSurfaceVariant,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: customTheme.colors.primaryContainer,
    borderColor: customTheme.colors.primary,
  },
  chipText: {
    color: customTheme.colors.onSurface,
    fontSize: 13,
  },
  chipTextSelected: {
    color: customTheme.colors.primary,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  emptyText: {
    fontSize: 16,
    color: customTheme.colors.onSurfaceVariant,
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: customTheme.colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    backgroundColor: customTheme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardEmpresa: {
    fontSize: 15,
    fontWeight: '600',
    color: customTheme.colors.onSurface,
  },
  cardData: {
    fontSize: 13,
    color: customTheme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  cardDetail: {
    fontSize: 12,
    color: customTheme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: customTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '85%',
  },
  detailModalContainer: {
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: customTheme.colors.onSurfaceVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
    opacity: 0.4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: customTheme.colors.onSurface,
    marginBottom: 16,
  },
  modalScroll: {
    flexGrow: 0,
  },
  input: {
    marginBottom: 12,
    backgroundColor: customTheme.colors.surface,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    borderColor: customTheme.colors.onSurfaceVariant,
  },
  saveButton: {
    flex: 1,
  },

  // Photo
  photoButton: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: `${customTheme.colors.primary}10`,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: `${customTheme.colors.primary}40`,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: 8,
    color: customTheme.colors.primary,
    fontSize: 14,
  },

  // Detail
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  detailPhotoContainer: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  detailPhoto: {
    width: '100%',
    height: '100%',
  },
  editPhotoOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  detailInfoItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: customTheme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: customTheme.colors.onSurface,
  },
});

export default ContaminadosScreen;
