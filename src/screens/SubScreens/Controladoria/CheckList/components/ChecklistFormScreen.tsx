import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Pressable,
  BackHandler,
} from 'react-native';
import {
  Surface,
  Text,
  Card,
  RadioButton,
  ActivityIndicator,
} from 'react-native-paper';
import {ref, onValue, set} from 'firebase/database';
import {dbRealTime} from '../../../../../../firebase';
import ModernHeader from '../../../../../assets/components/ModernHeader';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {customTheme} from '../../../../../theme/theme';
import {useUser} from '../../../../../contexts/userContext';
import {useChecklistSync} from '../../../../../contexts/ChecklistSyncContext';

type ConformityStatus = 'C' | 'NC' | 'NA' | '';

interface Question {
  id: string;
  label: string;
  quantidade?: string;
}

interface PeriodData {
  items: Record<string, ConformityStatus>;
  observacoes: string;
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
    location,
    selectedMonth,
  } = route.params;
  const {userInfo} = useUser();
  const {
    isOnline,
    saveChecklist,
    loadChecklist,
    loadQuestions: loadQuestionsSync,
    pendingOperations,
    syncStatus,
    forceSync,
  } = useChecklistSync();

  const isWeekly = checklistFrequency === 'Semanal';
  const year = selectedMonth.getFullYear();

  const [currentMonth, setCurrentMonth] = useState(
    selectedMonth.getMonth() + 1,
  );
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [yearWeeks, setYearWeeks] = useState<YearWeek[]>([]);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const maxPeriods = isWeekly ? 52 : 12;

  const [formData, setFormData] = useState<FormData>({
    periods: {},
  });

  const initialFormData = useRef<FormData>({periods: {}});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

  useEffect(() => {
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
      await loadSavedData();
    };

    init();
  }, []);

  // ADICIONAR useEffect para recarregar quando voltar online:
  useEffect(() => {
    if (isOnline) {
      // Recarrega dados do Firebase quando volta online
      loadSavedData();
    }
  }, [isOnline]);

  // Auto-selecionar primeira semana ao mudar de mês
  useEffect(() => {
    if (isWeekly && yearWeeks.length > 0) {
      const firstWeekOfMonth = yearWeeks.find(w => w.month === currentMonth);
      if (firstWeekOfMonth) {
        setSelectedPeriod(firstWeekOfMonth.weekNumber);
      }
    }
  }, [currentMonth]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );
    return () => backHandler.remove();
  }, [hasUnsavedChanges]);

  // SUBSTITUIR loadQuestions
  const loadQuestions = async () => {
    try {
      const questions = await loadQuestionsSync(checklistId);
      setQuestions(questions);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error);
      setLoading(false);
    }
  };

  // SUBSTITUIR loadSavedData
  const loadSavedData = async () => {
    try {
      const yearStr = year.toString();
      const data = await loadChecklist(yearStr, checklistId, location.id);

      if (data?.monthlyFormData) {
        const periods: Record<number, PeriodData> = {};

        Object.entries(data.monthlyFormData).forEach(
          ([period, periodData]: [string, any]) => {
            periods[parseInt(period)] = {
              items: periodData.items || {},
              observacoes: periodData.observacoes || '',
            };
          },
        );

        setFormData({periods});
        initialFormData.current = {periods};
        setHasUnsavedChanges(false);
      } else {
        // Se não tem dados, limpar o formulário
        setFormData({periods: {}});
      }
    } catch (error) {
      console.error('Erro ao carregar dados salvos:', error);
      setFormData({periods: {}});
    }
  };

  // SUBSTITUIR handleSave
  const handleSave = async () => {
    setHasUnsavedChanges(false);
    setSaving(true);

    try {
      const yearStr = year.toString();

      const allPeriodsData: Record<number, any> = {};
      const periodStatus: Record<number, string> = {};

      for (let period = 1; period <= maxPeriods; period++) {
        const periodData = formData.periods[period] || {
          items: questions.reduce((acc, q) => ({...acc, [q.id]: ''}), {}),
          observacoes: '',
        };

        const status = calculatePeriodStatus(periodData);

        allPeriodsData[period] = {
          items: periodData.items,
          observacoes: periodData.observacoes,
          status: status,
          responsavel: userInfo?.user || 'Desconhecido',
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

      // USA O SYNC CONTEXT
      await saveChecklist(yearStr, checklistId, location.id, saveData);

      //   Alert.alert(
      //     'Sucesso',
      //     isOnline
      //       ? 'Checklist salvo com sucesso!'
      //       : 'Checklist salvo offline! Será sincronizado quando houver conexão.',
      //   );
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
  if (hasUnsavedChanges) {
    Alert.alert(
      'Alterações não salvas',
      'Deseja salvar as alterações antes de sair?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Sair sem salvar', onPress: () => navigation.goBack()},
        {text: 'Salvar', onPress: handleSave},
      ]
    );
    return true;
  }
  navigation.goBack(); // ← Adicionar essa linha
  return false;
};

  const handleItemChange = (questionId: string, value: ConformityStatus) => {
    setHasUnsavedChanges(true);
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

  const handleObservacoesChange = (text: string) => {
    setHasUnsavedChanges(true);
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

  const PeriodSelector = () => {
    const monthNames = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
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
          <View style={styles.monthNav}>
            <TouchableOpacity
              style={[
                styles.monthNavButton,
                currentMonth === 1 && styles.monthNavButtonDisabled,
              ]}
              onPress={() =>
                setCurrentMonth((prev: number) => Math.max(1, prev - 1))
              }
              disabled={currentMonth === 1}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={24}
                color={currentMonth === 1 ? '#CCC' : customTheme.colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.monthNameButton}
              onPress={() => setShowMonthPicker(true)}>
              <Text style={styles.monthNavText}>
                {monthNames[currentMonth - 1]}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color={customTheme.colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.monthNavButton,
                currentMonth === 12 && styles.monthNavButtonDisabled,
              ]}
              onPress={() =>
                setCurrentMonth((prev: number) => Math.min(12, prev + 1))
              }
              disabled={currentMonth === 12}>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={
                  currentMonth === 12 ? '#CCC' : customTheme.colors.primary
                }
              />
            </TouchableOpacity>
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
                const endDateStr = formatDate(week.endDate);

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

    // Mensal
    return (
      <View style={styles.periodSelectorContainer}>
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={[
              styles.monthNavButton,
              selectedPeriod === 1 && styles.monthNavButtonDisabled,
            ]}
            onPress={() =>
              setSelectedPeriod((prev: number) => Math.max(1, prev - 1))
            }
            disabled={selectedPeriod === 1}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={24}
              color={selectedPeriod === 1 ? '#CCC' : customTheme.colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.monthNameButton}
            onPress={() => setShowMonthPicker(true)}>
            <Text style={styles.monthNavText}>
              {monthNames[selectedPeriod - 1]}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={customTheme.colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.monthNavButton,
              selectedPeriod === 12 && styles.monthNavButtonDisabled,
            ]}
            onPress={() =>
              setSelectedPeriod((prev: number) => Math.min(12, prev + 1))
            }
            disabled={selectedPeriod === 12}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={
                selectedPeriod === 12 ? '#CCC' : customTheme.colors.primary
              }
            />
          </TouchableOpacity>
        </View>

        <View style={styles.monthStatusIndicator}>
          {monthNames.map((month, index) => {
            const period = index + 1;
            const periodData = formData.periods[period] || {
              items: {},
              observacoes: '',
            };
            const monthStatus = calculatePeriodStatus(periodData);
            const statusColor = getStatusColor(
              monthStatus === 'Concluído'
                ? 'C'
                : monthStatus === 'Concluído com NC'
                ? 'NC'
                : '',
            );

            return (
              <View key={period} style={styles.monthIndicatorItem}>
                <View
                  style={[
                    styles.monthIndicatorDot,
                    {backgroundColor: statusColor},
                  ]}
                />
                <Text
                  style={[
                    styles.monthIndicatorText,
                    selectedPeriod === period &&
                      styles.monthIndicatorTextSelected,
                  ]}>
                  {month}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const QuestionCard = ({question}: {question: Question}) => {
    const currentPeriod = formData.periods[selectedPeriod] || {
      items: {},
      observacoes: '',
    };
    const currentValue = currentPeriod.items[question.id] || '';
    const statusColor = getStatusColor(currentValue);

    return (
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
            <Text style={styles.questionText}>{question.label}</Text>
          </View>

          {question.quantidade && (
            <Text style={styles.quantidadeText}>
              Qtd: {question.quantidade}
            </Text>
          )}

          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => handleItemChange(question.id, 'C')}>
              <RadioButton
                value="C"
                status={currentValue === 'C' ? 'checked' : 'unchecked'}
                onPress={() => handleItemChange(question.id, 'C')}
                color="#4CAF50"
              />
              <Text
                style={[
                  styles.radioLabel,
                  currentValue === 'C' && {color: '#4CAF50', fontWeight: '600'},
                ]}>
                Conforme
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => handleItemChange(question.id, 'NC')}>
              <RadioButton
                value="NC"
                status={currentValue === 'NC' ? 'checked' : 'unchecked'}
                onPress={() => handleItemChange(question.id, 'NC')}
                color="#F44336"
              />
              <Text
                style={[
                  styles.radioLabel,
                  currentValue === 'NC' && {
                    color: '#F44336',
                    fontWeight: '600',
                  },
                ]}>
                Não Conforme
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => handleItemChange(question.id, 'NA')}>
              <RadioButton
                value="NA"
                status={currentValue === 'NA' ? 'checked' : 'unchecked'}
                onPress={() => handleItemChange(question.id, 'NA')}
                color="#9E9E9E"
              />
              <Text
                style={[
                  styles.radioLabel,
                  currentValue === 'NA' && {
                    color: '#9E9E9E',
                    fontWeight: '600',
                  },
                ]}>
                N/A
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
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
            icon: pendingOperations > 0 ? 'cloud-sync' : 'content-save',
            onPress: pendingOperations > 0 && isOnline ? forceSync : handleSave,
            loading: saving || syncStatus === 'syncing',
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
    observacoes: '',
  };
  const hasNonConforming = Object.values(currentPeriod.items).includes('NC');
  const monthNames = [
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

  return (
    <Surface style={styles.container}>
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMonthPicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione o Mês</Text>
            <ScrollView style={styles.monthList}>
              {monthNames.map((month, index) => {
                const monthNumber = index + 1;
                const periodData = formData.periods[monthNumber] || {
                  items: {},
                  observacoes: '',
                };
                const monthStatus = calculatePeriodStatus(periodData);
                const statusColor = getStatusColor(
                  monthStatus === 'Concluído'
                    ? 'C'
                    : monthStatus === 'Concluído com NC'
                    ? 'NC'
                    : '',
                );

                return (
                  <TouchableOpacity
                    key={monthNumber}
                    style={styles.monthPickerItem}
                    onPress={() => {
                      if (isWeekly) {
                        setCurrentMonth(monthNumber);
                      } else {
                        setSelectedPeriod(monthNumber);
                      }
                      setShowMonthPicker(false);
                    }}>
                    <View
                      style={[
                        styles.monthPickerDot,
                        {backgroundColor: statusColor},
                      ]}
                    />
                    <Text style={styles.monthPickerText}>{month}</Text>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={customTheme.colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

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
            {pendingOperations > 0 && `- ${pendingOperations} pendente(s)`}
          </Text>
        </View>
      )}

      {/* Banner de sincronização */}
      {syncStatus === 'syncing' && (
        <View style={styles.syncBanner}>
          <ActivityIndicator size="small" color={customTheme.colors.primary} />
          <Text style={styles.syncText}>Sincronizando...</Text>
        </View>
      )}

      <View style={styles.locationBanner}>
        <MaterialCommunityIcons
          name="map-marker"
          size={16}
          color={customTheme.colors.primary}
        />
        <Text style={styles.locationText}>{location.name}</Text>
      </View>

      <PeriodSelector />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Itens do Checklist</Text>

        {questions.map(question => (
          <QuestionCard key={question.id} question={question} />
        ))}

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

        {hasNonConforming && (
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
      </ScrollView>
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
    paddingVertical: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  monthNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: customTheme.colors.surfaceVariant,
  },
  monthNavButtonDisabled: {
    opacity: 0.3,
  },
  monthNameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: customTheme.colors.surfaceVariant,
  },
  monthNavText: {
    fontSize: 16,
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
  monthButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
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
  monthStatusIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  monthIndicatorItem: {
    alignItems: 'center',
    gap: 4,
  },
  monthIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  monthIndicatorText: {
    fontSize: 10,
    color: customTheme.colors.onSurfaceVariant,
  },
  monthIndicatorTextSelected: {
    fontWeight: '600',
    color: customTheme.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: '80%',
    maxHeight: '70%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: customTheme.colors.onSurface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.outline,
  },
  monthList: {
    maxHeight: 400,
  },
  monthPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  monthPickerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  monthPickerText: {
    flex: 1,
    fontSize: 16,
    color: customTheme.colors.onSurface,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: customTheme.colors.onSurface,
    marginBottom: 12,
    marginTop: 8,
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
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
});
