import React, { useState, useEffect } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import {
    Surface,
    Text,
    Card,
    RadioButton,
    ActivityIndicator,
} from 'react-native-paper';
import { ref, onValue, set } from 'firebase/database';
import { dbRealTime } from '../../../../../../firebase';
import ModernHeader from '../../../../../assets/components/ModernHeader';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../../../theme/theme';
import { useUser } from '../../../../../contexts/userContext';
import { CHECKLIST_DEFINITIONS } from '.././types/ChecklistTypes';

type ConformityStatus = 'C' | 'NC' | '';

interface Question {
    id: string;
    label: string;
    quantidade?: string;
}

interface WeekData {
    items: Record<string, ConformityStatus>;
    observacoes: string;
}

interface FormData {
    weeks: Record<number, WeekData>;
}

export default function ChecklistFormScreen({ route, navigation }: any) {
    const { checklistId, checklistTitle, checklistIcon, location, selectedMonth } = route.params;
    const { userInfo } = useUser();
    
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    
    const [formData, setFormData] = useState<FormData>({
        weeks: {
            1: { items: {}, observacoes: '' },
            2: { items: {}, observacoes: '' },
            3: { items: {}, observacoes: '' },
            4: { items: {}, observacoes: '' },
        }
    });

    useEffect(() => {
        loadQuestions();
        loadSavedData();
    }, []);

    const loadQuestions = async () => {
        const checklistDef = CHECKLIST_DEFINITIONS[checklistId];
        if (checklistDef && checklistDef.questions) {
            setQuestions(checklistDef.questions);
        }
        setLoading(false);
    };

    const loadSavedData = () => {
        const year = selectedMonth.getFullYear();
        const month = String(selectedMonth.getMonth() + 1).padStart(2, '0');
        
        const dataRef = ref(
            dbRealTime(), 
            `checklists/${year}/${month}/${checklistId}/${location.id}`
        );
        
        onValue(dataRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                if (data.weeklyFormData) {
                    const weeks: Record<number, WeekData> = {};
                    
                    for (let week = 1; week <= 4; week++) {
                        weeks[week] = data.weeklyFormData[week] || {
                            items: {},
                            observacoes: ''
                        };
                    }
                    
                    setFormData({ weeks });
                }
            }
        });
    };

    const getStatusColor = (status: ConformityStatus) => {
        switch (status) {
            case 'C':
                return '#4CAF50';
            case 'NC':
                return '#F44336';
            default:
                return '#9E9E9E';
        }
    };

    const calculateWeekStatus = (weekData: WeekData): 'Pendente' | 'Em Andamento' | 'Concluído' | 'Concluído com NC' => {
        const items = Object.values(weekData.items);
        if (items.length === 0) return 'Pendente';
        
        const answered = items.filter(i => i !== '').length;
        const total = questions.length;
        const hasNC = items.includes('NC');
        
        if (answered === 0) return 'Pendente';
        if (answered < total) return 'Em Andamento';
        if (hasNC) return 'Concluído com NC';
        return 'Concluído';
    };

    const handleItemChange = (questionId: string, value: ConformityStatus) => {
        setFormData(prev => ({
            weeks: {
                ...prev.weeks,
                [selectedWeek]: {
                    ...prev.weeks[selectedWeek],
                    items: {
                        ...prev.weeks[selectedWeek].items,
                        [questionId]: value
                    }
                }
            }
        }));
    };

    const handleObservacoesChange = (text: string) => {
        setFormData(prev => ({
            weeks: {
                ...prev.weeks,
                [selectedWeek]: {
                    ...prev.weeks[selectedWeek],
                    observacoes: text
                }
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        
        try {
            const year = selectedMonth.getFullYear();
            const month = String(selectedMonth.getMonth() + 1).padStart(2, '0');
            
            const weeklyStatus: Record<number, string> = {};
            for (let week = 1; week <= 4; week++) {
                weeklyStatus[week] = calculateWeekStatus(formData.weeks[week]);
            }
            
            const overallStatus = Object.values(weeklyStatus).every(s => s === 'Pendente')
                ? 'Pendente'
                : Object.values(weeklyStatus).every(s => s === 'Concluído' || s === 'Concluído com NC')
                    ? Object.values(weeklyStatus).some(s => s === 'Concluído com NC')
                        ? 'Concluído com NC'
                        : 'Concluído'
                    : 'Em Andamento';
            
            const saveData = {
                status: overallStatus,
                lastUpdate: new Date().toISOString(),
                weeklyStatus,
                weeklyFormData: formData.weeks,
                responsavel: userInfo?.user || 'Desconhecido'
            };
            
            const dataRef = ref(
                dbRealTime(), 
                `checklists/${year}/${month}/${checklistId}/${location.id}`
            );
            
            await set(dataRef, saveData);
            
            Alert.alert('Sucesso', 'Checklist salvo com sucesso!');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Erro', 'Falha ao salvar checklist');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const WeekSelector = () => (
        <View style={styles.weekSelector}>
            {[1, 2, 3, 4].map(week => {
                const isSelected = selectedWeek === week;
                const weekStatus = calculateWeekStatus(formData.weeks[week]);
                const statusColor = getStatusColor(
                    weekStatus === 'Concluído' ? 'C' : 
                    weekStatus === 'Concluído com NC' ? 'NC' : ''
                );
                
                return (
                    <TouchableOpacity
                        key={week}
                        style={[
                            styles.weekButton,
                            isSelected && styles.weekButtonSelected,
                            { borderColor: isSelected ? customTheme.colors.primary : '#E0E0E0' }
                        ]}
                        onPress={() => setSelectedWeek(week)}
                    >
                        <View style={[styles.weekDot, { backgroundColor: statusColor }]} />
                        <Text style={[
                            styles.weekButtonText,
                            isSelected && styles.weekButtonTextSelected
                        ]}>
                            Semana {week}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    const QuestionCard = ({ question }: { question: Question }) => {
        const currentValue = formData.weeks[selectedWeek].items[question.id] || '';
        const statusColor = getStatusColor(currentValue);

        return (
            <Card style={[styles.questionCard, { borderColor: statusColor }]}>
                <View style={styles.questionContent}>
                    <View style={styles.questionHeader}>
                        <MaterialCommunityIcons
                            name={currentValue === 'C' ? 'check-circle' : currentValue === 'NC' ? 'close-circle' : 'circle-outline'}
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
                            onPress={() => handleItemChange(question.id, 'C')}
                        >
                            <RadioButton
                                value="C"
                                status={currentValue === 'C' ? 'checked' : 'unchecked'}
                                onPress={() => handleItemChange(question.id, 'C')}
                                color="#4CAF50"
                            />
                            <Text style={[
                                styles.radioLabel,
                                currentValue === 'C' && { color: '#4CAF50', fontWeight: '600' }
                            ]}>
                                Conforme
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.radioOption}
                            onPress={() => handleItemChange(question.id, 'NC')}
                        >
                            <RadioButton
                                value="NC"
                                status={currentValue === 'NC' ? 'checked' : 'unchecked'}
                                onPress={() => handleItemChange(question.id, 'NC')}
                                color="#F44336"
                            />
                            <Text style={[
                                styles.radioLabel,
                                currentValue === 'NC' && { color: '#F44336', fontWeight: '600' }
                            ]}>
                                Não Conforme
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
                    iconName={checklistIcon}
                    onBackPress={() => navigation.goBack()}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customTheme.colors.primary} />
                </View>
            </Surface>
        );
    }

    const hasNonConforming = Object.values(formData.weeks[selectedWeek].items).includes('NC');

    return (
        <Surface style={styles.container}>
            <ModernHeader
                title={checklistTitle}
                iconName={checklistIcon}
                onBackPress={() => navigation.goBack()}
                rightButton={{
                    icon: 'content-save',
                    onPress: handleSave,
                    loading: saving
                }}
            />

            <View style={styles.locationBanner}>
                <MaterialCommunityIcons
                    name="map-marker"
                    size={16}
                    color={customTheme.colors.primary}
                />
                <Text style={styles.locationText}>{location.name}</Text>
            </View>

            <WeekSelector />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
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
                        value={formData.weeks[selectedWeek].observacoes}
                        onChangeText={handleObservacoesChange}
                        textAlignVertical="top"
                    />
                </Card>

                {hasNonConforming && (
                    <Card style={styles.warningCard}>
                        <View style={styles.warningContent}>
                            <MaterialCommunityIcons
                                name="alert"
                                size={20}
                                color="#F57C00"
                            />
                            <Text style={styles.warningText}>
                                Existem itens não conformes. Adicione observações detalhando as não conformidades.
                            </Text>
                        </View>
                    </Card>
                )}

                <View style={{ height: 20 }} />
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
    },
    weekSelector: {
        flexDirection: 'row',
        padding: 12,
        gap: 8,
        backgroundColor: customTheme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outline,
    },
    weekButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 10,
        borderRadius: 8,
        borderWidth: 2,
        backgroundColor: '#FFF',
    },
    weekButtonSelected: {
        backgroundColor: customTheme.colors.primaryContainer,
    },
    weekDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    weekButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    weekButtonTextSelected: {
        fontWeight: '600',
        color: customTheme.colors.primary,
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
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    questionText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    quantidadeText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 8,
    },
    radioGroup: {
        flexDirection: 'row',
        gap: 16,
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