import { Image, StyleSheet, Text, View } from 'react-native';
import React, { memo, useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';

import { Card } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../theme/theme';
import dayjs from 'dayjs';
import { db } from '../../../../firebase';

interface Meeting {
    id: string;
    assunto: string;
    name: string;
    entrada: string;
    saida: string;
    date: string;
    sala: string;
}

interface MeetingItemProps {
    meeting: Meeting;
    onPress: () => void;
    isUserMeeting: boolean;
}

// Função para formatar nome - colocada fora do componente para não recriar a cada renderização
const formatName = (fullName: string): string => {
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length <= 1) return fullName;

    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];

    return `${firstName} ${lastName}`;
};

// Cache para armazenar URLs de fotos já buscadas
const photoURLCache: Record<string, string | null> = {};

const MeetingItemComponent = ({ meeting, onPress, isUserMeeting }: MeetingItemProps) => {
    const today = dayjs().format('YYYYMMDD');
    const isCompleted = meeting.date < today;
    const isPending = false;

    const [userPhotoURL, setUserPhotoURL] = useState<string | undefined>(
        // Inicializar com valor do cache, se existir
        photoURLCache[meeting.name] !== undefined
            ? photoURLCache[meeting.name] || undefined
            : undefined
    );

    const formattedName = formatName(meeting.name);

    // Buscar foto do usuário apenas uma vez, usando um ID estável (nome do usuário)
    useEffect(() => {
        // Se já temos a URL no cache ou no estado, não fazemos nada
        if (userPhotoURL !== undefined || photoURLCache[meeting.name] !== undefined) {
            return;
        }
    
        let isMounted = true;
        const fetchUserPhoto = async () => {
            try {
                const usersSnapshot = await getDocs(
                    query(
                        collection(db(), 'users'),
                        where('user', '==', meeting.name),
                        limit(1)
                    )
                );
    
                if (!isMounted) return;
    
                if (!usersSnapshot.empty) {
                    const userData = usersSnapshot.docs[0].data();
                    if (userData.photoURL) {
                        // Atualizar o cache e o estado
                        photoURLCache[meeting.name] = userData.photoURL;
                        setUserPhotoURL(userData.photoURL);
                    } else {
                        // Marcar no cache que não há foto
                        photoURLCache[meeting.name] = null;
                    }
                } else {
                    // Marcar no cache que não há foto
                    photoURLCache[meeting.name] = null;
                }
            } catch (error) {
                console.error('Erro ao buscar foto do usuário:', error);
                if (isMounted) {
                    // Marcar no cache que houve erro
                    photoURLCache[meeting.name] = null;
                }
            }
        };
    
        fetchUserPhoto();
    
        // Cleanup para evitar memory leaks
        return () => {
            isMounted = false;
        };
    }, [meeting.name, userPhotoURL]);

    // Determinar o ícone e a cor baseado no status
    const getStatusInfo = () => {
        if (isCompleted) {
            return {
                icon: 'check-circle',
                color: customTheme.colors.primary || 'green',
                label: 'Concluída'
            };
        } else if (isPending) {
            return {
                icon: 'clock-time-four',
                color: customTheme.colors.warning || 'orange',
                label: 'Pendente'
            };
        } else {
            return {
                icon: 'calendar-check',
                color: customTheme.colors.primary,
                label: 'Agendada'
            };
        }
    };

    const statusInfo = getStatusInfo();

    return (
        <Card
            style={[
                styles.meetingCard,
                isCompleted && styles.completedCard,
                isPending && styles.pendingCard,
                meeting.date === dayjs().format('YYYYMMDD') && styles.todayCard,
                isUserMeeting && styles.userMeetingCard
            ]}
            onPress={onPress}
        >
            <Card.Content style={styles.meetingCardContent}>
                <View style={styles.meetingMainContent}>
                    {/* Header com título e badge de status */}
                    <View style={styles.meetingHeader}>
                        <Text style={styles.meetingTitle} numberOfLines={1}>{meeting.assunto}</Text>

                        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15' }]}>
                            <MaterialCommunityIcons name={statusInfo.icon} size={12} color={statusInfo.color} />
                            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                        </View>
                    </View>

                    <View style={styles.meetingDetailsRow}>
                        {/* Info de horário e sala */}
                        <View style={styles.meetingInfoContainer}>
                            <View style={styles.meetingInfoRow}>
                                <MaterialCommunityIcons
                                    name="clock-outline"
                                    size={14}
                                    color={customTheme.colors.onSurfaceVariant}
                                />
                                <Text style={styles.meetingInfoText}>
                                    {meeting.entrada} - {meeting.saida}
                                </Text>
                            </View>

                            <View style={styles.meetingInfoRow}>
                                <MaterialCommunityIcons
                                    name="map-marker-outline"
                                    size={14}
                                    color={customTheme.colors.onSurfaceVariant}
                                />
                                <Text style={styles.meetingInfoText} numberOfLines={1}>
                                    {meeting.sala}
                                </Text>
                            </View>
                        </View>

                        {/* Usuário com nome e avatar */}
                        <View style={styles.userContainer}>
                            {userPhotoURL ? (
                                <Image
                                    source={{ uri: userPhotoURL }}
                                    style={styles.userAvatar}
                                />
                            ) : (
                                <View style={styles.userAvatarContainer}>
                                    <Text style={styles.userInitial}>
                                        {meeting.name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.userName}>{formattedName}</Text>
                        </View>
                    </View>
                </View>
            </Card.Content>
        </Card>
    );
};

// Usando memo para evitar re-renderizações desnecessárias
const MeetingItem = memo(MeetingItemComponent, (prevProps, nextProps) => {
    // Só re-renderiza se o ID da reunião mudar ou se for/deixar de ser reunião do usuário
    return (
        prevProps.meeting.id === nextProps.meeting.id &&
        prevProps.isUserMeeting === nextProps.isUserMeeting
    );
});

export default MeetingItem;

// Estilos - incluídos aqui para facilitar a migração
const styles = StyleSheet.create({
    meetingCard: {
        marginBottom: 8,
        borderRadius: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        backgroundColor: customTheme.colors.surface,
    },
    completedCard: {
        opacity: 0.9,
    },
    pendingCard: {
        borderLeftColor: customTheme.colors.warning || 'orange',
        borderLeftWidth: 3,
    },
    todayCard: {
        backgroundColor: customTheme.colors.surfaceVariant || '#f5f5f5',
    },
    userMeetingCard: {
        borderLeftColor: customTheme.colors.primary,
        borderLeftWidth: 3,
    },
    meetingCardContent: {
        padding: 0,
    },
    meetingMainContent: {
        padding: 5,
    },
    meetingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
        marginLeft: 2,
    },
    meetingTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    meetingDetailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    meetingInfoContainer: {
        flex: 1,
    },
    meetingInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    meetingInfoText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant || '#666666',
        marginLeft: 4,
    },
    userContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 8,
        borderLeftWidth: 1,
        borderLeftColor: customTheme.colors.outlineVariant + '30',
    },
    userAvatarContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: customTheme.colors.primaryContainer || '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
    },
    userAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 6,
    },
    userInitial: {
        fontSize: 11,
        fontWeight: '600',
        color: customTheme.colors.onPrimaryContainer || '#333333',
    },
    userName: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        fontWeight: '500',
    },
});