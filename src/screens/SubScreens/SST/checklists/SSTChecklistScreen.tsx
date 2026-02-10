import React, {useEffect, useState} from 'react';
import {View, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform} from 'react-native';
import {Surface, Text, Card, ActivityIndicator} from 'react-native-paper';
import {ref, onValue} from 'firebase/database';
import {dbRealTime} from '../../../../../firebase';
import ModernHeader from '../../../../assets/components/ModernHeader';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {customTheme} from '../../../../theme/theme';
import {useUser} from '../../../../contexts/userContext';
import {useChecklistSync} from '../../../../contexts/ChecklistSyncContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReportGeneratorModal from './ReportGeneratorModal';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const CLOUD_RUN_URL = 'https://relatorio-checklist-708827138368.europe-west1.run.app';

type ChecklistStatus =
  | 'Pendente'
  | 'Em Andamento'
  | 'Concluído'
  | 'Concluído com NC';

interface ChecklistLocation {
  id: string;
  name: string;
  status: ChecklistStatus;
  lastUpdate?: string;
  monthlyStatus?: Record<number, ChecklistStatus>;
  useCustomQuestions?: boolean;
  questions?: Array<{
    id: string;
    label: string;
    quantidade?: string;
    sectionTitle?: string;
  }>;
}

interface ChecklistDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  frequency: string;
  questions: Array<{
    id: string;
    label: string;
    quantidade?: string;
    sectionTitle?: string; // Título da seção
  }>;
  locations: ChecklistLocation[];
}

interface SavedChecklistData {
  [year: string]: {
    [checklistId: string]: {
      [locationId: string]: {
        monthlyFormData: {
          [periodNumber: number]: {
            ncProofs: any;
            items: Record<string, string>;
            observacoes: string;
            status: ChecklistStatus;
            responsavel?: string;
          };
        };
        lastUpdate: string;
        status: ChecklistStatus;
        responsavel?: string;
        monthlyStatus: {
          [periodNumber: number]: ChecklistStatus;
        };
      };
    };
  };
}

interface ReportModalData {
  checklistId: string;
  checklistTitle: string;
  locationId: string;
  locationName: string;
  questions: Array<{id: string; label: string; sectionTitle?: string}>;
}

export interface ChecklistScreenProps {
  navigation: any;
  route?: {
    params?: {
      /**
       * Nome exato da categoria no Firebase.
       * Ex: "QSMS - Geral", "QSMS - Meio Ambiente", "QSMS - Qualidade"
       */
      category?: string;
      /**
       * Título exibido no header da tela
       */
      title?: string;
      /**
       * Nome do ícone (MaterialCommunityIcons)
       */
      headerIcon?: string;
      /**
       * Variante do relatório: 'sst', 'meioAmbiente' ou 'qualidade'
       */
      reportVariant?: 'sst' | 'meioAmbiente' | 'qualidade';
    };
  };
}

export default function SSTChecklistScreen({navigation, route}: ChecklistScreenProps) {
  // Props com valores padrão
  const category = route?.params?.category || 'QSMS - Geral';
  const screenTitle = route?.params?.title || 'Checklist SST';
  const headerIcon = route?.params?.headerIcon || 'shield-check';
  const reportVariant = route?.params?.reportVariant || 'sst';

  // Gerar chave de cache única baseada na categoria
  const cacheKey = category.replace(/\s+/g, '_').toLowerCase();
  const {userInfo} = useUser();
  const {isOnline, syncStatus} = useChecklistSync();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [savedData, setSavedData] = useState<SavedChecklistData>({});
  const [checklists, setChecklists] = useState<ChecklistDefinition[]>([]);
  const [loadingDefinitions, setLoadingDefinitions] = useState(true);

  // Estados do modal de relatório
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportModalData, setReportModalData] = useState<ReportModalData | null>(
    null,
  );
  const [generatingReport, setGeneratingReport] = useState(false);

  // Mapear ícones Lucide para MaterialCommunityIcons
  const getIconName = (lucideIcon: string): string => {
    const iconMap: Record<string, string> = {
      Droplet: 'water',
      Droplets: 'water-outline',
      Recycle: 'recycle',
      AlertTriangle: 'alert-triangle',
      ShieldAlert: 'shield-alert',
      Shield: 'shield',
      Package: 'package-variant',
      Boxes: 'package-variant-closed',
      Archive: 'archive',
      Warehouse: 'warehouse',
      ClipboardCheck: 'clipboard-check',
      ClipboardList: 'clipboard-text',
      Container: 'package',
      Lock: 'lock',
      Leaf: 'leaf',
    };

    return iconMap[lucideIcon] || 'clipboard-check';
  };

  // Função para cachear definições (usa cacheKey dinâmica)
  const cacheChecklistDefinitions = async (
    definitions: ChecklistDefinition[],
  ) => {
    try {
      await AsyncStorage.setItem(
        `@checklist_definitions_${cacheKey}`,
        JSON.stringify(definitions),
      );
    } catch (error) {
      console.error('Erro ao cachear definições:', error);
    }
  };

  const loadCachedDefinitions = async () => {
    try {
      const cached = await AsyncStorage.getItem(`@checklist_definitions_${cacheKey}`);
      if (cached) {
        const definitions = JSON.parse(cached);
        setChecklists(definitions);
        return definitions;
      }
    } catch (error) {
      console.error('Erro ao carregar cache:', error);
    }
    return null;
  };

  // Buscar definições dos checklists do Firebase
  useEffect(() => {
    // Carregar cache primeiro (resposta rápida)
    loadCachedDefinitions();

    // Se estiver online, buscar do Firebase
    if (isOnline) {
      const definitionsRef = ref(dbRealTime(), 'checklists-config');

      const unsubscribe = onValue(definitionsRef, snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.val();

          // Filtrar pela categoria passada como parâmetro
          const filteredChecklists = Object.values(data)
            .filter(
              (checklist: any) => checklist.category === category,
            )
            .map((checklist: any) => checklist as ChecklistDefinition);

          setChecklists(filteredChecklists);
          cacheChecklistDefinitions(filteredChecklists);
          console.log(`Checklists ${category} carregados do Firebase`);
        } else {
          setChecklists([]);
        }
        setLoadingDefinitions(false);
      });

      return () => unsubscribe();
    } else {
      // Offline: usar apenas cache
      setLoadingDefinitions(false);
    }
  }, [isOnline]);

  // Função para converter semanas em meses (para checklists semanais)
  const getMonthFromWeek = (weekNumber: number): number => {
    return Math.ceil(weekNumber / 4);
  };

  // Função para converter status semanal em mensal
  const getMonthlyStatusFromWeekly = (
    weeklyStatus: Record<number, ChecklistStatus>,
  ): Record<number, ChecklistStatus> => {
    const monthlyStatus: Record<number, ChecklistStatus> = {};
    const weeksByMonth: Record<number, ChecklistStatus[]> = {};

    Object.entries(weeklyStatus).forEach(([week, status]) => {
      const weekNum = parseInt(week);
      const month = getMonthFromWeek(weekNum);

      if (month >= 1 && month <= 12) {
        if (!weeksByMonth[month]) {
          weeksByMonth[month] = [];
        }
        weeksByMonth[month].push(status);
      }
    });

    Object.entries(weeksByMonth).forEach(([month, statuses]) => {
      const monthNum = parseInt(month);

      if (statuses.every(s => s === 'Concluído')) {
        monthlyStatus[monthNum] = 'Concluído';
      } else if (statuses.some(s => s === 'Concluído com NC')) {
        monthlyStatus[monthNum] = 'Concluído com NC';
      } else if (statuses.some(s => s !== 'Pendente')) {
        monthlyStatus[monthNum] = 'Em Andamento';
      } else {
        monthlyStatus[monthNum] = 'Pendente';
      }
    });

    return monthlyStatus;
  };

  const updateChecklistsWithData = () => {
    const year = selectedMonth.getFullYear().toString();

    const updatedChecklists = checklists.map(checklist => ({
      ...checklist,
      locations: checklist.locations.map(location => {
        const savedDataForLocation =
          savedData[year]?.[checklist.id]?.[location.id];

        if (savedDataForLocation) {
          // Pegar status mensal (convertendo de semanal se necessário)
          let displayMonthlyStatus = savedDataForLocation.monthlyStatus || {};

          if (
            checklist.frequency === 'Semanal' &&
            savedDataForLocation.monthlyStatus
          ) {
            displayMonthlyStatus = getMonthlyStatusFromWeekly(
              savedDataForLocation.monthlyStatus,
            );
          }

          return {
            ...location,
            status: savedDataForLocation.status,
            lastUpdate: savedDataForLocation.lastUpdate,
            monthlyStatus: displayMonthlyStatus,
          };
        }

        return {
          ...location,
          status: 'Pendente' as ChecklistStatus,
          lastUpdate: '',
          monthlyStatus: {},
        };
      }),
    }));

    setChecklists(updatedChecklists);
  };

  // Cachear dados salvos (usa cacheKey dinâmica)
  const cacheSavedData = async (year: string, data: any) => {
    try {
      await AsyncStorage.setItem(
        `@checklist_saved_${cacheKey}_${year}`,
        JSON.stringify(data),
      );
    } catch (error) {
      console.error('Erro ao cachear dados salvos:', error);
    }
  };

  const loadCachedSavedData = async (year: string) => {
    try {
      const cached = await AsyncStorage.getItem(`@checklist_saved_${cacheKey}_${year}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Erro ao carregar dados salvos do cache:', error);
    }
    return null;
  };

  // useEffect dos dados salvos
  useEffect(() => {
    const year = selectedMonth.getFullYear().toString();

    // Carregar cache primeiro
    loadCachedSavedData(year).then(cached => {
      if (cached) {
        setSavedData(prev => ({...prev, [year]: cached}));
      }
    });

    // Se online, buscar do Firebase
    if (isOnline) {
      const checklistsRef = ref(dbRealTime(), `checklists/${year}`);

      const unsubscribe = onValue(checklistsRef, snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setSavedData(prev => ({...prev, [year]: data}));
          cacheSavedData(year, data);
        } else {
          setSavedData(prev => ({...prev, [year]: {}}));
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, [selectedMonth, isOnline]);

  useEffect(() => {
    if (!loadingDefinitions) {
      updateChecklistsWithData();
    }
  }, [selectedMonth, savedData, loadingDefinitions]);

  const getStatusColor = (status: ChecklistStatus) => {
    switch (status) {
      case 'Concluído':
        return '#4CAF50';
      case 'Concluído com NC':
        return '#FF9800';
      case 'Em Andamento':
        return '#2196F3';
      case 'Pendente':
      default:
        return '#9E9E9E';
    }
  };

  const MonthNavigator = () => {
    const months = [
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

    const monthName = months[selectedMonth.getMonth()];
    const year = selectedMonth.getFullYear();

    const goToPreviousMonth = () => {
      const newDate = new Date(selectedMonth);
      newDate.setMonth(newDate.getMonth() - 1);
      setSelectedMonth(newDate);
    };

    const goToNextMonth = () => {
      const newDate = new Date(selectedMonth);
      newDate.setMonth(newDate.getMonth() + 1);
      setSelectedMonth(newDate);
    };

    return (
      <View style={styles.monthNavigator}>
        <TouchableOpacity
          style={styles.monthNavButton}
          onPress={goToPreviousMonth}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={24}
            color={customTheme.colors.primary}
          />
        </TouchableOpacity>

        <View style={styles.monthDisplay}>
          <MaterialCommunityIcons
            name="calendar-month"
            size={20}
            color={customTheme.colors.primary}
          />
          <Text style={styles.monthDisplayText}>
            {monthName} de {year}
          </Text>
        </View>

        <TouchableOpacity style={styles.monthNavButton} onPress={goToNextMonth}>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={customTheme.colors.primary}
          />
        </TouchableOpacity>
      </View>
    );
  };


  const getCardBackgroundColor = (status: ChecklistStatus) => {
    switch (status) {
      case 'Concluído':
        return '#E8F5E9'; // Verde claro
      case 'Concluído com NC':
        return '#FFF3E0'; // Laranja claro
      case 'Em Andamento':
        return '#E3F2FD'; // Azul claro
      case 'Pendente':
      default:
        return customTheme.colors.surfaceVariant;
    }
  };

  const handleOpenReportModal = (
    checklistId: string,
    checklistTitle: string,
    locationId: string,
    locationName: string,
    questions: Array<{id: string; label: string}>,
  ) => {
    setReportModalData({
      checklistId,
      checklistTitle,
      locationId,
      locationName,
      questions,
    });
    setReportModalVisible(true);
  };

  const handleGenerateReport = async (data: any) => {
    console.log('Gerando relatório com dados:', data);
    setGeneratingReport(true);

    try {
      // Preparar os itens do checklist com seus resultados
      const year = selectedMonth.getFullYear().toString();
      const month = selectedMonth.getMonth() + 1;

      const checklistSavedData =
        savedData[year]?.[reportModalData?.checklistId || '']?.[
          reportModalData?.locationId || ''
        ]?.monthlyFormData?.[month];

      const itensComResultado = (reportModalData?.questions || []).map(q => {
        const resultado = checklistSavedData?.items?.[q.id];
        const ncProof = checklistSavedData?.ncProofs?.[q.id];
        return {
          id: q.id,
          label: q.label,
          resultado: resultado || 'NA',
          sectionTitle: q.sectionTitle || '',
          ...(ncProof && {ncProof}),
        };
      });

      const requestData = {
        checklist: {
          ...data,
          itens: itensComResultado,
          dataChecklist: selectedMonth.toISOString(),
        },
      };

      console.log('Enviando para Cloud Run:', requestData);

      // Fazer requisição para o Cloud Run
      const response = await fetch(`${CLOUD_RUN_URL}/generate-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar relatório');
      }

      // Backend retorna PDF binário diretamente
      const blob = await response.blob();

      if (!blob || blob.size === 0) {
        throw new Error('Resposta inválida do servidor');
      }

      // Converter blob para base64 para salvar com RNFS
      const base64Data: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Extrair nome do arquivo do header Content-Disposition ou usar fallback
      const disposition = response.headers.get('Content-Disposition');
      const fileNameMatch = disposition?.match(/filename="?(.+?)"?$/);
      const fileName = fileNameMatch?.[1] || `Relatorio_Checklist_${Date.now()}.pdf`;
      const filePath = `${
        Platform.OS === 'android'
          ? RNFS.DownloadDirectoryPath
          : RNFS.DocumentDirectoryPath
      }/${fileName}`;

      await RNFS.writeFile(filePath, base64Data, 'base64');
      console.log('PDF salvo em:', filePath);

      setReportModalVisible(false);

      // Perguntar se quer compartilhar
      Alert.alert(
        'Relatório Gerado',
        `O relatório foi salvo em:\n${fileName}`,
        [
          {text: 'OK', style: 'cancel'},
          {
            text: 'Compartilhar',
            onPress: async () => {
              try {
                await Share.open({
                  url: `file://${filePath}`,
                  type: 'application/pdf',
                  title: 'Compartilhar Relatório',
                });
              } catch (shareError) {
                console.log('Compartilhamento cancelado ou erro:', shareError);
              }
            },
          },
        ],
      );
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      Alert.alert(
        'Erro',
        error.message || 'Não foi possível gerar o relatório. Tente novamente.',
        [{text: 'OK'}],
      );
    } finally {
      setGeneratingReport(false);
    }
  };

  const getMonthYearLabel = () => {
    const months = [
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
    return `${months[selectedMonth.getMonth()]}/${selectedMonth.getFullYear()}`;
  };

  const LocationCard = ({
    location,
    checklistId,
    checklistTitle,
    checklistIcon,
    checklistFrequency,
    questions,
  }: {
    location: ChecklistLocation;
    checklistId: string;
    checklistTitle: string;
    checklistIcon: string;
    checklistFrequency: string;
    questions: Array<{id: string; label: string; sectionTitle?: string}>;
  }) => {
    // Pegar o status do mês atualmente selecionado
    const currentMonth = selectedMonth.getMonth() + 1;
    const currentMonthStatus =
      location.monthlyStatus?.[currentMonth] || 'Pendente';
    const statusColor = getStatusColor(currentMonthStatus);
    const cardBackground = getCardBackgroundColor(currentMonthStatus);
    const canGenerateReport =
      currentMonthStatus === 'Concluído' ||
      currentMonthStatus === 'Concluído com NC';

    return (
      <TouchableOpacity
        style={[styles.locationCard, {backgroundColor: cardBackground}]}
        activeOpacity={0.7}
        onPress={() => {
          navigation.navigate('ChecklistForm', {
            checklistId,
            checklistTitle,
            checklistIcon,
            checklistFrequency,
            location,
            selectedMonth,
          });
        }}>
        <View style={styles.locationContent}>
          <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
          <Text style={styles.locationName} numberOfLines={2}>
            {location.name}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.reportButton,
            !canGenerateReport && styles.reportButtonDisabled,
          ]}
          activeOpacity={0.7}
          onPress={(e) => {
            e.stopPropagation();
            handleOpenReportModal(
              checklistId,
              checklistTitle,
              location.id,
              location.name,
              questions,
            );
          }}>
          <MaterialCommunityIcons
            name="file-pdf-box"
            size={22}
            color={canGenerateReport ? '#D32F2F' : '#BDBDBD'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading || loadingDefinitions) {
    return (
      <Surface style={styles.container}>
        <ModernHeader
          title={screenTitle}
          iconName={headerIcon}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={customTheme.colors.primary} />
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      <ModernHeader
        title={screenTitle}
        iconName={headerIcon}
        onBackPress={() => navigation.goBack()}
      />

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <MaterialCommunityIcons
            name="cloud-off-outline"
            size={16}
            color="#FF9800"
          />
          <Text style={styles.offlineText}>Modo Offline - Dados em cache</Text>
        </View>
      )}

      <MonthNavigator />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {checklists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="clipboard-alert-outline"
              size={64}
              color={customTheme.colors.outline}
            />
            <Text style={styles.emptyText}>Nenhum checklist encontrado</Text>
          </View>
        ) : (
          checklists.map(checklist => {
            const completedCount = checklist.locations.filter(
              loc =>
                loc.status === 'Concluído' || loc.status === 'Concluído com NC',
            ).length;
            const totalCount = checklist.locations.length;

            return (
              <Card key={checklist.id} style={styles.checklistCard}>
                <Card.Content style={styles.cardContent}>
                  <View style={styles.checklistHeader}>
                    <View style={styles.checklistTitleRow}>
                      <MaterialCommunityIcons
                        name={getIconName(checklist.icon)}
                        size={20}
                        color={customTheme.colors.primary}
                        style={styles.checklistIcon}
                      />
                      <Text style={styles.checklistTitle} numberOfLines={2}>
                        {checklist.title}
                      </Text>
                    </View>

                    <View style={styles.progressBadge}>
                      <Text style={styles.progressText}>
                        {completedCount}/{totalCount}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.locationsContainer}>
                    {checklist.locations.map(location => (
                      <LocationCard
                        key={location.id}
                        location={location}
                        checklistId={checklist.id}
                        checklistTitle={checklist.title}
                        checklistIcon={checklist.icon}
                        checklistFrequency={checklist.frequency}
                        questions={
                          location.useCustomQuestions && location.questions && location.questions.length > 0
                            ? location.questions.map(q => ({
                                id: q.id,
                                label: q.label,
                                sectionTitle: q.sectionTitle,
                              }))
                            : checklist.questions
                        }
                      />
                    ))}
                  </View>
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Modal de Geração de Relatório */}
      {reportModalData && (
        <ReportGeneratorModal
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          onGenerate={handleGenerateReport}
          checklistTitle={reportModalData.checklistTitle}
          locationName={reportModalData.locationName}
          itens={reportModalData.questions.map(q => ({
            id: q.id,
            label: q.label,
            resultado: undefined,
          }))}
          mesAno={getMonthYearLabel()}
          loading={generatingReport}
          variant={reportVariant}
        />
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
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
  container: {
    flex: 1,
    backgroundColor: customTheme.colors.background,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: customTheme.colors.outline,
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: customTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.outline,
  },
  monthNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: customTheme.colors.surfaceVariant,
  },
  monthDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  monthDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    color: customTheme.colors.onSurface,
  },
  checklistCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  cardContent: {
    padding: 12,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  checklistTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  checklistIcon: {
    marginTop: 2,
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: customTheme.colors.onSurface,
    flex: 1,
    lineHeight: 20,
  },
  progressBadge: {
    backgroundColor: customTheme.colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: customTheme.colors.onPrimaryContainer,
  },
  locationsContainer: {
    gap: 8,
  },
  locationCard: {
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  locationName: {
    fontSize: 14,
    fontWeight: '500',
    color: customTheme.colors.onSurface,
    flex: 1,
  },
  reportButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
});