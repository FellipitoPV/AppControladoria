import { useState, useEffect } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
    SafeAreaView,
} from 'react-native';
import { Text, Surface, TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import database from '@react-native-firebase/database';
import { useUser } from '../../../../contexts/userContext';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import { customTheme } from '../../../../theme/theme';
import EquipmentSection from './EquipmentSection';
import { Equipment, Container, ClienteInterface, ProgramacaoEquipamento, clientes, listaTiposEquipamentos, listaTiposContainers } from './logisticTypes';
import ModernHeader from '../../../../assets/components/ModernHeader';

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

    const [formErrors, setFormErrors] = useState<string[]>([]);

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

    // Função validateForm atualizada com os tipos corretos
    const validateForm = () => {
        const errors: string[] = [];

        // Validação do cliente usando ClienteInterface
        if (!clienteSelecionado) {
            errors.push("Por favor, selecione um cliente");
        }

        // Validação do endereço
        if (!endereco.trim()) {
            errors.push("Por favor, informe o endereço de entrega");
        }

        // Validação dos equipamentos e containers
        if (equipamentosSelecionados.length === 0 && containersSelecionados.length === 0) {
            errors.push("Selecione pelo menos um equipamento ou container");
        }

        // Validação das quantidades dos equipamentos selecionados
        equipamentosSelecionados.forEach((equip: SelectedEquipment) => {
            if (!equip.quantidade || equip.quantidade <= 0) {
                errors.push(`Quantidade inválida para o equipamento do tipo ${equip.tipo}`);
            }
        });

        // Validação das quantidades dos containers selecionados
        containersSelecionados.forEach((container: SelectedContainer) => {
            if (!container.quantidade || container.quantidade <= 0) {
                errors.push(`Quantidade inválida para o container ${container.tipo}${container.capacidade ? ` de ${container.capacidade}` : ''}`);
            }
        });

        // Validação da data
        if (!dataEntrega) {
            errors.push("Selecione uma data de entrega");
        } else {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const dataEntregaCopy = new Date(dataEntrega);
            dataEntregaCopy.setHours(0, 0, 0, 0);

            if (dataEntregaCopy < hoje) {
                errors.push("A data de entrega não pode ser anterior a hoje");
            }
        }

        setFormErrors(errors);
        return errors.length === 0;
    };

    // Modifique a função handleSalvar para usar os tipos corretos
    const handleSalvar = async () => {
        if (loading) return;

        if (!validateForm()) {
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

            await database()
                .ref('programacoes')
                .push(novaProgramacao);

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
            setFormErrors(['Ocorreu um erro ao salvar a programação. Tente novamente.']);
        } finally {
            setLoading(false);
        }
    };

    // Adicione useEffect para validação em tempo real
    useEffect(() => {
        validateForm();
    }, [
        clienteSelecionado,
        endereco,
        equipamentosSelecionados,
        containersSelecionados,
        dataEntrega
    ]);

    const handleClienteSelect = async (cliente: ClienteInterface) => {
        setClienteSelecionado(cliente);
        setEndereco("")
        setClienteError(false);
    };

    const handleDataChange = (event: any, selectedDate?: Date) => {
        setMostrarSeletorData(false);
        if (selectedDate) {
            setDataEntrega(selectedDate);
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
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <ModernHeader
                title="Nova Programação"
                iconName="truck"
                onBackPress={() => navigation?.goBack()}
            />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <Surface style={styles.formContainer}>

                    {/* Informações Gerais Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="information"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Informações Gerais
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            {/* Cliente Dropdown */}
                            <View style={styles.inputContainer}>
                                <View style={styles.inputHeader}>
                                    <Icon
                                        name="domain"
                                        size={20}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text style={styles.inputTitle}>Cliente</Text>
                                </View>
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
                                        autoScroll={false}
                                        maxHeight={300}
                                        search
                                        searchPlaceholder="Buscar cliente..."
                                        labelField="razaoSocial"
                                        valueField="cnpjCpf"
                                        placeholder="Selecione o Cliente"
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

                            {/* Endereço Input Atualizado */}
                            <View style={styles.inputContainer}>
                                <View style={styles.inputHeader}>
                                    <Icon
                                        name="map-marker"
                                        size={20}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text style={styles.inputTitle}>Endereço</Text>
                                </View>
                                <View style={styles.enderecoWrapper}>
                                    <TextInput
                                        mode="outlined"
                                        style={styles.enderecoText}
                                        value={endereco}
                                        onChangeText={setEndereco}
                                        placeholder="Digite o endereço"
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                    />
                                    <View style={styles.enderecoActions}>
                                        <TouchableOpacity
                                            style={[
                                                styles.enderecoCnpjButton,
                                                loadingAddress && styles.enderecoCnpjButtonLoading
                                            ]}
                                            onPress={handleBuscarEnderecoCnpj}
                                            disabled={loadingAddress}
                                        >
                                            {loadingAddress ? (
                                                <View style={styles.loadingContainer}>
                                                    <ActivityIndicator
                                                        size="small"
                                                        color={customTheme.colors.onPrimary}
                                                    />
                                                    <Text style={styles.enderecoCnpjButtonText}>
                                                        Buscando...
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text style={styles.enderecoCnpjButtonText}>
                                                    Preencher com CNPJ
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.enderecoGpsButton}
                                            onPress={() => {
                                                // Combinando nome do cliente e endereço para pesquisa
                                                const searchQuery = `${clienteSelecionado?.razaoSocial || ''} ${endereco}`.trim();
                                                const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
                                                Linking.openURL(url);
                                            }}
                                        >
                                            <Icon
                                                name="crosshairs-gps"
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            {/* Data de Entrega */}
                            <View style={styles.inputContainer}>
                                <View style={styles.inputHeader}>
                                    <Icon
                                        name="calendar"
                                        size={20}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text style={styles.inputTitle}>Data da Operação</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setMostrarSeletorData(true)}
                                >
                                    <Text style={styles.dateText}>
                                        {dataEntrega.toLocaleDateString('pt-BR')}
                                    </Text>
                                </TouchableOpacity>
                            </View>

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

                    {/* Equipamentos Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="forklift"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Equipamentos
                            </Text>
                        </View>

                        <View style={styles.equipmentContainer}>
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

                            {equipamentoError && (
                                <View style={styles.errorContainer}>
                                    <Icon
                                        name="alert-circle"
                                        size={16}
                                        color={customTheme.colors.error}
                                    />
                                    <Text style={styles.errorText}>
                                        Selecione pelo menos um equipamento
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Observações Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="notebook"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Observações
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.observacoesContainer}>
                                <TextInput
                                    mode="outlined"
                                    value={observacoes}
                                    onChangeText={setObservacoes}
                                    placeholder="Digite suas observações aqui..."
                                    multiline
                                    numberOfLines={4}
                                    style={styles.observacoesInput}
                                    textAlignVertical="top"
                                    left={<TextInput.Icon icon={() => (
                                        <Icon
                                            name="pencil"
                                            size={24}
                                            color={customTheme.colors.primary}
                                        />
                                    )} />}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Save Button Section */}
                    <View style={styles.buttonContainer}>
                        {formErrors.length > 0 && (
                            <View style={styles.errorContainer}>
                                {formErrors.map((error, index) => (
                                    <View key={index} style={styles.errorItem}>
                                        <Icon
                                            name="alert-circle"
                                            size={16}
                                            color={customTheme.colors.error}
                                        />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                (loading || formErrors.length > 0) && styles.saveButtonDisabled
                            ]}
                            onPress={handleSalvar}
                            disabled={loading || formErrors.length > 0}
                        >
                            <View style={styles.saveButtonContent}>
                                <Icon
                                    name="content-save"
                                    size={24}
                                    color={formErrors.length > 0 ? customTheme.colors.onSurfaceDisabled : customTheme.colors.onPrimary}
                                />
                                <Text style={[
                                    styles.saveButtonText,
                                    formErrors.length > 0 && styles.saveButtonTextDisabled
                                ]}>
                                    {loading ? 'Salvando...' : 'Salvar Programação'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                </Surface>
            </ScrollView>
        </SafeAreaView>
    );


};

const styles = StyleSheet.create({
    enderecoCnpjButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: customTheme.colors.primary,
        borderRadius: 4,
        minWidth: 140,
    },
    enderecoCnpjButtonLoading: {
        opacity: 0.8,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    enderecoCnpjButtonText: {
        fontSize: 14,
        color: customTheme.colors.onPrimary,
    },
    enderecoWrapper: {
        backgroundColor: customTheme.colors.surface,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        padding: 12,
        minHeight: 50,
    },
    enderecoText: {
        backgroundColor: '#FFFFFF',
        minHeight: 40,
        paddingVertical: 8,
        textAlignVertical: 'top',
    },
    enderecoActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outlineVariant,
    },
    inputContainer: {
        gap: 8,
        marginBottom: 16,
    },
    inputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inputTitle: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    dropdownContainer: {
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
    },
    dropdown: {
        height: 56,
        borderRadius: 8,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
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
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    placeholderStyle: {
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
    },
    dropdownItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outlineVariant,
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
    dropdownError: {
        borderColor: customTheme.colors.error,
        borderWidth: 2,
    },
    enderecoGpsButton: {
        padding: 8,
    },
    dateInput: {
        backgroundColor: customTheme.colors.surface,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        height: 56,
    },
    dateText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    buttonContainer: {
        marginTop: 12,
        marginBottom: 24,
        gap: 16,
    },
    errorContainer: {
        backgroundColor: customTheme.colors.errorContainer,
        borderRadius: 8,
        padding: 12,
    },
    errorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    errorText: {
        color: customTheme.colors.error,
        fontSize: 14,
        flex: 1,
    },
    saveButton: {
        backgroundColor: customTheme.colors.primary,
        borderRadius: 8,
        padding: 16,
        elevation: 3,
        minHeight: 56,
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
        backgroundColor: customTheme.colors.surfaceDisabled,
        elevation: 0,
    },
    saveButtonTextDisabled: {
        color: customTheme.colors.onSurfaceDisabled,
    },
    observacoesContainer: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
    },
    observacoesInput: {
        backgroundColor: '#FFFFFF',
        minHeight: 150,
        textAlignVertical: 'top',
        paddingTop: 12,
        paddingBottom: 12,
    },
    equipmentContainer: {
        backgroundColor: customTheme.colors.surface,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        padding: 16,
        gap: 16,
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    formContainer: {
        padding: 16,
        backgroundColor: customTheme.colors.surface,
        elevation: 2,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    sectionTitle: {
        color: customTheme.colors.onSurface,
        fontWeight: '600',
        fontSize: 18,
    },
    inputGroup: {
        gap: 16,
    },
});


export default FormularioProgramacao;