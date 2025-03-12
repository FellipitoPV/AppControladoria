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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../theme/theme';
import ModernHeader from '../../../assets/components/ModernHeader';
import firestore from '@react-native-firebase/firestore';
import { useUser } from '../../../contexts/userContext';
import { hasAccess } from '../../Adm/components/admTypes';
import { ProgramacaoEquipamento } from './Components/logisticTypes';
import { useNetwork } from '../../../contexts/NetworkContext';
import database from '@react-native-firebase/database';
import ActionButton from '../../../assets/components/ActionButton';

const { width } = Dimensions.get('window');

interface LavagemStats {
    hoje: number;
    semana: number;
    mes: number;
    total: number;
}

export default function LogisticaScreen({ navigation }: any) {
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
            const snapshot = await database()
                .ref('programacoes')
                .once('value');

            const data = snapshot.val();

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

    const fetchLavagemStats = async () => {
        try {
            // Datas de referência como timestamps
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const inicioSemana = getStartOfWeek();
            const inicioMes = getStartOfMonth();

            // Buscar todos os registros da coleção registroLavagens
            const snapshot = await firestore()
                .collection('registroLavagens')
                .get();

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
            snapshot.docs.forEach(processarDocumento);

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

    // Funções específicas de verificação de acesso
    const canAccessNovaProgramacao = () => {
        if (!userInfo) return false;
        return hasAccess(userInfo, 'logistica', 1);
    };

    const canAccessAgendamentos = () => {
        if (!userInfo) return false;
        // Permite acesso se tiver nível 1 em logística OU nível 1 em operação
        return hasAccess(userInfo, 'logistica', 1) || hasAccess(userInfo, 'operacao', 1);
    };

    // Função que retorna a mensagem apropriada de requisito de acesso
    const getAccessRequiredMessage = (accessType: 'novaProgramacao' | 'agendamentos') => {
        switch (accessType) {
            case 'novaProgramacao':
                return 'Requer acesso à Logística nível 1';
            case 'agendamentos':
                return 'Requer acesso à Logística ou Operação nível 1';
            default:
                return 'Acesso não permitido';
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

    const renderActionButton = (
        icon: string,
        text: string,
        onPress: () => void,
        accessType?: 'novaProgramacao' | 'agendamentos', // Tornar opcional
        badge?: number
    ) => {
        // Se accessType não for fornecido, o botão estará desbloqueado para todos
        const isBlocked = accessType ? (
            accessType === 'novaProgramacao'
                ? !canAccessNovaProgramacao()
                : !canAccessAgendamentos()
        ) : false; // Sem restrição de acesso quando accessType não é fornecido

        return (
            <TouchableOpacity
                style={[
                    styles.actionButton,
                    isBlocked && styles.actionButtonDisabled
                ]}
                onPress={isBlocked ? undefined : onPress}
                disabled={isBlocked}
            >
                <View style={styles.actionIconContainer}>
                    <View style={[
                        styles.actionIcon,
                        { backgroundColor: isBlocked ? customTheme.colors.surfaceDisabled : customTheme.colors.primaryContainer }
                    ]}>
                        {isBlocked ? (
                            <MaterialCommunityIcons name="lock" size={24} color={customTheme.colors.onSurfaceDisabled} />
                        ) : (
                            <MaterialCommunityIcons name={icon} size={24} color={customTheme.colors.primary} />
                        )}
                    </View>
                    {!isBlocked && badge !== undefined && badge > 0 && (
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>
                                {badge > 99 ? '99+' : badge}
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={[
                    styles.actionText,
                    isBlocked && styles.actionTextDisabled
                ]}>
                    {text}
                </Text>
                {isBlocked && accessType && (
                    <Text style={styles.accessRequiredText}>
                        {getAccessRequiredMessage(accessType)}
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Surface style={styles.container}>

            {/* Header */}
            <ModernHeader
                title="Logistica"
                iconName="car-wash"
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
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    actionButton: {
        width: (width - 48) / 2,
        height: 120,
        padding: 16,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
        elevation: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonDisabled: {
        opacity: 0.7,
        backgroundColor: customTheme.colors.surfaceDisabled,
    },
    actionIconContainer: {
        position: 'relative',
        marginBottom: 8,
        flex: 0,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
        textAlign: 'center',
    },
    actionTextDisabled: {
        color: customTheme.colors.onSurfaceDisabled,
    },
    accessRequiredText: {
        fontSize: 10,
        color: customTheme.colors.error,
        textAlign: 'center',
        marginTop: 4,
    },
    badgeContainer: {
        position: 'absolute',
        top: -8,
        right: -8,
        borderRadius: 10,
        backgroundColor: customTheme.colors.error,
        padding: 4,
        borderWidth: 1.5,
        borderColor: customTheme.colors.surface,
    },
    badgeText: {
        color: customTheme.colors.onError,
        fontWeight: 'bold',
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'stretch', // Garante que todos os itens se esticam para mesma altura
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
    lavagemCard: {
        marginBottom: 12,
        borderRadius: 12,
        elevation: 2,
    },
});