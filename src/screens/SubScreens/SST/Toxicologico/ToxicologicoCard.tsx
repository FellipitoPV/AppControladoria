import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Timestamp } from 'firebase/firestore';
import {
    ToxicologicoInterface,
    getResultadoColor,
    getResultadoIcon,
} from './ToxicologicoTypes';
import { customTheme } from '../../../../theme/theme';

interface ToxicologicoCardProps {
    item: ToxicologicoInterface;
    onPress: () => void;
    onEdit?: () => void;
}

const formatDate = (date: Timestamp | string | any): string => {
    if (!date) return '';
    let dateObj: Date;
    if (date instanceof Timestamp) {
        dateObj = date.toDate();
    } else if (date && typeof date === 'object' && 'seconds' in date) {
        dateObj = new Date(date.seconds * 1000);
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

export const ToxicologicoCard: React.FC<ToxicologicoCardProps> = ({
    item,
    onPress,
    onEdit,
}) => {
    const resultadoColor = getResultadoColor(item.resultado);
    const resultadoIcon = getResultadoIcon(item.resultado);
    const houveRecusa = item.houveRecusa === 'Houve recusa injustificada';

    const dataHora = [formatDate(item.data), item.hora].filter(Boolean).join('  ·  ');
    const tipoMgL = [item.tipoTeste, item.resultadoMgL ? `${item.resultadoMgL} mg/L` : '']
        .filter(Boolean).join('  ·  ');

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Card style={styles.card}>
                <Card.Content style={styles.content}>
                    {/* Barra lateral colorida */}
                    <View style={[styles.resultBar, { backgroundColor: resultadoColor }]} />

                    <View style={styles.mainContent}>
                        {/* Linha 1: colaborador + badge resultado */}
                        <View style={styles.header}>
                            <Text style={styles.title} numberOfLines={1}>
                                {item.colaborador}
                            </Text>
                            <View style={[styles.resultadoBadge, { backgroundColor: resultadoColor + '22' }]}>
                                <MaterialCommunityIcons name={resultadoIcon} size={12} color={resultadoColor} />
                                <Text style={[styles.resultadoText, { color: resultadoColor }]}>
                                    {item.resultado}
                                </Text>
                            </View>
                        </View>

                        {/* Linha 2: encarregado */}
                        <Text style={styles.encarregado} numberOfLines={1}>
                            <MaterialCommunityIcons name="account-tie" size={12} color={customTheme.colors.outline} />
                            {'  '}{item.encarregado}
                        </Text>

                        {/* Linha 3: data/hora · tipo · mg/L */}
                        <View style={styles.metaRow}>
                            {dataHora ? (
                                <View style={styles.metaChip}>
                                    <MaterialCommunityIcons name="calendar-clock" size={12} color={customTheme.colors.outline} />
                                    <Text style={styles.metaText}>{dataHora}</Text>
                                </View>
                            ) : null}
                            {tipoMgL ? (
                                <View style={styles.metaChip}>
                                    <MaterialCommunityIcons name="clipboard-list-outline" size={12} color={customTheme.colors.outline} />
                                    <Text style={styles.metaText}>{tipoMgL}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Footer: assinaturas + recusa */}
                        <View style={styles.footer}>
                            <View style={styles.assinaturaRow}>
                                <AssinaturaChip label="Resp." signed={!!item.assinaturaResponsavel?.assinatura} />
                                <AssinaturaChip label="Colab." signed={!!item.assinaturaColaborador?.assinatura} />
                                {houveRecusa && (
                                    <AssinaturaChip label="Test." signed={!!item.assinaturaTestemunha?.assinatura} />
                                )}
                            </View>
                            {houveRecusa && (
                                <View style={styles.recusaBadge}>
                                    <MaterialCommunityIcons name="alert" size={11} color="#FB8C00" />
                                    <Text style={styles.recusaText}>Recusa</Text>
                                </View>
                            )}
                        </View>
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

const AssinaturaChip = ({ label, signed }: { label: string; signed: boolean }) => (
    <View style={[
        chipStyles.chip,
        { backgroundColor: signed ? customTheme.colors.primaryContainer : customTheme.colors.surfaceVariant },
    ]}>
        <MaterialCommunityIcons
            name={signed ? 'draw-pen' : 'draw'}
            size={10}
            color={signed ? customTheme.colors.primary : customTheme.colors.outline}
        />
        <Text style={[chipStyles.text, { color: signed ? customTheme.colors.primary : customTheme.colors.outline }]}>
            {label}
        </Text>
    </View>
);

const chipStyles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 2,
    },
    text: {
        fontSize: 10,
        fontWeight: '500',
    },
});

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginVertical: 4,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 10,
        elevation: 1,
        overflow: 'hidden',
    },
    content: {
        padding: 0,
        flexDirection: 'row',
    },
    resultBar: {
        width: 4,
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
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
        paddingRight: 28, // espaço para o botão de edição
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        flex: 1,
        marginRight: 8,
    },
    resultadoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
        gap: 3,
    },
    resultadoText: {
        fontSize: 11,
        fontWeight: '700',
    },
    encarregado: {
        fontSize: 12,
        color: customTheme.colors.outline,
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8,
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
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outlineVariant,
        paddingTop: 7,
    },
    assinaturaRow: {
        flexDirection: 'row',
        gap: 4,
    },
    recusaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FB8C0022',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 3,
    },
    recusaText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FB8C00',
    },
    editButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        padding: 5,
        borderRadius: 14,
        backgroundColor: customTheme.colors.primaryContainer,
    },
});

export default ToxicologicoCard;
