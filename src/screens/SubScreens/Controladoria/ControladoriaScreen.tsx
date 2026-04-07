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
import { ecoApi } from '../../../api/ecoApi';

import ActionButton from '../../../assets/components/ActionButton';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../../assets/components/ModernHeader';
import { customTheme } from '../../../theme/theme';
import { useNetwork } from '../../../contexts/NetworkContext';
import { useUser } from '../../../contexts/userContext';

const { width } = Dimensions.get('window');

interface LavagemStats {
    hoje: number;
    semana: number;
    mes: number;
    total: number;
}

export default function ControladoriaScreen({ navigation }: any) {
    const { userInfo } = useUser();
    const { isOnline } = useNetwork();

    const [stats, setStats] = useState<LavagemStats>({
        hoje: 0,
        semana: 0,
        mes: 0,
        total: 0
    });

    const [lavagensRecentes, setLavagensRecentes] = useState<any[]>([]);
    const [lavagensAgendadas, setLavagensAgendadas] = useState<any[]>([]);

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

    // Função para buscar estatísticas de lavagem
    const fetchLavagemStats = async () => {
        try {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const inicioSemana = getStartOfWeek();
            const inicioMes = getStartOfMonth();

            const allData = await ecoApi.list('registroLavagens');

            let statsHoje = 0;
            let statsSemana = 0;
            let statsMes = 0;

            allData.forEach((dados: any) => {
                if (!dados?.data) return;

                try {
                    let dataLavagem: Date;
                    if (typeof dados.data === 'string' && dados.data.includes('/')) {
                        const [dia, mes, ano] = dados.data.split('/');
                        dataLavagem = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
                    } else if (typeof dados.data === 'string' && dados.data.length > 0) {
                        dataLavagem = new Date(dados.data);
                    } else if (dados.data instanceof Date) {
                        dataLavagem = dados.data;
                    } else {
                        return;
                    }

                    dataLavagem.setHours(0, 0, 0, 0);

                    if (dataLavagem.getTime() === hoje.getTime()) statsHoje++;
                    if (dataLavagem >= inicioSemana) statsSemana++;
                    if (dataLavagem >= inicioMes) statsMes++;
                } catch (error) {
                    console.warn('Erro ao processar data:', dados.data, error);
                }
            });

            return { hoje: statsHoje, semana: statsSemana, mes: statsMes, total: allData.length };
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            return { hoje: 0, semana: 0, mes: 0, total: 0 };
        }
    };


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
                title="Gestão de Materiais"
                iconName="file-document-outline"
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >

                {/* Cards de Estatísticas */}
                {/* <View style={styles.statsGrid}>
                    <Card style={styles.statsCard}>
                        <Card.Content>
                            <View style={styles.statsIconContainer}>
                                <MaterialCommunityIcons name="calendar-today" size={24} color={customTheme.colors.primary} />
                            </View>
                            <Text style={styles.statsValue}>{stats.hoje}</Text>
                            <Text style={styles.statsLabel}>Hoje</Text>
                        </Card.Content>
                    </Card>

                    <Card style={styles.statsCard}>
                        <Card.Content>
                            <View style={styles.statsIconContainer}>
                                <MaterialCommunityIcons name="calendar-range" size={24} color={customTheme.colors.secondary} />
                            </View>
                            <Text style={styles.statsValue}>{stats.semana}</Text>
                            <Text style={styles.statsLabel}>Esta Semana</Text>
                        </Card.Content>
                    </Card>

                    <Card style={styles.statsCard}>
                        <Card.Content>
                            <View style={styles.statsIconContainer}>
                                <MaterialCommunityIcons name="calendar-month" size={24} color={customTheme.colors.tertiary} />
                            </View>
                            <Text style={styles.statsValue}>{stats.mes}</Text>
                            <Text style={styles.statsLabel}>Este Mês</Text>
                        </Card.Content>
                    </Card>
                </View> */}

                {/* Ações com verificação de acesso */}
                <View style={styles.actionsContainer}>
                    <Text style={styles.sectionTitle}>Ações</Text>
                    <View style={styles.actionsGrid}>

                        {/* <ActionButton
                            icon="calendar-plus"
                            text="Agendar Operação"
                            onPress={() => navigation.navigate('LogisticaProgram')}
                        /> */}

                        {/* <ActionButton
                            icon="clock-outline"
                            text="Operações Pendentes"
                            onPress={() => navigation.navigate('OperacaoProgram')}
                            badge={agendamentosPendentes}
                        /> */}

                        {/* <ActionButton
                            icon="file-document-multiple"
                            text="Histórico de Operações"
                            onPress={() => navigation.navigate('LogisticaHist')}
                        /> */}

                        <ActionButton
                            icon="archive-search"
                            text="Histórico de RDO"
                            onPress={() => navigation.navigate('RdoHist')}
                        />

                    </View>
                </View>

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
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'stretch', // Garante que todos os itens se esticam para mesma altura
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
    lavagemCard: {
        marginBottom: 12,
        borderRadius: 12,
        elevation: 2,
    },
});