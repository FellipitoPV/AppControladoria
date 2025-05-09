import {
    Button,
    Card,
    Chip,
    DataTable,
    Divider,
    Switch,
    Text
} from 'react-native-paper';
import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

import { Compostagem } from '../../../../helpers/Types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../../theme/theme';
import dayjs from 'dayjs';

interface RelatorioCompostagemContentProps {
    compostagens: Compostagem[];
    onGerarExcel: () => void;
    loading: boolean;
}

const RelatorioCompostagemContent: React.FC<RelatorioCompostagemContentProps> = ({
    compostagens,
    onGerarExcel,
    loading
}) => {
    const [viewMode, setViewMode] = useState<'simples' | 'detalhado'>('simples');
    const [estatisticas, setEstatisticas] = useState<any>({});
    const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});

    // Calcular estatísticas ao carregar ou atualizar os dados
    useEffect(() => {
        if (compostagens.length > 0) {
            calcularEstatisticas();
        }
    }, [compostagens]);

    // Função para calcular estatísticas
    const calcularEstatisticas = () => {
        // Inicializa variáveis para estatísticas
        let tempAmbTotal = 0;
        let tempBaseTotal = 0;
        let tempMeioTotal = 0;
        let tempTopoTotal = 0;
        let umidadeAmbTotal = 0;
        let umidadeLeiraTotal = 0;

        let countTempAmb = 0;
        let countTempBase = 0;
        let countTempMeio = 0;
        let countTempTopo = 0;
        let countUmidadeAmb = 0;
        let countUmidadeLeira = 0;

        let tempAmbMax = -Infinity;
        let tempBaseMax = -Infinity;
        let tempMeioMax = -Infinity;
        let tempTopoMax = -Infinity;
        let umidadeAmbMax = -Infinity;
        let umidadeLeiraMax = -Infinity;

        let tempAmbMin = Infinity;
        let tempBaseMin = Infinity;
        let tempMeioMin = Infinity;
        let tempTopoMin = Infinity;
        let umidadeAmbMin = Infinity;
        let umidadeLeiraMin = Infinity;

        // Mapeia responsáveis e leiras para contagem
        const responsaveis: Record<string, number> = {};
        const leiras: Record<string, number> = {};

        // Processa cada registro de compostagem
        compostagens.forEach(comp => {
            // Conta responsáveis
            if (comp.responsavel) {
                responsaveis[comp.responsavel] = (responsaveis[comp.responsavel] || 0) + 1;
            }

            // Conta leiras
            if (comp.leira) {
                leiras[comp.leira] = (leiras[comp.leira] || 0) + 1;
            }

            // Temperatura ambiente
            if (comp.tempAmb) {
                tempAmbTotal += Number(comp.tempAmb);
                countTempAmb++;
                tempAmbMax = Math.max(tempAmbMax, Number(comp.tempAmb));
                tempAmbMin = Math.min(tempAmbMin, Number(comp.tempAmb));
            }

            // Temperatura base
            if (comp.tempBase) {
                tempBaseTotal += Number(comp.tempBase);
                countTempBase++;
                tempBaseMax = Math.max(tempBaseMax, Number(comp.tempBase));
                tempBaseMin = Math.min(tempBaseMin, Number(comp.tempBase));
            }

            // Temperatura meio
            if (comp.tempMeio) {
                tempMeioTotal += Number(comp.tempMeio);
                countTempMeio++;
                tempMeioMax = Math.max(tempMeioMax, Number(comp.tempMeio));
                tempMeioMin = Math.min(tempMeioMin, Number(comp.tempMeio));
            }

            // Temperatura topo
            if (comp.tempTopo) {
                tempTopoTotal += Number(comp.tempTopo);
                countTempTopo++;
                tempTopoMax = Math.max(tempTopoMax, Number(comp.tempTopo));
                tempTopoMin = Math.min(tempTopoMin, Number(comp.tempTopo));
            }

            // Umidade ambiente
            if (comp.umidadeAmb) {
                umidadeAmbTotal += Number(comp.umidadeAmb);
                countUmidadeAmb++;
                umidadeAmbMax = Math.max(umidadeAmbMax, Number(comp.umidadeAmb));
                umidadeAmbMin = Math.min(umidadeAmbMin, Number(comp.umidadeAmb));
            }

            // Umidade leira
            if (comp.umidadeLeira) {
                umidadeLeiraTotal += Number(comp.umidadeLeira);
                countUmidadeLeira++;
                umidadeLeiraMax = Math.max(umidadeLeiraMax, Number(comp.umidadeLeira));
                umidadeLeiraMin = Math.min(umidadeLeiraMin, Number(comp.umidadeLeira));
            }
        });

        // Calcula médias
        const tempAmbMedia = countTempAmb > 0 ? (tempAmbTotal / countTempAmb).toFixed(1) : '-';
        const tempBaseMedia = countTempBase > 0 ? (tempBaseTotal / countTempBase).toFixed(1) : '-';
        const tempMeioMedia = countTempMeio > 0 ? (tempMeioTotal / countTempMeio).toFixed(1) : '-';
        const tempTopoMedia = countTempTopo > 0 ? (tempTopoTotal / countTempTopo).toFixed(1) : '-';
        const umidadeAmbMedia = countUmidadeAmb > 0 ? (umidadeAmbTotal / countUmidadeAmb).toFixed(1) : '-';
        const umidadeLeiraMedia = countUmidadeLeira > 0 ? (umidadeLeiraTotal / countUmidadeLeira).toFixed(1) : '-';

        // Encontra o responsável com mais registros
        let responsavelMaisAtivo = '';
        let maxRegistros = 0;
        Object.entries(responsaveis).forEach(([nome, count]) => {
            if (Number(count) > maxRegistros) {
                maxRegistros = Number(count);
                responsavelMaisAtivo = nome;
            }
        });

        // Encontra a leira mais monitorada
        let leiraMaisMonitorada = '';
        let maxMonitoramentos = 0;
        Object.entries(leiras).forEach(([leira, count]) => {
            if (Number(count) > maxMonitoramentos) {
                maxMonitoramentos = Number(count);
                leiraMaisMonitorada = leira;
            }
        });

        // Define objeto de estatísticas
        setEstatisticas({
            totalRegistros: compostagens.length,
            responsavelMaisAtivo,
            registrosPorResponsavel: responsavelMaisAtivo ? `${responsavelMaisAtivo} (${maxRegistros} registros)` : '-',
            leiraMaisMonitorada: leiraMaisMonitorada ? `Leira ${leiraMaisMonitorada} (${maxMonitoramentos} registros)` : '-',
            temperaturas: {
                ambiente: {
                    media: tempAmbMedia,
                    max: tempAmbMax !== -Infinity ? tempAmbMax.toFixed(1) : '-',
                    min: tempAmbMin !== Infinity ? tempAmbMin.toFixed(1) : '-',
                },
                base: {
                    media: tempBaseMedia,
                    max: tempBaseMax !== -Infinity ? tempBaseMax.toFixed(1) : '-',
                    min: tempBaseMin !== Infinity ? tempBaseMin.toFixed(1) : '-',
                },
                meio: {
                    media: tempMeioMedia,
                    max: tempMeioMax !== -Infinity ? tempMeioMax.toFixed(1) : '-',
                    min: tempMeioMin !== Infinity ? tempMeioMin.toFixed(1) : '-',
                },
                topo: {
                    media: tempTopoMedia,
                    max: tempTopoMax !== -Infinity ? tempTopoMax.toFixed(1) : '-',
                    min: tempTopoMin !== Infinity ? tempTopoMin.toFixed(1) : '-',
                }
            },
            umidade: {
                ambiente: {
                    media: umidadeAmbMedia,
                    max: umidadeAmbMax !== -Infinity ? umidadeAmbMax.toFixed(1) : '-',
                    min: umidadeAmbMin !== Infinity ? umidadeAmbMin.toFixed(1) : '-',
                },
                leira: {
                    media: umidadeLeiraMedia,
                    max: umidadeLeiraMax !== -Infinity ? umidadeLeiraMax.toFixed(1) : '-',
                    min: umidadeLeiraMin !== Infinity ? umidadeLeiraMin.toFixed(1) : '-',
                }
            }
        });
    };

    // Alternar expansão de um card específico
    const toggleCardExpansion = (id: string) => {
        setExpandedCards(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    return (
        <View style={styles.container}>
            {/* Card de Resumo */}
            <Card style={styles.card}>
                <Card.Content>
                    <View style={styles.headerRow}>
                        <Icon name="chart-box" size={24} color={customTheme.colors.primary} />
                        <Text style={styles.headerText}>Resumo do Relatório</Text>
                    </View>

                    <Divider style={styles.divider} />

                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Icon name="counter" size={24} color={customTheme.colors.secondary} />
                            <Text style={styles.summaryLabel}>Total de Registros</Text>
                            <Text style={styles.summaryValue}>{compostagens.length}</Text>
                        </View>

                        <View style={styles.summaryItem}>
                            <Icon name="account" size={24} color={customTheme.colors.secondary} />
                            <Text style={styles.summaryLabel}>Responsável</Text>
                            <Text style={styles.summaryValue} numberOfLines={1}>
                                {estatisticas.responsavelMaisAtivo || '-'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.metricsContainer}>
                        <Text style={styles.metricsTitle}>Médias de Temperatura (°C)</Text>
                        <View style={styles.metricsRow}>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Ambiente</Text>
                                <Text style={styles.metricValue}>
                                    {estatisticas.temperaturas?.ambiente?.media || '-'}
                                </Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Base</Text>
                                <Text style={styles.metricValue}>
                                    {estatisticas.temperaturas?.base?.media || '-'}
                                </Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Meio</Text>
                                <Text style={styles.metricValue}>
                                    {estatisticas.temperaturas?.meio?.media || '-'}
                                </Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Topo</Text>
                                <Text style={styles.metricValue}>
                                    {estatisticas.temperaturas?.topo?.media || '-'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.metricsContainer}>
                        <Text style={styles.metricsTitle}>Médias de Umidade (%)</Text>
                        <View style={styles.metricsRow}>
                            <View style={[styles.metricItem, { flex: 1 }]}>
                                <Text style={styles.metricLabel}>Ambiente</Text>
                                <Text style={styles.metricValue}>
                                    {estatisticas.umidade?.ambiente?.media || '-'}
                                </Text>
                            </View>
                            <View style={[styles.metricItem, { flex: 1 }]}>
                                <Text style={styles.metricLabel}>Leira</Text>
                                <Text style={styles.metricValue}>
                                    {estatisticas.umidade?.leira?.media || '-'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Botão para gerar Excel */}
                    <Button
                        mode="contained"
                        onPress={onGerarExcel}
                        loading={loading}
                        disabled={loading}
                        icon="file-excel"
                        style={styles.exportButton}
                    >
                        Exportar para Excel
                    </Button>
                </Card.Content>
            </Card>

            {/* Modo de visualização */}
            <View style={styles.viewModeContainer}>
                <Text style={styles.viewModeText}>Modo de Visualização:</Text>
                <View style={styles.viewModeToggle}>
                    <Text style={viewMode === 'simples' ? styles.viewModeActive : styles.viewModeInactive}>
                        Simples
                    </Text>
                    <Switch
                        value={viewMode === 'detalhado'}
                        onValueChange={() => setViewMode(viewMode === 'simples' ? 'detalhado' : 'simples')}
                        color={customTheme.colors.primary}
                    />
                    <Text style={viewMode === 'detalhado' ? styles.viewModeActive : styles.viewModeInactive}>
                        Detalhado
                    </Text>
                </View>
            </View>

            {/* Lista de Compostagens */}
            <Text style={styles.sectionTitle}>
                Registros de Compostagem ({compostagens.length})
            </Text>

            {viewMode === 'simples' ? (
                // Visualização Simples (Tabela)
                <DataTable style={styles.dataTable}>
                    <DataTable.Header>
                        <DataTable.Title>Data</DataTable.Title>
                        <DataTable.Title>Hora</DataTable.Title>
                        <DataTable.Title>Leira</DataTable.Title>
                        <DataTable.Title numeric>Temp. Meio (°C)</DataTable.Title>
                    </DataTable.Header>

                    <ScrollView>
                        {compostagens.map((comp) => (
                            <DataTable.Row key={comp.id}>
                                <DataTable.Cell>{dayjs(comp.data).format("DD/MM/YYYY")}</DataTable.Cell>
                                <DataTable.Cell>{dayjs(comp.data).format("hh:mm")}</DataTable.Cell>
                                <DataTable.Cell>Leira {comp.leira}</DataTable.Cell>
                                <DataTable.Cell numeric>{comp.tempMeio || '-'}</DataTable.Cell>
                            </DataTable.Row>
                        ))}
                    </ScrollView>
                </DataTable>
            ) : (
                // Visualização Detalhada (Cards)
                <View>
                    {compostagens.map((comp) => (
                        <Card key={comp.id} style={styles.detailCard}>
                            <TouchableOpacity
                                onPress={() => comp.id && toggleCardExpansion(comp.id)}
                                style={styles.cardHeader}
                            >
                                <View style={styles.cardHeaderLeft}>
                                    <Icon name="calendar" size={16} color={customTheme.colors.primary} />
                                    <Text style={styles.cardDate}>
                                        {dayjs(comp.data).format("DD/MM/YYYY")} às {dayjs(comp.data).format("HH:mm")}
                                    </Text>
                                </View>
                                <View style={styles.cardHeaderRight}>
                                    <Chip icon="silo" compact>Leira {comp.leira}</Chip>
                                    <Icon
                                        name={expandedCards[comp.id ?? ''] ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color={customTheme.colors.primary}
                                    />
                                </View>
                            </TouchableOpacity>

                            {comp.id && expandedCards[comp.id] && (
                                <Card.Content style={styles.expandedContent}>
                                    <Divider style={styles.divider} />

                                    {/* Responsável */}
                                    <View style={styles.detailRow}>
                                        <Icon name="account" size={16} color={customTheme.colors.secondary} />
                                        <Text style={styles.detailLabel}>Responsável:</Text>
                                        <Text style={styles.detailValue}>{comp.responsavel || 'Não informado'}</Text>
                                    </View>

                                    {/* Temperaturas */}
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailSectionTitle}>Temperaturas</Text>
                                        <View style={styles.temperaturesGrid}>
                                            <View style={styles.temperatureItem}>
                                                <Text style={styles.temperatureLabel}>Ambiente</Text>
                                                <Text style={styles.temperatureValue}>
                                                    {comp.tempAmb ? `${comp.tempAmb}°C` : 'N/R'}
                                                </Text>
                                            </View>
                                            <View style={styles.temperatureItem}>
                                                <Text style={styles.temperatureLabel}>Base</Text>
                                                <Text style={styles.temperatureValue}>
                                                    {comp.tempBase ? `${comp.tempBase}°C` : 'N/R'}
                                                </Text>
                                            </View>
                                            <View style={styles.temperatureItem}>
                                                <Text style={styles.temperatureLabel}>Meio</Text>
                                                <Text style={styles.temperatureValue}>
                                                    {comp.tempMeio ? `${comp.tempMeio}°C` : 'N/R'}
                                                </Text>
                                            </View>
                                            <View style={styles.temperatureItem}>
                                                <Text style={styles.temperatureLabel}>Topo</Text>
                                                <Text style={styles.temperatureValue}>
                                                    {comp.tempTopo ? `${comp.tempTopo}°C` : 'N/R'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Umidade */}
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailSectionTitle}>Umidade</Text>
                                        <View style={styles.umidadeRow}>
                                            <View style={styles.umidadeItem}>
                                                <Text style={styles.umidadeLabel}>Ambiente</Text>
                                                <Text style={styles.umidadeValue}>
                                                    {comp.umidadeAmb ? `${comp.umidadeAmb}%` : 'N/R'}
                                                </Text>
                                            </View>
                                            <View style={styles.umidadeItem}>
                                                <Text style={styles.umidadeLabel}>Leira</Text>
                                                <Text style={styles.umidadeValue}>
                                                    {comp.umidadeLeira ? `${comp.umidadeLeira}%` : 'N/R'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* pH e Odor */}
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailSectionTitle}>Análise</Text>
                                        <View style={styles.analiseRow}>
                                            <View style={styles.analiseItem}>
                                                <Text style={styles.analiseLabel}>pH</Text>
                                                <Text style={styles.analiseValue}>
                                                    {comp.ph || 'N/R'}
                                                </Text>
                                            </View>
                                            <View style={styles.analiseItem}>
                                                <Text style={styles.analiseLabel}>Odor</Text>
                                                <Text style={styles.analiseValue}>
                                                    {comp.odor || 'N/R'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Observação */}
                                    {comp.observacao && (
                                        <View style={styles.observacaoContainer}>
                                            <Text style={styles.observacaoLabel}>Observação:</Text>
                                            <Text style={styles.observacaoText}>{comp.observacao}</Text>
                                        </View>
                                    )}

                                    {/* Contagem de fotos */}
                                    {comp.photoUrls && comp.photoUrls.length > 0 && (
                                        <View style={styles.fotosContainer}>
                                            <Icon name="image-multiple" size={16} color={customTheme.colors.secondary} />
                                            <Text style={styles.fotosText}>
                                                {comp.photoUrls.length} foto(s) disponível(is)
                                            </Text>
                                        </View>
                                    )}
                                </Card.Content>
                            )}
                        </Card>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    card: {
        marginBottom: 16,
        elevation: 2,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
        color: customTheme.colors.primary,
    },
    divider: {
        marginVertical: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    summaryItem: {
        alignItems: 'center',
        flex: 1,
    },
    summaryLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 4,
        textAlign: 'center',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: customTheme.colors.secondary,
        marginTop: 2,
    },
    metricsContainer: {
        marginBottom: 16,
    },
    metricsTitle: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        color: customTheme.colors.onSurface,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metricItem: {
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 2,
    },
    metricLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: customTheme.colors.secondary,
    },
    exportButton: {
        marginTop: 8,
    },
    viewModeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    viewModeText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    viewModeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewModeActive: {
        fontSize: 14,
        fontWeight: 'bold',
        color: customTheme.colors.primary,
        marginHorizontal: 8,
    },
    viewModeInactive: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginHorizontal: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: customTheme.colors.onSurface,
    },
    dataTable: {
        backgroundColor: 'white',
        borderRadius: 8,
        marginBottom: 16,
    },
    detailCard: {
        marginBottom: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardDate: {
        marginLeft: 8,
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    expandedContent: {
        paddingTop: 0,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 14,
        marginLeft: 8,
        color: customTheme.colors.onSurfaceVariant,
    },
    detailValue: {
        fontSize: 14,
        marginLeft: 8,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    detailSection: {
        marginBottom: 16,
    },
    detailSectionTitle: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        color: customTheme.colors.secondary,
    },
    temperaturesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    temperatureItem: {
        backgroundColor: customTheme.colors.primaryContainer,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        width: '48%',
        marginBottom: 8,
    },
    temperatureLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    temperatureValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: customTheme.colors.primary,
        marginTop: 4,
    },
    umidadeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    umidadeItem: {
        backgroundColor: customTheme.colors.secondaryContainer,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        width: '48%',
    },
    umidadeLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    umidadeValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: customTheme.colors.secondary,
        marginTop: 4,
    },
    analiseRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    analiseItem: {
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        width: '48%',
    },
    analiseLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    analiseValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 4,
    },
    observacaoContainer: {
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    observacaoLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 4,
    },
    observacaoText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    fotosContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fotosText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        marginLeft: 8,
    },
});

export default RelatorioCompostagemContent;