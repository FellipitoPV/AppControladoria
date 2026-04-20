import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  BackHandler,
  InteractionManager,
  Image,
} from 'react-native';
import {
  Surface,
  Text,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ecoApi, ecoStorage} from '../../../api/ecoApi';
import NetInfo from '@react-native-community/netinfo';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import ModernHeader from '../../../assets/components/ModernHeader';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {customTheme} from '../../../theme/theme';
import {useUser} from '../../../contexts/userContext';

type ConformityStatus = 'C' | 'NC' | 'NA' | '';
type ChecklistResponseMode = 'conformidade' | 'conceito_iqpi';
type IQPIConcept = '' | 'insatisfatorio' | 'fraco' | 'regular' | 'bom' | 'muito_bom' | 'excelente' | 'na';

interface Question {
  id: string;
  label: string;
  quantidade?: string;
  sectionTitle?: string; // Título da seção (ex: "Documentos Legais", "Gestão de SSO")
  subsectionTitle?: string;
  peso?: 1 | 2 | 3;
}

interface IQPIItemData {
  conceito: IQPIConcept;
  descricaoDesvio: string;
  peso?: 1 | 2 | 3;
}

interface NCProofData {
  photos?: string[];
  description?: string;
}

interface PeriodData {
  items: Record<string, ConformityStatus>;
  iqpiItems?: Record<string, IQPIItemData>;
  observacoes: string;
  ncProofs?: Record<string, NCProofData>;
}

interface FormData {
  periods: Record<number, PeriodData>;
}

interface YearWeek {
  weekNumber: number;
  month: number;
  startDay: number;
  endDay: number;
  fullStartDay: number;
  fullEndDay: number;
  startDate: Date;
  endDate: Date;
}

export default function ChecklistFormScreen({route, navigation}: any) {
  const {
    checklistId,
    checklistTitle,
    checklistIcon,
    checklistFrequency,
    checklistResponseMode = 'conformidade',
    location,
    selectedMonth,
  } = route.params;
  const {userInfo} = useUser();

  const isWeekly = checklistFrequency === 'Semanal';
  const isIQPI = checklistResponseMode === 'conceito_iqpi';
  const selectedMonthDate = new Date(selectedMonth);
  const year = selectedMonthDate.getFullYear();
  const currentMonth = selectedMonthDate.getMonth() + 1; // Mês fixo vindo da tela anterior

  const [selectedPeriod, setSelectedPeriod] = useState(isWeekly ? 1 : currentMonth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [yearWeeks, setYearWeeks] = useState<YearWeek[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Estados para comprovação de NC
  const [requiresProofOnNC, setRequiresProofOnNC] = useState<'none' | 'photo' | 'description' | 'both'>('none');
  const [ncProofs, setNcProofs] = useState<Record<number, Record<string, NCProofData>>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);

  const maxPeriods = isWeekly ? 52 : 12;

  const [formData, setFormData] = useState<FormData>({
    periods: {},
  });

  const PESO_INFO: Record<1 | 2 | 3, {titulo: string; descricao: string; exemplos: string[]}> = {
    1: {
      titulo: 'Severidade Baixa',
      descricao:
        'Violação de regra com potencial para causar acidente de baixa consequência. Exposição a risco de acidente com lesão leve.',
      exemplos: [
        'Reação para corrigir uso de EPI',
        'Ausência de uso de colete salva-vidas no pier flutuante',
        'Circulação de pedestres fora da faixa verde sem EPI',
        'Uso de celular em local indevido sem operações próximas',
        'Veículos acima da velocidade permitida em locais sem risco de atingimento de pessoas',
      ],
    },
    2: {
      titulo: 'Severidade Moderada',
      descricao:
        'Violação de regra com potencial para causar acidente de moderada consequência. Exposição a risco de acidente com lesão moderada.',
      exemplos: [
        'EPI incompleto',
        'Ausência de uso de cinto de segurança em empilhadeiras',
        'Colocação das mãos em cargas durante operações de içamento',
        'Caminhar sobre tubos na primeira fiada',
      ],
    },
    3: {
      titulo: 'Severidade Alta',
      descricao:
        'Violação de regra com potencial para causar acidente de grave consequência. Exposição a risco de acidente com lesão grave, incapacidade permanente ou fatalidade.',
      exemplos: [
        'Funcionário sem EPI',
        'Ausência de uso de cinto de segurança acima de 2m e sem proteção por barreiras',
        'Uso de celular próximo a movimentação de carga ou carga suspensa',
        'Passagem ou permanência sob carga suspensa',
        'Atividades de alto risco sem PT/PET',
        'Caminhar sobre tubos a mais de 1m do piso',
      ],
    },
  };

  const IQPI_CONCEPT_OPTIONS: Array<{value: IQPIConcept; label: string; color: string}> = [
    {value: 'insatisfatorio', label: 'Insatisfatório', color: '#D32F2F'},
    {value: 'fraco', label: 'Fraco', color: '#F44336'},
    {value: 'regular', label: 'Regular', color: '#F57C00'},
    {value: 'bom', label: 'Bom', color: '#1976D2'},
    {value: 'muito_bom', label: 'Muito Bom', color: '#2E7D32'},
    {value: 'excelente', label: 'Excelente', color: '#1B5E20'},
    {value: 'na', label: 'N/A', color: '#757575'},
  ];

  const handleShowPesoInfo = (peso?: 1 | 2 | 3) => {
    if (!peso) return;
    const info = PESO_INFO[peso];
    Alert.alert(
      `Peso ${peso} - ${info.titulo}`,
      `${info.descricao}\n\nExemplos:\n${info.exemplos.map(example => `- ${example}`).join('\n')}`,
    );
  };

  const initialFormData = useRef<FormData>({periods: {}});
  const hasUnsavedChanges = useRef(false);
  const firebaseListenerRef = useRef<any>(null);
  const yearDocMongoId = useRef<string | null>(null);
  const listRef = useRef<FlatList<Question> | null>(null);

  // Gerar semanas do ano (igual ao web)
  const getYearWeeks = (year: number): YearWeek[] => {
    const weeks: YearWeek[] = [];
    let weekNumber = 1;
    let currentDate = new Date(year, 0, 1);

    const firstDayOfWeek = currentDate.getDay();
    if (firstDayOfWeek !== 0) {
      currentDate.setDate(currentDate.getDate() - firstDayOfWeek);
    }

    while (currentDate.getFullYear() <= year) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const daysPerMonth: Record<string, number> = {};

      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(currentDate);
        checkDate.setDate(checkDate.getDate() + i);
        const checkYear = checkDate.getFullYear();
        const checkMonth = checkDate.getMonth() + 1;
        const key = `${checkYear}-${checkMonth}`;
        daysPerMonth[key] = (daysPerMonth[key] || 0) + 1;
      }

      let primaryKey = '';
      let maxDays = 0;

      Object.entries(daysPerMonth).forEach(([key, days]) => {
        if (days > maxDays) {
          maxDays = days;
          primaryKey = key;
        }
      });

      if (primaryKey) {
        const [yearStr, monthStr] = primaryKey.split('-');
        const primaryYear = parseInt(yearStr);
        const primaryMonth = parseInt(monthStr);

        if (primaryYear === year) {
          let startDay = 0;
          let endDay = 0;

          for (let i = 0; i < 7; i++) {
            const checkDate = new Date(currentDate);
            checkDate.setDate(checkDate.getDate() + i);

            if (
              checkDate.getFullYear() === year &&
              checkDate.getMonth() + 1 === primaryMonth
            ) {
              const day = checkDate.getDate();
              if (startDay === 0) startDay = day;
              endDay = day;
            }
          }

          const fullStartDay = weekStart.getDate();
          const fullEndDay = weekEnd.getDate();

          weeks.push({
            weekNumber,
            month: primaryMonth,
            startDay,
            endDay,
            fullStartDay,
            fullEndDay,
            startDate: new Date(weekStart),
            endDate: new Date(weekEnd),
          });
        }
      }

      weekNumber++;
      currentDate.setDate(currentDate.getDate() + 7);

      if (currentDate.getFullYear() > year && currentDate.getMonth() > 0) {
        break;
      }
    }

    return weeks;
  };

  // Monitorar conectividade
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Aguarda a animação de navegação terminar antes de carregar dados
    const interactionPromise = InteractionManager.runAfterInteractions(() => {
      const init = async () => {
        if (isWeekly) {
          const weeks = getYearWeeks(year);
          setYearWeeks(weeks);

          const firstWeekOfMonth = weeks.find(w => w.month === currentMonth);
          if (firstWeekOfMonth) {
            setSelectedPeriod(firstWeekOfMonth.weekNumber);
          }
        }

        await loadQuestions();
        await setupRealtimeListener();
      };

      init();
    });

    return () => {
      interactionPromise.cancel();
    };
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );
    return () => backHandler.remove();
  }, []);

  // Carregar perguntas e configuração do checklist
  const loadQuestions = async () => {
    try {
      // Verifica se a location tem questões personalizadas
      if (location.useCustomQuestions && location.questions?.length > 0) {
        console.log('Usando questões personalizadas da location');
        setQuestions(location.questions);
        await loadProofConfig();
        return;
      }

      const cacheKey = `@checklist_questions_${checklistId}`;

      try {
        const results = await ecoApi.list('checklists-config');
        const checklistData = results.find((item: any) => item.id === checklistId);

        if (checklistData) {
          const questionsData = checklistData.questions || [];
          setQuestions(questionsData);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(questionsData));
          applyProofConfig(checklistData);
        } else {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) setQuestions(JSON.parse(cached));
          await loadProofConfig();
        }
      } catch (error) {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) setQuestions(JSON.parse(cached));
        await loadProofConfig();
      }
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error);
    }
  };

  const applyProofConfig = (checklistData: any) => {
    let proofConfig: 'none' | 'photo' | 'description' | 'both' = 'none';

    if (checklistData.requiresProofOnNC && checklistData.requiresProofOnNC !== 'none') {
      proofConfig = checklistData.requiresProofOnNC;
    }

    if (checklistData.locations && location?.id) {
      const locationData = checklistData.locations.find((loc: any) => loc.id === location.id);
      if (locationData?.requiresProofOnNC && locationData.requiresProofOnNC !== '') {
        proofConfig = locationData.requiresProofOnNC;
      }
    }

    setRequiresProofOnNC(proofConfig);
    console.log('requiresProofOnNC:', proofConfig);
  };

  // Carregar configuração de comprovação de NC (fallback isolado)
  const loadProofConfig = async () => {
    try {
      const results = await ecoApi.list('checklists-config');
      const checklistData = results.find((item: any) => item.id === checklistId);
      if (checklistData) applyProofConfig(checklistData);
    } catch (error) {
      console.error('Erro ao carregar configuração de prova:', error);
    }
  };

  // Carregar dados salvos do checklist
  const setupRealtimeListener = async () => {
    const yearStr = year.toString();
    const cacheKey = `@checklist_cache_${yearStr}_${checklistId}_${location.id}`;

    // Carregar cache primeiro para resposta rápida
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        applyDataToForm(JSON.parse(cached));
      }
    } catch (e) {
      console.log('Sem cache disponível');
    }

    // Buscar da API — um documento por ano
    try {
      const results = await ecoApi.list('checklists');
      const yearDoc = results.find((d: any) => d._firebaseId === yearStr);

      if (yearDoc) {
        yearDocMongoId.current = yearDoc._id;
        const data = yearDoc[checklistId]?.[location.id] ?? null;
        if (data) {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
          if (!hasUnsavedChanges.current) {
            applyDataToForm(data);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  // Aplicar dados ao formulário
  const applyDataToForm = (data: any) => {
    if (data?.monthlyFormData) {
      const periods: Record<number, PeriodData> = {};
      const loadedNcProofs: Record<number, Record<string, NCProofData>> = {};

      Object.entries(data.monthlyFormData).forEach(
        ([period, periodData]: [string, any]) => {
          if (!periodData) return;
          periods[parseInt(period)] = {
            items: periodData.items || {},
            iqpiItems: periodData.iqpiItems || {},
            observacoes: periodData.observacoes || '',
          };

          if (periodData.ncProofs) {
            loadedNcProofs[parseInt(period)] = periodData.ncProofs;
          }
        },
      );

      setFormData({periods});
      setNcProofs(loadedNcProofs);
      initialFormData.current = {periods};
      hasUnsavedChanges.current = false;
    } else {
      setFormData({periods: {}});
      setNcProofs({});
    }
  };

  // Salvar checklist
  const handleSave = async () => {
    hasUnsavedChanges.current = false;
    setSaving(true);

    try {
      const yearStr = year.toString();
      const path = `checklists/${yearStr}/${checklistId}/${location.id}`;
      const cacheKey = `@checklist_cache_${yearStr}_${checklistId}_${location.id}`;

      const allPeriodsData: Record<number, any> = {};
      const periodStatus: Record<number, string> = {};

      for (let period = 1; period <= maxPeriods; period++) {
        const periodData = formData.periods[period] || {
          items: questions.reduce((acc, q) => ({...acc, [q.id]: ''}), {}),
          iqpiItems: {},
          observacoes: '',
        };

        const status = calculatePeriodStatus(periodData);
        const periodNcProofs = ncProofs[period] || {};

        allPeriodsData[period] = isIQPI
          ? {
              iqpiItems: periodData.iqpiItems || {},
              observacoes: periodData.observacoes,
              status,
              responsavel: userInfo?.user || 'Desconhecido',
            }
          : {
              items: periodData.items,
              observacoes: periodData.observacoes,
              status: status,
              responsavel: userInfo?.user || 'Desconhecido',
              ...(Object.keys(periodNcProofs).length > 0 && {ncProofs: periodNcProofs}),
            };

        periodStatus[period] = status;
      }

      const statuses = Object.values(periodStatus);
      const overallStatus = statuses.every(s => s === 'Concluído')
        ? 'Concluído'
        : statuses.some(s => s === 'Concluído com NC')
        ? 'Concluído com NC'
        : statuses.some(s => s !== 'Pendente')
        ? 'Em Andamento'
        : 'Pendente';

      const saveData = {
        status: overallStatus,
        lastUpdate: new Date().toISOString(),
        monthlyStatus: periodStatus,
        monthlyFormData: allPeriodsData,
        responsavel: userInfo?.user || 'Desconhecido',
      };

      // Sempre salvar no cache primeiro
      await AsyncStorage.setItem(cacheKey, JSON.stringify(saveData));

      // Verificar conectividade e salvar na API
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        const mongoId = yearDocMongoId.current;

        if (mongoId) {
          // Documento do ano já existe — fazer merge somente da location alterada
          const existing = await ecoApi.list('checklists');
          const yearDoc = existing.find((d: any) => d._id === mongoId);
          const updatedYearDoc = {
            _firebaseId: yearStr,
            ...(yearDoc || {}),
            [checklistId]: {
              ...(yearDoc?.[checklistId] || {}),
              [location.id]: saveData,
            },
          };
          await ecoApi.update('checklists', mongoId, updatedYearDoc);
        } else {
          // Primeiro save do ano — buscar doc existente ou criar
          const existing = await ecoApi.list('checklists');
          const yearDoc = existing.find((d: any) => d._firebaseId === yearStr);
          if (yearDoc) {
            yearDocMongoId.current = yearDoc._id;
            const updatedYearDoc = {
              ...yearDoc,
              [checklistId]: {
                ...(yearDoc[checklistId] || {}),
                [location.id]: saveData,
              },
            };
            await ecoApi.update('checklists', yearDoc._id, updatedYearDoc);
          } else {
            const result = await ecoApi.create('checklists', {
              _firebaseId: yearStr,
              [checklistId]: {[location.id]: saveData},
            });
            yearDocMongoId.current = result._id ?? result.id;
          }
        }
        console.log('Checklist salvo na API');
      } else {
        // Salvar na fila de pendentes para sincronizar depois
        const pendingKey = '@checklist_pending_saves';
        const pendingStr = await AsyncStorage.getItem(pendingKey);
        const pending = pendingStr ? JSON.parse(pendingStr) : [];
        pending.push({year: yearStr, checklistId, locationId: location.id, saveData, timestamp: Date.now()});
        await AsyncStorage.setItem(pendingKey, JSON.stringify(pending));
        console.log('Checklist salvo offline, aguardando sincronização');
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar checklist');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: ConformityStatus) => {
    switch (status) {
      case 'C':
        return '#4CAF50';
      case 'NC':
        return '#F44336';
      case 'NA':
        return '#9E9E9E';
      default:
        return '#E0E0E0';
    }
  };

  const calculatePeriodStatus = (
    periodData: PeriodData,
  ): 'Pendente' | 'Em Andamento' | 'Concluído' | 'Concluído com NC' => {
    if (isIQPI) {
      const iqpiItems = periodData.iqpiItems || {};
      const concepts = questions.map(question => iqpiItems[question.id]?.conceito || '');
      const filled = concepts.filter(Boolean).length;

      if (filled === 0) return 'Pendente';
      if (filled < questions.length) return 'Em Andamento';

      const hasDeviation = concepts.some(concept =>
        ['insatisfatorio', 'fraco', 'regular'].includes(concept),
      );

      return hasDeviation ? 'Concluído com NC' : 'Concluído';
    }

    const items = Object.values(periodData.items);
    if (items.length === 0) return 'Pendente';

    const totalItems = questions.length;
    const completedItems = items.filter(
      i => i === 'C' || i === 'NC' || i === 'NA',
    ).length;
    const hasNC = items.includes('NC');
    const hasC = items.includes('C');
    const emptyItems = items.filter(i => i === '').length;

    if (completedItems === totalItems) {
      if (hasNC) return 'Concluído com NC';
      if (hasC) return 'Concluído';
    }

    if (emptyItems < totalItems && emptyItems > 0) {
      return 'Em Andamento';
    }

    return 'Pendente';
  };

  const handleBackPress = () => {
    if (hasUnsavedChanges.current) {
      Alert.alert(
        'Alterações não salvas',
        'Deseja salvar as alterações antes de sair?',
        [
          {text: 'Cancelar', style: 'cancel'},
          {text: 'Sair sem salvar', onPress: () => navigation.goBack()},
          {text: 'Salvar', onPress: handleSave},
        ],
      );
      return true;
    }
    navigation.goBack();
    return true; // Retorna true para indicar que o evento foi tratado
  };

  const handleItemChange = (questionId: string, value: ConformityStatus) => {
    hasUnsavedChanges.current = true;
    setFormData(prev => {
      const currentPeriod = prev.periods[selectedPeriod] || {
        items: {},
        observacoes: '',
      };

      return {
        periods: {
          ...prev.periods,
          [selectedPeriod]: {
            ...currentPeriod,
            items: {
              ...currentPeriod.items,
              [questionId]: value,
            },
          },
        },
      };
    });
  };

  const handleIQPIConceptChange = (questionId: string, conceito: IQPIConcept) => {
    hasUnsavedChanges.current = true;
    const question = questions.find(item => item.id === questionId);
    setFormData(prev => {
      const currentPeriod = prev.periods[selectedPeriod] || {
        items: {},
        iqpiItems: {},
        observacoes: '',
      };

      return {
        periods: {
          ...prev.periods,
          [selectedPeriod]: {
            ...currentPeriod,
            iqpiItems: {
              ...(currentPeriod.iqpiItems || {}),
              [questionId]: {
                ...(currentPeriod.iqpiItems?.[questionId] || {
                  descricaoDesvio: '',
                  peso: question?.peso,
                }),
                conceito,
              },
            },
          },
        },
      };
    });
  };

  const handleIQPIDescricaoChange = (questionId: string, descricaoDesvio: string) => {
    hasUnsavedChanges.current = true;
    const question = questions.find(item => item.id === questionId);
    setFormData(prev => {
      const currentPeriod = prev.periods[selectedPeriod] || {
        items: {},
        iqpiItems: {},
        observacoes: '',
      };

      return {
        periods: {
          ...prev.periods,
          [selectedPeriod]: {
            ...currentPeriod,
            iqpiItems: {
              ...(currentPeriod.iqpiItems || {}),
              [questionId]: {
                ...(currentPeriod.iqpiItems?.[questionId] || {
                  conceito: '',
                  peso: question?.peso,
                }),
                descricaoDesvio,
              },
            },
          },
        },
      };
    });
  };

  const handleObservacoesChange = (text: string) => {
    hasUnsavedChanges.current = true;
    setFormData(prev => {
      const currentPeriod = prev.periods[selectedPeriod] || {
        items: {},
        observacoes: '',
      };

      return {
        periods: {
          ...prev.periods,
          [selectedPeriod]: {
            ...currentPeriod,
            observacoes: text,
          },
        },
      };
    });
  };

  // Funções para comprovação de NC
  const needsProofPhoto = requiresProofOnNC === 'photo' || requiresProofOnNC === 'both';
  const needsProofDescription = requiresProofOnNC === 'description' || requiresProofOnNC === 'both';

  const getQuestionNcProof = (questionId: string): NCProofData => {
    return ncProofs[selectedPeriod]?.[questionId] || {photos: [], description: ''};
  };

  const handleSelectPhoto = (questionId: string) => {
    Alert.alert('Adicionar Foto', 'Escolha uma opção:', [
      {
        text: 'Câmera',
        onPress: () => handleTakePhoto(questionId),
      },
      {
        text: 'Galeria',
        onPress: () => handlePickFromGallery(questionId),
      },
      {
        text: 'Cancelar',
        style: 'cancel',
      },
    ]);
  };

  const handleTakePhoto = async (questionId: string) => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (result.assets && result.assets[0]?.uri) {
        await uploadPhoto(questionId, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto');
    }
  };

  const handlePickFromGallery = async (questionId: string) => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (result.assets && result.assets[0]?.uri) {
        await uploadPhoto(questionId, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar foto:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a foto');
    }
  };

  const uploadPhoto = async (questionId: string, uri: string) => {
    setUploadingPhoto(questionId);
    hasUnsavedChanges.current = true;

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}.jpg`;
      const storagePath = `Checklist_Photos/${checklistId}/${location.id}/${selectedPeriod}/${questionId}/${fileName}`;

      // Verificar conectividade
      const netState = await NetInfo.fetch();
      let photoUrl: string;

      if (netState.isConnected) {
        // Online: fazer upload direto
        const result = await ecoStorage.upload({uri, type: 'image/jpeg', name: fileName});
        photoUrl = result.url;
        console.log('Foto enviada:', photoUrl);
      } else {
        // Offline: salvar localmente para upload posterior
        const pendingPhotosKey = '@checklist_pending_photos';
        const pendingStr = await AsyncStorage.getItem(pendingPhotosKey);
        const pending = pendingStr ? JSON.parse(pendingStr) : [];
        const tempId = `temp_${timestamp}`;
        pending.push({storagePath, localUri: uri, tempId, timestamp});
        await AsyncStorage.setItem(pendingPhotosKey, JSON.stringify(pending));
        photoUrl = tempId; // ID temporário que será substituído depois
        Alert.alert('Foto salva', 'A foto será enviada quando houver conexão.');
      }

      setNcProofs(prev => {
        const currentProof = prev[selectedPeriod]?.[questionId] || {photos: [], description: ''};
        return {
          ...prev,
          [selectedPeriod]: {
            ...prev[selectedPeriod],
            [questionId]: {
              ...currentProof,
              photos: [...(currentProof.photos || []), photoUrl],
            },
          },
        };
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      Alert.alert('Erro', 'Não foi possível enviar a foto');
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleRemovePhoto = (questionId: string, photoUrl: string) => {
    Alert.alert('Remover Foto', 'Deseja remover esta foto?', [
      {text: 'Cancelar', style: 'cancel'},
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          hasUnsavedChanges.current = true;
          setNcProofs(prev => {
            const currentProof = prev[selectedPeriod]?.[questionId] || {photos: [], description: ''};
            return {
              ...prev,
              [selectedPeriod]: {
                ...prev[selectedPeriod],
                [questionId]: {
                  ...currentProof,
                  photos: (currentProof.photos || []).filter(url => url !== photoUrl),
                },
              },
            };
          });
        },
      },
    ]);
  };

  const handleNcDescriptionChange = (questionId: string, description: string) => {
    hasUnsavedChanges.current = true;
    setNcProofs(prev => {
      const currentProof = prev[selectedPeriod]?.[questionId] || {photos: [], description: ''};
      return {
        ...prev,
        [selectedPeriod]: {
          ...prev[selectedPeriod],
          [questionId]: {
            ...currentProof,
            description,
          },
        },
      };
    });
  };

  const PeriodSelector = () => {
    const monthNamesFull = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];

    if (isWeekly) {
      const weeksInMonth = yearWeeks.filter(w => w.month === currentMonth);

      const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${day}/${month}`;
      };

      return (
        <View style={styles.periodSelectorContainer}>
          {/* Mês/Ano fixo (apenas informativo) */}
          <View style={styles.monthDisplay}>
            <MaterialCommunityIcons
              name="calendar-month"
              size={20}
              color={customTheme.colors.primary}
            />
            <Text style={styles.monthDisplayText}>
              {monthNamesFull[currentMonth - 1]} de {year}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.weekScroll}>
            <View style={styles.weekButtons}>
              {weeksInMonth.map((week, index) => {
                const isSelected = selectedPeriod === week.weekNumber;
                const periodData = formData.periods[week.weekNumber] || {
                  items: {},
                  observacoes: '',
                };
                const weekStatus = calculatePeriodStatus(periodData);
                const statusColor = getStatusColor(
                  weekStatus === 'Concluído'
                    ? 'C'
                    : weekStatus === 'Concluído com NC'
                    ? 'NC'
                    : '',
                );

                const startDateStr = formatDate(week.startDate);

                return (
                  <TouchableOpacity
                    key={week.weekNumber}
                    style={[
                      styles.periodButton,
                      styles.weekButton,
                      isSelected && styles.periodButtonSelected,
                    ]}
                    onPress={() => setSelectedPeriod(week.weekNumber)}>
                    <View
                      style={[styles.periodDot, {backgroundColor: statusColor}]}
                    />
                    <Text
                      style={[
                        styles.periodButtonText,
                        styles.weekButtonText,
                        isSelected && styles.periodButtonTextSelected,
                      ]}>
                      S{index + 1}
                    </Text>
                    <Text
                      style={[
                        styles.periodDateText,
                        styles.weekDateText,
                        isSelected && styles.periodDateTextSelected,
                      ]}>
                      {startDateStr}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      );
    }

    // Mensal - apenas mostra o mês/ano atual sem navegação
    return (
      <View style={styles.periodSelectorContainer}>
        <View style={styles.monthDisplay}>
          <MaterialCommunityIcons
            name="calendar-month"
            size={20}
            color={customTheme.colors.primary}
          />
          <Text style={styles.monthDisplayText}>
            {monthNamesFull[currentMonth - 1]} de {year}
          </Text>
        </View>
      </View>
    );
  };

  // Botão de opção customizado (muito mais leve que RadioButton)
  const OptionButton = ({
    selected,
    color,
    label,
    onPress,
  }: {
    selected: boolean;
    color: string;
    label: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={styles.radioOption}
      onPress={onPress}
      activeOpacity={0.6}>
      <View
        style={[
          styles.customRadio,
          {borderColor: selected ? color : '#BDBDBD'},
        ]}>
        {selected && (
          <View style={[styles.customRadioInner, {backgroundColor: color}]} />
        )}
      </View>
      <Text
        style={[
          styles.radioLabel,
          selected && {color: color, fontWeight: '600'},
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const QuestionCard = ({question}: {question: Question}) => {
    const currentPeriod = formData.periods[selectedPeriod] || {
      items: {},
      observacoes: '',
    };
    const currentValue = currentPeriod.items[question.id] || '';
    const statusColor = getStatusColor(currentValue);
    const questionProof = getQuestionNcProof(question.id);
    const showProofSection = currentValue === 'NC' && requiresProofOnNC !== 'none';

    return (
      <>
        {/* Título da seção se existir */}
        {question.sectionTitle && (
          <View style={styles.sectionTitleContainer}>
            <View style={styles.sectionTitleBar} />
            <Text style={styles.sectionTitleText}>{question.sectionTitle}</Text>
          </View>
        )}

        <Card style={[styles.questionCard, {borderColor: statusColor}]}>
          <View style={styles.questionContent}>
            <View style={styles.questionHeader}>
              <MaterialCommunityIcons
                name={
                  currentValue === 'C'
                    ? 'check-circle'
                    : currentValue === 'NC'
                    ? 'close-circle'
                    : currentValue === 'NA'
                    ? 'minus-circle'
                    : 'circle-outline'
                }
                size={20}
                color={statusColor}
              />
              {/* Texto com suporte a quebras de linha */}
              <Text style={styles.questionText}>{question.label}</Text>
            </View>

            {question.quantidade && (
              <Text style={styles.quantidadeText}>
                Qtd: {question.quantidade}
              </Text>
            )}

            <View style={styles.radioGroup}>
              <OptionButton
                selected={currentValue === 'C'}
                color="#4CAF50"
                label="Conforme"
                onPress={() => handleItemChange(question.id, 'C')}
              />
              <OptionButton
                selected={currentValue === 'NC'}
                color="#F44336"
                label="Não Conforme"
                onPress={() => handleItemChange(question.id, 'NC')}
              />
              <OptionButton
                selected={currentValue === 'NA'}
                color="#9E9E9E"
                label="N/A"
                onPress={() => handleItemChange(question.id, 'NA')}
              />
            </View>

            {/* Área de comprovação para NC */}
            {showProofSection && (
              <View style={styles.ncProofContainer}>
                <View style={styles.ncProofHeader}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color="#F44336" />
                  <Text style={styles.ncProofTitle}>Comprovação da NC</Text>
                </View>

                {/* Upload de Fotos */}
                {needsProofPhoto && (
                  <View style={styles.ncProofSection}>
                    <Text style={styles.ncProofLabel}>Anexar foto(s):</Text>
                    <View style={styles.photosContainer}>
                      {/* Fotos já enviadas */}
                      {questionProof.photos?.map((photoUrl, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.photoThumbnail}
                          onPress={() => handleRemovePhoto(question.id, photoUrl)}>
                          <Image source={{uri: photoUrl}} style={styles.photoImage} />
                          <View style={styles.photoRemoveIcon}>
                            <MaterialCommunityIcons name="close" size={12} color="#FFF" />
                          </View>
                        </TouchableOpacity>
                      ))}

                      {/* Botão de adicionar foto */}
                      <TouchableOpacity
                        style={styles.addPhotoButton}
                        onPress={() => handleSelectPhoto(question.id)}
                        disabled={uploadingPhoto === question.id}>
                        {uploadingPhoto === question.id ? (
                          <ActivityIndicator size="small" color={customTheme.colors.primary} />
                        ) : (
                          <>
                            <MaterialCommunityIcons
                              name="camera-plus"
                              size={24}
                              color={customTheme.colors.primary}
                            />
                            <Text style={styles.addPhotoText}>Adicionar</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Campo de Descrição */}
                {needsProofDescription && (
                  <View style={styles.ncProofSection}>
                    <Text style={styles.ncProofLabel}>Descreva a NC:</Text>
                    <TextInput
                      style={styles.ncDescriptionInput}
                      multiline
                      numberOfLines={2}
                      placeholder="Descreva a não conformidade..."
                      value={questionProof.description || ''}
                      onChangeText={text => handleNcDescriptionChange(question.id, text)}
                      textAlignVertical="top"
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        </Card>
      </>
    );
  };

  const IQPIQuestionCard = ({question}: {question: Question}) => {
    const currentPeriod = formData.periods[selectedPeriod] || {
      items: {},
      iqpiItems: {},
      observacoes: '',
    };
    const currentItem = currentPeriod.iqpiItems?.[question.id] || {
      conceito: '',
      descricaoDesvio: '',
      peso: question.peso,
    };
    const conceptMeta = IQPI_CONCEPT_OPTIONS.find(item => item.value === currentItem.conceito);
    const conceptColor = conceptMeta?.color || customTheme.colors.primary;

    return (
      <>
        {question.sectionTitle && (
          <View style={styles.sectionTitleContainer}>
            <View style={styles.sectionTitleBar} />
            <Text style={styles.sectionTitleText}>{question.sectionTitle}</Text>
          </View>
        )}

        {question.subsectionTitle && (
          <View style={styles.subsectionContainer}>
            <View style={styles.subsectionBar} />
            <Text style={styles.subsectionText}>{question.subsectionTitle}</Text>
          </View>
        )}

        <Card style={[styles.questionCard, {borderColor: currentItem.conceito ? conceptColor : '#E0E0E0'}]}>
          <View style={styles.questionContent}>
            <View style={styles.questionHeader}>
              <MaterialCommunityIcons
                name={currentItem.conceito ? 'star-circle' : 'circle-outline'}
                size={20}
                color={currentItem.conceito ? conceptColor : '#BDBDBD'}
              />
              <Text style={styles.questionText}>{question.label}</Text>
            </View>

            {(question.quantidade || question.peso) && (
              <View style={styles.iqpiMetaRow}>
                {question.quantidade ? (
                  <Text style={styles.quantidadeText}>Qtd: {question.quantidade}</Text>
                ) : null}
                {question.peso ? (
                  <TouchableOpacity
                    style={styles.pesoChip}
                    onPress={() => handleShowPesoInfo(question.peso)}>
                    <MaterialCommunityIcons name="information-outline" size={14} color={customTheme.colors.primary} />
                    <Text style={styles.pesoChipText}>{`Peso ${question.peso}`}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            <Text style={styles.iqpiLabel}>Conceito</Text>
            <View style={styles.iqpiConceptWrap}>
              {IQPI_CONCEPT_OPTIONS.map(option => {
                const selected = currentItem.conceito === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.iqpiConceptButton,
                      selected && {borderColor: option.color, backgroundColor: `${option.color}18`},
                    ]}
                    onPress={() => handleIQPIConceptChange(question.id, option.value)}>
                    <Text style={[styles.iqpiConceptText, selected && {color: option.color, fontWeight: '700'}]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.iqpiLabel}>Descrição dos desvios</Text>
            <TextInput
              style={styles.iqpiDescriptionInput}
              multiline
              numberOfLines={3}
              placeholder="Descreva os desvios observados..."
              placeholderTextColor={customTheme.colors.onSurfaceVariant}
              value={currentItem.descricaoDesvio}
              onChangeText={text => handleIQPIDescricaoChange(question.id, text)}
              textAlignVertical="top"
            />
          </View>
        </Card>
      </>
    );
  };

  if (loading) {
    return (
      <Surface style={styles.container}>
        <ModernHeader
          title={checklistTitle}
          iconName="clipboard-check"
          onBackPress={handleBackPress}
          rightButton={{
            icon: 'content-save',
            onPress: handleSave,
            loading: saving,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={customTheme.colors.primary} />
        </View>
      </Surface>
    );
  }

  const currentPeriod = formData.periods[selectedPeriod] || {
    items: {},
    iqpiItems: {},
    observacoes: '',
  };
  const hasNonConforming = Object.values(currentPeriod.items).includes('NC');

  const scrollToFirstUnanswered = () => {
    const firstUnansweredIndex = questions.findIndex(question => {
      if (isIQPI) {
        return !(currentPeriod.iqpiItems?.[question.id]?.conceito);
      }

      return !(currentPeriod.items?.[question.id]);
    });

    if (firstUnansweredIndex === -1) {
      Alert.alert('Checklist preenchido', 'Todas as questões deste período já foram respondidas.');
      return;
    }

    listRef.current?.scrollToIndex({
      index: firstUnansweredIndex,
      animated: true,
      viewPosition: 0.12,
    });
  };

  const renderQuestionItem = ({item}: {item: Question}) =>
    isIQPI ? (
      <IQPIQuestionCard question={item} />
    ) : (
      <QuestionCard question={item} />
    );

  const renderListHeader = () => (
    <Text style={styles.sectionTitle}>Itens do Checklist</Text>
  );

  const renderListFooter = () => (
    <>
      <Text style={styles.sectionTitle}>Observações</Text>

      <Card style={styles.observacoesCard}>
        <TextInput
          style={styles.observacoesInput}
          multiline
          numberOfLines={4}
          placeholder="Adicione observações relevantes..."
          value={currentPeriod.observacoes}
          onChangeText={handleObservacoesChange}
          textAlignVertical="top"
        />
      </Card>

      {!isIQPI && hasNonConforming && (
        <Card style={styles.warningCard}>
          <View style={styles.warningContent}>
            <MaterialCommunityIcons name="alert" size={20} color="#F57C00" />
            <Text style={styles.warningText}>
              Existem itens não conformes. Adicione observações detalhando as
              não conformidades.
            </Text>
          </View>
        </Card>
      )}

      <View style={{height: 20}} />
    </>
  );

  return (
    <Surface style={styles.container}>
      <ModernHeader
        title={checklistTitle}
        iconName="clipboard-check"
        onBackPress={handleBackPress}
        rightButton={{
          icon: 'content-save',
          onPress: handleSave,
          loading: saving,
        }}
      />

      {/* Banner de status offline */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <MaterialCommunityIcons
            name="cloud-off-outline"
            size={16}
            color="#FF9800"
          />
          <Text style={styles.offlineText}>
            Modo Offline{' '}
            {/* {pendingOperations > 0 && `- ${pendingOperations} pendente(s)`} */}
          </Text>
        </View>
      )}

      {/* Banner de sincronização */}
      {/* {syncStatus === 'syncing' && (
        <View style={styles.syncBanner}>
          <ActivityIndicator size="small" color={customTheme.colors.primary} />
          <Text style={styles.syncText}>Sincronizando...</Text>
        </View>
      )} */}

      <View style={styles.locationBanner}>
        <MaterialCommunityIcons
          name="map-marker"
          size={16}
          color={customTheme.colors.primary}
        />
        <Text style={styles.locationText}>{location.name}</Text>
      </View>

      <PeriodSelector />

      <FlatList
        ref={listRef}
        data={questions}
        keyExtractor={item => item.id}
        renderItem={renderQuestionItem}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={40}
        windowSize={7}
        removeClippedSubviews
        onScrollToIndexFailed={({index}) => {
          setTimeout(() => {
            listRef.current?.scrollToOffset({
              offset: Math.max(0, index * 220),
              animated: true,
            });
          }, 250);
        }}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
      />

      <TouchableOpacity
        style={styles.scrollFab}
        activeOpacity={0.85}
        onPress={scrollToFirstUnanswered}>
        <MaterialCommunityIcons
          name="arrow-down"
          size={24}
          color={customTheme.colors.onPrimary}
        />
      </TouchableOpacity>

    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: customTheme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // NOVOS ESTILOS PARA BANNERS DE STATUS
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: '#FFF3E0',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  offlineText: {
    fontSize: 12,
    color: '#F57C00',
    fontWeight: '500',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
  },
  syncText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: customTheme.colors.primaryContainer,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.outline,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: customTheme.colors.onPrimaryContainer,
    flex: 1,
  },
  periodSelectorContainer: {
    backgroundColor: customTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.outline,
    paddingVertical: 6,
  },
  monthDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginBottom: 4,
  },
  monthDisplayText: {
    fontSize: 14,
    fontWeight: '600',
    color: customTheme.colors.onSurface,
  },
  weekScroll: {
    paddingHorizontal: 12,
  },
  weekButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
    gap: 4,
    minWidth: 100,
  },
  weekButton: {
    minWidth: 60,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  periodButtonSelected: {
    backgroundColor: customTheme.colors.primaryContainer,
    borderColor: customTheme.colors.primary,
  },
  periodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: customTheme.colors.onSurface,
  },
  weekButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  periodButtonTextSelected: {
    fontWeight: '600',
    color: customTheme.colors.primary,
  },
  periodDateText: {
    fontSize: 10,
    color: customTheme.colors.onSurfaceVariant,
  },
  weekDateText: {
    fontSize: 9,
  },
  periodDateTextSelected: {
    color: customTheme.colors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: customTheme.colors.onSurface,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: customTheme.colors.primaryContainer,
  },
  sectionTitleBar: {
    width: 4,
    height: 20,
    backgroundColor: customTheme.colors.primary,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: customTheme.colors.primary,
    flex: 1,
  },
  subsectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: -2,
    paddingLeft: 6,
  },
  subsectionBar: {
    width: 3,
    height: 16,
    backgroundColor: customTheme.colors.secondary,
    borderRadius: 2,
    marginRight: 8,
  },
  subsectionText: {
    fontSize: 12,
    fontWeight: '700',
    color: customTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  questionCard: {
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 2,
    elevation: 1,
  },
  questionContent: {
    padding: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: customTheme.colors.onSurface,
    lineHeight: 20,
  },
  quantidadeText: {
    fontSize: 12,
    color: customTheme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  iqpiMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  pesoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: customTheme.colors.primaryContainer,
  },
  pesoChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: customTheme.colors.primary,
  },
  iqpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: customTheme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  iqpiConceptWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  iqpiConceptButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DADADA',
    backgroundColor: '#FFF',
  },
  iqpiConceptText: {
    fontSize: 12,
    color: customTheme.colors.onSurface,
    fontWeight: '500',
  },
  iqpiDescriptionInput: {
    borderWidth: 1.5,
    borderColor: customTheme.colors.outline,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 96,
    backgroundColor: customTheme.colors.surface,
    color: customTheme.colors.onSurface,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  customRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: 13,
    color: customTheme.colors.onSurface,
  },
  observacoesCard: {
    borderRadius: 8,
    elevation: 1,
    marginBottom: 12,
  },
  observacoesInput: {
    padding: 12,
    fontSize: 14,
    color: customTheme.colors.onSurface,
    minHeight: 100,
  },
  warningCard: {
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    elevation: 1,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#F57C00',
  },
  // Estilos para comprovação de NC
  ncProofContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FFCDD2',
    borderStyle: 'dashed',
  },
  ncProofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  ncProofTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F44336',
  },
  ncProofSection: {
    marginBottom: 10,
  },
  ncProofLabel: {
    fontSize: 12,
    color: customTheme.colors.onSurfaceVariant,
    marginBottom: 6,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: customTheme.colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.05)',
  },
  addPhotoText: {
    fontSize: 9,
    color: customTheme.colors.primary,
    marginTop: 2,
  },
  ncDescriptionInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    minHeight: 60,
    backgroundColor: '#FAFAFA',
    color: customTheme.colors.onSurface,
  },
  scrollFab: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: customTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.22,
    shadowRadius: 4,
  },
});
