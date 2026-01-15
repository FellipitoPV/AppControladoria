import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { DDSInterface } from './DDSTypes';
import { customTheme } from '../../../../theme/theme';
import { Timestamp } from 'firebase/firestore';

interface DDSCardProps {
    dds: DDSInterface;
    onPress: () => void;
    onEdit?: () => void;
}

const formatDate = (date: Timestamp | string): string => {
    if (!date) return '';

    let dateObj: Date;
    if (date instanceof Timestamp) {
        dateObj = date.toDate();
    } else if (typeof date === 'string') {
        dateObj = new Date(date);
    } else {
        return '';
    }

    return dateObj.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const formatTime = (time: Timestamp | string | any): string => {
    if (!time) return '';

    // Se já for string no formato HH:mm, retorna direto
    if (typeof time === 'string' && /^\d{2}:\d{2}$/.test(time)) {
        return time;
    }

    // Se for Timestamp do Firebase
    if (time instanceof Timestamp) {
        const dateObj = time.toDate();
        return dateObj.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    // Se for objeto com seconds (Timestamp serializado)
    if (time && typeof time === 'object' && 'seconds' in time) {
        const dateObj = new Date(time.seconds * 1000);
        return dateObj.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    // Se for string de data ISO
    if (typeof time === 'string') {
        const dateObj = new Date(time);
        if (!isNaN(dateObj.getTime())) {
            return dateObj.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
            });
        }
    }

    return String(time);
};

export const DDSCard: React.FC<DDSCardProps> = ({ dds, onPress, onEdit }) => {
    const participantesCount = dds.participantes?.length || 0;

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Card style={styles.card}>
                <Card.Content style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.titleContainer}>
                            <MaterialCommunityIcons
                                name="account-group"
                                size={24}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.title} numberOfLines={1}>
                                {dds.titulo}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.infoContainer}>
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons
                                name="account-tie"
                                size={18}
                                color={customTheme.colors.secondary}
                            />
                            <Text style={styles.infoText}>
                                {dds.instrutor}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons
                                name="calendar"
                                size={18}
                                color={customTheme.colors.secondary}
                            />
                            <Text style={styles.infoText}>
                                {formatDate(dds.dataRealizacao)}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons
                                name="clock-outline"
                                size={18}
                                color={customTheme.colors.secondary}
                            />
                            <Text style={styles.infoText}>
                                {formatTime(dds.horaInicio)} - {formatTime(dds.horaFim)}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons
                                name="map-marker"
                                size={18}
                                color={customTheme.colors.secondary}
                            />
                            <Text style={styles.infoText} numberOfLines={1}>
                                {dds.local}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <View style={styles.assuntoContainer}>
                            <MaterialCommunityIcons
                                name="text-box-outline"
                                size={16}
                                color={customTheme.colors.outline}
                            />
                            <Text style={styles.assuntoText} numberOfLines={2}>
                                {dds.assunto}
                            </Text>
                        </View>

                        <View style={styles.participantesContainer}>
                            <MaterialCommunityIcons
                                name="account-multiple"
                                size={16}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.participantesText}>
                                {participantesCount} participante{participantesCount !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    </View>

                    {onEdit && (
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={(e) => {
                                e.stopPropagation?.();
                                onEdit();
                            }}
                        >
                            <MaterialCommunityIcons
                                name="pencil"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                        </TouchableOpacity>
                    )}
                </Card.Content>
            </Card>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginVertical: 8,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
        elevation: 2,
    },
    content: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginLeft: 8,
        flex: 1,
    },
    infoContainer: {
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    infoText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginLeft: 8,
        flex: 1,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outlineVariant,
        paddingTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    assuntoContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
        marginRight: 12,
    },
    assuntoText: {
        fontSize: 13,
        color: customTheme.colors.outline,
        marginLeft: 6,
        flex: 1,
    },
    participantesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.primaryContainer,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
    },
    participantesText: {
        fontSize: 12,
        color: customTheme.colors.primary,
        marginLeft: 4,
        fontWeight: '500',
    },
    editButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        padding: 8,
        borderRadius: 20,
        backgroundColor: customTheme.colors.primaryContainer,
    },
});

export default DDSCard;
