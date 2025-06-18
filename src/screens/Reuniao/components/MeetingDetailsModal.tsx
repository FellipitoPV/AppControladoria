import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Surface, Text } from 'react-native-paper';

import ConfirmationModal from '../../../assets/components/ConfirmationModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { User } from '../../Adm/types/admTypes';
import { customTheme } from '../../../theme/theme';
import dayjs from 'dayjs';

interface MeetingDetailsModalProps {
    visible: boolean;
    onClose: () => void;
    meeting: {
        id: string;
        assunto: string;
        date: Date;
        startTime: Date;
        endTime: Date;
        room: string;
        createdBy?: string;
    };
    onDelete: (meetingId: string) => Promise<void>;
    currentUser: User;
}

const MeetingDetailsModal: React.FC<MeetingDetailsModalProps> = ({
    visible,
    onClose,
    meeting,
    onDelete,
    currentUser
}) => {
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Animação de slide
    const screenHeight = Dimensions.get('screen').height;
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;

    useEffect(() => {
        if (visible) {
            // Animar entrada
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            }).start();
        } else {
            // Animar saída
            Animated.timing(slideAnim, {
                toValue: screenHeight,
                duration: 300,
                useNativeDriver: true
            }).start();
        }
    }, [visible, screenHeight]);

    const handleDismiss = () => {
        Animated.spring(slideAnim, {
            toValue: 1200,
            bounciness: 2,
            speed: 20,
            useNativeDriver: true
        }).start();

        setTimeout(() => {
            onClose();
        }, 50);
    };

    const handleDeleteMeeting = () => {
        setShowDeleteConfirm(true);
    };

    // Função para verificar se o usuário pode excluir a reunião
    const canDeleteMeeting = () => {
        return (
            currentUser.cargo === "Administrador" ||
            (meeting.createdBy && meeting.createdBy === currentUser.user)
        );
    };

    // Item de informação simples
    const InfoItem: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
        <View style={styles.infoItem}>
            {currentUser.cargo === "Administrador" && label === "Identificação no sistema" && (
                <MaterialCommunityIcons
                    name="shield-account"
                    size={20}
                    color={customTheme.colors.primary}
                    style={styles.infoIcon}
                />
            )}
            <MaterialCommunityIcons
                name={icon}
                size={22}
                color={customTheme.colors.primary}
                style={styles.infoIcon}
            />
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || 'Não informado'}</Text>
            </View>

        </View>
    );

    // Cabeçalho de seção
    const SectionHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
        <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
                name={icon}
                size={24}
                color={customTheme.colors.primary}
            />
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );

    if (!meeting) {
        return null;
    }

    const formatDate = (date: Date) => {
        return dayjs(date).format('DD/MM/YYYY');
    };

    const formatTime = (date: Date) => {
        return dayjs(date).format('HH:mm');
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleDismiss}
        >
            <View style={styles.modalOverlay}>
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{
                                translateY: slideAnim
                            }]
                        }
                    ]}
                >
                    <Surface style={styles.modalContent}>
                        <ScrollView>

                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <View style={styles.modalHeaderContent}>
                                    <MaterialCommunityIcons
                                        name="calendar-text"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text variant="titleLarge">Detalhes da Reunião</Text>
                                </View>

                                <View style={styles.headerActions}>

                                    {canDeleteMeeting() && (
                                        <TouchableOpacity
                                            onPress={handleDeleteMeeting}
                                            style={styles.deleteButton}
                                            activeOpacity={0.7}
                                            disabled={isDeleteLoading}
                                        >
                                            {isDeleteLoading ? (
                                                <ActivityIndicator
                                                    size="small"
                                                    color={customTheme.colors.error}
                                                />
                                            ) : (
                                                <MaterialCommunityIcons
                                                    name="delete"
                                                    size={24}
                                                    color={customTheme.colors.error}
                                                />
                                            )}
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        onPress={handleDismiss}
                                        style={styles.closeButton}
                                        activeOpacity={0.7}
                                    >
                                        <MaterialCommunityIcons
                                            name="close"
                                            size={24}
                                            color={customTheme.colors.onSurface}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Conteúdo formatado como Card de informações */}
                            <View style={styles.contentWrapper}>

                                {/* Informações da Reunião */}
                                <View style={styles.sectionContainer}>
                                    <SectionHeader icon="information" title="Detalhes" />
                                    <InfoItem
                                        icon="text-box-outline"
                                        label="Assunto"
                                        value={meeting.assunto}
                                    />
                                    <InfoItem
                                        icon="calendar"
                                        label="Data"
                                        value={formatDate(meeting.date)}
                                    />
                                    <InfoItem
                                        icon="clock-outline"
                                        label="Horário"
                                        value={`${formatTime(meeting.startTime)} - ${formatTime(meeting.endTime)}`}
                                    />
                                    <InfoItem
                                        icon="door-open"
                                        label="Local"
                                        value={meeting.room}
                                    />
                                    {meeting.createdBy && (
                                        <InfoItem
                                            icon="account"
                                            label="Agendado por"
                                            value={meeting.createdBy}
                                        />
                                    )}
                                    {currentUser.cargo === "Administrador" && (
                                        <InfoItem
                                            icon="server"
                                            label="Identificação no sistema"
                                            value={meeting.id}
                                        />
                                    )}
                                </View>

                            </View>
                        </ScrollView>
                    </Surface>
                </Animated.View>
            </View>

            {/* Modal de confirmação de exclusão */}
            <ConfirmationModal
                visible={showDeleteConfirm}
                title="Confirmar Exclusão"
                message="Tem certeza que deseja excluir esta reunião?"
                itemToDelete={`Reunião: ${meeting.assunto}`}
                onCancel={() => setShowDeleteConfirm(false)}
                onConfirm={async () => {
                    setIsDeleteLoading(true);
                    try {
                        await onDelete(meeting.id);
                        setShowDeleteConfirm(false);
                        handleDismiss();
                    } catch (error) {
                        console.error('Erro ao excluir reunião:', error);
                        Alert.alert("Erro", "Não foi possível excluir a reunião. Tente novamente.");
                    } finally {
                        setIsDeleteLoading(false);
                    }
                }}
                confirmText="Excluir"
                iconName="calendar-remove"
                loading={isDeleteLoading}
            />

        </Modal>
    );
};

const styles = StyleSheet.create({
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deleteButton: {
        padding: 8,
        marginRight: 8,
    },
    closeButton: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        width: '100%',
        maxHeight: '95%',
    },
    modalContent: {
        backgroundColor: customTheme.colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '100%',
    },
    contentWrapper: {
        paddingBottom: 20,
        maxHeight: '90%',
    },
    sectionContainer: {
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: customTheme.colors.primary,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoIcon: {
        marginRight: 10,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    infoValue: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
});

export default MeetingDetailsModal;