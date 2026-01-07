import React, { useEffect, useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import {
    Surface,
    Text,
    Card,
    ActivityIndicator,
} from 'react-native-paper';
import { ref, onValue } from 'firebase/database';
import { dbRealTime } from '../../../../../firebase';
import ModernHeader from '../../../../assets/components/ModernHeader';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../../theme/theme';
import { useUser } from '../../../../contexts/userContext';

type ChecklistStatus = 'Pendente' | 'Em Andamento' | 'Concluído' | 'Concluído com NC';

interface ChecklistLocation {
    id: string;
    name: string;
    status: ChecklistStatus;
    lastUpdate?: string;
    monthlyStatus?: Record<number, ChecklistStatus>;
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
    }>;
    locations: ChecklistLocation[];
}

interface SavedChecklistData {
    [year: string]: {
        [checklistId: string]: {
            [locationId: string]: {
                monthlyFormData: {
                    [periodNumber: number]: {
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

export default function CheckListScreen({ navigation }: any) {
    const { userInfo } = useUser();
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [savedData, setSavedData] = useState<SavedChecklistData>({});
    const [checklists, setChecklists] = useState<ChecklistDefinition[]>([]);
    const [loadingDefinitions, setLoadingDefinitions] = useState(true);

    // Mapear ícones Lucide para MaterialCommunityIcons
    const getIconName = (lucideIcon: string): string => {
        const iconMap: Record<string, string> = {
            'Droplet': 'water',
            'Droplets': 'water-outline',
            'Recycle': 'recycle',
            'AlertTriangle': 'alert-triangle',
            'ShieldAlert': 'shield-alert',
            'Shield': 'shield',
            'Package': 'package-variant',
            'Boxes': 'package-variant-closed',
            'Archive': 'archive',
            'Warehouse': 'warehouse',
            'ClipboardCheck': 'clipboard-check',
            'ClipboardList': 'clipboard-text',
            'Container': 'package',
            'Lock': 'lock',
            'Leaf': 'leaf',
        };
        
        return iconMap[lucideIcon] || 'clipboard-check';
    };

    // Buscar definições dos checklists do Firebase
    useEffect(() => {
        const definitionsRef = ref(dbRealTime(), 'checklists-config');

        const unsubscribe = onValue(definitionsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                // Filtrar apenas checklists "QSMS - Meio Ambiente"
                const filteredChecklists = Object.values(data)
                    .filter((checklist: any) => checklist.category === 'QSMS - Meio Ambiente')
                    .map((checklist: any) => checklist as ChecklistDefinition);
                
                setChecklists(filteredChecklists);
                console.log('Checklists Meio Ambiente carregados:', filteredChecklists);
            } else {
                console.log('Nenhum checklist encontrado');
                setChecklists([]);
            }
            setLoadingDefinitions(false);
        });

        return () => unsubscribe();
    }, []);

    // Função para converter semanas em meses (para checklists semanais)
    const getMonthFromWeek = (weekNumber: number): number => {
        return Math.ceil(weekNumber / 4);
    };

    // Função para converter status semanal em mensal
    const getMonthlyStatusFromWeekly = (
        weeklyStatus: Record<number, ChecklistStatus>
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
                const savedDataForLocation = savedData[year]?.[checklist.id]?.[location.id];
                
                if (savedDataForLocation) {
                    // Pegar status mensal (convertendo de semanal se necessário)
                    let displayMonthlyStatus = savedDataForLocation.monthlyStatus || {};
                    
                    if (checklist.frequency === 'Semanal' && savedDataForLocation.monthlyStatus) {
                        displayMonthlyStatus = getMonthlyStatusFromWeekly(
                            savedDataForLocation.monthlyStatus
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

    // Buscar dados salvos dos checklists
    useEffect(() => {
        const year = selectedMonth.getFullYear().toString();
        const checklistsRef = ref(dbRealTime(), `checklists/${year}`);
        
        const unsubscribe = onValue(checklistsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setSavedData(prev => ({
                    ...prev,
                    [year]: data,
                }));
            } else {
                setSavedData(prev => ({
                    ...prev,
                    [year]: {},
                }));
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [selectedMonth]);

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
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
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
                    onPress={goToPreviousMonth}
                >
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

                <TouchableOpacity
                    style={styles.monthNavButton}
                    onPress={goToNextMonth}
                >
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color={customTheme.colors.primary}
                    />
                </TouchableOpacity>
            </View>
        );
    };

    const MonthIndicators = ({ monthlyStatus }: { monthlyStatus?: Record<number, ChecklistStatus> }) => {
        const monthsShort = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
        
        return (
            <View style={styles.monthIndicators}>
                {monthsShort.map((monthLetter, index) => {
                    const month = index + 1;
                    const status = monthlyStatus?.[month] || 'Pendente';
                    const color = getStatusColor(status);
                    
                    return (
                        <View
                            key={month}
                            style={[styles.monthBadge, { backgroundColor: color }]}
                        >
                            <Text style={styles.monthBadgeText}>{monthLetter}</Text>
                        </View>
                    );
                })}
            </View>
        );
    };

    const LocationCard = ({ 
        location, 
        checklistId,
        checklistTitle,
        checklistIcon,
        checklistFrequency
    }: { 
        location: ChecklistLocation; 
        checklistId: string;
        checklistTitle: string;
        checklistIcon: string;
        checklistFrequency: string;
    }) => {
        const statusColor = getStatusColor(location.status);

        return (
            <TouchableOpacity 
                style={styles.locationCard}
                activeOpacity={0.7}
                onPress={() => {
                    navigation.navigate('ChecklistForm', {
                        checklistId,
                        checklistTitle,
                        checklistIcon,
                        checklistFrequency,
                        location,
                        selectedMonth
                    });
                }}
            >
                <View style={styles.locationHeader}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={styles.locationName} numberOfLines={2}>
                        {location.name}
                    </Text>
                </View>
                
                <MonthIndicators monthlyStatus={location.monthlyStatus} />
            </TouchableOpacity>
        );
    };

    if (loading || loadingDefinitions) {
        return (
            <Surface style={styles.container}>
                <ModernHeader
                    title="Checklist Meio Ambiente"
                    iconName="leaf"
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
                title="Checklist Meio Ambiente"
                iconName="leaf"
                onBackPress={() => navigation.goBack()}
            />

            <MonthNavigator />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {checklists.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                            name="clipboard-alert-outline"
                            size={64}
                            color={customTheme.colors.outline}
                        />
                        <Text style={styles.emptyText}>
                            Nenhum checklist encontrado
                        </Text>
                    </View>
                ) : (
                    checklists.map(checklist => {
                        const completedCount = checklist.locations.filter(
                            loc => loc.status === 'Concluído' || loc.status === 'Concluído com NC'
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
                                            />
                                        ))}
                                    </View>
                                </Card.Content>
                            </Card>
                        );
                    })
                )}
            </ScrollView>
        </Surface>
    );
}

const styles = StyleSheet.create({
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
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 8,
        padding: 10,
        gap: 8,
    },
    locationHeader: {
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
    monthIndicators: {
        flexDirection: 'row',
        gap: 3,
        flexWrap: 'wrap',
        paddingLeft: 16,
    },
    monthBadge: {
        width: 18,
        height: 18,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthBadgeText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});