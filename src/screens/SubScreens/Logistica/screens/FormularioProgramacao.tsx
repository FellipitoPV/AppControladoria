import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Alert,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { Text, Surface, TextInput, Dialog } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Dropdown } from 'react-native-element-dropdown';
import database from '@react-native-firebase/database';
import { useUser } from '../../../../contexts/userContext';
import { ClienteInterface, clientes, Container, Equipment, ProgramacaoEquipamento } from '../../Controladoria/types/logisticTypes';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import { customTheme } from '../../../../theme/theme';


const FormularioProgramacao = ({ navigation }: { navigation: any }) => {
    const { userInfo } = useUser();
    const [loading, setLoading] = useState(false);

    // Estados para os campos do formulário
    const [cliente, setCliente] = useState('');
    const [endereco, setEndereco] = useState('');
    const [dataEntrega, setDataEntrega] = useState(new Date());
    const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<Equipment | null>(null);
    const [observacoes, setObservacoes] = useState('');
    const [clienteSelecionado, setClienteSelecionado] = useState<ClienteInterface | null>(null);
    const [enderecoCustomizado, setEnderecoCustomizado] = useState(false);
    const [loadingAddress, setLoadingAddress] = useState(false);

    const [equipamentosSelecionados, setEquipamentosSelecionados] = useState<Equipment[]>([]);
    const [containersSelecionados, setContainersSelecionados] = useState<Container[]>([]);

    // Estados para controles de UI
    const [mostrarSeletorData, setMostrarSeletorData] = useState(false);

    // Estados para validação
    const [clienteError, setClienteError] = useState(false);
    const [equipamentoError, setEquipamentoError] = useState(false);

    const generateId = () => {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `${timestamp}-${randomStr}`;
    };

    const handleClienteSelect = async (cliente: ClienteInterface) => {
        setClienteSelecionado(cliente);
        setClienteError(false);
        setLoadingAddress(true);
    };

    const handleDataChange = (event: any, selectedDate?: Date) => {
        setMostrarSeletorData(false);
        if (selectedDate) {
            setDataEntrega(selectedDate);
        }
    };

    const validarFormulario = () => {
        let isValid = true;

        if (!clienteSelecionado) {
            setClienteError(true);
            isValid = false;
        }
        if (!equipamentosSelecionados) {
            setEquipamentoError(true);
            isValid = false;
        }

        if (!isValid) {
            showGlobalToast(
                'error',
                'Campos Obrigatórios',
                'Preencha todos os campos obrigatórios',
                5000
            );
        }

        return isValid;
    };

    // Primeiro, vamos adicionar validações no handleSalvar
    const handleSalvar = async () => {
        if (loading) return;
        if (!validarFormulario()) return;

        // Validações adicionais para garantir que temos dados válidos
        if (!equipamentosSelecionados.length) {
            showGlobalToast(
                'error',
                'Erro',
                'Selecione pelo menos um equipamento',
                3000
            );
            return;
        }

        setLoading(true);
        try {
            const novaProgramacao: ProgramacaoEquipamento = {
                id: generateId(),
                cliente: clienteSelecionado?.razaoSocial || '',
                dataEntrega: dataEntrega.toISOString(),
                equipamentos: equipamentosSelecionados,
                containers: containersSelecionados,
                endereco,
                observacoes,
                status: 'programado',
                createdAt: Date.now(),
                createdBy: userInfo?.user || '',
            };

            // Salvar no Firebase Realtime Database
            await database()
                .ref('programacoes')
                .push(novaProgramacao);

            // Só atualiza o status se tivermos equipamentos/containers selecionados
            if (equipamentosSelecionados.length || containersSelecionados.length) {
                await atualizarStatusEquipamentos();
            }

            showGlobalToast(
                'success',
                'Sucesso',
                'Programação salva com sucesso!',
                3000
            );

            navigation.goBack();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            showGlobalToast(
                'error',
                'Erro',
                'Não foi possível salvar a programação',
                5000
            );
        } finally {
            setLoading(false);
        }
    };

    // Agora vamos corrigir a função atualizarStatusEquipamentos
    const atualizarStatusEquipamentos = async () => {
        try {
            const updates: Record<string, any> = {};

            // Atualizar status dos equipamentos
            equipamentosSelecionados.forEach(equipamento => {
                if (equipamento && equipamento.id) {
                    updates[`/equipamentos/${equipamento.id}/status`] = 'em_uso';
                }
            });

            // Atualizar status dos containers
            containersSelecionados.forEach(container => {
                if (container && container.id) {
                    updates[`/containers/${container.id}/status`] = 'em_uso';
                }
            });

            // Só faz o update se tiver alterações para fazer
            if (Object.keys(updates).length > 0) {
                await database().ref().update(updates);
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            throw new Error('Falha ao atualizar status dos equipamentos/containers');
        }
    };

    return (
        <Surface style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <MaterialIcons name="local-shipping" size={32} color={customTheme.colors.primary} />
                <Text style={styles.headerTitle}>
                    Nova Programação de Equipamento
                </Text>
            </View>

            {/* Conteúdo Principal */}
            <ScrollView style={styles.content}>

                {/* Seção: Informações do Cliente */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="business" size={24} color={customTheme.colors.primary} />
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Informações do Cliente
                        </Text>
                    </View>

                    {/* Dropdown Cliente */}
                    <View style={styles.inputRow}>
                        <MaterialIcons
                            name="person"
                            size={24}
                            color={customTheme.colors.primary}
                        />
                        <View style={styles.dropdownContainer}>
                            <Dropdown
                                style={[
                                    styles.dropdown,
                                    clienteError && styles.dropdownError
                                ]}
                                containerStyle={styles.dropdownList}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                inputSearchStyle={styles.dropdownSearchInput}
                                data={clientes}
                                maxHeight={400}
                                search
                                searchPlaceholder="Buscar cliente..."
                                labelField="razaoSocial"
                                valueField="cnpjCpf"
                                placeholder="Selecione o Cliente"
                                autoScroll={false}          // Desabilita o scroll automático
                                activeColor="transparent"   // Remove a cor de fundo do item ativo
                                value={clienteSelecionado?.cnpjCpf}
                                onChange={item => {
                                    const clienteEncontrado = clientes.find(c => c.cnpjCpf === item.cnpjCpf);
                                    if (clienteEncontrado) {
                                        handleClienteSelect(clienteEncontrado);
                                        setClienteError(false);
                                    }
                                }}
                                renderItem={item => (
                                    <View style={styles.dropdownItem}>
                                        <Text style={styles.dropdownItemLabel}>
                                            {item.razaoSocial}
                                        </Text>
                                        <Text style={styles.dropdownItemCnpj}>
                                            {item.cnpjCpf}
                                        </Text>
                                    </View>
                                )}
                            />
                        </View>
                    </View>

                    {/* Endereço */}
                    <View style={styles.inputRow}>
                        <MaterialIcons
                            name="location-on"
                            size={24}
                            color={customTheme.colors.primary}
                        />
                        <View style={styles.enderecoWrapper}>
                            {loadingAddress ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator
                                        size="small"
                                        color={customTheme.colors.primary}
                                    />
                                    <Text style={styles.loadingText}>
                                        Buscando endereço...
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    <Text style={[
                                        styles.enderecoText,
                                        !endereco && styles.placeholderText
                                    ]}>
                                        {endereco || 'Endereço será preenchido automaticamente ao selecionar o cliente'}
                                    </Text>
                                    {/* {endereco && (
                                        <TouchableOpacity
                                            style={styles.alterarEnderecoButton}
                                            onPress={() => setShowAddressModal(true)}
                                        >
                                            <MaterialIcons
                                                name="edit"
                                                size={20}
                                                color={customTheme.colors.primary}
                                            />
                                            <Text style={styles.alterarEnderecoText}>
                                                Alterar endereço
                                            </Text>
                                        </TouchableOpacity>
                                    )} */}
                                </>
                            )}
                        </View>
                    </View>

                    {/* Data de Entrega */}
                    <View style={styles.inputRow}>
                        <MaterialIcons
                            name="event"
                            size={24}
                            color={customTheme.colors.primary}
                        />
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => setMostrarSeletorData(true)}
                        >
                            <Text style={styles.dateText}>
                                Data da Operação: {dataEntrega.toLocaleDateString('pt-BR')}
                            </Text>
                        </TouchableOpacity>

                        {mostrarSeletorData && (
                            <DateTimePicker
                                value={dataEntrega}
                                mode="date"
                                onChange={handleDataChange}
                                minimumDate={new Date()}
                                locale="pt-BR"
                            />
                        )}
                    </View>
                </View>

                {/* Seção: Observações */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="note" size={24} color={customTheme.colors.primary} />
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Observações
                        </Text>
                    </View>

                    <TextInput
                        mode="outlined"
                        label="Observações"
                        value={observacoes}
                        onChangeText={setObservacoes}
                        multiline
                        numberOfLines={4}
                        style={styles.observacoesInput}
                    />
                </View>

                {/* Botão Salvar */}
                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    onPress={handleSalvar}
                    disabled={loading}
                >
                    <View style={styles.saveButtonContent}>
                        <MaterialIcons
                            name="save"
                            size={24}
                            color={customTheme.colors.onPrimary}
                        />
                        <Text style={styles.saveButtonText}>
                            {loading ? 'Salvando...' : 'Salvar Programação'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>

        </Surface>
    );
};

const styles = StyleSheet.create({
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
        width: '100%',
    },
    dropdownContainer: {
        flex: 1,
    },
    dropdown: {
        height: 50,
        borderColor: customTheme.colors.outline,
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 12,
        backgroundColor: customTheme.colors.surface,
        width: '100%',
    },
    dropdownList: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        backgroundColor: customTheme.colors.surface,
        elevation: 3,
    },
    dropdownSearchInput: {
        height: 40,
        borderColor: customTheme.colors.outline,
        borderRadius: 4,
        color: customTheme.colors.onSurface,
    },
    selectedTextStyle: {
        color: customTheme.colors.onSurface,
        fontSize: 16,
    },
    dropdownItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outlineVariant,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 40, // Mantém a altura consistente
        padding: 4,
    },
    loadingText: {
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
    },
    enderecoWrapper: {
        flex: 1,
        backgroundColor: customTheme.colors.surface,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 4,
        padding: 12,
        minHeight: 50, // Garante altura mínima consistente
    },
    enderecoText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    placeholderText: {
        color: customTheme.colors.onSurfaceVariant,
        fontStyle: 'italic',
    },
    dropdownItemLabel: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        marginBottom: 4,
    },
    dropdownItemCnpj: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    dateInput: {
        flex: 1,
        backgroundColor: customTheme.colors.surface,
        padding: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
    },
    dateText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    placeholderStyle: {
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
        position: 'relative', // Adicione isto
    },
    dropdownError: {
        borderColor: customTheme.colors.error,
        borderWidth: 2,
    },
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        paddingVertical: 16,
        paddingHorizontal: 20,
        elevation: 4,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outline,
    },
    headerTitle: {
        fontSize: 22,
        marginLeft: 12,
        color: customTheme.colors.onSurface,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
        padding: 16,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outlineVariant,
    },
    sectionTitle: {
        marginLeft: 8,
        color: customTheme.colors.onSurface,
        fontWeight: '600',
    },
    observacoesInput: {
        minHeight: 120,
    },
    saveButton: {
        backgroundColor: customTheme.colors.primary,
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        elevation: 3,
    },
    saveButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    saveButtonText: {
        color: customTheme.colors.onPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
});

export default FormularioProgramacao;
