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
import { collection, getDocs } from 'firebase/firestore';
import { db, dbRealTime } from '../../../../firebase';
import { getDatabase, onValue, ref } from 'firebase/database';

import ActionButton from '../../../assets/components/ActionButton';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../../assets/components/ModernHeader';
import { ProgramacaoEquipamento } from './types/logisticTypes';
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
    const [agendamentosPendentes, setAgendamentosPendentes] = useState(0);

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

    // Função atualizada para buscar agendamentos sem responsável
    const fetchAgendamentosPendentes = async () => {
        try {
            if (!isOnline) {
                console.log('Usuário offline, não é possível buscar agendamentos');
                return;
            }

            // Agora usamos o database do Firebase Realtime (não o Firestore)
            const snapshot = await new Promise((resolve, reject) => {
                onValue(ref(dbRealTime(), 'programacoes'), (snap) => resolve(snap), reject);
            });

            const data = (snapshot as any)?.val();

            if (!data) {
                setAgendamentosPendentes(0);
                return;
            }

            // Converter os dados em um array e filtrar apenas os que não têm responsável de operação
            const programacoesArray: ProgramacaoEquipamento[] = Object.entries(data)
                .map(([key, value]: [string, any]) => ({
                    firebaseKey: key,
                    ...value
                }));

            // Filtra apenas programações sem responsável de operação
            const semResponsavel = programacoesArray.filter(prog => !prog.responsavelOperacao);

            setAgendamentosPendentes(semResponsavel.length);
        } catch (error) {
            console.error('Erro ao buscar agendamentos pendentes:', error);
            setAgendamentosPendentes(0);
        }
    };

    // Função para buscar estatísticas de lavagem
    const fetchLavagemStats = async () => {
        try {
            // Datas de referência como timestamps
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const inicioSemana = getStartOfWeek();
            const inicioMes = getStartOfMonth();

            // Buscar todos os registros da coleção registroLavagens
            const snapshot = await getDocs(collection(db(), 'registroLavagens'));

            let statsHoje = 0;
            let statsSemana = 0;
            let statsMes = 0;

            // Função auxiliar para processar documentos
            const processarDocumento = (doc: any) => {
                const dados = doc.data();

                // Verifica se o documento tem o campo data
                if (!dados || !dados.data) {
                    console.warn('Documento sem data encontrado:', doc.id);
                    return;
                }

                let dataLavagem: Date;

                try {
                    // Tenta primeiro parsear como string DD/MM/YYYY
                    if (typeof dados.data === 'string' && dados.data.includes('/')) {
                        const [dia, mes, ano] = dados.data.split('/');
                        dataLavagem = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
                    }
                    // Se for um timestamp do Firestore
                    else if (dados.data && dados.data.toDate) {
                        dataLavagem = dados.data.toDate();
                    }
                    // Se for uma data JavaScript
                    else if (dados.data instanceof Date) {
                        dataLavagem = dados.data;
                    }
                    else {
                        console.warn('Formato de data não reconhecido:', dados.data);
                        return;
                    }

                    // Normaliza a hora para meia-noite
                    dataLavagem.setHours(0, 0, 0, 0);

                    // Comparar usando timestamps
                    if (dataLavagem.getTime() === hoje.getTime()) {
                        statsHoje++;
                    }
                    if (dataLavagem >= inicioSemana) {
                        statsSemana++;
                    }
                    if (dataLavagem >= inicioMes) {
                        statsMes++;
                    }

                } catch (error) {
                    console.warn('Erro ao processar data do documento:', doc.id, error);
                }
            };

            // Processar todos os documentos
            snapshot.forEach(processarDocumento);

            const total = snapshot.size;

            return {
                hoje: statsHoje,
                semana: statsSemana,
                mes: statsMes,
                total
            };
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            return {
                hoje: 0,
                semana: 0,
                mes: 0,
                total: 0
            };
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

    // Adicione isso ao useEffect existente
    useEffect(() => {
        fetchAgendamentosPendentes();

        // Atualiza quando a tela receber foco
        const unsubscribe = navigation.addListener('focus', () => {
            fetchAgendamentosPendentes();
        });

        return unsubscribe;
    }, [navigation, isOnline]);

    return (
        <Surface style={styles.container}>

            {/* Header */}
            <ModernHeader
                title="Controladoria"
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