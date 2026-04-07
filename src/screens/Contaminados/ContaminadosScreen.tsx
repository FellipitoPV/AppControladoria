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
import {Chip, Text, TextInput} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {useNavigation} from '@react-navigation/native';

import ModernHeader from '../../assets/components/ModernHeader';
import SaveButton from '../../assets/components/SaveButton';
import {showGlobalToast} from '../../helpers/GlobalApi';
import {useNetwork} from '../../contexts/NetworkContext';
import {useUser} from '../../contexts/userContext';
import {customTheme} from '../../theme/theme';
import {ecoApi, ecoStorage, BASE_URL} from '../../api/ecoApi';
import {
  Contaminado,
  ContaminadoStatus,
  getItemPhotos,
} from './types/contaminadoTypes';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const formatDate = (value: any): string => {
  if (!value) return '—';
  if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }
  return String(value);
};

const withAlpha = (hex: string, alpha: number): string => {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
};

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
  const [photoUris, setPhotoUris] = useState<string[]>([]);
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
  const [newEditPhotoUris, setNewEditPhotoUris] = useState<string[]>([]);
  const detailSlideAnim = useRef(new Animated.Value(500)).current;

  // Delete confirmation
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  // Photo viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const loadContaminados = async () => {
    try {
      const data = await ecoApi.list('contaminados');
      const items: Contaminado[] = data
        .map((doc: any) => ({...doc, id: doc._id ?? doc.id}))
        .sort((a: Contaminado, b: Contaminado) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      setContaminados(items);
    } catch (error) {
      console.error('Erro ao carregar contaminados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContaminados();
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
    setPhotoUris([]);
    setEmpresa('');
    setData('');
    setMtr('');
    setPesagem('');
  };

  const openNewModal = () => {
    resetNewForm();
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
      setNewEditPhotoUris([]);
    }, 150);
  };

  const openDetailModal = (item: Contaminado) => {
    setSelectedItem(item);
    setEditMtr(item.mtr || '');
    setEditPesagem(item.pesagem || '');
    setNewEditPhotoUris([]);
    setDetailModalVisible(true);
  };

  // ==================== PHOTO VIEWER ====================

  const openViewer = (photos: string[], startIndex: number) => {
    setViewerPhotos(photos);
    setViewerIndex(startIndex);
    setViewerVisible(true);
  };

  // ==================== IMAGE PICKER ====================

  const showImagePickerMulti = (onSelect: (uris: string[]) => void) => {
    Alert.alert('Adicionar Foto', 'Escolha uma opção', [
      {
        text: 'Câmera',
        onPress: () => {
          launchCamera({mediaType: 'photo', quality: 0.7}, response => {
            if (
              !response.didCancel &&
              !response.errorCode &&
              response.assets?.[0]?.uri
            ) {
              onSelect([response.assets[0].uri]);
            }
          });
        },
      },
      {
        text: 'Galeria',
        onPress: () => {
          launchImageLibrary(
            {mediaType: 'photo', quality: 0.7, selectionLimit: 0},
            response => {
              if (
                !response.didCancel &&
                !response.errorCode &&
                response.assets
              ) {
                const uris = response.assets
                  .map(a => a.uri)
                  .filter((uri): uri is string => !!uri);
                if (uris.length > 0) onSelect(uris);
              }
            },
          );
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
    const timestamp = Date.now() + Math.random();
    const sanitized = empresaName.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `contaminados_${timestamp}_${sanitized}.jpg`;
    const result = await ecoStorage.upload({uri, type: 'image/jpeg', name: filename});
    return result.url;
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

    if (photoUris.length === 0) {
      showGlobalToast(
        'error',
        'Foto obrigatória',
        'Adicione pelo menos uma foto do resíduo',
        4000,
      );
      return;
    }
    if (!empresa.trim()) {
      showGlobalToast(
        'error',
        'Empresa obrigatória',
        'Informe o nome da empresa',
        4000,
      );
      return;
    }
    if (!data.trim()) {
      showGlobalToast(
        'error',
        'Data obrigatória',
        'Informe a data de chegada',
        4000,
      );
      return;
    }

    setIsSaving(true);
    try {
      const photoUrls = await Promise.all(
        photoUris.map(uri => uploadImage(uri, empresa)),
      );
      const now = new Date().toISOString();

      const newItem: Omit<Contaminado, 'id'> = {
        photoUrls,
        data: data.trim(),
        empresa: empresa.trim(),
        mtr: mtr.trim(),
        pesagem: pesagem.trim(),
        status: 'Aguardando',
        createdAt: now,
        updatedAt: now,
      };

      await ecoApi.create('contaminados', newItem);
      showGlobalToast('success', 'Registro salvo', '', 4000);
      closeNewModal();
      loadContaminados();
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
      const existingPhotos = getItemPhotos(selectedItem);
      let uploadedUrls: string[] = [];

      if (newEditPhotoUris.length > 0) {
        uploadedUrls = await Promise.all(
          newEditPhotoUris.map(uri => uploadImage(uri, selectedItem.empresa)),
        );
      }

      await ecoApi.update('contaminados', selectedItem.id, {
        photoUrls: [...existingPhotos, ...uploadedUrls],
        mtr: editMtr.trim(),
        pesagem: editPesagem.trim(),
        updatedAt: new Date().toISOString(),
      });

      showGlobalToast('success', 'Atualizado com sucesso', '', 4000);
      closeDetailModal();
      loadContaminados();
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
      const existingPhotos = getItemPhotos(selectedItem);
      let uploadedUrls: string[] = [];

      if (newEditPhotoUris.length > 0) {
        uploadedUrls = await Promise.all(
          newEditPhotoUris.map(uri => uploadImage(uri, selectedItem.empresa)),
        );
      }

      await ecoApi.update('contaminados', selectedItem.id, {
        status: 'Destinado',
        photoUrls: [...existingPhotos, ...uploadedUrls],
        mtr: editMtr.trim(),
        pesagem: editPesagem.trim(),
        updatedAt: new Date().toISOString(),
      });

      showGlobalToast('success', 'Marcado como Destinado', '', 4000);
      closeDetailModal();
      loadContaminados();
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
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem?.id) return;
    if (!isOnline) {
      showGlobalToast('info', 'Modo Offline', 'É necessário estar online', 4000);
      return;
    }
    setDeleteConfirmVisible(false);
    setIsDeleting(true);
    try {
      await ecoApi.delete('contaminados', selectedItem.id!);
      const photos = getItemPhotos(selectedItem);
      for (const url of photos) {
        try {
          const filename = url.replace(`${BASE_URL}/storage/files/`, '');
          await ecoStorage.delete(filename);
        } catch {}
      }
      showGlobalToast('success', 'Registro excluído', '', 4000);
      closeDetailModal();
      loadContaminados();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      showGlobalToast('error', 'Erro ao excluir', 'Tente novamente', 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  // ==================== DATE MASK ====================

  const handleDataChange = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);

    if (cleaned.length >= 5) {
      setData(
        `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`,
      );
    } else if (cleaned.length >= 3) {
      setData(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
    } else {
      setData(cleaned);
    }
  };

  // ==================== RENDER CARD ====================

  const renderCard = ({item}: {item: Contaminado}) => {
    const isAguardando = item.status === 'Aguardando';
    const photos = getItemPhotos(item);
    const firstPhoto = photos[0];

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openDetailModal(item)}
        activeOpacity={0.7}>
        <View style={styles.cardRow}>
          {/* Thumbnail */}
          <View style={styles.thumbnailContainer}>
            {firstPhoto && !imageErrors[item.id || ''] ? (
              <Image
                source={{uri: firstPhoto}}
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
            {photos.length > 1 && (
              <View style={styles.photoCountBadge}>
                <Icon name="image-multiple" size={9} color="#fff" />
                <Text style={styles.photoCountBadgeText}>{photos.length}</Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardEmpresa} numberOfLines={1}>
              {item.empresa}
            </Text>
            <Text style={styles.cardData}>{formatDate(item.data)}</Text>
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
              {backgroundColor: isAguardando ? withAlpha(customTheme.colors.warning, 0.12) : withAlpha(customTheme.colors.primary, 0.12)},
            ]}>
            <Text
              style={[
                styles.statusText,
                {color: isAguardando ? customTheme.colors.warning : customTheme.colors.primary},
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
            style={[styles.chip, filter === f && styles.chipSelected]}
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

      {/* ==================== PHOTO VIEWER ==================== */}
      <Modal
        visible={viewerVisible}
        transparent={false}
        statusBarTranslucent
        animationType="fade">
        <View style={styles.viewerContainer}>
          <TouchableOpacity
            style={styles.viewerCloseBtn}
            onPress={() => setViewerVisible(false)}>
            <Icon name="close" size={26} color="#fff" />
          </TouchableOpacity>

          {viewerPhotos.length > 0 && (
            <Image
              source={{uri: viewerPhotos[viewerIndex]}}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}

          {viewerPhotos.length > 1 && (
            <>
              <View style={styles.viewerNav}>
                <TouchableOpacity
                  style={styles.viewerNavBtn}
                  onPress={() => setViewerIndex(i => Math.max(0, i - 1))}
                  disabled={viewerIndex === 0}>
                  <Icon
                    name="chevron-left"
                    size={36}
                    color={
                      viewerIndex === 0 ? 'rgba(255,255,255,0.25)' : '#fff'
                    }
                  />
                </TouchableOpacity>
                <Text style={styles.viewerNavText}>
                  {viewerIndex + 1} / {viewerPhotos.length}
                </Text>
                <TouchableOpacity
                  style={styles.viewerNavBtn}
                  onPress={() =>
                    setViewerIndex(i =>
                      Math.min(viewerPhotos.length - 1, i + 1),
                    )
                  }
                  disabled={viewerIndex === viewerPhotos.length - 1}>
                  <Icon
                    name="chevron-right"
                    size={36}
                    color={
                      viewerIndex === viewerPhotos.length - 1
                        ? 'rgba(255,255,255,0.25)'
                        : '#fff'
                    }
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.viewerDots}>
                {viewerPhotos.map((_, i) => (
                  <TouchableOpacity key={i} onPress={() => setViewerIndex(i)}>
                    <View
                      style={[
                        styles.viewerDot,
                        i === viewerIndex && styles.viewerDotActive,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* ==================== NEW MODAL ==================== */}
      <Modal visible={newModalVisible} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.backdrop} onPress={closeNewModal} />
          <Animated.View
            style={[
              styles.modalContainer,
              {transform: [{translateY: newSlideAnim}]},
            ]}>
            <View style={styles.modalAccentBar} />
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Icon name="flask-plus-outline" size={20} color={customTheme.colors.primary} />
              </View>
              <View style={{flex: 1}}>
                <Text variant="titleMedium" style={{color: customTheme.colors.onSurface}}>Novo Contaminado</Text>
                <Text variant="bodySmall" style={{color: customTheme.colors.onSurfaceVariant}}>Preencha os dados do resíduo</Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}>
              {/* Photos */}
              <Text style={styles.photoSectionLabel}>
                Fotos{' '}
                {photoUris.length > 0 ? `(${photoUris.length})` : '(obrigatório)'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photoStrip}
                contentContainerStyle={styles.photoStripContent}>
                {photoUris.map((uri, index) => (
                  <View key={index} style={styles.photoThumbContainer}>
                    <TouchableOpacity
                      onPress={() => openViewer(photoUris, index)}>
                      <Image source={{uri}} style={styles.photoThumb} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() =>
                        setPhotoUris(prev => prev.filter((_, i) => i !== index))
                      }>
                      <Icon name="close-circle" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={[
                    styles.photoAddBtn,
                    photoUris.length === 0 && styles.photoAddBtnWide,
                  ]}
                  onPress={() =>
                    showImagePickerMulti(uris =>
                      setPhotoUris(prev => [...prev, ...uris]),
                    )
                  }>
                  <Icon
                    name="camera-plus"
                    size={photoUris.length === 0 ? 36 : 26}
                    color={customTheme.colors.primary}
                  />
                  <Text style={styles.photoAddBtnText}>
                    {photoUris.length === 0 ? 'Adicionar Foto *' : 'Mais'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>

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
                <TouchableOpacity style={styles.btnCancel} onPress={closeNewModal}>
                  <Text style={styles.btnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <View style={{flex: 1}}>
                  <SaveButton onPress={handleSave} text="Salvar" iconName="content-save" loading={isSaving} disabled={isSaving} />
                </View>
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
            <View style={styles.modalAccentBar} />

            {selectedItem && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalScroll}>
                {/* Header with delete */}
                <View style={styles.detailHeader}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1}}>
                    <View style={styles.modalIconBox}>
                      <Icon name="flask-outline" size={20} color={customTheme.colors.primary} />
                    </View>
                    <Text variant="titleMedium" style={{color: customTheme.colors.onSurface}}>Detalhes</Text>
                  </View>
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

                {/* Photos strip */}
                {(() => {
                  const existingPhotos = getItemPhotos(selectedItem);
                  const allPhotos = [...existingPhotos, ...newEditPhotoUris];
                  return (
                    <>
                      <Text style={styles.photoSectionLabel}>
                        Fotos ({allPhotos.length})
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.photoStrip}
                        contentContainerStyle={styles.photoStripContent}>
                        {existingPhotos.map((url, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.photoThumbContainer}
                            onPress={() => openViewer(allPhotos, index)}>
                            <Image source={{uri: url}} style={styles.photoThumb} />
                          </TouchableOpacity>
                        ))}
                        {newEditPhotoUris.map((uri, index) => (
                          <View
                            key={`new-${index}`}
                            style={styles.photoThumbContainer}>
                            <TouchableOpacity
                              onPress={() =>
                                openViewer(
                                  allPhotos,
                                  existingPhotos.length + index,
                                )
                              }>
                              <Image source={{uri}} style={styles.photoThumb} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.photoRemoveBtn}
                              onPress={() =>
                                setNewEditPhotoUris(prev =>
                                  prev.filter((_, i) => i !== index),
                                )
                              }>
                              <Icon name="close-circle" size={22} color="#fff" />
                            </TouchableOpacity>
                            <View style={styles.photoNewBadge}>
                              <Text style={styles.photoNewBadgeText}>Nova</Text>
                            </View>
                          </View>
                        ))}
                        <TouchableOpacity
                          style={styles.photoAddBtn}
                          onPress={() =>
                            showImagePickerMulti(uris =>
                              setNewEditPhotoUris(prev => [...prev, ...uris]),
                            )
                          }>
                          <Icon
                            name="camera-plus"
                            size={26}
                            color={customTheme.colors.primary}
                          />
                          <Text style={styles.photoAddBtnText}>Adicionar</Text>
                        </TouchableOpacity>
                      </ScrollView>
                    </>
                  );
                })()}

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
                    <Text style={styles.detailValue}>{formatDate(selectedItem.data)}</Text>
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
                              ? withAlpha(customTheme.colors.warning, 0.12)
                              : withAlpha(customTheme.colors.primary, 0.12),
                          alignSelf: 'flex-start',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              selectedItem.status === 'Aguardando'
                                ? customTheme.colors.warning
                                : customTheme.colors.primary,
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
                  <TouchableOpacity style={styles.btnCancel} onPress={closeDetailModal}>
                    <Text style={styles.btnCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <View style={{flex: 1, gap: 8}}>
                    <SaveButton onPress={handleUpdate} text="Salvar Alterações" iconName="content-save" loading={isUpdating} disabled={isUpdating || isDeleting} />
                    {selectedItem.status === 'Aguardando' && (
                      <SaveButton onPress={handleMarkDestinado} text="Marcar como Destinado" iconName="check-circle-outline" loading={isUpdating} disabled={isUpdating || isDeleting} />
                    )}
                  </View>
                </View>
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade" onRequestClose={() => setDeleteConfirmVisible(false)}>
        <View style={styles.deleteModalBackdrop}>
          <View style={styles.deleteModalContainer}>
            <View style={[styles.modalAccentBar, {backgroundColor: customTheme.colors.error}]} />
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBox, {backgroundColor: withAlpha(customTheme.colors.error, 0.1)}]}>
                <Icon name="alert-outline" size={20} color={customTheme.colors.error} />
              </View>
              <View style={{flex: 1}}>
                <Text variant="titleMedium" style={{color: customTheme.colors.onSurface}}>Confirmar Exclusão</Text>
                <Text variant="bodySmall" style={{color: customTheme.colors.onSurfaceVariant}}>Esta ação não pode ser desfeita</Text>
              </View>
            </View>
            <View style={styles.deleteModalBody}>
              <Text variant="bodyMedium" style={{color: customTheme.colors.onSurfaceVariant}}>
                Deseja excluir o registro de "{selectedItem?.empresa}"? Todas as fotos associadas serão removidas permanentemente.
              </Text>
            </View>
            <View style={styles.deleteModalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setDeleteConfirmVisible(false)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <View style={{flex: 1}}>
                <SaveButton onPress={confirmDelete} text="Excluir" iconName="trash-can-outline" style={{backgroundColor: customTheme.colors.error}} />
              </View>
            </View>
          </View>
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
    borderWidth: 1,
    borderColor: customTheme.colors.surfaceVariant,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    position: 'relative',
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
  photoCountBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  photoCountBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
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
    borderRadius: 6,
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
    overflow: 'hidden',
  },
  detailModalContainer: {
    maxHeight: '90%',
  },
  modalAccentBar: {
    height: 4,
    backgroundColor: customTheme.colors.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingBottom: 8,
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: customTheme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  btnCancelText: {
    color: customTheme.colors.onSurfaceVariant,
    fontWeight: '500',
    fontSize: 15,
  },
  deleteModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContainer: {
    width: '100%',
    backgroundColor: customTheme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
  },
  deleteModalBody: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  deleteModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: customTheme.colors.surfaceVariant,
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

  // Photo strip
  photoSectionLabel: {
    fontSize: 13,
    color: customTheme.colors.onSurfaceVariant,
    fontWeight: '500',
    marginBottom: 8,
  },
  photoStrip: {
    marginBottom: 16,
  },
  photoStripContent: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  photoThumbContainer: {
    width: 90,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
  },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: 10,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
  },
  photoAddBtn: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: `${customTheme.colors.primary}50`,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${customTheme.colors.primary}08`,
  },
  photoAddBtnWide: {
    width: 150,
  },
  photoAddBtnText: {
    fontSize: 11,
    color: customTheme.colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  photoNewBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: customTheme.colors.primary,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  photoNewBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },

  // Detail
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    padding: 16,
    paddingBottom: 8,
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

  // Viewer
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
  },
  viewerNav: {
    position: 'absolute',
    bottom: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  viewerNavBtn: {
    padding: 8,
  },
  viewerNavText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  viewerDots: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  viewerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  viewerDotActive: {
    width: 12,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});

export default ContaminadosScreen;
