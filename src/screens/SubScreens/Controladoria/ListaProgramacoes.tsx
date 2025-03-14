import React, { useEffect, useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Linking,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { Text, Surface, Dialog, Portal, Modal } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import database from '@react-native-firebase/database';

import { NavigationProp } from '@react-navigation/native';
import { useNetwork } from '../../../contexts/NetworkContext';
import { useUser } from '../../../contexts/userContext';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import { customTheme } from '../../../theme/theme';
import { Container, ProgramacaoEquipamento, Responsavel } from './types/logisticTypes';
import ModernHeader from '../../../assets/components/ModernHeader';
import { hasAccess } from '../../Adm/types/admTypes';

function alpha(color: string, opacity: number): string {
    const opacityHex = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `${color}${opacityHex}`;
}

const ListaProgramacoes = ({ navigation }: { navigation: NavigationProp<any> }) => {
    const { userInfo } = useUser();
    const { isOnline } = useNetwork();

    const [programacoes, setProgramacoes] = useState<ProgramacaoEquipamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [selectedProgramacao, setSelectedProgramacao] = useState<ProgramacaoEquipamento | null>(null);
    const [responsavelCarregamentoNome, setResponsavelCarregamentoNome] = useState('');

    const [isOperacaoResponsavel, setIsOperacaoResponsavel] = useState(false);

    const [confirmacaoVisible, setConfirmacaoVisible] = useState(false);
    const [programacaoConclusao, setProgramacaoConclusao] = useState<ProgramacaoEquipamento | null>(null);

    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

    const canCreateProgram = () => userInfo && hasAccess(userInfo, 'logistica', 1);
    const canDeleteProgram = () => userInfo && hasAccess(userInfo, 'logistica', 1);
    const canTakeResponsibility = () => userInfo && hasAccess(userInfo, 'operacao', 1);
    const canFinishOperation = () => userInfo && hasAccess(userInfo, 'operacao', 1);

    useEffect(() => {
        const buscarProgramacoes = () => {
            const ref = database().ref('programacoes');

            ref.on('value', snapshot => {
                const data = snapshot.val();
                if (data) {
                    const programacoesArray = Object.entries(data).map(([key, value]: [string, any]) => ({
                        firebaseKey: key,
                        ...value
                    }));

                    // Ordena por data
                    const programacoesOrdenadas = programacoesArray.sort((a, b) => {
                        return new Date(a.dataEntrega).getTime() - new Date(b.dataEntrega).getTime();
                    });

                    setProgramacoes(programacoesOrdenadas);
                } else {
                    setProgramacoes([]);
                }
                setLoading(false);
            });

            // Cleanup listener
            return () => ref.off();
        };

        buscarProgramacoes();
    }, []);

    // Função de deletar modificada com verificação de acesso
    const handleDelete = async (programacao: ProgramacaoEquipamento) => {
        if (!canDeleteProgram()) {
            showGlobalToast(
                'error',
                'Acesso Negado',
                'Você não tem permissão para excluir programações',
                3000
            );
            return;
        }

        try {
            setLoading(true);
            setDeleteDialogVisible(false);

            await database()
                .ref(`programacoes/${programacao.firebaseKey}`)
                .remove();

            showGlobalToast(
                'success',
                'Sucesso',
                'Programação excluída com sucesso',
                3000
            );
        } catch (error) {
            console.error('Erro ao excluir programação:', error);
            showGlobalToast(
                'error',
                'Erro',
                'Não foi possível excluir a programação',
                3000
            );
        } finally {
            setLoading(false);
            setSelectedProgramacao(null);
        }
    };

    const handleOpenDialog = (programacao: ProgramacaoEquipamento) => {
        setSelectedProgramacao(programacao);
        setIsOperacaoResponsavel(checkIsOperacaoResponsavel(programacao, userInfo));
        // Inicializa com o nome do responsável atual, se existir
        setResponsavelCarregamentoNome(programacao.responsavelCarregamento?.nome || '');
        setDialogVisible(true);
    };

    const concluirOperacao = async (programacao: ProgramacaoEquipamento) => {
        try {
            setLoading(true);
            setConfirmacaoVisible(false);

            // Criar objeto com dados da conclusão
            const conclusaoData = {
                ...programacao,
                dataConclusao: new Date().toISOString(),
                responsavelConclusao: {
                    nome: userInfo?.user,
                    userId: userInfo?.id,
                    timestamp: Date.now()
                }
            };

            // Salvar no Firebase Database (não real-time)
            await database()
                .ref(`historico/${programacao.firebaseKey}`)
                .set(conclusaoData);

            // Remover da lista de programações ativas
            await database()
                .ref(`programacoes/${programacao.firebaseKey}`)
                .remove();

            showGlobalToast('success', 'Sucesso', 'Operação concluída com sucesso!', 3000);
        } catch (error) {
            console.error('Erro ao concluir operação:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível concluir a operação', 3000);
        } finally {
            setLoading(false);
        }
    };

    const formatarTipoContainer = (container: Container): string => {
        let localTipo = container.tipo;

        if (container.tipo === "cacamba") {
            localTipo = "Caçamba";
        }

        if (container.residuo && container.capacidade) {
            return `${localTipo} ${container.capacidade} - ${container.residuo}`;
        }
        else if (container.capacidade) {
            return `${localTipo} ${container.capacidade}`;
        }

        return localTipo;
    };

    const checkIsOperacaoResponsavel = (programacao: ProgramacaoEquipamento, userInfo: any) => {
        return programacao?.responsavelOperacao?.nome === userInfo?.user;
    };

    const abrirGoogleMaps = (cliente: string, endereco: string) => {
        const enderecoFormatado = endereco.replace(/\s/g, '+');
        const url = Platform.select({
            ios: `maps://0,0?q=${cliente}${enderecoFormatado}`,
            android: `geo:0,0?q=${cliente}${enderecoFormatado}`,
            default: `https://www.google.com/maps/search/?api=1&query=${cliente}${enderecoFormatado}`
        });

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                // Fallback para browser caso o app não esteja instalado
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${cliente}${enderecoFormatado}`);
            }
        });
    };

    const isAtrasado = (data: string) => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataEntrega = new Date(data);
        dataEntrega.setHours(0, 0, 0, 0);
        return dataEntrega < hoje;
    };

    const isHoje = (data: string) => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataEntrega = new Date(data);
        dataEntrega.setHours(0, 0, 0, 0);
        return dataEntrega.getTime() === hoje.getTime();
    };

    const assumirResponsabilidade = async (programacao: ProgramacaoEquipamento, tipo: 'carregamento' | 'operacao') => {
        if (!userInfo) {
            showGlobalToast('error', 'Erro', 'Usuário não identificado', 3000);
            return;
        }

        let responsavel: Responsavel;

        if (tipo === 'carregamento') {
            if (!responsavelCarregamentoNome.trim()) {
                showGlobalToast('error', 'Erro', 'Digite o nome do responsável pelo carregamento', 3000);
                return;
            }
            responsavel = {
                nome: responsavelCarregamentoNome,
                userId: 'manual',
                timestamp: Date.now()
            };
        } else {
            responsavel = {
                nome: userInfo.user,
                userId: userInfo.id,
                timestamp: Date.now()
            };
        }

        try {
            await database()
                .ref(`programacoes/${programacao.firebaseKey}/${tipo === 'carregamento' ? 'responsavelCarregamento' : 'responsavelOperacao'}`)
                .set(responsavel);

            // Atualiza o estado local após assumir a operação
            if (tipo === 'operacao') {
                setIsOperacaoResponsavel(true);
            }

            showGlobalToast('success', 'Sucesso', `Responsabilidade ${tipo === 'carregamento' ? 'do carregamento' : 'da operação'} atribuída com sucesso`, 3000);
            setResponsavelCarregamentoNome('');
        } catch (error) {
            console.error('Erro ao assumir responsabilidade:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível assumir a responsabilidade', 3000);
        }
    };

    // Renderização dos botões de operação com verificação de acesso
    const renderOperationButtons = (programacao: ProgramacaoEquipamento) => {
        const isResponsible = programacao.responsavelOperacao?.nome === userInfo?.user;

        if (!isResponsible && !canTakeResponsibility()) {
            return null;
        }

        return (
            <View style={styles.botoesOperacao}>
                {isOnline ? (
                    <>
                        {/* Botões para usuário que já é responsável */}
                        {isResponsible && (
                            <>
                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => handleOpenDialog(programacao)}
                                >
                                    <MaterialIcons
                                        name="edit"
                                        size={20}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text style={styles.editButtonText}>Alterar</Text>
                                </TouchableOpacity>

                                {/* Botão de finalizar só aparece se tiver ambos os responsáveis e permissão */}
                                {programacao.responsavelCarregamento?.nome && canFinishOperation() && (
                                    <TouchableOpacity
                                        style={styles.concluirButton}
                                        onPress={() => {
                                            setProgramacaoConclusao(programacao);
                                            setConfirmacaoVisible(true);
                                        }}
                                    >
                                        <MaterialIcons
                                            name="check-circle"
                                            size={20}
                                            color={customTheme.colors.primary}
                                        />
                                        <Text style={styles.concluirButtonText}>Finalizar Operação</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}

                        {/* Botão para quando não há responsável */}
                        {!programacao.responsavelOperacao?.nome && canTakeResponsibility() && (
                            <TouchableOpacity
                                style={styles.assumirButton}
                                onPress={() => handleOpenDialog(programacao)}
                            >
                                <MaterialIcons
                                    name="engineering"
                                    size={20}
                                    color={customTheme.colors.primary}
                                />
                                <Text style={styles.assumirButtonText}>
                                    Assumir Responsabilidade pela Operação
                                </Text>
                            </TouchableOpacity>
                        )}
                    </>
                ) : (
                    <View style={styles.offlineMessage}>
                        <MaterialIcons
                            name="wifi-off"
                            size={16}
                            color={customTheme.colors.error}
                        />
                        <Text style={styles.offlineText}>
                            Conecte-se à internet para gerenciar as programações
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    const renderResponsavelInfo = (tipo: string, responsavel?: Responsavel) => {
        if (!responsavel) return null;

        const isCarregamento = tipo === 'carregamento';

        return (
            <View style={[
                styles.responsavelContainer,
                isCarregamento ? styles.responsavelCarregamento : styles.responsavelOperacao
            ]}>
                <View style={styles.responsavelIconTitle}>
                    <MaterialIcons
                        name={isCarregamento ? "local-shipping" : "engineering"}
                        size={18}
                        color={isCarregamento ?
                            customTheme.colors.primary :
                            customTheme.colors.secondary
                        }
                    />
                    <Text style={[
                        styles.responsavelTipo,
                        isCarregamento ?
                            { color: customTheme.colors.primary } :
                            { color: customTheme.colors.secondary }
                    ]}>
                        {isCarregamento ? "Carregamento" : "Operação"}
                    </Text>
                </View>

                <View style={styles.responsavelContent}>
                    <Text style={styles.responsavelNome} numberOfLines={1}>
                        {responsavel.nome}
                    </Text>
                    <Text style={styles.responsavelData}>
                        {new Date(responsavel.timestamp).toLocaleString('pt-BR')}
                    </Text>
                </View>
            </View>
        );
    };

    const renderProgramacao = (programacao: ProgramacaoEquipamento) => {
        const atrasado = isAtrasado(programacao.dataEntrega);
        const hoje = isHoje(programacao.dataEntrega);

        return (
            <Surface
                key={programacao.id}
                style={[
                    styles.programacaoCard,
                    atrasado && styles.cardAtrasado,
                    hoje && styles.cardHoje
                ]}
            >
                <View style={[
                    styles.cardHeader,
                    atrasado && styles.headerAtrasado,
                    hoje && styles.headerHoje
                ]}>
                    <View style={styles.headerLeft}>
                        <MaterialIcons
                            name={atrasado ? "warning" : hoje ? "today" : "event"}
                            size={24}
                            color={atrasado ? customTheme.colors.error : hoje ? customTheme.colors.primary : customTheme.colors.onSurfaceVariant}
                        />
                        <Text style={[
                            styles.dataText,
                            atrasado && styles.textoAtrasado,
                            hoje && styles.textoHoje
                        ]}>
                            {new Date(programacao.dataEntrega).toLocaleDateString('pt-BR')}
                        </Text>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={[
                            styles.statusBadge,
                            atrasado && styles.statusAtrasado,
                            hoje && styles.statusHoje
                        ]}>
                            <Text style={styles.statusText}>
                                {atrasado ? 'Atrasado' : hoje ? 'Hoje' : 'Agendado'}
                            </Text>
                        </View>
                        {renderDeleteButton(programacao)}
                    </View>
                </View>

                <View style={styles.cardContent}>
                    {/* Linha 1: Cliente e Endereço */}
                    <View style={styles.infoRow}>
                        <View style={styles.clienteContainer}>
                            <View style={styles.iconLabel}>
                                <MaterialIcons name="business" size={20} color={customTheme.colors.primary} />
                                <Text style={styles.labelText}>Cliente:</Text>
                            </View>
                            <Text style={styles.clienteText}>{programacao.cliente}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.enderecoContainer}
                            onPress={() => abrirGoogleMaps(programacao.cliente, programacao.endereco)}
                        >
                            <View style={styles.iconLabel}>
                                <MaterialIcons name="location-on" size={20} color={customTheme.colors.primary} />
                                <Text style={styles.labelText}>Endereço:</Text>
                            </View>
                            <View style={styles.enderecoWrapper}>
                                <Text style={styles.enderecoText} >
                                    {programacao.endereco}
                                </Text>
                                <MaterialIcons name="map" size={16} color={customTheme.colors.primary} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Linha 2: Equipamentos e Containers */}
                    <View style={styles.itemsRow}>
                        {programacao.equipamentos.length > 0 && (
                            <View style={styles.itemsSection}>
                                <View style={styles.iconLabel}>
                                    <MaterialIcons name="local-shipping" size={20} color={customTheme.colors.primary} />
                                    <Text style={styles.labelText}>Equipamentos:</Text>
                                </View>
                                <View style={styles.itemsList}>
                                    {programacao.equipamentos.map((equip, index) => (
                                        <View key={index} style={styles.itemChip}>
                                            <Text style={styles.itemText}>
                                                {equip.tipo} ({equip.quantidade}x)
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {programacao.containers?.length > 0 && (
                            <View style={styles.itemsSection}>
                                <View style={styles.iconLabel}>
                                    <MaterialIcons name="inventory" size={20} color={customTheme.colors.primary} />
                                    <Text style={styles.labelText}>Containers:</Text>
                                </View>
                                <View style={styles.itemsList}>
                                    {programacao.containers.map((container, index) => (
                                        <View key={index} style={styles.itemChip}>
                                            <Text style={styles.itemText}>
                                                {formatarTipoContainer(container)} ({container.quantidade}x)
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Observações (se houver) */}
                    {programacao.observacoes && (
                        <View style={styles.observacoesContainer}>
                            <View style={styles.observacoesTitleContainer}>
                                <MaterialIcons
                                    name="short-text"
                                    size={20}
                                    color={customTheme.colors.error}
                                />
                                <Text style={styles.observacoesTitle}>
                                    Observações
                                </Text>
                            </View>
                            <Text style={styles.observacoesText}>
                                {programacao.observacoes}
                            </Text>
                        </View>
                    )}

                    {/* Linha de Responsáveis */}
                    <View style={styles.responsaveisRow}>
                        {renderResponsavelInfo('carregamento', programacao.responsavelCarregamento)}
                        {renderResponsavelInfo('operacao', programacao.responsavelOperacao)}
                    </View>

                    {/* Seção de botões e ações */}
                    {/* Seção de botões e ações */}
                    {/* Substituir a condição existente por esta nova condição */}
                    {((programacao.responsavelOperacao?.nome === userInfo?.user) ||
                        (!programacao.responsavelOperacao?.nome && userInfo && hasAccess(userInfo, 'operacao', 1))) && (
                            <View style={styles.botoesOperacao}>
                                {isOnline ? (
                                    <>
                                        {/* Botões para usuário que já é responsável */}
                                        {programacao.responsavelOperacao?.nome === userInfo?.user && (
                                            <>
                                                <TouchableOpacity
                                                    style={styles.editButton}
                                                    onPress={() => handleOpenDialog(programacao)}
                                                >
                                                    <MaterialIcons
                                                        name="edit"
                                                        size={20}
                                                        color={customTheme.colors.primary}
                                                    />
                                                    <Text style={styles.editButtonText}>Alterar</Text>
                                                </TouchableOpacity>

                                                {/* Botão de finalizar só aparece se tiver ambos os responsáveis */}
                                                {programacao.responsavelCarregamento?.nome && (
                                                    <TouchableOpacity
                                                        style={styles.concluirButton}
                                                        onPress={() => {
                                                            setProgramacaoConclusao(programacao);
                                                            setConfirmacaoVisible(true);
                                                        }}
                                                    >
                                                        <MaterialIcons
                                                            name="check-circle"
                                                            size={20}
                                                            color={customTheme.colors.primary}
                                                        />
                                                        <Text style={styles.concluirButtonText}>Finalizar Operação</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </>
                                        )}

                                        {/* Botão para quando não há responsável - AQUI ESTÁ A CORREÇÃO */}
                                        {!programacao.responsavelOperacao?.nome && userInfo && hasAccess(userInfo, 'operacao', 1) && (
                                            <TouchableOpacity
                                                style={styles.assumirButton}
                                                onPress={() => handleOpenDialog(programacao)}
                                            >
                                                <MaterialIcons
                                                    name="engineering"
                                                    size={20}
                                                    color={customTheme.colors.primary}
                                                />
                                                <Text style={styles.assumirButtonText}>
                                                    Assumir Responsabilidade pela Operação
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </>
                                ) : (
                                    <View style={styles.offlineMessage}>
                                        <MaterialIcons
                                            name="wifi-off"
                                            size={16}
                                            color={customTheme.colors.error}
                                        />
                                        <Text style={styles.offlineText}>
                                            Conecte-se à internet para gerenciar as programações
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                    {/* Mensagem de helper */}
                    {(programacao.responsavelOperacao?.nome === userInfo?.user &&
                        !programacao.responsavelCarregamento?.nome &&
                        isOnline) && (
                            <Text style={styles.helperFinalizarText}>
                                * Defina o responsável pelo carregamento para poder finalizar a operação
                            </Text>
                        )}

                </View>
            </Surface>
        );
    };

    // Renderização do botão de deletar com verificação de acesso
    const renderDeleteButton = (programacao: ProgramacaoEquipamento) => {
        if (!canDeleteProgram()) {
            return null;
        }

        return (
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                    setSelectedProgramacao(programacao);
                    setDeleteDialogVisible(true);
                }}
            >
                <MaterialIcons
                    name="delete"
                    size={20}
                    color={customTheme.colors.error}
                />
            </TouchableOpacity>
        );
    };

    // Modificando o header para usar verificação de acesso
    const headerProps = {
        title: "Agendamentos",
        iconName: "clock",
        onBackPress: () => navigation.goBack(),
        ...(canCreateProgram() ? {
            rightIcon: 'plus-box',
            rightAction: () => navigation.navigate('LogisticaProgram')
        } : {})
    };

    useEffect(() => {
        if (selectedProgramacao && dialogVisible) {
            setIsOperacaoResponsavel(checkIsOperacaoResponsavel(selectedProgramacao, userInfo));
        }
    }, [selectedProgramacao, dialogVisible, userInfo]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator
                    size="large"
                    color={customTheme.colors.primary}
                />
                <Text style={styles.loadingText}>Carregando programações...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>

            {/* Header */}
            <ModernHeader {...headerProps} />

            <ScrollView style={styles.content}>
                {programacoes.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="event-busy" size={48} color={customTheme.colors.onSurfaceVariant} />
                        <Text style={styles.emptyText}>Nenhuma programação encontrada</Text>
                    </View>
                ) : (
                    programacoes.map(programacao => renderProgramacao(programacao))
                )}

                <Text> </Text>
            </ScrollView>

            {/* Modal de assumir responsabilidade */}
            <Dialog
                visible={dialogVisible}
                onDismiss={() => {
                    setDialogVisible(false);
                    setResponsavelCarregamentoNome(''); // Limpa ao fechar
                }}
                style={styles.dialog}
            >
                <Dialog.Title>Responsabilidades</Dialog.Title>
                <Dialog.Content>
                    <View style={[styles.dialogSection, styles.dialogSectionDivider]}>
                        <Text style={styles.dialogSectionTitle}>Responsável pela Operação</Text>

                        {isOperacaoResponsavel ? (
                            <View style={styles.successMessage}>
                                <MaterialIcons name="check-circle" size={20} color={customTheme.colors.primary} />
                                <Text style={styles.successText}>
                                    Você é o responsável pela operação
                                </Text>
                            </View>
                        ) : (
                            <View>
                                <Text style={styles.userInfoText}>
                                    Ao assumir esta operação, <Text style={{ fontWeight: 'bold' }}>{userInfo?.user} </Text>
                                    será o responsável oficial. Você será encarregado de supervisionar e garantir
                                    sua conclusão.
                                </Text>

                                <TouchableOpacity
                                    style={[styles.dialogButton, styles.operacaoButton]}
                                    onPress={async () => {
                                        if (selectedProgramacao) {
                                            setLoading(true)
                                            await assumirResponsabilidade(selectedProgramacao, 'operacao');
                                            setIsOperacaoResponsavel(true);
                                            setLoading(false)
                                        }
                                    }}
                                >
                                    <MaterialIcons name="engineering" size={24} color={customTheme.colors.primary} />
                                    <Text style={styles.dialogButtonTitle}>
                                        Confirmar como Responsável pela Operação
                                    </Text>
                                </TouchableOpacity>
                            </View>

                        )}
                    </View>

                    <View style={styles.dialogSection}>
                        <Text style={styles.dialogSectionTitle}>Responsável pelo Carregamento</Text>
                        <TextInput
                            value={responsavelCarregamentoNome}
                            onChangeText={setResponsavelCarregamentoNome}
                            style={[
                                styles.input,
                                !isOperacaoResponsavel && styles.inputDisabled
                            ]}
                            placeholder="Digite o nome do responsável..."
                            placeholderTextColor={alpha(customTheme.colors.onSurface, 0.5)}
                            editable={isOperacaoResponsavel}
                        />
                        <TouchableOpacity
                            style={[
                                styles.dialogButton,
                                styles.carregamentoButton,
                                !isOperacaoResponsavel && styles.buttonDisabled
                            ]}
                            onPress={() => {
                                if (selectedProgramacao && isOperacaoResponsavel) {
                                    assumirResponsabilidade(selectedProgramacao, 'carregamento');
                                    setDialogVisible(false);
                                }
                            }}
                            disabled={!isOperacaoResponsavel}
                        >
                            <MaterialIcons
                                name="local-shipping"
                                size={24}
                                color={isOperacaoResponsavel ?
                                    customTheme.colors.primary :
                                    alpha(customTheme.colors.onSurface, 0.3)
                                }
                            />
                            <Text style={[
                                styles.dialogButtonTitle,
                                !isOperacaoResponsavel && styles.textDisabled
                            ]}>
                                Confirmar Responsável pelo Carregamento
                            </Text>
                        </TouchableOpacity>

                        {!isOperacaoResponsavel && (
                            <Text style={styles.helperText}>
                                * Assuma a responsabilidade para designar o respónsavel pelo carregamento
                            </Text>
                        )}
                    </View>

                </Dialog.Content>
            </Dialog>

            {/* Dialog de confirmação */}
            <Portal>
                <Dialog
                    visible={confirmacaoVisible}
                    onDismiss={() => {
                        setConfirmacaoVisible(false);
                        setProgramacaoConclusao(null);
                    }}
                    style={styles.confirmDialog}
                >
                    <Dialog.Title>Confirmar Conclusão da Operação</Dialog.Title>
                    <Dialog.Content>
                        <View style={styles.confirmContent}>
                            <Text style={styles.confirmTitle}>Detalhes da Operação:</Text>

                            {/* Cliente */}
                            <View style={styles.confirmSection}>
                                <View style={styles.confirmSectionHeader}>
                                    <MaterialIcons name="business" size={20} color={customTheme.colors.primary} />
                                    <Text style={styles.confirmSectionTitle}>Cliente</Text>
                                </View>
                                <View style={styles.confirmSectionContent}>
                                    <Text style={styles.confirmSectionValue}>
                                        {programacaoConclusao?.cliente}
                                    </Text>
                                </View>
                            </View>

                            {/* Equipamentos */}
                            {(programacaoConclusao?.equipamentos?.length ?? 0) > 0 && (
                                <View style={styles.confirmSection}>
                                    <View style={styles.confirmSectionHeader}>
                                        <MaterialIcons name="local-shipping" size={20} color={customTheme.colors.primary} />
                                        <Text style={styles.confirmSectionTitle}>Equipamentos</Text>
                                    </View>
                                    <View style={styles.confirmSectionContent}>
                                        <View style={styles.itemsGrid}>
                                            {programacaoConclusao?.equipamentos.map((equip, index) => (
                                                <View key={index} style={styles.itemChip}>
                                                    <Text style={styles.itemChipText}>
                                                        {equip.tipo} ({equip.quantidade}x)
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* Containers */}
                            {(programacaoConclusao?.containers?.length ?? 0) > 0 && (
                                <View style={styles.confirmSection}>
                                    <View style={styles.confirmSectionHeader}>
                                        <MaterialIcons name="inventory" size={20} color={customTheme.colors.primary} />
                                        <Text style={styles.confirmSectionTitle}>Containers</Text>
                                    </View>
                                    <View style={styles.confirmSectionContent}>
                                        <View style={styles.itemsGrid}>
                                            {programacaoConclusao?.containers.map((container, index) => (
                                                <View key={index} style={styles.itemChip}>
                                                    <Text style={styles.itemChipText}>
                                                        {formatarTipoContainer(container)} ({container.quantidade}x)
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* Responsável pelo Carregamento */}
                            <View style={styles.confirmSection}>
                                <View style={styles.confirmSectionHeader}>
                                    <MaterialIcons name="person" size={20} color={customTheme.colors.primary} />
                                    <Text style={styles.confirmSectionTitle}>Responsável pelo Carregamento</Text>
                                </View>
                                <View style={styles.confirmSectionContent}>
                                    <View style={styles.responsavelInfo}>
                                        <MaterialIcons
                                            name="local-shipping"
                                            size={18}
                                            color={customTheme.colors.onSurfaceVariant}
                                        />
                                        <Text style={styles.responsavelNome}>
                                            {programacaoConclusao?.responsavelCarregamento?.nome || 'Não definido'}
                                        </Text>
                                    </View>
                                    <Text style={styles.responsavelData}>
                                        Definido em: {programacaoConclusao?.responsavelCarregamento?.timestamp ?
                                            new Date(programacaoConclusao.responsavelCarregamento.timestamp).toLocaleString('pt-BR') :
                                            'N/A'}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.confirmWarning}>
                                Esta ação irá concluir a operação e movê-la para o histórico.
                            </Text>
                        </View>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setConfirmacaoVisible(false);
                                setProgramacaoConclusao(null);
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={() => {
                                if (programacaoConclusao) {
                                    concluirOperacao(programacaoConclusao);
                                }
                            }}
                        >
                            <MaterialIcons name="check" size={20} color={customTheme.colors.onPrimary} />
                            <Text style={styles.confirmButtonText}>Confirmar Conclusão</Text>
                        </TouchableOpacity>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Dialog de Deletar */}
            <Portal>
                <Dialog
                    visible={deleteDialogVisible}
                    onDismiss={() => {
                        setDeleteDialogVisible(false);
                        setSelectedProgramacao(null);
                    }}
                    style={styles.confirmDialog}
                >
                    <Dialog.Title>Confirmar Exclusão</Dialog.Title>
                    <Dialog.Content>
                        <View style={styles.confirmContent}>
                            <Text style={styles.confirmWarning}>
                                Tem certeza que deseja excluir esta programação?
                            </Text>

                            <View style={styles.confirmItem}>
                                <MaterialIcons name="business" size={20} color={customTheme.colors.primary} />
                                <Text style={styles.confirmLabel}>Cliente:</Text>
                                <Text style={styles.confirmValue}>{selectedProgramacao?.cliente}</Text>
                            </View>

                            <Text style={styles.deleteWarning}>
                                Esta ação não poderá ser desfeita.
                            </Text>
                        </View>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setDeleteDialogVisible(false);
                                setSelectedProgramacao(null);
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={() => {
                                if (selectedProgramacao) {
                                    handleDelete(selectedProgramacao);
                                }
                            }}
                        >
                            <MaterialIcons name="delete" size={20} color={customTheme.colors.onError} />
                            <Text style={[styles.confirmButtonText, { color: customTheme.colors.onError }]}>
                                Confirmar Exclusão
                            </Text>
                        </TouchableOpacity>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

        </View>
    );
};

const styles = StyleSheet.create({
    offlineMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: alpha(customTheme.colors.error, 0.1),
        padding: 12,
        borderRadius: 8,
        width: '100%', // Garante que ocupe toda a largura disponível
    },

    offlineText: {
        fontSize: 13,
        color: customTheme.colors.error,
        flex: 1, // Permite que o texto ocupe o espaço restante
        flexWrap: 'wrap', // Permite quebra de linha se necessário
    },
    userInfoText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 16,
        lineHeight: 20,
    },

    observacoesContainer: {
        backgroundColor: alpha(customTheme.colors.error, 0.1),
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },

    observacoesTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: alpha(customTheme.colors.error, 0.3),
    },

    observacoesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: customTheme.colors.error,
    },

    observacoesText: {
        flex: 1,
        fontSize: 13,
        color: customTheme.colors.error,
        flexWrap: 'wrap',
        marginTop: 4,
    },

    confirmSection: {
        backgroundColor: alpha(customTheme.colors.surfaceVariant, 0.5),
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    confirmSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    confirmSectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: customTheme.colors.primary,
    },
    confirmSectionContent: {
        marginLeft: 28,
    },
    confirmSectionValue: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    itemChip: {
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    itemChipText: {
        fontSize: 13,
        color: customTheme.colors.onSurfaceVariant,
    },
    responsavelInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    responsavelNome: {
        fontSize: 14,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    responsavelData: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 4,
    },

    deleteWarning: {
        fontSize: 13,
        color: customTheme.colors.error,
        fontStyle: 'italic',
        marginTop: 16,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    deleteButton: {
        padding: 8,
        borderRadius: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },

    helperFinalizarText: {
        fontSize: 12,
        color: customTheme.colors.error,
        fontStyle: 'italic',
        marginTop: 4,
        textAlign: 'right'
    },

    botoesOperacao: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'flex-end',
    },

    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: alpha(customTheme.colors.primary, 0.1),
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },

    editButtonText: {
        fontSize: 13,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },

    concluirButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: alpha(customTheme.colors.primary, 0.1),
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },

    concluirButtonText: {
        fontSize: 13,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },

    confirmDialog: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 28,
        marginHorizontal: 24,
    },

    confirmContent: {
        gap: 16,
    },

    confirmTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginBottom: 8,
    },

    confirmItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },

    confirmLabel: {
        fontSize: 14,
        color: customTheme.colors.primary,
        fontWeight: '500',
        minWidth: 80,
    },

    confirmValue: {
        flex: 1,
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },

    confirmWarning: {
        fontSize: 13,
        color: customTheme.colors.error,
        fontStyle: 'italic',
        marginTop: 8,
    },

    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },

    cancelButtonText: {
        fontSize: 14,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },

    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: customTheme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },

    confirmButtonText: {
        fontSize: 14,
        color: customTheme.colors.onPrimary,
        fontWeight: '500',
    },

    inputDisabled: {
        backgroundColor: alpha(customTheme.colors.surfaceVariant, 0.5),
        color: alpha(customTheme.colors.onSurface, 0.3),
    },

    buttonDisabled: {
        backgroundColor: alpha(customTheme.colors.surfaceVariant, 0.5),
        opacity: 0.7,
    },

    textDisabled: {
        color: alpha(customTheme.colors.onSurface, 0.3),
    },

    helperText: {
        fontSize: 12,
        color: customTheme.colors.error,
        marginTop: 4,
        fontStyle: 'italic',
    },

    successMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: alpha(customTheme.colors.primary, 0.1),
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },

    successText: {
        color: customTheme.colors.primary,
        fontWeight: '500',
        fontSize: 14,
    },
    responsavelContainer: {
        flex: 1,
        minWidth: '48%', // Permite 2 itens por linha com gap
        flexDirection: 'column',
        borderRadius: 8,
        padding: 8,
        gap: 4,
    },
    responsavelCarregamento: {
        backgroundColor: alpha(customTheme.colors.primary, 0.08),
    },
    responsavelOperacao: {
        backgroundColor: alpha(customTheme.colors.secondary, 0.08),
    },
    responsavelIconTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    responsavelTipo: {
        fontSize: 12,
        fontWeight: '500',
    },
    responsavelContent: {
        marginLeft: 22, // Alinha com o texto do título
    },
    programacaoCard: {
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: customTheme.colors.surface,
        elevation: 2,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outline,
    },
    headerAtrasado: {
        backgroundColor: alpha(customTheme.colors.error, 0.1),
    },
    headerHoje: {
        backgroundColor: alpha(customTheme.colors.primary, 0.1),
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dataText: {
        fontSize: 15,
        fontWeight: '500',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    cardContent: {
        padding: 12,
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        gap: 12,
    },
    clienteContainer: {
        flex: 1,
    },
    enderecoContainer: {
        flex: 2,
    },
    iconLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    labelText: {
        fontSize: 13,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    clienteText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    enderecoWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    enderecoText: {
        flex: 1,
        fontSize: 14,
        color: customTheme.colors.primary,
        textDecorationLine: 'underline',
    },
    itemsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    itemsSection: {
        flex: 1,
    },
    itemsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    itemText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    responsaveisRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    assumirButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    assumirButtonText: {
        fontSize: 13,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    dialogSection: {
        marginBottom: 20,
    },
    dialogSectionDivider: {
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outlineVariant,
        paddingTop: 20,
    },
    dialogSectionTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
        marginBottom: 12,
    },
    input: {
        marginBottom: 12,
        backgroundColor: customTheme.colors.surface,
        color: customTheme.colors.onSurface,
        borderWidth: 1,
        padding: 12,
        borderRadius: 8,
    },
    carregamentoButton: {
        backgroundColor: customTheme.colors.primaryContainer,
    },
    operacaoButton: {
        backgroundColor: customTheme.colors.secondaryContainer,
    },
    // Add these to your existing styles object
    dialog: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 28,
        marginHorizontal: 24,
    },
    dialogButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        gap: 12,
    },
    dialogButtonTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    cardAtrasado: {
        borderLeftWidth: 4,
        borderLeftColor: customTheme.colors.error,
    },
    cardHoje: {
        borderLeftWidth: 4,
        borderLeftColor: customTheme.colors.primary,
    },
    textoAtrasado: {
        color: customTheme.colors.error,
    },
    textoHoje: {
        color: customTheme.colors.primary,
    },
    statusAtrasado: {
        backgroundColor: customTheme.colors.errorContainer,
    },
    statusHoje: {
        backgroundColor: customTheme.colors.primaryContainer,
    },
    loadingText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        marginTop: 48,
    },
    emptyText: {
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
    },
});

export default ListaProgramacoes;