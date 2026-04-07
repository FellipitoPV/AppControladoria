import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Button, Surface, Text, TextInput as PaperInput} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {PERMISSIONS, RESULTS, check, request} from 'react-native-permissions';
import {RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';

import ModernHeader from '../../../assets/components/ModernHeader';
import {customTheme} from '../../../theme/theme';
import {showGlobalToast} from '../../../helpers/GlobalApi';
import {ecoApi, ecoStorage} from '../../../api/ecoApi';
import {useBackgroundSync} from '../../../contexts/backgroundSyncContext';
import {useUser} from '../../../contexts/userContext';
import {ProductSelectionModal} from './Components/ProductSelectionModal';
import {
  EQUIPAMENTOS,
  PLACAS_VEICULOS,
  ProdutoEstoque,
  TIPOS_LAVAGEM,
} from './Components/lavagemTypes';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FotoItem {
  uri: string;
  id: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

type RootStackParamList = {
  LavagemForm: {
    placa?: string;
    lavagem?: string;
    agendamentoId?: string;
    mode?: 'edit' | 'create';
    lavagemData?: any;
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const withAlpha = (hex: string, alpha: number) =>
  hex + Math.round(alpha * 255).toString(16).padStart(2, '0');

const formatDateTime = (date: Date) =>
  `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  accentColor,
  badge,
  children,
}: {
  title: string;
  icon: string;
  accentColor?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const color = accentColor || customTheme.colors.primary;
  return (
    <Surface style={styles.sectionCard}>
      <View style={[styles.sectionAccentBar, {backgroundColor: color}]} />
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconBox, {backgroundColor: withAlpha(color, 0.12)}]}>
          <Icon name={icon} size={20} color={color} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {badge ? (
          <View style={[styles.sectionBadge, {backgroundColor: withAlpha(color, 0.12)}]}>
            <Text style={[styles.sectionBadgeText, {color}]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </Surface>
  );
}

function PhotoGrid({
  photos,
  onAdd,
  onDelete,
  onView,
}: {
  photos: FotoItem[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onView: (uri: string) => void;
}) {
  return (
    <View style={styles.photoGrid}>
      {photos.map(p => (
        <View key={p.id} style={styles.photoThumbWrap}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => onView(p.uri)}>
            <Image
              source={{uri: p.uri}}
              style={styles.photoThumb}
              resizeMode="cover"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.photoDeleteBtn}
            onPress={() => onDelete(p.id)}
            hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
            <Icon name="close-circle" size={22} color={customTheme.colors.error} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        style={styles.photoAddBtn}
        onPress={onAdd}
        activeOpacity={0.75}>
        <Icon name="camera-plus" size={28} color={customTheme.colors.primary} />
        <Text style={styles.photoAddText}>Adicionar</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── SelectField ───────────────────────────────────────────────────────────────

interface SelectOption {
  label: string;
  value: string;
  [key: string]: any;
}

function SelectField({
  placeholder,
  value,
  options,
  onChange,
  disabled = false,
  error = false,
  leftIcon,
  searchable = false,
  freeSolo = false,
}: {
  placeholder: string;
  value: string;
  options: SelectOption[];
  onChange: (item: SelectOption) => void;
  disabled?: boolean;
  error?: boolean;
  leftIcon?: string;
  searchable?: boolean;
  freeSolo?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<TextInput>(null);

  const selectedLabel = options.find(o => o.value === value)?.label ?? value;

  const filtered = searchable && search.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  // No modo freeSolo, mostra opção de usar o texto digitado se não houver match exato
  const showFreeSoloOption =
    freeSolo &&
    search.trim().length > 0 &&
    !options.some(o => o.value.toLowerCase() === search.trim().toLowerCase());

  const handleOpen = () => {
    if (disabled) return;
    setSearch('');
    setOpen(true);
  };

  const handleSelect = (item: SelectOption) => {
    onChange(item);
    setOpen(false);
    setSearch('');
  };

  const handleFreeSoloConfirm = () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    onChange({label: trimmed, value: trimmed});
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      {/* ── Trigger ── */}
      <TouchableOpacity
        style={[
          sfStyles.trigger,
          error && sfStyles.triggerError,
          disabled && sfStyles.triggerDisabled,
        ]}
        onPress={handleOpen}
        activeOpacity={disabled ? 1 : 0.7}>
        {leftIcon ? (
          <Icon
            name={leftIcon}
            size={20}
            color={
              disabled
                ? customTheme.colors.onSurfaceVariant
                : customTheme.colors.primary
            }
            style={sfStyles.leftIcon}
          />
        ) : null}
        <Text
          style={[
            sfStyles.triggerText,
            !value && sfStyles.triggerPlaceholder,
          ]}
          numberOfLines={1}>
          {value ? selectedLabel : placeholder}
        </Text>
        {!disabled && (
          <Icon
            name="chevron-down"
            size={20}
            color={customTheme.colors.onSurfaceVariant}
          />
        )}
      </TouchableOpacity>

      {/* ── Modal ── */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={sfStyles.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />

        <View style={sfStyles.sheet}>
          {/* Handle */}
          <View style={sfStyles.handle} />

          {/* Search */}
          {searchable && (
            <View style={sfStyles.searchRow}>
              <Icon
                name="magnify"
                size={20}
                color={customTheme.colors.onSurfaceVariant}
              />
              <TextInput
                ref={searchRef}
                style={sfStyles.searchInput}
                placeholder={freeSolo ? 'Buscar ou digitar...' : 'Buscar...'}
                placeholderTextColor={customTheme.colors.onSurfaceVariant}
                value={search}
                onChangeText={setSearch}
                autoFocus
                autoCapitalize="none"
                onSubmitEditing={freeSolo ? handleFreeSoloConfirm : undefined}
                returnKeyType={freeSolo ? 'done' : 'search'}
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
                  <Icon
                    name="close-circle"
                    size={18}
                    color={customTheme.colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Opção freeSolo — usar texto digitado */}
          {showFreeSoloOption && (
            <TouchableOpacity
              style={sfStyles.freeSoloOption}
              onPress={handleFreeSoloConfirm}
              activeOpacity={0.7}>
              <Icon
                name="plus-circle-outline"
                size={18}
                color={customTheme.colors.primary}
              />
              <Text style={sfStyles.freeSoloText}>
                Usar: <Text style={sfStyles.freeSoloBold}>"{search.trim()}"</Text>
              </Text>
            </TouchableOpacity>
          )}

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(item, idx) => `${item.value}_${idx}`}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={sfStyles.listContent}
            renderItem={({item}) => {
              const selected = item.value === value;
              return (
                <TouchableOpacity
                  style={[
                    sfStyles.option,
                    selected && sfStyles.optionSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      sfStyles.optionText,
                      selected && sfStyles.optionTextSelected,
                    ]}>
                    {item.label}
                  </Text>
                  {selected && (
                    <Icon
                      name="check"
                      size={18}
                      color={customTheme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              !showFreeSoloOption ? (
                <View style={sfStyles.emptySearch}>
                  <Icon
                    name="magnify-close"
                    size={32}
                    color={customTheme.colors.onSurfaceVariant}
                  />
                  <Text style={sfStyles.emptySearchText}>
                    Nenhum resultado para "{search}"
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      </Modal>
    </>
  );
}

const sfStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: customTheme.colors.outline,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: customTheme.colors.surface,
    gap: 10,
    minHeight: 52,
  },
  triggerError: {borderColor: customTheme.colors.error},
  triggerDisabled: {
    backgroundColor: customTheme.colors.surfaceVariant,
    opacity: 0.6,
  },
  leftIcon: {flexShrink: 0},
  triggerText: {
    flex: 1,
    fontSize: 15,
    color: customTheme.colors.onSurface,
    fontWeight: '500',
  },
  triggerPlaceholder: {
    color: customTheme.colors.onSurfaceVariant,
    fontWeight: '400',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: customTheme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '65%',
    paddingBottom: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: customTheme.colors.onSurfaceVariant,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12,
    opacity: 0.4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: customTheme.colors.surfaceVariant,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: customTheme.colors.onSurface,
    padding: 0,
  },
  listContent: {paddingHorizontal: 8, paddingBottom: 8},
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginVertical: 1,
  },
  optionSelected: {
    backgroundColor: withAlpha(customTheme.colors.primary, 0.08),
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: customTheme.colors.onSurface,
  },
  optionTextSelected: {
    color: customTheme.colors.primary,
    fontWeight: '600',
  },
  freeSoloOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: customTheme.colors.primaryContainer,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.outlineVariant,
  },
  freeSoloText: {
    fontSize: 14,
    color: customTheme.colors.onSurface,
    flex: 1,
  },
  freeSoloBold: {
    fontWeight: '700',
    color: customTheme.colors.primary,
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptySearchText: {
    fontSize: 14,
    color: customTheme.colors.onSurfaceVariant,
  },
});

// ── Main Component ────────────────────────────────────────────────────────────

export default function LavagemForm({
  navigation,
  route,
}: {
  navigation?: StackNavigationProp<RootStackParamList, 'LavagemForm'>;
  route?: RouteProp<RootStackParamList, 'LavagemForm'>;
}) {
  const {userInfo} = useUser();
  const {
    produtos: produtosEstoque,
    forceSync,
    marcarAgendamentoComoConcluido,
  } = useBackgroundSync();
  const {
    placa,
    lavagem,
    agendamentoId,
    mode = 'create',
    lavagemData,
  } = route?.params || {};

  // ── Form fields ─────────────────────────────────────────────────────────────
  const [responsavel, setResponsavel] = useState(userInfo?.user || '');
  const [dataEHora, setDataEHora] = useState(new Date());
  const [veiculo, setVeiculo] = useState(placa || '');
  const [tipoVeiculo, setTipoVeiculo] = useState('veiculo');
  const [numeroEquipamento, setNumeroEquipamento] = useState('');
  const [showEquipmentNumber, setShowEquipmentNumber] = useState(false);
  const [tipoLavagem, setTipoLavagem] = useState(lavagem || '');
  const [produtosSelecionados, setProdutosSelecionados] = useState<ProdutoEstoque[]>([]);
  const [fotosAntes, setFotosAntes] = useState<FotoItem[]>([]);
  const [fotosDepois, setFotosDepois] = useState<FotoItem[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [observacoes, setObservacoes] = useState('');

  // ── UI state ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [responsaveisOptions, setResponsaveisOptions] = useState<
    {label: string; value: string}[]
  >([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProdutoEstoque | undefined>();
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  const [fullscreenPhotoUri, setFullscreenPhotoUri] = useState<string | null>(null);

  // ── Vehicle list ─────────────────────────────────────────────────────────────
  const allVeiculoItems = [
    ...PLACAS_VEICULOS.map(item => ({
      label: `${item.value} — Veículo`,
      value: item.value,
      tipo: 'veiculo',
    })),
    ...EQUIPAMENTOS.map(item => ({
      label: `${item.value} — Equipamento`,
      value: item.value,
      tipo: 'equipamento',
    })),
  ];

  // ── Remote data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    ecoApi
      .list('RespLavagens')
      .then(data => {
        const fromApi = data
          .filter((item: any) => !!item.value)
          .map((item: any) => ({label: item.value, value: item.value}));

        // Garante que o usuário logado aparece como primeira opção
        const nomeUsuario = userInfo?.user;
        if (nomeUsuario) {
          const jaExiste = fromApi.some(
            (o: {value: string}) => o.value === nomeUsuario,
          );
          if (!jaExiste) {
            fromApi.unshift({label: nomeUsuario, value: nomeUsuario});
          } else {
            // Move para o topo
            const idx = fromApi.findIndex(
              (o: {value: string}) => o.value === nomeUsuario,
            );
            fromApi.unshift(fromApi.splice(idx, 1)[0]);
          }
        }

        setResponsaveisOptions(fromApi);
      })
      .catch(err => {
        console.error('[RespLavagens] erro:', err);
      });
  }, [userInfo]);

  // Pré-selecionar responsável com o usuário logado no modo create
  useEffect(() => {
    if (mode === 'create' && userInfo?.user) {
      setResponsavel(userInfo.user);
    }
  }, [userInfo?.user, mode]);

  useEffect(() => {
    ecoApi
      .list('checklistLavagem')
      .then(data => {
        const items: ChecklistItem[] = data
          .filter((item: any) => item.ativo !== false)
          .map((item: any) => ({
            id: item._id ?? item.id ?? String(Math.random()),
            label: item.label || item.nome || item.descricao || '',
            checked: false,
          }));
        setChecklist(items);
      })
      .catch(() => {});
  }, []);

  // ── Initialize (edit mode) ───────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        if (mode === 'edit' && lavagemData) {
          setResponsavel(lavagemData.responsavel || '');
          setObservacoes(lavagemData.observacoes || '');
          setTipoLavagem(lavagemData.tipoLavagem || '');

          const rawData = lavagemData.data;
          const parsedDate =
            rawData instanceof Date
              ? rawData
              : typeof rawData === 'string'
              ? new Date(rawData)
              : new Date();
          setDataEHora(isNaN(parsedDate.getTime()) ? new Date() : parsedDate);

          const vValue =
            lavagemData.veiculo?.placa || lavagemData.placaVeiculo || '';
          setVeiculo(vValue);
          const vTipo = lavagemData.veiculo?.tipo || 'veiculo';
          setTipoVeiculo(vTipo);
          setNumeroEquipamento(lavagemData.veiculo?.numeroEquipamento || '');
          setShowEquipmentNumber(vTipo === 'equipamento');

          setProdutosSelecionados(
            (lavagemData.produtos || []).map((p: any) => ({
              nome: p.nome || p.produto || '',
              quantidade: String(p.quantidade ?? '1'),
              quantidadeMinima: '0',
              unidadeMedida: p.unidadeMedida || 'litro',
              photoUrl: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })),
          );

          // Fotos: suporte ao formato antigo (fotos[]) e novo (fotosAntes / fotosDepois)
          const mapFotos = (arr: any[]): FotoItem[] =>
            arr.map((f: any) => ({
              uri: f.url || f.uri || '',
              id: f.id || String(Date.now() + Math.random()),
            }));

          if (lavagemData.fotosAntes?.length) {
            setFotosAntes(mapFotos(lavagemData.fotosAntes));
          } else if (lavagemData.fotos?.length) {
            setFotosAntes(mapFotos(lavagemData.fotos));
          }

          if (lavagemData.fotosDepois?.length) {
            setFotosDepois(mapFotos(lavagemData.fotosDepois));
          }

          // Checklist: aplica check state salvo anteriormente
          if (lavagemData.checklist?.length) {
            const savedMap: Record<string, boolean> = {};
            lavagemData.checklist.forEach(
              (item: any) => (savedMap[item.id] = !!item.checked),
            );
            setChecklist(prev =>
              prev.map(item => ({
                ...item,
                checked: savedMap[item.id] ?? item.checked,
              })),
            );
          }
        } else {
          if (placa) {
            setVeiculo(placa);
            const tipo = detectTipoVeiculo(placa.toUpperCase());
            setTipoVeiculo(tipo);
            setShowEquipmentNumber(tipo === 'equipamento');
          }
          if (lavagem) setTipoLavagem(lavagem);
        }
      } catch {
        showGlobalToast('error', 'Erro', 'Erro ao carregar o formulário', 3000);
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const detectTipoVeiculo = (value: string): string => {
    const rgxAntiga = /^[A-Z]{3}-?\d{4}$/;
    const rgxMercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/;
    if (rgxAntiga.test(value) || rgxMercosul.test(value)) return 'veiculo';
    return 'outros';
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!responsavel) e.responsavel = 'Informe o responsável';
    if (!veiculo) e.veiculo = 'Selecione um veículo ou equipamento';
    if (showEquipmentNumber && !numeroEquipamento)
      e.numeroEquipamento = 'Informe o número do equipamento';
    if (!tipoLavagem) e.tipoLavagem = 'Selecione o tipo de lavagem';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Camera / Gallery ─────────────────────────────────────────────────────────
  const checkCameraPermission = async (): Promise<boolean> => {
    const permission = Platform.select({
      android: PERMISSIONS.ANDROID.CAMERA,
      ios: PERMISSIONS.IOS.CAMERA,
    });
    if (!permission) return false;
    const result = await check(permission);
    if (result === RESULTS.GRANTED) return true;
    if (result === RESULTS.DENIED) {
      const r = await request(permission);
      return r === RESULTS.GRANTED;
    }
    Alert.alert(
      'Permissão Necessária',
      'Permita o acesso à câmera nas configurações do aplicativo.',
      [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Configurações', onPress: () => Linking.openSettings()},
      ],
    );
    return false;
  };

  const addPhoto = (tipo: 'antes' | 'depois') => {
    const setter =
      tipo === 'antes'
        ? (f: FotoItem) => setFotosAntes(p => [...p, f])
        : (f: FotoItem) => setFotosDepois(p => [...p, f]);
    const setterMulti =
      tipo === 'antes'
        ? (fs: FotoItem[]) => setFotosAntes(p => [...p, ...fs])
        : (fs: FotoItem[]) => setFotosDepois(p => [...p, ...fs]);

    Alert.alert('Adicionar Foto', 'Escolha a origem:', [
      {
        text: 'Câmera',
        onPress: async () => {
          const ok = await checkCameraPermission();
          if (!ok) return;
          launchCamera({mediaType: 'photo', saveToPhotos: true, quality: 1}, res => {
            if (!res.didCancel && !res.errorCode && res.assets?.[0]?.uri) {
              setter({uri: res.assets[0].uri!, id: String(Date.now())});
            }
          });
        },
      },
      {
        text: 'Galeria',
        onPress: () => {
          launchImageLibrary(
            {mediaType: 'photo', quality: 1, selectionLimit: 10},
            res => {
              if (!res.didCancel && !res.errorCode && res.assets) {
                setterMulti(
                  res.assets.map(a => ({
                    uri: a.uri!,
                    id: String(Date.now() + Math.random()),
                  })),
                );
              }
            },
          );
        },
      },
      {text: 'Cancelar', style: 'cancel'},
    ]);
  };

  const deletePhoto = (id: string, tipo: 'antes' | 'depois') => {
    if (tipo === 'antes') setFotosAntes(p => p.filter(f => f.id !== id));
    else setFotosDepois(p => p.filter(f => f.id !== id));
  };

  // ── Product handlers ─────────────────────────────────────────────────────────
  const handleAddProduct = (produto: ProdutoEstoque) => {
    if (editingProductIndex !== null) {
      setProdutosSelecionados(prev => {
        const next = [...prev];
        next[editingProductIndex] = produto;
        return next;
      });
    } else {
      setProdutosSelecionados(prev => [...prev, produto]);
    }
    setEditingProduct(undefined);
    setEditingProductIndex(null);
  };

  const handleEditProduct = (index: number) => {
    setEditingProduct(produtosSelecionados[index]);
    setEditingProductIndex(index);
    setProductModalVisible(true);
  };

  const handleRemoveProduct = (index: number) =>
    setProdutosSelecionados(prev => prev.filter((_, i) => i !== index));

  // ── Upload ────────────────────────────────────────────────────────────────────
  const uploadFotos = async (fotos: FotoItem[], folder: string) =>
    Promise.all(
      fotos.map(async f => {
        if (f.uri.startsWith('http')) return {url: f.uri, path: '', id: f.id};
        const res = await ecoStorage.upload({
          uri: f.uri,
          type: 'image/jpeg',
          name: `${folder}_${Date.now()}_${Math.random()
            .toString(36)
            .substring(7)}.jpg`,
        });
        return {url: res.url, path: res.filename, id: f.id};
      }),
    );

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (isSaving) return;
    if (!validate()) {
      showGlobalToast(
        'error',
        'Campos obrigatórios',
        'Preencha todos os campos obrigatórios',
        4000,
      );
      return;
    }

    setIsSaving(true);
    showGlobalToast('info', 'Aguarde', 'Salvando lavagem...', 15000);

    try {
      const hasNewFotos =
        [...fotosAntes, ...fotosDepois].some(f => !f.uri.startsWith('http'));
      if (hasNewFotos) {
        showGlobalToast('info', 'Aguarde', 'Fazendo upload das fotos...', 20000);
      }

      const [uploadedAntes, uploadedDepois] = await Promise.all([
        uploadFotos(fotosAntes, 'antes'),
        uploadFotos(fotosDepois, 'depois'),
      ]);

      // Atualizar estoque dos produtos
      for (const prod of produtosSelecionados) {
        const estoque = produtosEstoque.find(p => p.nome === prod.nome);
        if (estoque && userInfo?.cargo?.toLowerCase() !== 'administrador') {
          const nova =
            parseInt(estoque.quantidade) - parseInt(prod.quantidade);
          if (nova < 0) {
            throw new Error(`Quantidade insuficiente: ${estoque.nome}`);
          }
          if (estoque.id) {
            await ecoApi.update('produtos', estoque.id, {
              quantidade: nova.toString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
      await forceSync('produtos');

      const now = new Date().toISOString();
      const record = {
        responsavel,
        data: dataEHora.toISOString(),
        veiculo: {
          placa: veiculo,
          tipo: tipoVeiculo,
          numeroEquipamento:
            tipoVeiculo === 'equipamento' ? numeroEquipamento : null,
        },
        tipoLavagem,
        produtos: produtosSelecionados.map(p => ({
          nome: p.nome,
          quantidade: parseInt(p.quantidade),
        })),
        fotosAntes: uploadedAntes,
        fotosDepois: uploadedDepois,
        checklist: checklist.map(i => ({
          id: i.id,
          label: i.label,
          checked: i.checked,
        })),
        observacoes,
        status: 'concluido',
        updatedAt: now,
        createdAt: now,
        createdBy: userInfo?.id || null,
        agendamentoId: agendamentoId || null,
      };

      if (mode === 'edit' && lavagemData?.id) {
        await ecoApi.update('registroLavagens', lavagemData.id, record);
        showGlobalToast('success', 'Sucesso', 'Lavagem atualizada com sucesso', 4000);
      } else {
        await ecoApi.create('registroLavagens', record);
        if (agendamentoId && marcarAgendamentoComoConcluido) {
          await marcarAgendamentoComoConcluido(agendamentoId);
        }
        showGlobalToast('success', 'Sucesso', 'Lavagem registrada com sucesso', 4000);
      }

      navigation?.goBack();
    } catch (err: any) {
      showGlobalToast(
        'error',
        'Erro',
        err.message || 'Não foi possível finalizar a lavagem',
        4000,
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ModernHeader
          title={mode === 'edit' ? 'Editar Lavagem' : 'Nova Lavagem'}
          iconName="car-wash"
          onBackPress={() => navigation?.goBack()}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={customTheme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const checklistConcluidos = checklist.filter(i => i.checked).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ModernHeader
        title={mode === 'edit' ? 'Editar Lavagem' : 'Nova Lavagem'}
        iconName="car-wash"
        onBackPress={() => navigation?.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">

        {/* ── Informações Gerais ──────────────────────────────────────────── */}
        <SectionCard title="Informações Gerais" icon="information">
          <Text style={styles.fieldLabel}>Responsável *</Text>
          <SelectField
            placeholder="Selecione o responsável"
            value={responsavel}
            options={responsaveisOptions}
            onChange={item => {
              setResponsavel(item.value);
              setErrors(e => ({...e, responsavel: ''}));
            }}
            leftIcon="account"
            searchable
            freeSolo
            error={!!errors.responsavel}
          />
          {errors.responsavel ? (
            <Text style={styles.errorText}>{errors.responsavel}</Text>
          ) : null}

          <Text style={[styles.fieldLabel, {marginTop: 16}]}>Data e Hora *</Text>
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}>
            <Icon
              name="calendar-clock"
              size={20}
              color={customTheme.colors.primary}
            />
            <Text style={styles.dateText}>{formatDateTime(dataEHora)}</Text>
            <Icon
              name="chevron-right"
              size={20}
              color={customTheme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dataEHora}
              mode="date"
              display="default"
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) {
                  const d = new Date(date);
                  d.setHours(dataEHora.getHours(), dataEHora.getMinutes());
                  setDataEHora(d);
                  setShowTimePicker(true);
                }
              }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={dataEHora}
              mode="time"
              display="default"
              onChange={(_, date) => {
                setShowTimePicker(false);
                if (date) {
                  const d = new Date(dataEHora);
                  d.setHours(date.getHours(), date.getMinutes());
                  setDataEHora(d);
                }
              }}
            />
          )}
        </SectionCard>

        {/* ── Veículo / Equipamento ───────────────────────────────────────── */}
        <SectionCard title="Veículo / Equipamento" icon="car">
          <Text style={styles.fieldLabel}>Placa ou Equipamento *</Text>
          <SelectField
            placeholder="Selecione o veículo ou equipamento"
            value={veiculo}
            options={allVeiculoItems}
            onChange={item => {
              setVeiculo(item.value);
              setTipoVeiculo(item.tipo);
              setShowEquipmentNumber(item.tipo === 'equipamento');
              setErrors(e => ({...e, veiculo: ''}));
            }}
            leftIcon={tipoVeiculo === 'equipamento' ? 'wrench' : 'car'}
            searchable
            freeSolo
            disabled={!!placa}
            error={!!errors.veiculo}
          />
          {errors.veiculo ? (
            <Text style={styles.errorText}>{errors.veiculo}</Text>
          ) : null}

          {showEquipmentNumber && (
            <>
              <Text style={[styles.fieldLabel, {marginTop: 16}]}>
                Número do Equipamento *
              </Text>
              <PaperInput
                mode="outlined"
                label="Nº Equipamento"
                value={numeroEquipamento}
                onChangeText={t => {
                  setNumeroEquipamento(t);
                  setErrors(e => ({...e, numeroEquipamento: ''}));
                }}
                keyboardType="numeric"
                style={styles.textInput}
                error={!!errors.numeroEquipamento}
              />
              {errors.numeroEquipamento ? (
                <Text style={styles.errorText}>{errors.numeroEquipamento}</Text>
              ) : null}
            </>
          )}
        </SectionCard>

        {/* ── Tipo de Lavagem ─────────────────────────────────────────────── */}
        <SectionCard title="Tipo de Lavagem" icon="car-wash">
          <SelectField
            placeholder="Selecione o tipo de lavagem"
            value={tipoLavagem}
            options={TIPOS_LAVAGEM}
            onChange={item => {
              setTipoLavagem(item.value);
              setErrors(e => ({...e, tipoLavagem: ''}));
            }}
            leftIcon="car-wash"
            disabled={!!lavagem}
            error={!!errors.tipoLavagem}
          />
          {errors.tipoLavagem ? (
            <Text style={styles.errorText}>{errors.tipoLavagem}</Text>
          ) : null}
        </SectionCard>

        {/* ── Produtos Utilizados ─────────────────────────────────────────── */}
        <SectionCard
          title="Produtos Utilizados"
          icon="package-variant"
          badge={
            produtosSelecionados.length > 0
              ? String(produtosSelecionados.length)
              : undefined
          }>
          {produtosSelecionados.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum produto adicionado</Text>
          ) : (
            produtosSelecionados.map((p, idx) => (
              <View key={idx} style={styles.productRow}>
                <View style={styles.productIconBox}>
                  <Icon
                    name="package-variant"
                    size={16}
                    color={customTheme.colors.primary}
                  />
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productNome}>{p.nome}</Text>
                  <Text style={styles.productQtd}>
                    {p.quantidade} {p.unidadeMedida}
                  </Text>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    onPress={() => handleEditProduct(idx)}
                    hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
                    <Icon
                      name="pencil-outline"
                      size={18}
                      color={customTheme.colors.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemoveProduct(idx)}
                    hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
                    <Icon
                      name="trash-can-outline"
                      size={18}
                      color={customTheme.colors.error}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setEditingProduct(undefined);
              setEditingProductIndex(null);
              setProductModalVisible(true);
            }}
            activeOpacity={0.7}>
            <Icon
              name="plus-circle-outline"
              size={18}
              color={customTheme.colors.primary}
            />
            <Text style={styles.addBtnText}>Adicionar produto</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ── Fotos — Antes ───────────────────────────────────────────────── */}
        <SectionCard
          title="Fotos — Antes da Lavagem"
          icon="camera-front"
          accentColor="#FF9800"
          badge={fotosAntes.length > 0 ? String(fotosAntes.length) : undefined}>
          {fotosAntes.length === 0 && (
            <Text style={styles.emptyText}>
              Registre fotos antes de iniciar a lavagem
            </Text>
          )}
          <PhotoGrid
            photos={fotosAntes}
            onAdd={() => addPhoto('antes')}
            onDelete={id => deletePhoto(id, 'antes')}
            onView={uri => setFullscreenPhotoUri(uri)}
          />
        </SectionCard>

        {/* ── Checklist ───────────────────────────────────────────────────── */}
        <SectionCard
          title="Checklist de Atividades"
          icon="checkbox-marked-outline"
          accentColor="#4CAF50"
          badge={
            checklist.length > 0
              ? `${checklistConcluidos}/${checklist.length}`
              : undefined
          }>
          {checklist.length === 0 ? (
            <View style={styles.checklistEmpty}>
              <Icon
                name="clipboard-text-outline"
                size={36}
                color={customTheme.colors.onSurfaceVariant}
              />
              <Text style={styles.emptyText}>
                Nenhum item configurado
              </Text>
              <Text style={styles.emptySubText}>
                Configure os itens no painel web
              </Text>
            </View>
          ) : (
            checklist.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.checklistItem,
                  idx === checklist.length - 1 && {borderBottomWidth: 0},
                ]}
                onPress={() =>
                  setChecklist(prev =>
                    prev.map(i =>
                      i.id === item.id ? {...i, checked: !i.checked} : i,
                    ),
                  )
                }
                activeOpacity={0.7}>
                <View
                  style={[
                    styles.checkBox,
                    item.checked && styles.checkBoxChecked,
                  ]}>
                  {item.checked && (
                    <Icon
                      name="check"
                      size={14}
                      color={customTheme.colors.onPrimary}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.checklistLabel,
                    item.checked && styles.checklistLabelChecked,
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </SectionCard>

        {/* ── Fotos — Depois ──────────────────────────────────────────────── */}
        <SectionCard
          title="Fotos — Depois da Lavagem"
          icon="camera-rear"
          accentColor="#2196F3"
          badge={fotosDepois.length > 0 ? String(fotosDepois.length) : undefined}>
          {fotosDepois.length === 0 && (
            <Text style={styles.emptyText}>
              Registre fotos após concluir a lavagem
            </Text>
          )}
          <PhotoGrid
            photos={fotosDepois}
            onAdd={() => addPhoto('depois')}
            onDelete={id => deletePhoto(id, 'depois')}
            onView={uri => setFullscreenPhotoUri(uri)}
          />
        </SectionCard>

        {/* ── Observações ─────────────────────────────────────────────────── */}
        <SectionCard title="Observações" icon="note-text">
          <PaperInput
            mode="outlined"
            label="Observações (opcional)"
            value={observacoes}
            onChangeText={setObservacoes}
            multiline
            numberOfLines={4}
            style={styles.textInput}
          />
        </SectionCard>

        {/* ── Botão Salvar ─────────────────────────────────────────────────── */}
        <View style={styles.saveRow}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving}
            style={styles.saveBtn}
            contentStyle={styles.saveBtnContent}
            icon="content-save">
            {mode === 'edit' ? 'Atualizar Lavagem' : 'Registrar Lavagem'}
          </Button>
        </View>
      </ScrollView>

      {/* ── Modal: Produto ──────────────────────────────────────────────────── */}
      <ProductSelectionModal
        visible={productModalVisible}
        onClose={() => {
          setProductModalVisible(false);
          setEditingProduct(undefined);
          setEditingProductIndex(null);
        }}
        onConfirm={handleAddProduct}
        availableProducts={produtosEstoque}
        selectedProducts={produtosSelecionados}
        initialProduct={editingProduct}
      />

      {/* ── Modal: Foto em tela cheia ───────────────────────────────────────── */}
      {fullscreenPhotoUri && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setFullscreenPhotoUri(null)}>
          <TouchableOpacity
            style={styles.fullscreenOverlay}
            activeOpacity={1}
            onPress={() => setFullscreenPhotoUri(null)}>
            <Image
              source={{uri: fullscreenPhotoUri}}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.fullscreenClose}
              onPress={() => setFullscreenPhotoUri(null)}>
              <Icon name="close" size={28} color="white" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: customTheme.colors.background},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  scroll: {flex: 1},
  scrollContent: {paddingTop: 12, paddingBottom: 36},

  // Section Card
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: customTheme.colors.surfaceVariant,
    overflow: 'hidden',
    elevation: 2,
    backgroundColor: customTheme.colors.surface,
  },
  sectionAccentBar: {height: 4},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: customTheme.colors.onSurface,
    flex: 1,
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {fontSize: 12, fontWeight: '700'},
  sectionContent: {paddingHorizontal: 16, paddingBottom: 16},

  // Fields
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: customTheme.colors.onSurfaceVariant,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  errorText: {fontSize: 12, color: customTheme.colors.error, marginTop: 4},
  textInput: {backgroundColor: customTheme.colors.surface, marginTop: 4},

  // Date Row
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: customTheme.colors.outline,
    borderRadius: 8,
    padding: 14,
    gap: 10,
    backgroundColor: customTheme.colors.surface,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: customTheme.colors.onSurface,
    fontWeight: '500',
  },


  // Products
  emptyText: {
    fontSize: 13,
    color: customTheme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 12,
    color: customTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 2,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.surfaceVariant,
    gap: 10,
  },
  productIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: withAlpha(customTheme.colors.primary, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {flex: 1},
  productNome: {
    fontSize: 14,
    fontWeight: '600',
    color: customTheme.colors.onSurface,
  },
  productQtd: {
    fontSize: 12,
    color: customTheme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  productActions: {flexDirection: 'row', gap: 16},
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  addBtnText: {
    fontSize: 14,
    color: customTheme.colors.primary,
    fontWeight: '500',
  },

  // Photos
  photoGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4},
  photoThumbWrap: {position: 'relative', width: 90, height: 90},
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: customTheme.colors.surfaceVariant,
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: customTheme.colors.surface,
    borderRadius: 12,
  },
  photoAddBtn: {
    width: 90,
    height: 90,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: customTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: withAlpha(customTheme.colors.primary, 0.05),
  },
  photoAddText: {
    fontSize: 11,
    color: customTheme.colors.primary,
    fontWeight: '600',
  },

  // Checklist
  checklistEmpty: {alignItems: 'center', paddingVertical: 8, gap: 6},
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.surfaceVariant,
    gap: 12,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: customTheme.colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxChecked: {
    backgroundColor: customTheme.colors.primary,
    borderColor: customTheme.colors.primary,
  },
  checklistLabel: {flex: 1, fontSize: 14, color: customTheme.colors.onSurface},
  checklistLabelChecked: {
    color: customTheme.colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },

  // Save Button
  saveRow: {marginHorizontal: 16, marginTop: 8},
  saveBtn: {borderRadius: 10},
  saveBtnContent: {paddingVertical: 6},

  // Fullscreen Photo
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {width: '100%', height: '80%'},
  fullscreenClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
  },
});
