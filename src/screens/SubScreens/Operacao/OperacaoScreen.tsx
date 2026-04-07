import React, { useEffect, useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import {
    Surface,
    Text,
    Card,
    Button,
    ProgressBar,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { customTheme } from '../../../theme/theme';
import ModernHeader from '../../../assets/components/ModernHeader';
import { ecoApi } from '../../../api/ecoApi';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ActionButton from '../../../assets/components/ActionButton';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface RelatoriosStats {
    hoje: number;
    semana: number;
    mes: number;
    total: number;
}

// TODO Fazer funcionar o modo de salvar offline
export default function OperacaoScreen({ navigation }: any) {
    const [stats, setStats] = useState<RelatoriosStats>({
        hoje: 0,
        semana: 0,
        mes: 0,
        total: 0
    });


    const [lavagensRecentes, setLavagensRecentes] = useState<any[]>([]);
    const [lavagensAgendadas, setLavagensAgendadas] = useState<any[]>([]);

    const [agendamentosPendentes, setAgendamentosPendentes] = useState(0);
    const [hasDraft, setHasDraft] = useState(false);

    // Primeiro, vamos criar funções auxiliares para datas
    const getStartOfDay = () => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const getStartOfWeek = () => {
        const date = new Date();
        const day = date.getDay(); // 0-6
        const diff = date.getDate() - day;
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

    const fetchRelatoriosStats = async () => {
        try {
            // Datas de referência
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const inicioSemana = getStartOfWeek();
            const inicioMes = getStartOfMonth();

            const allData = await ecoApi.list('relatoriosRDO');

            let statsHoje = 0;
            let statsSemana = 0;
            let statsMes = 0;

            allData.forEach((dados: any) => {
                if (!dados?.data) return;

                try {
                    let dataRelatorio: Date;

                    if (typeof dados.data === 'string' && dados.data.includes('/')) {
                        const [dia, mes, ano] = dados.data.split('/');
                        dataRelatorio = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
                    } else if (typeof dados.data === 'string' && dados.data.length > 0) {
                        dataRelatorio = new Date(dados.data);
                    } else if (dados.data instanceof Date) {
                        dataRelatorio = dados.data;
                    } else {
                        return;
                    }

                    dataRelatorio.setHours(0, 0, 0, 0);

                    if (dataRelatorio.getTime() === hoje.getTime()) statsHoje++;
                    if (dataRelatorio >= inicioSemana) statsSemana++;
                    if (dataRelatorio >= inicioMes) statsMes++;
                } catch (error) {
                    console.warn('Erro ao processar data:', dados.data, error);
                }
            });

            return { hoje: statsHoje, semana: statsSemana, mes: statsMes, total: allData.length };
        } catch (error) {
            console.error('Erro ao buscar estatísticas de relatórios:', error);
            return {
                hoje: 0,
                semana: 0,
                mes: 0,
                total: 0
            };
        }
    };

    const checkForDraft = async () => {
        try {
            const draftJson = await AsyncStorage.getItem('rdoDraft');
            setHasDraft(!!draftJson); // Converte para boolean
        } catch (error) {
            console.error("Erro ao verificar rascunhos:", error);
            setHasDraft(false);
        }
    };

    useEffect(() => {
        const loadStats = async () => {
            const novasStats = await fetchRelatoriosStats();
            setStats(novasStats);
        };

        loadStats();

        // Atualizar stats quando o app voltar do background
        const unsubscribe = navigation.addListener('focus', () => {
            loadStats();
        });

        return unsubscribe;
    }, [navigation]);

    // Aqui você implementará a lógica para buscar os dados do Firebase
    useEffect(() => {
        // Implementar busca de dados
    }, []);

    useEffect(() => {
        checkForDraft();

        const unsubscribe = navigation.addListener('focus', () => {
            checkForDraft();
        });

        return unsubscribe;
    }, [navigation]);

    return (
        <Surface style={styles.container}>

            {/* Header */}
            <ModernHeader
                title="Operacional"
                iconName="clipboard-list"
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
                                <Icon name="today" size={24} color={customTheme.colors.primary} />
                            </View>
                            <Text style={styles.statsValue}>{stats.hoje}</Text>
                            <Text style={styles.statsLabel}>Hoje</Text>
                        </Card.Content>
                    </Card>

                    <Card style={styles.statsCard}>
                        <Card.Content>
                            <View style={styles.statsIconContainer}>
                                <Icon name="date-range" size={24} color={customTheme.colors.secondary} />
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

                {/* Ações */}
                <View style={styles.actionsContainer}>
                    <Text style={styles.sectionTitle}>Ações</Text>
                    <View style={styles.actionsGrid}>
                        <ActionButton
                            icon="file-document-edit"
                            text="Relatório Diário"
                            onPress={() => navigation.navigate('RdoForm')}
                            noticeText={hasDraft ? "Rascunho disponível..." : undefined}
                            noticeColor={customTheme.colors.primary}
                        />

                        {/* <ActionButton
                            icon="clock-outline"
                            text="Operações Pendentes"
                            onPress={() => navigation.navigate('OperacaoProgram')}
                            badge={agendamentosPendentes}
                        /> */}

                        <ActionButton
                            icon="archive-search"
                            text="Histórico de RDO"
                            onPress={() => navigation.navigate('RdoHist')}
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
        justifyContent: 'space-between',
        gap: 12,
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