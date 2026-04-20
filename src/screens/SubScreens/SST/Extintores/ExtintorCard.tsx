import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Chip, IconButton, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../../theme/theme';
import {
    ExtintorInterface,
    formatDate,
    formatMonthYear,
    formatYear,
    getDiasParaRecarga,
    getDiasParaTesteHidrostatico,
    getExtintorStatus,
} from './ExtintoresTypes';

const withAlpha = (hex: string, alpha: number): string => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return `${hex}${a}`;
};

interface ExtintorCardProps {
    extintor: ExtintorInterface;
    validadeHidrostatico: number;
    onPress: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const statusMap = {
    Vencido: { color: customTheme.colors.error, icon: 'alert-circle' },
    'A Vencer': { color: customTheme.colors.warning, icon: 'clock-alert-outline' },
    Valido: { color: customTheme.colors.primary, icon: 'check-circle' },
};

export const ExtintorCard: React.FC<ExtintorCardProps> = ({
    extintor,
    validadeHidrostatico,
    onPress,
    onEdit,
    onDelete,
}) => {
    const status = getExtintorStatus(extintor, validadeHidrostatico);
    const statusMeta = statusMap[status];
    const diasParaRecarga = getDiasParaRecarga(extintor);
    const diasParaTeste = getDiasParaTesteHidrostatico(extintor, validadeHidrostatico);
    const showTesteInfo = diasParaTeste <= 365;
    const showRecargaInfo = diasParaRecarga <= 30;

    return (
        <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
            <Card style={styles.card} elevation={2}>
                <View style={[styles.accentBar, { backgroundColor: statusMeta.color }]} />
                <Card.Content style={styles.cardContent}>
                    <View style={styles.headerRow}>
                        <View style={styles.titleWrap}>
                            <Text style={styles.title}>Extintor #{extintor.numero || 'Sem numero'}</Text>
                            <Text style={styles.subtitle}>{extintor.unidadeEcologika || 'Unidade nao informada'}</Text>
                        </View>
                        <View style={styles.actionsRow}>
                            <Chip compact icon={statusMeta.icon} textStyle={[styles.statusText, { color: statusMeta.color }]} style={[styles.chip, { backgroundColor: withAlpha(statusMeta.color, 0.12) }]}> 
                                {status}
                            </Chip>
                            <IconButton icon="pencil-outline" size={18} onPress={onEdit} style={styles.iconButton} />
                            <IconButton icon="delete-outline" size={18} iconColor={customTheme.colors.error} onPress={onDelete} style={styles.iconButton} />
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={18} color={customTheme.colors.onSurfaceVariant} />
                        <Text style={styles.infoText}>
                            {extintor.localizacao || 'Localizacao nao informada'}
                            {'  •  '}
                            {extintor.tipo || 'Tipo nao informado'}
                            {'  •  '}
                            {extintor.carga || 'Carga nao informada'}
                        </Text>
                    </View>

                    {(showRecargaInfo || showTesteInfo) && (
                        <View style={styles.metaGrid}>
                            {showRecargaInfo && (
                                <View style={styles.metaItemWide}>
                                    <Text style={styles.metaLabel}>Recarga</Text>
                                    <Text style={styles.metaValue}>
                                        {formatDate(extintor.dataRecarga)}  •  prox. {formatMonthYear(extintor.dataRecarga, extintor.validadeMeses)}
                                    </Text>
                                </View>
                            )}
                            {showTesteInfo && (
                                <View style={styles.metaItemWide}>
                                    <Text style={styles.metaLabel}>Teste hidrostatico</Text>
                                    <Text style={styles.metaValue}>
                                        {formatDate(extintor.dataTesteHidrostatico)}  •  prox. {formatYear(extintor.dataTesteHidrostatico, validadeHidrostatico)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {!!extintor.observacoes && (
                        <Text style={styles.observacoes}>{extintor.observacoes}</Text>
                    )}
                </Card.Content>
            </Card>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: 12,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: customTheme.colors.surfaceVariant,
        overflow: 'hidden',
    },
    accentBar: {
        height: 4,
    },
    cardContent: {
        paddingVertical: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
    },
    titleWrap: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
    subtitle: {
        marginTop: 2,
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    actionsRow: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    chip: {
        marginRight: 4,
        borderRadius: 6,
        height: 28,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    iconButton: {
        margin: 0,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
    },
    infoText: {
        color: customTheme.colors.onSurfaceVariant,
        flex: 1,
        fontSize: 13,
    },
    metaGrid: {
        marginTop: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    metaItem: {
        width: '47%',
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    metaItemWide: {
        width: '100%',
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    metaLabel: {
        fontSize: 11,
        color: customTheme.colors.onSurfaceVariant,
    },
    metaValue: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
    observacoes: {
        marginTop: 10,
        color: customTheme.colors.onSurfaceVariant,
        fontStyle: 'italic',
        fontSize: 12,
    },
});

export default ExtintorCard;
