import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Card,
    Surface,
    Text
} from 'react-native-paper';
import { off, onValue, ref, remove, set } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';

import CreateMeetingModal from './components/CreateMeetingModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MeetingDetailsModal from './components/MeetingDetailsModal';
import MeetingItem from './components/MeetingItem';
import ModernHeader from '../../assets/components/ModernHeader';
import { customTheme } from '../../theme/theme';
import dayjs from 'dayjs';
import { dbRealTime } from '../../../firebase';
import { showGlobalToast } from '../../helpers/GlobalApi';
import { useUser } from '../../contexts/userContext';

interface Meeting {
    id: string;
    assunto: string;
    name: string;
    entrada: string;
    saida: string;
    date: string;
    sala: string;
}

export default function MeetingsScreen({ navigation }: any) {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const { userInfo } = useUser();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [creatingMeeting, setCreatingMeeting] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | undefined>();
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null); // Para filtrar por sala

    // Keep track of active listeners
    const activeListenerRef = useRef<(() => void) | null>(null);

    // Date change handler
    const handleDateChange = (event: any, date?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (date) {
            setSelectedDate(date);
            const formattedDate = dayjs(date).format('YYYYMMDD');

            // Clean up previous listener if exists
            if (activeListenerRef.current) {
                activeListenerRef.current();
            }

            // Set new listener
            const unsubscribe = fetchMeetings(formattedDate);
            if (typeof unsubscribe === 'function') {
                activeListenerRef.current = unsubscribe;
            }
        }
    };

    // Fetch meetings for a specific date from Firebase Realtime Database
    const fetchMeetings = (date: string): (() => void) => {
        try {
            setLoading(true);

            // Create reference to meetings node
            const meetingsRef = ref(dbRealTime(), '/meetings');
            const onValueChange = onValue(meetingsRef, snapshot => {
                const data = snapshot.val();
                const loadedMeetings: Meeting[] = [];

                if (data) {
                    Object.keys(data).forEach((key) => {
                        const meetingData = data[key];
                        const meeting: Meeting = {
                            ...meetingData,
                            id: key,
                        };
                        loadedMeetings.push(meeting);
                    });

                    // Filter meetings for the specific date
                    const filteredMeetings = loadedMeetings.filter((meeting) => meeting.date === date);

                    // Sort meetings by entry time
                    const sortedMeetings = filteredMeetings.sort((a, b) => {
                        const timeA = a.entrada.split(':').map(Number);
                        const timeB = b.entrada.split(':').map(Number);

                        if (timeA[0] !== timeB[0]) {
                            return timeA[0] - timeB[0]; // Compare hours
                        } else {
                            return timeA[1] - timeB[1]; // If hours are equal, compare minutes
                        }
                    });

                    // Update the local state of meetings with the sorted list
                    setMeetings(sortedMeetings);
                } else {
                    console.log('No meetings found.');
                    setMeetings([]);
                }
                setLoading(false);
            });

            // Return cleanup function
            return () => off(meetingsRef, 'value', onValueChange);
        } catch (error) {
            console.error('Error loading meetings from Realtime Database: ', error);
            showGlobalToast('error', 'Erro', 'Não foi possível carregar as reuniões', 3000);
            setLoading(false);

            // Return empty cleanup function in case of error
            return () => { };
        }
    };

    const handleDeleteMeeting = async (meetingId: string) => {
        try {
            await remove(ref(dbRealTime(), `/meetings/${meetingId}`));

            showGlobalToast('success', 'Sucesso', 'Reunião excluída com sucesso', 3000);

            // Refresh meetings after deletion
            const formattedDate = dayjs(selectedDate).format('YYYYMMDD');
            if (activeListenerRef.current) {
                activeListenerRef.current();
            }
            const unsubscribe = fetchMeetings(formattedDate);
            if (typeof unsubscribe === 'function') {
                activeListenerRef.current = unsubscribe;
            }

            return Promise.resolve();
        } catch (error) {
            console.error('Erro ao excluir reunião:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível excluir a reunião', 3000);
            return Promise.reject(error);
        }
    };

    // Abrir modal para criar nova reunião
    const handleAddMeeting = () => {
        setCreatingMeeting(true);
    };

    // Criar reunião a partir dos dados da modal
    const handleCreateMeetingFromModal = async (meetingData: {
        assunto: string;
        selectedDate: Date;
        selectedTime: Date;
        selectedEndTime: Date;
        selectedRoom: string;
    }) => {
        setLoading(true);

        try {
            // Formatar dados recebidos do modal
            const currentDate = dayjs(meetingData.selectedDate).format('YYYYMMDD');
            const horaEntrada = dayjs(meetingData.selectedTime).format('HH:mm');
            const horaSaida = dayjs(meetingData.selectedEndTime).format('HH:mm');

            // Validações
            if (horaEntrada < '07:00' || horaEntrada > '17:00') {
                showGlobalToast('error', 'Erro', 'Selecione um horário entre 7h e 17h', 3000);
                setLoading(false);
                return;
            }

            if (horaSaida <= horaEntrada) {
                showGlobalToast('error', 'Erro', 'O horário de término deve ser após o início', 3000);
                setLoading(false);
                return;
            }

            // Verificar conflitos
            const conflictingMeeting = meetings.find((meeting) => {
                return (
                    meeting.sala === meetingData.selectedRoom &&
                    meeting.date === currentDate &&
                    ((meeting.entrada <= horaEntrada && meeting.saida > horaEntrada) ||
                        (meeting.entrada < horaSaida && meeting.saida >= horaSaida) ||
                        (horaEntrada <= meeting.entrada && horaSaida > meeting.entrada))
                );
            });

            if (conflictingMeeting) {
                showGlobalToast('error', 'Erro', `${meetingData.selectedRoom} já está ocupada das ${conflictingMeeting.entrada} às ${conflictingMeeting.saida}.`, 3000);
                setLoading(false);
                return;
            }

            // Criar a nova reunião
            const novaReuniao = {
                id: generateUniqueId(),
                name: userInfo?.user || '',
                entrada: horaEntrada,
                saida: horaSaida,
                date: currentDate,
                assunto: meetingData.assunto,
                sala: meetingData.selectedRoom
            };

            // Salvar a nova reunião no Realtime Database
            await set(ref(dbRealTime(), `/meetings/${novaReuniao.id}`), novaReuniao);

            setCreatingMeeting(false);
            showGlobalToast('success', 'Sucesso', 'Reunião criada com sucesso!', 3000);

            // Recarregar reuniões
            if (activeListenerRef.current) {
                activeListenerRef.current();
            }
            const unsubscribe = fetchMeetings(currentDate);
            if (typeof unsubscribe === 'function') {
                activeListenerRef.current = unsubscribe;
            }
        } catch (error) {
            console.error('Erro ao criar reunião:', error);
            showGlobalToast('error', 'Erro', 'Erro ao criar reunião. Tente novamente mais tarde.', 3000);
        } finally {
            setLoading(false);
        }
    };

    // Gerar ID único para nova reunião
    const generateUniqueId = () => {
        return Math.random().toString(36).substring(2, 15);
    };

    // Lista de salas disponíveis
    const rooms = ['Sala de reunião 1', 'Sala de reunião 2', 'Sala de reunião 3'];

    // Obter reuniões filtradas por sala (se selecionada)
    const getFilteredMeetings = () => {
        if (selectedRoom) {
            return meetings.filter(meeting => meeting.sala === selectedRoom);
        }
        return meetings;
    };

    // Format date for display
    const formatDate = (date: Date): string => {
        return dayjs(date).format('DD/MM/YYYY');
    };

    // Load initial data
    useEffect(() => {
        // Get the current date
        const currentDate = new Date();
        setSelectedDate(currentDate);
        const formattedDate = dayjs(currentDate).format('YYYYMMDD');
        const unsubscribe = fetchMeetings(formattedDate);

        if (typeof unsubscribe === 'function') {
            activeListenerRef.current = unsubscribe;
        }

        // Clean up listener when component unmounts
        return () => {
            if (activeListenerRef.current) {
                activeListenerRef.current();
            }
        };
    }, []);

    // Navegar para visualizar/editar uma reunião existente
    const handleMeetingPress = (meeting: Meeting) => {
        setSelectedMeeting(meeting);
    };

    // Lista filtrada de reuniões
    const filteredMeetings = getFilteredMeetings();

    return (
        <Surface style={styles.container}>
            <ModernHeader
                title="Reuniões"
                iconName="presentation"
                onBackPress={() => navigation.goBack()}
            />

            <View style={styles.content}>
                {/* Seção superior com botão de adicionar */}
                <View style={styles.headerSection}>
                    <View style={styles.datePickerContainer}>
                        <TouchableOpacity
                            style={styles.datePickerButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <MaterialCommunityIcons name="calendar" size={22} color={customTheme.colors.primary} />
                            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
                        </TouchableOpacity>
                    </View>

                    {selectedDate >= new Date(new Date().setHours(0, 0, 0, 0)) && (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleAddMeeting}
                        >
                            <MaterialCommunityIcons
                                name="plus"
                                size={22}
                                color={customTheme.colors.onPrimary || '#ffffff'}
                            />
                            <Text style={styles.addButtonText}>Nova Reunião</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Visualização de salas */}
                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={customTheme.colors.primary} />
                        <Text style={styles.loaderText}>Carregando reuniões...</Text>
                    </View>
                ) : (
                    <View style={styles.roomsContainer}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {rooms.map((roomName) => {
                                const roomMeetings = meetings.filter(m => m.sala === roomName);
                                return (
                                    <Card key={roomName} style={styles.roomCard}>
                                        <View style={styles.roomCardHeader}>
                                            <MaterialCommunityIcons
                                                name="door-open"
                                                size={20}
                                                color={customTheme.colors.primary}
                                            />
                                            <Text style={styles.roomTitle}>{roomName}</Text>
                                        </View>

                                        <Card.Content style={styles.roomCardContent}>
                                            {roomMeetings.length === 0 ? (
                                                <View style={styles.emptyRoomMessage}>
                                                    <MaterialCommunityIcons
                                                        name="check-circle-outline"
                                                        size={24}
                                                        color={customTheme.colors.primary}
                                                    />
                                                    <Text style={styles.emptyRoomText}>
                                                        Sala disponível para reserva
                                                    </Text>
                                                </View>
                                            ) : (
                                                <View>
                                                    {roomMeetings.map((meeting) => (
                                                        <MeetingItem
                                                            key={meeting.id}
                                                            meeting={meeting}
                                                            onPress={() => handleMeetingPress(meeting)}
                                                            isUserMeeting={meeting.name === userInfo?.user}
                                                        />
                                                    ))}
                                                </View>
                                            )}
                                        </Card.Content>
                                    </Card>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Date Picker Modal */}
                {showDatePicker && (
                    <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                    />
                )}

                {/* Meeting creation modal */}
                <CreateMeetingModal
                    visible={creatingMeeting}
                    onClose={() => setCreatingMeeting(false)}
                    onCreateMeeting={handleCreateMeetingFromModal}
                    selectedDate={selectedDate}
                    isLoading={loading}
                />

                {/* Meeting details modal */}
                <MeetingDetailsModal
                    visible={!!selectedMeeting}
                    onClose={() => setSelectedMeeting(undefined)}
                    meeting={{
                        id: selectedMeeting?.id || '',
                        assunto: selectedMeeting?.assunto || '',
                        date: selectedMeeting ? new Date(
                            parseInt(selectedMeeting.date.substring(0, 4)),
                            parseInt(selectedMeeting.date.substring(4, 6)) - 1,
                            parseInt(selectedMeeting.date.substring(6, 8))
                        ) : new Date(),
                        startTime: selectedMeeting ? (() => {
                            const [hours, minutes] = selectedMeeting.entrada.split(':').map(Number);
                            const date = new Date();
                            date.setHours(hours, minutes, 0);
                            return date;
                        })() : new Date(),
                        endTime: selectedMeeting ? (() => {
                            const [hours, minutes] = selectedMeeting.saida.split(':').map(Number);
                            const date = new Date();
                            date.setHours(hours, minutes, 0);
                            return date;
                        })() : new Date(),
                        room: selectedMeeting?.sala || '',
                        createdBy: selectedMeeting?.name || '',
                    }}
                    currentUser={userInfo!}
                    onDelete={handleDeleteMeeting}
                />
            </View>
        </Surface>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background || '#F8F9FA',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    headerSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    datePickerContainer: {
        flex: 1,
        marginRight: 16,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: customTheme.colors.surface || '#FFFFFF',
        borderWidth: 1,
        borderColor: customTheme.colors.outline || '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    dateText: {
        fontSize: 16, fontWeight: '600',
        color: customTheme.colors.onSurface || '#333333',
        marginLeft: 8,
        fontFamily: 'Roboto-Medium',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.primary || '#005CFF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    addButtonText: {
        color: customTheme.colors.onPrimary || '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 8,
        fontFamily: 'Roboto-Medium',
    },
    roomsContainer: {
        flex: 1,
    },
    roomCard: {
        marginBottom: 20,
        borderRadius: 8,
        backgroundColor: customTheme.colors.surface || '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        elevation: 4,
    },
    roomCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: customTheme.colors.surfaceVariant || '#F1F4FF',
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outlineVariant || '#E0E0E0',
    },
    roomTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: customTheme.colors.onSurface || '#333333',
        marginLeft: 8,
        fontFamily: 'Roboto-Bold',
    },
    roomCardContent: {
        padding: 16,
    },
    emptyRoomMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: customTheme.colors.primaryContainer + '20' || '#E6F0FF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customTheme.colors.primary + '10' || '#B3D4FF',
    },
    emptyRoomText: {
        fontSize: 16,
        marginLeft: 10,
        color: customTheme.colors.primary || '#005CFF',
        fontWeight: '500',
        fontFamily: 'Roboto-Medium',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loaderText: {
        marginTop: 16,
        color: customTheme.colors.onSurfaceVariant || '#666666',
        fontSize: 16,
        fontWeight: '500',
        fontFamily: 'Roboto-Medium',
    },
});