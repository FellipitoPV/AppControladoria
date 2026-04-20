import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
    ControleDocumento,
    getStatusDocumento,
    STATUS_COLORS,
    STATUS_ICONS,
    STATUS_LABELS,
    AREA_COLORS,
    AREA_ICONS,
    formatDate,
} from './ControleDocumentosTypes';
import { customTheme } from '../../../../theme/theme';

const withAlpha = (hex: string, alpha: number): string => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return `${hex}${a}`;
};

interface ControleDocumentosCardProps {
    item: ControleDocumento;
    onPress: () => void;
    onEdit?: () => void;
}

export const ControleDocumentosCard: React.FC<ControleDocumentosCardProps> = ({
    item,
    onPress,
    onEdit,
}) => {
    const status = getStatusDocumento(item.vencimento, item.alertaVencimento);
    const statusColor = STATUS_COLORS[status];
    const statusIcon = STATUS_ICONS[status];
    const statusLabel = STATUS_LABELS[status];
    const areaColor = item.area ? AREA_COLORS[item.area] : customTheme.colors.outline;
    const areaIcon = item.area ? AREA_ICONS[item.area] : 'file-document-outline';
    const shouldShowDates = status !== 'vigente';

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Card style={styles.card} elevation={2}>
                <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
                <Card.Content style={styles.content}>

                    <View style={styles.mainContent}>
                        {/* Linha 1: tipoPrograma + badge status */}
                        <View style={styles.header}>
                            <Text style={styles.title} numberOfLines={1}>
                                {item.tipoPrograma}
                            </Text>
                            <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.12) }]}>
                                <MaterialCommunityIcons name={statusIcon} size={12} color={statusColor} />
                                <Text style={[styles.statusText, { color: statusColor }]}> 
                                    {statusLabel}
                                </Text>
                            </View>
                        </View>

                        {/* Linha 2: responsável */}
                        <Text style={styles.responsavel} numberOfLines={1}>
                            <MaterialCommunityIcons name="account-tie" size={12} color={customTheme.colors.outline} />
                            {'  '}{item.responsavel}
                        </Text>

                        {shouldShowDates && (
                            <View style={styles.metaRow}>
                                {item.vencimento ? (
                                    <View style={styles.metaChip}>
                                        <MaterialCommunityIcons name="calendar-clock" size={12} color={statusColor} />
                                        <Text style={styles.metaText}>Vence: {formatDate(item.vencimento)}</Text>
                                    </View>
                                ) : null}
                                {item.dataAtualizacao ? (
                                    <View style={styles.metaChip}>
                                        <MaterialCommunityIcons name="calendar-edit" size={12} color={customTheme.colors.outline} />
                                        <Text style={styles.metaText}>Atualizado: {formatDate(item.dataAtualizacao)}</Text>
                                    </View>
                                ) : null}
                            </View>
                        )}

                        {/* Footer: área badge */}
                        {item.area && (
                            <View style={styles.footer}>
                                <View style={[styles.areaBadge, { backgroundColor: withAlpha(areaColor, 0.12) }]}> 
                                    <MaterialCommunityIcons name={areaIcon} size={11} color={areaColor} />
                                    <Text style={[styles.areaText, { color: areaColor }]}>{item.area}</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Botão de edição */}
                    {onEdit && (
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={e => {
                                e.stopPropagation?.();
                                onEdit();
                            }}
                        >
                            <MaterialCommunityIcons name="pencil" size={15} color={customTheme.colors.primary} />
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
        marginVertical: 4,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: customTheme.colors.surfaceVariant,
        overflow: 'hidden',
    },
    content: {
        padding: 0,
    },
    statusBar: {
        height: 4,
    },
    mainContent: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 3,
        paddingRight: 28,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    responsavel: {
        fontSize: 12,
        color: customTheme.colors.outline,
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 6,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: customTheme.colors.surfaceVariant,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
    },
    metaText: {
        fontSize: 11,
        color: customTheme.colors.onSurfaceVariant,
    },
    footer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outlineVariant,
        paddingTop: 7,
        marginTop: 2,
    },
    areaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 3,
    },
    areaText: {
        fontSize: 10,
        fontWeight: '600',
    },
    editButton: {
        position: 'absolute',
        top: 12,
        right: 8,
        padding: 5,
        borderRadius: 14,
        backgroundColor: withAlpha(customTheme.colors.primary, 0.12),
    },
});

export default ControleDocumentosCard;
