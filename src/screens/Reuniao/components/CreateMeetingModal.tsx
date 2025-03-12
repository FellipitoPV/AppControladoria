import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    Animated,
    Dimensions
} from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { customTheme } from '../../../theme/theme';

const { height } = Dimensions.get('window');

interface CreateMeetingModalProps {
    visible: boolean;
    onClose: () => void;
    onCreateMeeting: (meetingData: {
        assunto: string;
        selectedDate: Date;
        selectedTime: Date;
        selectedEndTime: Date;
        selectedRoom: string;
    }) => void;
    selectedDate: Date;
    isLoading: boolean;
}

const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
    visible,
    onClose: closeProp,
    onCreateMeeting,
    selectedDate,
    isLoading
}) => {
    // Create a wrapper for close to handle animation
    const [isClosing, setIsClosing] = useState(false);

    // Animation refs
    const slideAnim = useRef(new Animated.Value(height)).current;
    const roomIconAnim = useRef({
        room1: new Animated.Value(1),
        room2: new Animated.Value(1),
        room3: new Animated.Value(1)
    }).current;

    // Form states
    const [assunto, setAssunto] = useState<string>("");
    const [errorAssunto, setErrorAssunto] = useState<boolean>(false);
    const [selectedTime, setSelectedTime] = useState<Date | null>(null);
    const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<string>("Sala de reunião 1");

    // Time pickers visibility
    const [showStartTimePicker, setShowStartTimePicker] = useState<boolean>(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState<boolean>(false);

    const onClose = () => {
        setIsClosing(true);

        // Animação de saída
        Animated.spring(slideAnim, {
            toValue: height,
            useNativeDriver: true,
            tension: 65,
            friction: 7,
            velocity: 5
        }).start();

        // Definir um tempo fixo para fechar o modal (300ms)
        setTimeout(() => {
            setIsClosing(false);
            closeProp();
        }, 300);
    };

    // Handle modal visibility with animation
    useEffect(() => {
        if (visible) {
            // Reset form fields
            setAssunto("");
            setErrorAssunto(false);

            // Set default times (9:00 AM and 10:00 AM)
            const defaultStartTime = new Date(selectedDate);
            defaultStartTime.setHours(9, 0, 0);
            setSelectedTime(defaultStartTime);

            const defaultEndTime = new Date(selectedDate);
            defaultEndTime.setHours(10, 0, 0);
            setSelectedEndTime(defaultEndTime);

            // Play slide-in animation
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11
            }).start();

            // Animate the default room button (Sala 1) after a brief delay
            setTimeout(() => {
                Animated.spring(roomIconAnim.room1, {
                    toValue: 1.2,
                    friction: 3,
                    tension: 40,
                    useNativeDriver: true
                }).start();
            }, 300);
        }
    }, [visible, selectedDate]);

    // Reset error when assunto changes
    useEffect(() => {
        if (assunto.trim() !== '') {
            setErrorAssunto(false);
        }
    }, [assunto]);

    // Handle time selection
    const handleStartTimeChange = (event: any, selectedDate?: Date) => {
        setShowStartTimePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setSelectedTime(selectedDate);

            // If start time is set and end time isn't, set end time to start time + 1 hour
            if (!selectedEndTime) {
                const endTime = new Date(selectedDate);
                endTime.setHours(selectedDate.getHours() + 1);
                setSelectedEndTime(endTime);
            }
            // If end time is earlier than start time, adjust it
            else if (selectedEndTime <= selectedDate) {
                const endTime = new Date(selectedDate);
                endTime.setHours(selectedDate.getHours() + 1);
                setSelectedEndTime(endTime);
            }
        }
    };

    const handleEndTimeChange = (event: any, selectedDate?: Date) => {
        setShowEndTimePicker(Platform.OS === 'ios');
        if (selectedDate && selectedTime && selectedDate > selectedTime) {
            setSelectedEndTime(selectedDate);
        } else if (selectedDate && selectedTime) {
            // If end time is earlier than start time, show error or adjust
            const endTime = new Date(selectedTime);
            endTime.setHours(selectedTime.getHours() + 1);
            setSelectedEndTime(endTime);
        }
    };

    // Handle room selection with animation
    const handleRoomSelect = (room: string) => {
        setSelectedRoom(room);

        // Reset all animations
        Object.keys(roomIconAnim).forEach((key) => {
            Animated.timing(roomIconAnim[key as keyof typeof roomIconAnim], {
                toValue: 1,
                duration: 200,
                useNativeDriver: true
            }).start();
        });

        // Animate the selected room
        Animated.spring(roomIconAnim[roomToAnimKey(room)], {
            toValue: 1.2,
            friction: 3,
            tension: 40,
            useNativeDriver: true
        }).start();
    };

    // Map room names to animation keys
    const roomToAnimKey = (room: string): keyof typeof roomIconAnim => {
        switch (room) {
            case "Sala de reunião 1": return "room1";
            case "Sala de reunião 2": return "room2";
            case "Sala de reunião 3": return "room3";
            default: return "room1";
        }
    };

    // Create meeting handler
    const handleCreateMeeting = () => {
        // Validate inputs
        console.log("Criando reunião dentro da modal")
        if (!assunto.trim()) {
            setErrorAssunto(true);
            return;
        }

        if (!selectedTime || !selectedEndTime) {
            return;
        }

        // Call the create meeting function from props
        onCreateMeeting({
            assunto,
            selectedDate,
            selectedTime,
            selectedEndTime,
            selectedRoom
        });
    };

    // Format time for display
    const formatTime = (date: Date | null): string => {
        if (!date) return '--:--';
        return dayjs(date).format('HH:mm');
    };

    return (
        <Modal
            visible={visible || isClosing}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <Animated.View
                    style={[
                        styles.modalContainer,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeButton}
                        >
                            <Icon name="close" size={24} color={customTheme.colors.onSurface} />
                        </TouchableOpacity>

                        <Text style={styles.modalTitle}>Nova Reunião</Text>

                        <View style={styles.headerSpacer} />
                    </View>

                    <ScrollView
                        style={styles.modalContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Subject input */}
                        <View style={styles.inputSection}>
                            <Text style={styles.sectionTitle}>
                                <Icon name='text-box-outline' color={customTheme.colors.primary} size={24} />
                                {" "} Assunto da Reunião
                            </Text>
                            <TextInput
                                mode="outlined"
                                label="Assunto"
                                placeholder="Ex: Reunião de Planejamento"
                                value={assunto}
                                onChangeText={setAssunto}
                                error={errorAssunto}
                                style={styles.input}
                                theme={{ colors: { onSurface: customTheme.colors.onSurface } }}
                            />
                            {errorAssunto && (
                                <Text style={styles.errorText}>
                                    O assunto da reunião é obrigatório
                                </Text>
                            )}
                        </View>

                        {/* Date display */}
                        <View style={styles.dateDisplaySection}>
                            <Text style={styles.sectionTitle}>
                                <Icon name='calendar-month' color={customTheme.colors.primary} size={24} />
                                {" "} Data Selecionada
                            </Text>
                            <View style={styles.dateDisplayContainer}>
                                <Icon name="calendar" size={22} color={customTheme.colors.primary} />
                                <Text style={styles.dateDisplayText}>
                                    {dayjs(selectedDate).format('DD/MM/YYYY')}
                                </Text>
                            </View>
                        </View>

                        {/* Time selection */}
                        <View style={styles.timeSection}>
                            <Text style={styles.sectionTitle}>
                                <Icon name='clock-outline' color={customTheme.colors.primary} size={24} />
                                {" "} Horário da Reunião
                            </Text>
                            <View style={styles.timeSelectionContainer}>
                                <TouchableOpacity
                                    style={styles.timePickerButton}
                                    onPress={() => setShowStartTimePicker(true)}
                                >
                                    <Icon name="clock-start" size={22} color={customTheme.colors.primary} />
                                    <Text style={styles.timePickerText}>
                                        Início: {formatTime(selectedTime)}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.timePickerButton}
                                    onPress={() => setShowEndTimePicker(true)}
                                >
                                    <Icon name="clock-end" size={22} color={customTheme.colors.primary} />
                                    <Text style={styles.timePickerText}>
                                        Término: {formatTime(selectedEndTime)}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Time pickers */}
                            {showStartTimePicker && (
                                <DateTimePicker
                                    value={selectedTime || new Date()}
                                    mode="time"
                                    is24Hour={true}
                                    display="default"
                                    onChange={handleStartTimeChange}
                                    minimumDate={new Date(1990, 0, 1, 7, 0)} // 7 AM
                                    maximumDate={new Date(1990, 0, 1, 17, 0)} // 5 PM
                                />
                            )}

                            {showEndTimePicker && (
                                <DateTimePicker
                                    value={selectedEndTime || new Date()}
                                    mode="time"
                                    is24Hour={true}
                                    display="default"
                                    onChange={handleEndTimeChange}
                                    minimumDate={selectedTime || new Date()}
                                    maximumDate={new Date(1990, 0, 1, 18, 0)} // 6 PM
                                />
                            )}
                        </View>

                        {/* Room selection */}
                        <View style={styles.roomSection}>
                            <Text style={styles.sectionTitle}>
                                <Icon name='google-classroom' color={customTheme.colors.primary} size={24} />
                                {" "} Sala de Reunião
                            </Text>
                            <View style={styles.roomButtonsContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.roomButton,
                                        selectedRoom === "Sala de reunião 1" && styles.roomButtonActive
                                    ]}
                                    onPress={() => handleRoomSelect("Sala de reunião 1")}
                                >
                                    <Animated.View style={{
                                        transform: [
                                            { scale: roomIconAnim.room1 },
                                            {
                                                rotate: roomIconAnim.room1.interpolate({
                                                    inputRange: [1, 1.2],
                                                    outputRange: ['0deg', '25deg']
                                                })
                                            }
                                        ]
                                    }}>
                                        <Icon
                                            name="door-open"
                                            size={24}
                                            color={selectedRoom === "Sala de reunião 1"
                                                ? customTheme.colors.onPrimary
                                                : customTheme.colors.onSurface}
                                        />
                                    </Animated.View>
                                    <Text style={[
                                        styles.roomButtonText,
                                        selectedRoom === "Sala de reunião 1" && styles.roomButtonTextActive
                                    ]}>
                                        Sala 1
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.roomButton,
                                        selectedRoom === "Sala de reunião 2" && styles.roomButtonActive
                                    ]}
                                    onPress={() => handleRoomSelect("Sala de reunião 2")}
                                >
                                    <Animated.View style={{
                                        transform: [
                                            { scale: roomIconAnim.room2 },
                                            {
                                                rotate: roomIconAnim.room2.interpolate({
                                                    inputRange: [1, 1.2],
                                                    outputRange: ['0deg', '25deg']
                                                })
                                            }
                                        ]
                                    }}>
                                        <Icon
                                            name="door-open"
                                            size={24}
                                            color={selectedRoom === "Sala de reunião 2"
                                                ? customTheme.colors.onPrimary
                                                : customTheme.colors.onSurface}
                                        />
                                    </Animated.View>
                                    <Text style={[
                                        styles.roomButtonText,
                                        selectedRoom === "Sala de reunião 2" && styles.roomButtonTextActive
                                    ]}>
                                        Sala 2
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.roomButton,
                                        selectedRoom === "Sala de reunião 3" && styles.roomButtonActive
                                    ]}
                                    onPress={() => handleRoomSelect("Sala de reunião 3")}
                                >
                                    <Animated.View style={{
                                        transform: [
                                            { scale: roomIconAnim.room3 },
                                            {
                                                rotate: roomIconAnim.room3.interpolate({
                                                    inputRange: [1, 1.2],
                                                    outputRange: ['0deg', '25deg']
                                                })
                                            }
                                        ]
                                    }}>
                                        <Icon
                                            name="door-open"
                                            size={24}
                                            color={selectedRoom === "Sala de reunião 3"
                                                ? customTheme.colors.onPrimary
                                                : customTheme.colors.onSurface}
                                        />
                                    </Animated.View>
                                    <Text style={[
                                        styles.roomButtonText,
                                        selectedRoom === "Sala de reunião 3" && styles.roomButtonTextActive
                                    ]}>
                                        Sala 3
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Extra space to ensure scrolling content is all visible */}
                        <View style={{ height: 100 }} />
                    </ScrollView>

                    {/* Footer buttons */}
                    <View style={styles.modalFooter}>
                        <Button
                            mode="outlined"
                            onPress={onClose}
                            disabled={isLoading}
                            style={styles.footerButton}
                            contentStyle={styles.buttonContent}
                            icon={({ size, color }) => (
                                <Icon name="close-circle-outline" size={size} color={color} />
                            )}
                        >
                            Cancelar
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleCreateMeeting}
                            loading={isLoading}
                            disabled={isLoading || !assunto.trim() || !selectedTime || !selectedEndTime}
                            style={styles.footerButton}
                            contentStyle={styles.buttonContent}
                            icon={({ size, color }) => (
                                <Icon name="check-circle-outline" size={size} color={color} />
                            )}
                        >
                            Agendar
                        </Button>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContainer: {
        backgroundColor: customTheme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outlineVariant || customTheme.colors.outline,
    },
    closeButton: {
        padding: 8,
        marginRight: -8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 40,
    },
    modalContent: {
        padding: 20,
    },
    inputSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginBottom: 12,
    },
    input: {
        backgroundColor: customTheme.colors.surface,
        marginBottom: 8,
    },
    errorText: {
        color: customTheme.colors.error,
        fontSize: 12,
        marginTop: 4,
        marginLeft: 8,
    },
    dateDisplaySection: {
        marginBottom: 24,
    },
    dateDisplayContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 14,
        borderRadius: 8,
    },
    dateDisplayText: {
        fontSize: 16,
        marginLeft: 10,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    timeSection: {
        marginBottom: 24,
    },
    timeSelectionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    timePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        padding: 14,
        borderRadius: 8,
        flex: 1,
    },
    timePickerText: {
        fontSize: 15,
        marginLeft: 8,
        color: customTheme.colors.onSurface,
    },
    roomSection: {
        marginBottom: 24,
    },
    roomButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    roomButton: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        backgroundColor: customTheme.colors.surface,
        elevation: 1,
    },
    roomButtonActive: {
        backgroundColor: customTheme.colors.primary,
        borderColor: customTheme.colors.primary,
        elevation: 3,
    },
    roomButtonText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
        textAlign: 'center',
    },
    roomButtonTextActive: {
        color: customTheme.colors.onPrimary,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outlineVariant || customTheme.colors.outline,
        backgroundColor: customTheme.colors.surface,
    },
    footerButton: {
        flex: 1,
        marginHorizontal: 8,
        borderRadius: 8,
    },
    buttonContent: {
        paddingVertical: 6,
    }
});

export default CreateMeetingModal