import { useState, useEffect, useRef } from 'react';
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
import { Equipment, Container, ClienteInterface, ProgramacaoEquipamento, listaTiposEquipamentos, listaTiposContainers } from '../types/logisticTypes';
import ModernHeader from '../../../../assets/components/ModernHeader';
import { DropdownRef, Equipamento } from '../../Operacao/rdo/Types/rdoTypes';
import EquipmentSection from '../Components/EquipmentSection';
import { clientes } from '../../../../helpers/Types';



const FormularioProgramacao = ({ navigation }: { navigation: any }) => {
    const { userInfo } = useUser();
    const [loading, setLoading] = useState(false);

    // Estados para os campos do formulário
    const [endereco, setEndereco] = useState('');
    const [dataEntrega, setDataEntrega] = useState(new Date());
    const [observacoes, setObservacoes] = useState('');
    const [clienteSelecionado, setClienteSelecionado] = useState<ClienteInterface | null>(null);
    const [loadingAddress, setLoadingAddress] = useState(false);

    const [formErrors, setFormErrors] = useState<string[]>([]);

    const [equipamentosSelecionados, setEquipamentosSelecionados] = useState<Equipment[]>([]);
    const [containersSelecionados, setContainersSelecionados] = useState<Container[]>([]);

    // Estados para controles de UI
    const [mostrarSeletorData, setMostrarSeletorData] = useState(false);

    // Estados para validação
    const [clienteError, setClienteError] = useState(false);
    const [equipamentoError, setEquipamentoError] = useState(false);

    // Add refs for dropdowns like in the second example
    const clienteRef = useRef<DropdownRef>(null);

    // Format date like in the second example
    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('pt-BR');
    };

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
        equipamentosSelecionados.forEach((equip: Equipment) => {
            if (!equip.quantidade || equip.quantidade <= 0) {
                errors.push(`Quantidade inválida para o equipamento do tipo ${equip.tipo}`);
            }
        });

        // Validação das quantidades dos containers selecionados
        containersSelecionados.forEach((container: Container) => {
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
        setEndereco("");
        setClienteError(false);
    };

    const handleDataChange = (event: any, selectedDate?: Date) => {
        setMostrarSeletorData(false);
        if (selectedDate) {
            setDataEntrega(selectedDate);
        }
    };

    const buscarEnderecoPorCnpj = async (cnpj: string) => {
        setLoadingAddress(true);
        try {
            console.log("Iniciando busca por CNPJ");
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
            setLoadingAddress(false);
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
                                name="information-outline"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Informações Gerais
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            {/* Cliente Dropdown - Updated to match second example */}
                            <TouchableOpacity
                                style={styles.dropdownContainer}
                                activeOpacity={0.7}
                                onPress={() => clienteRef.current?.open()}
                            >
                                <Dropdown
                                    ref={clienteRef}
                                    autoScroll={false}
                                    style={styles.dropdown}
                                    placeholderStyle={styles.placeholderStyle}
                                    selectedTextStyle={styles.selectedTextStyle}
                                    inputSearchStyle={styles.dropdownSearchInput}
                                    iconStyle={styles.iconStyle}
                                    data={clientes.map(c => ({
                                        label: c.razaoSocial,
                                        value: c.cnpjCpf,
                                        icon: 'domain',
                                    }))}
                                    containerStyle={styles.dropdownList}
                                    maxHeight={300}
                                    search
                                    searchPlaceholder="Buscar cliente..."
                                    labelField="label"
                                    valueField="value"
                                    placeholder="Selecione o Cliente"
                                    value={clienteSelecionado?.cnpjCpf}
                                    onChange={item => {
                                        const clienteEncontrado = clientes.find(c => c.cnpjCpf === item.value);
                                        if (clienteEncontrado) {
                                            handleClienteSelect(clienteEncontrado);
                                            setClienteError(false);
                                        }
                                    }}
                                    renderLeftIcon={() => (
                                        <Icon
                                            style={styles.dropdownIcon}
                                            name="domain"
                                            size={24}
                                            color={customTheme.colors.primary}
                                        />
                                    )}
                                    renderItem={item => (
                                        <View style={styles.dropdownItem}>
                                            <Icon
                                                name={item.icon}
                                                size={20}
                                                color={customTheme.colors.primary}
                                            />
                                            <Text style={styles.dropdownItemLabel}>
                                                {item.label}
                                            </Text>
                                        </View>
                                    )}
                                />
                            </TouchableOpacity>

                            {/* Endereço Input - Improved styling */}
                            <TextInput
                                mode="outlined"
                                label="Endereço"
                                value={endereco}
                                onChangeText={setEndereco}
                                placeholder="Digite o endereço"
                                multiline
                                numberOfLines={4}
                                style={styles.input}
                                textAlignVertical="top"
                                left={<TextInput.Icon icon={() => (
                                    <Icon
                                        name="map-marker"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                )} />}
                            />

                            {/* CNPJ and GPS buttons */}
                            <View style={styles.enderecoActions}>
                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        loadingAddress && styles.actionButtonLoading
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
                                            <Text style={styles.actionButtonText}>
                                                Buscando...
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={styles.buttonContent}>
                                            <Icon name="card-account-details" size={18} color={customTheme.colors.onPrimary} />
                                            <Text style={styles.actionButtonText}>
                                                Preencher com CNPJ
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.gpsButton}
                                    onPress={() => {
                                        // Combinando nome do cliente e endereço para pesquisa
                                        const searchQuery = `${clienteSelecionado?.razaoSocial || ''} ${endereco}`.trim();
                                        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
                                        Linking.openURL(url);
                                    }}
                                >
                                    <Icon
                                        name="crosshairs-gps"
                                        size={22}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text style={styles.gpsButtonText}>Ver no Mapa</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Data de Entrega */}
                            <TouchableOpacity
                                style={styles.datePickerContainer}
                                onPress={() => setMostrarSeletorData(true)}
                            >
                                <TextInput
                                    mode="outlined"
                                    label="Data da Operação"
                                    value={formatDate(dataEntrega)}
                                    editable={false}
                                    style={styles.input}
                                    left={<TextInput.Icon icon={() => (
                                        <Icon
                                            name="calendar"
                                            size={24}
                                            color={customTheme.colors.primary}
                                        />
                                    )} />}
                                />
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

                    {/* Equipamentos Section */}
                    <View style={styles.section}>

                        <View style={styles.equipmentContainer}>
                            <EquipmentSection
                                equipamentosSelecionados={equipamentosSelecionados}
                                containersSelecionados={containersSelecionados}
                                onAddEquipment={(item: Equipment) => {
                                    console.log("Equipamento adicionado: ", item)
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
        marginBottom: 24, // Reduced margin for more compact layout
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16, // Reduced margin
    },
    sectionTitle: {
        color: customTheme.colors.onSurface,
        fontWeight: '600',
        fontSize: 18,
    },
    inputGroup: {
        gap: 12, // Reduced gap for more compact layout
    },
    input: {
        backgroundColor: '#FFFFFF',
    },
    observacoesInput: {
        backgroundColor: '#FFFFFF',
        minHeight: 120, // Reduced height
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    dropdownContainer: {
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        height: 56,
    },
    dropdown: {
        height: 56,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        borderWidth: 1,
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
    dropdownIcon: {
        marginRight: 12,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    dropdownItemLabel: {
        flex: 1,
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    placeholderStyle: {
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
    },
    selectedTextStyle: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    dropdownSearchInput: {
        height: 40,
        borderColor: customTheme.colors.outline,
        borderRadius: 4,
        color: customTheme.colors.onSurface,
    },
    iconStyle: {
        width: 24,
        height: 24,
    },
    equipmentContainer: {
        backgroundColor: customTheme.colors.surface,
        gap: 16,
    },
    datePickerContainer: {
        flex: 1,
    },
    enderecoActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: -4, // Negative margin to bring it closer to the input
        marginBottom: 8,
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: customTheme.colors.primary,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonLoading: {
        opacity: 0.8,
    },
    actionButtonText: {
        fontSize: 14,
        color: customTheme.colors.onPrimary,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    gpsButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: customTheme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    gpsButtonText: {
        fontSize: 14,
        color: customTheme.colors.primary,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonContainer: {
        marginTop: 8,
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
        padding: 14, // Slightly reduced padding
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
        backgroundColor: customTheme.colors.surfaceDisabled,
        elevation: 0,
    },
    saveButtonTextDisabled: {
        color: customTheme.colors.onSurfaceDisabled,
    },
});

export default FormularioProgramacao;