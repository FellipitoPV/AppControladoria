import React, { useEffect, useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    Dimensions,
} from 'react-native';
import {
    Surface,
    Text,
} from 'react-native-paper';
import { customTheme } from '../../../theme/theme';
import ModernHeader from '../../../assets/components/ModernHeader';
import firestore from '@react-native-firebase/firestore';
import { useUser } from '../../../contexts/userContext';
import { hasAccess } from '../../Adm/types/admTypes';
import { useNetwork } from '../../../contexts/NetworkContext';
import database from '@react-native-firebase/database';
import ActionButton from '../../../assets/components/ActionButton';

const { width } = Dimensions.get('window');

interface ProgramacaoStats {
    pendentes: number;
    agendadas: number;
    concluidas: number;
}

export default function LogisticaScreen({ navigation }: any) {
    const { userInfo } = useUser();
    const { isOnline } = useNetwork();

    const [stats, setStats] = useState<ProgramacaoStats>({
        pendentes: 0,
        agendadas: 0,
        concluidas: 0
    });

    const [programacoesPendentes, setProgramacoesPendentes] = useState(0);

    // Funções específicas de verificação de acesso
    const canAccessNovaProgramacao = () => {
        if (!userInfo) return false;
        return hasAccess(userInfo, 'logistica', 1);
    };

    const canAccessAgendamentos = () => {
        if (!userInfo) return false;
        return hasAccess(userInfo, 'logistica', 1);
    };

    const canAccessHistorico = () => {
        if (!userInfo) return false;
        return hasAccess(userInfo, 'logistica', 1);
    };

    // Função para buscar programações pendentes
    const fetchProgramacoesPendentes = async () => {
        try {
            if (!isOnline) {
                console.log('Usuário offline, não é possível buscar programações');
                return;
            }

            const snapshot = await database()
                .ref('programacoes')
                .once('value');

            const data = snapshot.val();

            if (!data) {
                setProgramacoesPendentes(0);
                return;
            }

            // Converter os dados em um array 
            const programacoesArray = Object.entries(data)
                .map(([key, value]: [string, any]) => ({
                    firebaseKey: key,
                    ...value
                }));

            // Filtra apenas programações pendentes
            const pendentes = programacoesArray.filter(prog => !prog.status || prog.status === 'pendente');

            setProgramacoesPendentes(pendentes.length);
        } catch (error) {
            console.error('Erro ao buscar programações pendentes:', error);
            setProgramacoesPendentes(0);
        }
    };

    useEffect(() => {
        fetchProgramacoesPendentes();

        // Atualiza quando a tela receber foco
        const unsubscribe = navigation.addListener('focus', () => {
            fetchProgramacoesPendentes();
        });

        return unsubscribe;
    }, [navigation, isOnline]);

    return (
        <Surface style={styles.container}>
            {/* Header */}
            <ModernHeader
                title="Logística"
                iconName="truck-delivery"
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Ações com verificação de acesso */}
                <View style={styles.actionsContainer}>
                    <Text style={styles.sectionTitle}>Ações</Text>
                    <View style={styles.actionsGrid}>

                        <ActionButton
                            icon="calendar-plus"
                            text="Nova Programação"
                            onPress={() => navigation.navigate('LogisticaProgram')}
                            disabled={!canAccessNovaProgramacao()}
                            disabledText="Requer acesso à Logística nível 1"
                        />

                        <ActionButton
                            icon="clock-outline"
                            text="Programações Agendadas"
                            onPress={() => navigation.navigate('ProgramacoesAgendadas')}
                            disabled={!canAccessAgendamentos()}
                            disabledText="Requer acesso à Logística nível 1"
                            badge={programacoesPendentes}
                        />

                        <ActionButton
                            icon="file-document-multiple"
                            text="Histórico de Operações"
                            onPress={() => navigation.navigate('HistoricoOperacoes')}
                            disabled={!canAccessHistorico()}
                            disabledText="Requer acesso à Logística nível 1"
                        />

                    </View>
                </View>
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
        alignItems: 'stretch',
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