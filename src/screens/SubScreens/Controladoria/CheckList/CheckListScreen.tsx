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
import { CHECKLIST_DEFINITIONS } from './types/ChecklistTypes';

type ChecklistStatus = 'Pendente' | 'Em Andamento' | 'Concluído' | 'Concluído com NC';

interface ChecklistLocation {
    id: string;
    name: string;
    status: ChecklistStatus;
    lastUpdate?: string;
    weeklyStatus?: Record<number, ChecklistStatus>;
}

interface ChecklistDefinition {
    id: string;
    title: string;
    description: string;
    icon: string;
    locations: ChecklistLocation[];
}

interface SavedChecklistData {
    [dateKey: string]: {
        [checklistId: string]: {
            [locationId: string]: {
                status: ChecklistStatus;
                lastUpdate: string;
                weeklyStatus: Record<number, ChecklistStatus>;
                responsavel?: string;
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

    const getDateKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

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

    const updateChecklistsWithData = () => {
        const dateKey = getDateKey(selectedMonth);
        const updatedChecklists = Object.values(CHECKLIST_DEFINITIONS).map(checklist => ({
            ...checklist,
            locations: checklist.locations.map(location => {
                const savedDataForLocation = savedData[dateKey]?.[checklist.id]?.[location.id];
                
                if (savedDataForLocation) {
                    return {
                        ...location,
                        status: savedDataForLocation.status,
                        lastUpdate: savedDataForLocation.lastUpdate,
                        weeklyStatus: savedDataForLocation.weeklyStatus || {},
                    };
                }
                
                return {
                    ...location,
                    status: 'Pendente' as ChecklistStatus,
                    lastUpdate: '',
                    weeklyStatus: {},
                };
            }),
        }));

        setChecklists(updatedChecklists);
    };

    useEffect(() => {
        const year = selectedMonth.getFullYear();
        const month = String(selectedMonth.getMonth() + 1).padStart(2, '0');
        
        const checklistsRef = ref(dbRealTime(), `checklists/${year}/${month}`);
        
        const unsubscribe = onValue(checklistsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setSavedData(prev => ({
                    ...prev,
                    [`${year}-${month}`]: data,
                }));
            } else {
                setSavedData(prev => ({
                    ...prev,
                    [`${year}-${month}`]: {},
                }));
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [selectedMonth]);

    useEffect(() => {
        updateChecklistsWithData();
    }, [selectedMonth, savedData]);

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

    const WeekIndicators = ({ weeklyStatus }: { weeklyStatus?: Record<number, ChecklistStatus> }) => {
        return (
            <View style={styles.weekIndicators}>
                {[1, 2, 3, 4].map(week => {
                    const status = weeklyStatus?.[week] || 'Pendente';
                    const color = getStatusColor(status);
                    
                    return (
                        <View
                            key={week}
                            style={[styles.weekBadge, { backgroundColor: color }]}
                        >
                            <Text style={styles.weekBadgeText}>{week}</Text>
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
        checklistIcon
    }: { 
        location: ChecklistLocation; 
        checklistId: string;
        checklistTitle: string;
        checklistIcon: string;
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
                        location,
                        selectedMonth
                    });
                }}
            >
                <View style={styles.locationContent}>
                    <View style={styles.locationLeft}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={styles.locationName} numberOfLines={1}>
                            {location.name}
                        </Text>
                    </View>
                    
                    <WeekIndicators weeklyStatus={location.weeklyStatus} />
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <Surface style={styles.container}>
                <ModernHeader
                    title="Check-List"
                    iconName="clipboard-check"
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
                title="Check-List"
                iconName="clipboard-check"
                onBackPress={() => navigation.goBack()}
            />

            <MonthNavigator />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {checklists.map(checklist => {
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
                                            name={checklist.icon}
                                            size={20}
                                            color={customTheme.colors.primary}
                                        />
                                        <Text style={styles.checklistTitle} numberOfLines={1}>
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
                                        />
                                    ))}
                                </View>
                            </Card.Content>
                        </Card>
                    );
                })}
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
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    checklistTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        flex: 1,
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
    },
    locationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    locationLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    locationName: {
        fontSize: 14,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    weekIndicators: {
        flexDirection: 'row',
        gap: 4,
    },
    weekBadge: {
        width: 20,
        height: 20,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    weekBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});