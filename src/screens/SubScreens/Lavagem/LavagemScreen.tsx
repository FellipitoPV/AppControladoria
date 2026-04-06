import {
    Button,
    Card,
    ProgressBar,
    Surface,
    Text,
} from 'react-native-paper';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import React, { useEffect, useState } from 'react';

import ActionButton from '../../../assets/components/ActionButton';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LowStockAlert } from './Components/LowStockAlert';
import ModernHeader from '../../../assets/components/ModernHeader';
import { customTheme } from '../../../theme/theme';
import { ecoApi } from '../../../api/ecoApi';
import { useBackgroundSync } from '../../../contexts/backgroundSyncContext';

const { width } = Dimensions.get('window');

interface LavagemStats {
    hoje: number;
    semana: number;
    mes: number;
    total: number;
}

export default function LavagemScreen({ navigation }: any) {
    const {
        produtos,
        forceSync,
        marcarAgendamentoComoConcluido
    } = useBackgroundSync();

    const [stats, setStats] = useState<LavagemStats>({
        hoje: 0,
        semana: 0,
        mes: 0,
        total: 0
    });

    const [lavagensRecentes, setLavagensRecentes] = useState<any[]>([]);
    const [lavagensAgendadas, setLavagensAgendadas] = useState<any[]>([]);

    const [agendamentosPendentes, setAgendamentosPendentes] = useState(0);

    // Primeiro, vamos criar funções auxiliares para datas
    const getStartOfDay = () => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const getStartOfWeek = () => {
        const date = new Date();
        const day = date.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
        // Ajusta para semana começando na segunda-feira
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        date.setDate(diff);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const getStartOfMonth = () => {
        const date = new Date();
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const fetchLavagemStats = async () => {
        try {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const inicioSemana = getStartOfWeek();
            const inicioMes = getStartOfMonth();

            const registros = await ecoApi.list('registroLavagens');

            let statsHoje = 0;
            let statsSemana = 0;
            let statsMes = 0;

            registros.forEach((dados: any) => {
                if (!dados?.data) return;

                let dataLavagem: Date;
                try {
                    if (typeof dados.data === 'string' && dados.data.includes('/')) {
                        const [dia, mes, ano] = dados.data.split('/');
                        dataLavagem = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
                    } else {
                        dataLavagem = new Date(dados.data);
                    }

                    if (isNaN(dataLavagem.getTime())) return;
                    dataLavagem.setHours(0, 0, 0, 0);

                    if (dataLavagem.getTime() === hoje.getTime()) statsHoje++;
                    if (dataLavagem >= inicioSemana) statsSemana++;
                    if (dataLavagem >= inicioMes) statsMes++;
                } catch {
                    // ignora registros com data inválida
                }
            });

            return { hoje: statsHoje, semana: statsSemana, mes: statsMes, total: registros.length };
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            return { hoje: 0, semana: 0, mes: 0, total: 0 };
        }
    };

    const fetchAgendamentosPendentes = async () => {
        try {
            const registros = await ecoApi.list('registroLavagens');
            const pendentes = registros.filter((r: any) => r.concluido === false);
            setAgendamentosPendentes(pendentes.length);
        } catch (error) {
            console.error('Erro ao buscar agendamentos pendentes:', error);
        }
    };

    useEffect(() => {
        fetchAgendamentosPendentes();

        // Atualiza quando a tela receber foco
        const unsubscribe = navigation.addListener('focus', () => {
            fetchAgendamentosPendentes();
        });

        return unsubscribe;
    }, [navigation]);

    // Aqui você implementará a lógica para buscar os dados do Firebase
    useEffect(() => {
        // Implementar busca de dados
    }, []);

    useEffect(() => {
        const loadStats = async () => {
            const novasStats = await fetchLavagemStats();
            setStats(novasStats);
        };

        loadStats();

        // Opcional: Atualizar stats quando o app voltar do background
        const unsubscribe = navigation.addListener('focus', () => {
            loadStats();
        });

        return unsubscribe;
    }, [navigation]);

    return (
        <Surface style={styles.container}>

            {/* Header */}
            <ModernHeader
                title="Gestão de Lavagens"
                iconName="car-wash"
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >

                {/* Cards de Estatísticas */}
                <View style={styles.statsGrid}>
                    <Card style={styles.statsCard}>
                        <Card.Content>
                            <View style={styles.statsIconContainer}>
                                <Icon name="calendar-today" size={24} color={customTheme.colors.primary} />
                            </View>
                            <Text style={styles.statsValue}>{stats.hoje}</Text>
                            <Text style={styles.statsLabel}>Hoje</Text>
                        </Card.Content>
                    </Card>

                    <Card style={styles.statsCard}>
                        <Card.Content>
                            <View style={styles.statsIconContainer}>
                                <Icon name="calendar-week" size={24} color={customTheme.colors.secondary} />
                            </View>
                            <Text style={styles.statsValue}>{stats.semana}</Text>
                            <Text style={styles.statsLabel}>Esta Semana</Text>
                        </Card.Content>
                    </Card>

                    <Card style={styles.statsCard}>
                        <Card.Content>
                            <View style={styles.statsIconContainer}>
                                <Icon name="calendar-month" size={24} color={customTheme.colors.tertiary} />
                            </View>
                            <Text style={styles.statsValue}>{stats.mes}</Text>
                            <Text style={styles.statsLabel}>Este Mês</Text>
                        </Card.Content>
                    </Card>

                </View>

                {/* Alerta de Baixo estoque */}
                <LowStockAlert produtos={produtos} />

                {/* Ações */}
                <View style={styles.actionsContainer}>
                    <Text style={styles.sectionTitle}>Ações</Text>
                    <View style={styles.actionsGrid}>

                        <ActionButton
                            icon="plus"
                            text="Nova Lavagem"
                            onPress={() => navigation.navigate('LavagemForm')}
                        />

                        <ActionButton
                            icon="calendar-blank-outline"
                            text="Agendamentos"
                            onPress={() => navigation.navigate('LavagemAgend')}
                        />

                        <ActionButton
                            icon="package-variant"
                            text="Produtos"
                            onPress={() => navigation.navigate('LavagemEstoq')}
                        />

                        <ActionButton
                            icon="history"
                            text="Histórico"
                            onPress={() => navigation.navigate('LavagemHist')}
                        />

                        <ActionButton
                            icon="file-chart"
                            text="Gerar Relatório"
                            onPress={() => navigation.navigate('LavagemRelat')}
                        />

                    </View>
                </View>

                {/* Próximas Lavagens Agendadas */}
                {lavagensAgendadas.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Próximas Lavagens</Text>
                        {lavagensAgendadas.map((lavagem, index) => (
                            <Card key={index} style={styles.agendamentoCard}>
                                <Card.Content>
                                    <></>
                                    {/* Implementar card de agendamento */}
                                </Card.Content>
                            </Card>
                        ))}
                    </View>
                )}

                {/* Lavagens Recentes */}
                {lavagensRecentes.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Lavagens Recentes</Text>
                        {lavagensRecentes.map((lavagem, index) => (
                            <Card key={index} style={styles.lavagemCard}>
                                <Card.Content>
                                    <></>
                                    {/* Implementar card de lavagem recente */}
                                </Card.Content>
                            </Card>
                        ))}
                    </View>
                )}
            </ScrollView>
        </Surface>
    );
}

const styles = StyleSheet.create({
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'stretch', // Garante que todos os itens se esticam para mesma altura
    },
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statsCard: {
        width: (width - 48) / 3,
        borderRadius: 12,
        elevation: 2,
    },
    statsIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: customTheme.colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statsValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: customTheme.colors.onSurface,
    },
    statsLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    actionsContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginBottom: 16,
    },
    section: {
        marginBottom: 24,
    },
    agendamentoCard: {
        marginBottom: 12,
        borderRadius: 12,
        elevation: 2,
    },
    lavagemCard: {
        marginBottom: 12,
        borderRadius: 12,
        elevation: 2,
    },
});