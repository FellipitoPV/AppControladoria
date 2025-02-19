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
    Linking,
} from 'react-native';
import { Text, Surface, TextInput, Dialog } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Dropdown } from 'react-native-element-dropdown';
import database from '@react-native-firebase/database';
import { useUser } from '../../../../contexts/userContext';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import { customTheme } from '../../../../theme/theme';
import EquipmentSection from './EquipmentSection';
import { Equipment, Container, ClienteInterface, ProgramacaoEquipamento, clientes, listaTiposEquipamentos, listaTiposContainers } from './logisticTypes';
import ModernHeader from '../../../../assets/components/ModernHeader';
import axios from 'axios';

export interface SelectedEquipment extends Equipment {
    quantidade: number;
}

export interface SelectedContainer extends Container {
    quantidade: number;
}

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

    const [equipamentosSelecionados, setEquipamentosSelecionados] = useState<SelectedEquipment[]>([]);
    const [containersSelecionados, setContainersSelecionados] = useState<SelectedContainer[]>([]);

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
        setLoadingAddress(true); // Inicia o loading

        try {
            // Remove caracteres especiais do CNPJ
            const cnpj = cliente.cnpjCpf.replace(/[^\d]/g, '');

            // Busca dados na Brasil API
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);

            if (response.ok) {
                const data = await response.json();

                // Formata o endereço com os dados da API
                const enderecoCompleto = `${data.descricao_tipo_de_logradouro} ${data.logradouro}, ${data.numero}${data.complemento ? ` - ${data.complemento}` : ''}, ${data.bairro}, ${data.municipio} - ${data.uf}, CEP: ${String(data.cep).padStart(8, '0')}`;

                setEndereco(enderecoCompleto);
                setEnderecoCustomizado(false);
            } else {
                // Se não encontrar na API, usa o endereço cadastrado (se existir)
                if (cliente.endereco) {
                    setEndereco(cliente.endereco);
                }
                console.log('Endereço não encontrado na Brasil API');
            }
        } catch (error) {
            console.error('Erro ao buscar dados na Brasil API:', error);
            // Em caso de erro, usa o endereço cadastrado (se existir)
            if (cliente.endereco) {
                setEndereco(cliente.endereco);
            }
        } finally {
            setLoadingAddress(false); // Finaliza o loading independente do resultado
        }
    };

    const handleDataChange = (event: any, selectedDate?: Date) => {
        setMostrarSeletorData(false);
        if (selectedDate) {
            setDataEntrega(selectedDate);
        }
    };

    const validateForm = () => {
        let isValid = true;
        const errors = [];

        if (!clienteSelecionado) {
            errors.push('Por favor, selecione um cliente.');
            isValid = false;
        }

        if (!endereco) {
            errors.push('Por favor, informe o endereço.');
            isValid = false;
        }

        if (equipamentosSelecionados.length === 0) {
            errors.push('Por favor, selecione pelo menos um equipamento.');
            isValid = false;
        }

        if (!isValid) {
            showGlobalToast('error', 'Campos obrigatórios', errors.join('\n'), 4000);
        }

        return isValid;
    };

    // Primeiro, vamos adicionar validações no handleSalvar
    const handleSalvar = async () => {
        if (loading) return;

        if (!validateForm()) {
            return;
        }

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

    const buscarEnderecoPorCnpj = async (cnpj: string) => {
        setLoading(true)
        try {
            console.log("Iniciando busca por CNPJ")
            // Remove caracteres especiais do CNPJ
            const localCnpj = cnpj.replace(/[^\d]/g, '');

            // Busca dados na Brasil API
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${localCnpj}`);
            const data = await response.json();

            // Extrai os dados de endereço da resposta
            const { logradouro, numero, complemento, bairro, municipio, uf, cep } = data;

            // Monta o endereço completo
            const endereco = `${logradouro}, ${numero}${complemento ? ` - ${complemento}` : ''}, ${bairro}, ${municipio} - ${uf}, CEP: ${cep}`;

            return endereco;
        } catch (error) {
            console.error('Erro ao buscar endereço por CNPJ:', error);
            throw error;
        }
        finally {
            setLoading(false)
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

    const handleBuscarEnderecoCnpj = async () => {
        if (clienteSelecionado) {
            setLoadingAddress(true);
            try {
                // Lógica para buscar o endereço com base no CNPJ do cliente selecionado
                const enderecoCnpj = await buscarEnderecoPorCnpj(clienteSelecionado.cnpjCpf);
                setEndereco(enderecoCnpj);
            } catch (error) {
                console.error('Erro ao buscar endereço por CNPJ:', error);
            } finally {
                setLoadingAddress(false);
            }
        }
    };

    return (
        <View style={styles.container}>

            {/* Header */}
            <ModernHeader
                title="Nova Programação"
                iconName="truck"
                onBackPress={() => navigation?.goBack()}
            />

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
                                autoScroll={false}
                                activeColor="transparent"
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
                            <TextInput
                                style={[
                                    styles.enderecoText,
                                    !endereco && styles.placeholderText
                                ]}
                                value={endereco}
                                onChangeText={setEndereco}
                                placeholder="Digite o endereço"
                            />
                            <View style={styles.enderecoActions}>
                                <TouchableOpacity
                                    style={styles.enderecoCnpjButton}
                                    onPress={handleBuscarEnderecoCnpj}
                                >
                                    <Text style={styles.enderecoCnpjButtonText}>
                                        Preencher com CNPJ
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.enderecoGpsButton}
                                    onPress={() => {
                                        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
                                        Linking.openURL(url);
                                    }}
                                >
                                    <MaterialIcons
                                        name="gps-fixed"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                </TouchableOpacity>
                            </View>
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

                {/* Seção: Equipamentos */}
                <EquipmentSection
                    equipamentosSelecionados={equipamentosSelecionados}
                    containersSelecionados={containersSelecionados}
                    onAddEquipment={(item: Equipment) => {
                        setEquipamentosSelecionados(prev => [...prev, { ...item, quantidade: 1 }]);
                    }}
                    onRemoveEquipment={(id: string) => {
                        setEquipamentosSelecionados(prev => prev.filter(e => e.id !== id));
                    }}
                    onUpdateEquipmentQuantity={(id: string, quantity: number) => {
                        setEquipamentosSelecionados(prev =>
                            prev.map(e => e.id === id ? { ...e, quantidade: quantity } : e)
                        );
                    }}
                    onAddContainer={(item: Container) => {
                        setContainersSelecionados(prev => [...prev, { ...item, quantidade: 1 }]);
                    }}
                    onRemoveContainer={(id: string) => {
                        setContainersSelecionados(prev => prev.filter(c => c.id !== id));
                    }}
                    onUpdateContainerQuantity={(id: string, quantity: number) => {
                        setContainersSelecionados(prev =>
                            prev.map(c => c.id === id ? { ...c, quantidade: quantity } : c)
                        );
                    }}
                    listaTiposEquipamentos={listaTiposEquipamentos}
                    listaTiposContainers={listaTiposContainers}
                    equipamentoError={equipamentoError}
                />

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
        </View>
    );

};

const styles = StyleSheet.create({
    enderecoActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    enderecoCnpjButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: customTheme.colors.primary,
        borderRadius: 4,
    },
    enderecoCnpjButtonText: {
        fontSize: 14,
        color: customTheme.colors.onPrimary,
    },
    enderecoGpsButton: {
        padding: 8,
    },
    enderecoErradoButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    enderecoErradoText: {
        fontSize: 12,
        color: customTheme.colors.error,
    },
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
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
    dropdownLabel: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        marginBottom: 8,
        fontWeight: '500',
    },
    selectedEquipmentList: {
        marginTop: 16,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outlineVariant,
        paddingTop: 16,
    },
    selectedEquipmentTitle: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    subsection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outlineVariant,
    },
    subsectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    subsectionTitle: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    dropdownPlaceholder: {
        color: customTheme.colors.onSurfaceVariant,
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
    dropdownItemMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dropdownItemText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    selectedItemsList: {
        gap: 8,
    },
    selectedItem: {
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 8,
        overflow: 'hidden',
    },
    selectedItemContent: {
        padding: 12,
    },
    selectedItemInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    selectedItemText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    selectedItemControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    quantidadeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        borderRadius: 4,
        overflow: 'hidden',
    },
    quantidadeButton: {
        padding: 8,
    },
    quantidadeText: {
        minWidth: 30,
        textAlign: 'center',
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    removeButton: {
        padding: 8,
    },
    equipamentoItemText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        marginBottom: 4,
    },
    containerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    equipamentoItem: {
        marginBottom: 8,
    },
    containerItemText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    containerItemSubtext: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 2,
    },
    equipamentoInfo: {
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
        marginBottom: 16,
    },
    equipamentoInfoText: {
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 4,
        fontSize: 14,
    },
    containersSection: {
        marginTop: 16,
        gap: 8,
    },
    containerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
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
    alterarEnderecoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 4,
    },
    alterarEnderecoText: {
        color: customTheme.colors.primary,
        fontSize: 14,
    },
    placeholderText: {
        color: customTheme.colors.onSurfaceVariant,
        fontStyle: 'italic',
    },
    enderecoInput: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: customTheme.colors.surface,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 4,
        padding: 12,
        minHeight: 50,
    },
    enderecoInputText: {
        flex: 1,
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
        position: 'relative', // Importante para o posicionamento absoluto da lista
    },
    googleAutocompleteContainer: {
        flex: 1,
        paddingHorizontal: 16,
        zIndex: 1, // Importante para a visibilidade da lista
    },
    googleAutocompleteInput: {
        backgroundColor: customTheme.colors.surface,
        color: customTheme.colors.onSurface,
        fontSize: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
    },
    googleAutocompleteList: {
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 4,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    googleAutocompleteRow: {
        padding: 15,
        borderBottomWidth: 1,
        borderColor: customTheme.colors.outlineVariant,
    },
    addressInputButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        gap: 8,
    },
    addressInputText: {
        flex: 1,
        color: customTheme.colors.onSurface,
        fontSize: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outline,
        backgroundColor: customTheme.colors.surface,
    },
    modalBackButton: {
        padding: 8,
    },
    modalTitle: {
        fontSize: 18,
        marginLeft: 8,
        color: customTheme.colors.onSurface,
        fontWeight: '600',
    },
    enderecoDefaultContainer: {
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 8,
    },
    enderecoDefaultText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
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
    photoTip: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        fontStyle: 'italic',
        marginBottom: 12,
        textAlign: 'center',
    },
    datePickerIOS: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: customTheme.colors.surface,
    },
    photoNameDialog: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        width: '90%',
        alignSelf: 'center',
    },
    photoPreviewContainer: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 16,
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    photoPreviewImage: {
        width: '100%',
        height: '100%',
    },
    photoNameInput: {
        marginTop: 8,
        backgroundColor: customTheme.colors.surface,
    },
    itemContainerStyle: {
        width: '100%',
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
    dropdownStyle: {
        width: '85%', // Limita a largura do dropdown
    },
    textInputStyle: {
        flex: 1,
        backgroundColor: customTheme.colors.surface,
        width: '85%', // Mantém consistência com os dropdowns
    },
    inputContainer: {
        marginBottom: 12,
    },
    inputWrapper: {
        backgroundColor: customTheme.colors.surface,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 4,
        height: 56, // Mesma altura do TextInput
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    inputIcon: {
        marginLeft: 12,
        marginRight: 8,
    },
    inputError: {
        borderColor: customTheme.colors.error,
        borderWidth: 2,
    },
    dropdownInput: {
        flex: 1,
        borderWidth: 0, // Remove a borda do dropdown
        backgroundColor: 'transparent',
        height: '100%',
    },
    textInput: {
        backgroundColor: customTheme.colors.surface,
        marginBottom: 12,
        height: 56,
    },
    dropdownButton: {
        backgroundColor: customTheme.colors.surface,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 4,
        marginBottom: 12,
        height: 56,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    dropdownContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdownText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    input: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        marginBottom: 12,
    },
    inputText: {
        marginLeft: 12,
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    photoButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    photoButton: {
        flex: 1,
        backgroundColor: customTheme.colors.primary,
        borderRadius: 8,
        padding: 12,
        elevation: 2,
    },
    photoButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    photoButtonText: {
        color: customTheme.colors.onPrimary,
        fontSize: 16,
        fontWeight: '500',
    },
    photoList: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    emptyPhotos: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 120,
    },
    photoContainer: {
        marginRight: 12,
        width: 120,
    },
    photoThumbnail: {
        width: 120,
        height: 120,
        borderRadius: 8,
        marginBottom: 4,
    },
    photoName: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center',
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
    tipoOcorrenciaContainer: {
        marginBottom: 12,
        borderColor: customTheme.colors.outline,
        borderWidth: 1,
        borderRadius: 4,
        backgroundColor: customTheme.colors.surface,
        height: 56,
        justifyContent: 'center', // Centraliza verticalmente
        paddingHorizontal: 16,
    },
    tipoOcorrenciaContent: {
        flexDirection: 'row',
        alignItems: 'center', // Alinha os itens verticalmente
    },
    tipoOcorrenciaText: {
        color: customTheme.colors.onSurface,
        fontSize: 16,
        marginLeft: 12,
        flex: 1,
    },
    tipoOcorrenciaButton: {
        marginBottom: 12,
        borderColor: customTheme.colors.outline,
        borderWidth: 1,
        backgroundColor: customTheme.colors.surface,
        height: 56, // Mesmo tamanho dos inputs
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
    },
    searchContainer: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outline,
        backgroundColor: customTheme.colors.surface
    },
    searchInput: {
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        backgroundColor: customTheme.colors.surface,
        color: customTheme.colors.onSurface
    },
    photoNameInfo: {
        marginBottom: 16,
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center'
    },
    photoNameExample: {
        color: customTheme.colors.primary,
        fontWeight: '500'
    },
    inputDisabled: {
        backgroundColor: customTheme.colors.surfaceDisabled,
        color: customTheme.colors.onSurface,
        opacity: 0.8
    },
    ocorrenciaDetalhes: {
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 8,
        marginBottom: 12
    },
    dialog: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 28,
        marginHorizontal: 24
    },
    dialogTitle: {
        textAlign: 'center',
        color: customTheme.colors.primary,
        fontSize: 20,
        fontWeight: 'bold'
    },
    tipoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8
    },
    tipoIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: customTheme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    tipoText: {
        flex: 1,
        fontSize: 16,
        color: customTheme.colors.onSurface
    },
    modalPhotoName: {
        color: customTheme.colors.onPrimary,
        fontSize: 16,
        textAlign: 'center'
    },
    dropdownItemSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 32, // para alinhar com o texto acima
        marginTop: 4,
        gap: 4,
    },
    photoPreview: {
        width: '100%',
        height: 200,
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    buttonError: {
        borderColor: customTheme.colors.error,
        borderWidth: 2,
    },
    tiposGrid: {
        gap: 12,
    },
    modalContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: '100%',
        height: '80%',
        resizeMode: 'contain',
    },
    modalButtons: {
        position: 'absolute',
        top: 40,
        right: 20,
        flexDirection: 'row',
        gap: 16,
    },
    modalButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 12,
        borderRadius: 20,
    },
    deleteButton: {
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
    },
});

export default FormularioProgramacao;
