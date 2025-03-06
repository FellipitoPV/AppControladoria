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
import firestore from '@react-native-firebase/firestore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ActionButton from '../../../assets/components/ActionButton';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface LavagemStats {
    hoje: number;
    semana: number;
    mes: number;
    total: number;
}

export default function OperacaoScreen({ navigation }: any) {
    const [stats, setStats] = useState<LavagemStats>({
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

    // Função para formatar a data no formato do Firestore
    const formatFirestoreDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR');
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

                    // Para debug - identificar o tipo de registro (antigo ou novo)
                    // const tipoRegistro = dados.createdBy ? 'novo' : 'antigo';
                    // console.log(`Processado registro ${tipoRegistro} - Data: ${dataLavagem.toLocaleDateString()} - ID: ${doc.id}`);

                } catch (error) {
                    console.warn('Erro ao processar data do documento:', doc.id, error);
                }
            };

            // Processar todos os documentos
            snapshot.docs.forEach(processarDocumento);

            const total = snapshot.size;

            // Para debug
            // console.log('Estatísticas de Lavagem:', {
            //     hoje: statsHoje,
            //     semana: statsSemana,
            //     mes: statsMes,
            //     total,
            //     dataReferencia: {
            //         hoje: hoje.toLocaleDateString(),
            //         inicioSemana: inicioSemana.toLocaleDateString(),
            //         inicioMes: inicioMes.toLocaleDateString()
            //     }
            // });

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

    const fetchAgendamentosPendentes = async () => {
        try {
            const snapshot = await firestore()
                .collection('agendamentos')
                .where('concluido', '==', false)
                .get();

            setAgendamentosPendentes(snapshot.size);
        } catch (error) {
            console.error('Erro ao buscar agendamentos pendentes:', error);
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
        checkForDraft();

        const unsubscribe = navigation.addListener('focus', () => {
            checkForDraft();
        });

        return unsubscribe;
    }, [navigation]);


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

    const renderActionButton = (
        icon: string,
        text: string,
        onPress: () => void,
        badge?: number
    ) => {
        return (
            <TouchableOpacity
                style={styles.actionButton}
                onPress={onPress}
            >
                <View style={styles.actionIconContainer}>
                    <View style={[
                        styles.actionIcon,
                        { backgroundColor: customTheme.colors.primaryContainer }
                    ]}>
                        <MaterialCommunityIcons name={icon} size={24} color={customTheme.colors.primary} />
                    </View>
                    {badge !== undefined && badge > 0 && (
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>
                                {badge > 99 ? '99+' : badge}
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={styles.actionText}>
                    {text}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <Surface style={styles.container}>

            {/* Header */}
            <ModernHeader
                title="Operação"
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
        gap: 5,
    },

    actionButton: {
        width: (width - 48) / 2,
        height: 120, // Altura fixa para todos os botões
        padding: 16,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
        elevation: 2,
        justifyContent: 'center', // Centraliza o conteúdo verticalmente
        alignItems: 'center',
    },

    actionIconContainer: {
        position: 'relative',
        marginBottom: 8,
        flex: 0, // Impede que o container se expanda
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
        textAlign: 'center', // Garante alinhamento centralizado do texto
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