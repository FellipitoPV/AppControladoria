import { Card, Surface, Text } from 'react-native-paper';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { Compostagem } from '../../../helpers/Types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../../assets/components/ModernHeader';
import { customTheme } from '../../../theme/theme';
import { db } from '../../../../firebase';

const { width } = Dimensions.get('window');

interface CompostagemStats {
    hoje: number;
    semana: number;
    mes: number;
    total: number;
}

export default function CompostagemScreen({ navigation }: any) {
    const [stats, setStats] = useState<CompostagemStats>({
        hoje: 0,
        semana: 0,
        mes: 0,
        total: 0
    });


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

    const fetchCompostagemStats = async () => {
        try {
            // Datas de referência
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
    
            const inicioSemana = getStartOfWeek();
            const inicioMes = getStartOfMonth();
    
            // Buscar todas as compostagens
            const querySnapshot = await getDocs(
                query(
                    collection(db(), 'compostagens'),
                    where('isMedicaoRotina', '==', false)
                )
            );
    
            let statsHoje = 0;
            let statsSemana = 0;
            let statsMes = 0;
    
            querySnapshot.docs.forEach(doc => {
                const compostagem = doc.data() as Compostagem;
    
                // Log para compostagens sem responsável ou com responsável vazio
                if (!compostagem.responsavel || compostagem.responsavel.trim() === '') {
                    console.warn('Compostagem sem responsável:', {
                        id: doc.id,
                        data: compostagem.data,
                        leira: compostagem.leira
                    });
                }
    
                if (!compostagem.data) {
                    console.warn('Documento sem data encontrado:', doc.id);
                    return;
                }
    
                try {
                    // Pegar a data original no formato YYYY-MM-DD
                    const [ano, mes, dia] = compostagem.data.split('-');
    
                    // Criar a data usando o timezone local
                    const dataCompostagem = new Date(
                        parseInt(ano),
                        parseInt(mes) - 1,
                        parseInt(dia)
                    );
                    dataCompostagem.setHours(0, 0, 0, 0);
    
                    // Debug
                    // console.log('Processando compostagem:', {
                    //     id: doc.id,
                    //     dataOriginal: compostagem.data,
                    //     dataCompostagem: dataCompostagem.toLocaleDateString('pt-BR'),
                    //     hoje: hoje.toLocaleDateString('pt-BR'),
                    //     comparacaoHoje: dataCompostagem.getTime() === hoje.getTime() ? 'IGUAL' : 'DIFERENTE',
                    //     timestampCompostagem: dataCompostagem.getTime(),
                    //     timestampHoje: hoje.getTime()
                    // });
    
                    // Comparação por timestamp para maior precisão
                    if (dataCompostagem.getTime() === hoje.getTime()) {
                        statsHoje++;
                    }
                    if (dataCompostagem >= inicioSemana) {
                        statsSemana++;
                    }
                    if (dataCompostagem >= inicioMes) {
                        statsMes++;
                    }
                } catch (error) {
                    console.error('Erro ao processar data:', compostagem.data, error);
                }
            });
    
            // Debug final
            // console.log('Estatísticas finais:', {
            //     hoje: statsHoje,
            //     semana: statsSemana,
            //     mes: statsMes,
            //     total: querySnapshot.size,
            //     referencias: {
            //         hoje: hoje.toLocaleDateString('pt-BR'),
            //         inicioSemana: inicioSemana.toLocaleDateString('pt-BR'),
            //         inicioMes: inicioMes.toLocaleDateString('pt-BR')
            //     }
            // });
    
            return {
                hoje: statsHoje,
                semana: statsSemana,
                mes: statsMes,
                total: querySnapshot.size
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

    // Aqui você implementará a lógica para buscar os dados do Firebase
    useEffect(() => {
        fetchCompostagemStats();
    }, []);

    useEffect(() => {
        const loadStats = async () => {
            const novasStats = await fetchCompostagemStats();
            setStats(novasStats);
        };

        loadStats();

        const unsubscribe = navigation.addListener('focus', () => {
            loadStats();
        });

        return unsubscribe;
    }, [navigation]);

    return (
        <Surface style={styles.container}>
            {/* Header */}
            <ModernHeader
                title="Compostagem"
                iconName="sprout"
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

                {/* Ações */}
                <View style={styles.actionsContainer}>
                    <Text style={styles.sectionTitle}>Ações</Text>
                    <View style={styles.actionsGrid}>
                        {/* Novo Registro */}
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('CompostagemForm')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: customTheme.colors.primaryContainer }]}>
                                <Icon
                                    name="plus-circle-outline"
                                    size={32}
                                    color={customTheme.colors.primary}
                                />
                            </View>
                            <Text style={styles.actionText}>Novo Registro</Text>
                        </TouchableOpacity>

                        {/* Lista de Compostagens */}
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('CompostagemHistory')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: customTheme.colors.secondaryContainer }]}>
                                <Icon
                                    name="format-list-bulleted"
                                    size={32}
                                    color={customTheme.colors.secondary}
                                />
                            </View>
                            <Text style={styles.actionText}>Histórico de Compostagens</Text>
                        </TouchableOpacity>

                        {/* Lista de Compostagens */}
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('CompostagemRelat')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: customTheme.colors.secondaryContainer }]}>
                                <Icon
                                    name="file-chart"
                                    size={32}
                                    color={customTheme.colors.secondary}
                                />
                            </View>
                            <Text style={styles.actionText}>Relátorio</Text>
                        </TouchableOpacity>

                    </View>
                </View>

            </ScrollView>
        </Surface>
    );
}

const styles = StyleSheet.create({
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'stretch', // Garante que todos os itens se esticam para mesma altura
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
});