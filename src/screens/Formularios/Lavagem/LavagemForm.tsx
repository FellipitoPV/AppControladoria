import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    Dimensions,
    TouchableOpacity,
    Pressable,
} from 'react-native';
import {
    Surface,
    Text,
    TextInput,
    Button,
    IconButton,
    useTheme,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { customTheme } from '../../../theme/theme';
import { useUser } from '../../../contexts/userContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { Dropdown } from 'react-native-element-dropdown';
import ModernHeader from '../../../assets/components/ModernHeader';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import PhotoGallery from './Components/PhotoGallery';
import FullScreenImage from '../../../assets/components/FullScreenImage';
import { EQUIPAMENTOS, PLACAS_VEICULOS } from './Components/lavagemTypes';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useBackgroundSync } from '../../../contexts/backgroundSyncContext';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

const { width } = Dimensions.get('window');

interface DropdownRef {
    open: () => void;
    close: () => void;
}

type RootStackParamList = {
    LavagemForm: { placa?: string; lavagem?: string, agendamentoId: string };
};

type LavagemFormRouteProp = RouteProp<RootStackParamList, 'LavagemForm'>;

interface LavagemFormInterface {
    navigation?: StackNavigationProp<RootStackParamList, 'LavagemForm'>;
    route?: LavagemFormRouteProp;
}

export default function LavagemForm({ navigation, route }: LavagemFormInterface) {
    const { userInfo } = useUser(); // Usando o contexto do usuário
    const { placa, lavagem, agendamentoId } = route?.params || {}; // Pegando os parâmetros corretamente
    const {
        agendamentos,
        forceSync,
        marcarAgendamentoComoConcluido
    } = useBackgroundSync();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [searchText, setSearchText] = useState('');
    const [veiculoSelecionado, setVeiculoSelecionado] = useState('');
    const [tipoVeiculo, setTipoVeiculo] = useState('');
    const [tipoLavagemSelecionado, setTipoLavagemSelecionado] = useState('');
    const [formErrors, setFormErrors] = useState<string[]>([]);
    const [isVeiculoDisabled, setIsVeiculoDisabled] = useState(false);

    const [photos, setPhotos] = useState<Array<{ uri: string; id: string }>>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; id: string } | null>(null);
    const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);

    const [numeroEquipamento, setNumeroEquipamento] = useState('');
    const [showEquipmentNumber, setShowEquipmentNumber] = useState(false);

    const [customItems, setCustomItems] = useState<Array<{
        label: string;
        value: string;
        icon: string;
        tipo: string;
        isCustom: boolean;
    }>>([]);

    // Refs para abrir os dropdowns
    const lavagemRef = useRef<DropdownRef>(null);
    const veiculoRef = useRef<DropdownRef>(null);

    // Refs para os itens
    const [dropdownRefs, setDropdownRefs] = useState<Array<React.RefObject<any>>>([]);

    const TIPOS_LAVAGEM = [
        { label: 'Completa', value: 'completa', icon: 'local-car-wash' },
        { label: 'Simples', value: 'simples', icon: 'local-car-wash' }
    ];

    const [produtosSelecionados, setProdutosSelecionados] = useState<Array<{
        produto: string;
        quantidade: string;
    }>>([]);

    // Lista de produtos disponíveis (exemplo)
    const PRODUTOS_ESTOQUE = [
        { nome: 'Shampoo Automotivo', quantidade: '50' },
        { nome: 'Cera Líquida', quantidade: '30' },
        { nome: 'Limpa Pneus', quantidade: '25' },
        { nome: 'Silicone', quantidade: '40' },
    ];

    const handleAddCustomItem = (searchValue: string) => {
        const novoItem = {
            label: searchValue.toUpperCase(),
            value: searchValue.toUpperCase(),
            icon: 'directions-car',
            tipo: 'veiculo',
            isCustom: false
        };

        setCustomItems(prev => [...prev, novoItem]);
        handleSelectItem(novoItem);
    };

    const handleSelectItem = (item: any) => {
        setVeiculoSelecionado(item.value);
        setTipoVeiculo(item.tipo);
        setSearchText('');

        // Controla a visibilidade do input de número do equipamento
        setShowEquipmentNumber(item.tipo === 'equipamento');
        // Reseta o número do equipamento se não for um equipamento
        if (item.tipo !== 'equipamento') {
            setNumeroEquipamento('');
        }
    };

    const formatarDadosDropdown = () => {
        const veiculos = PLACAS_VEICULOS.map(item => ({
            label: `${item.value} - ${item.tipo}`,
            value: item.value,
            icon: 'directions-car',
            tipo: 'veiculo',
            isCustom: false,
        }));

        const equipamentos = EQUIPAMENTOS.map(item => ({
            label: `${item.value} - ${item.tipo}`,
            value: item.value,
            icon: 'build',
            tipo: 'equipamento',
            isCustom: false,
        }));

        const dados = [...veiculos, ...equipamentos, ...customItems];

        // Adiciona opção de novo item apenas se houver texto de busca
        if (searchText && !dados.some(item =>
            item.label.toLowerCase().includes(searchText.toLowerCase()) ||
            item.value.toLowerCase().includes(searchText.toLowerCase())
        )) {
            dados.push({
                label: `Adicionar "${searchText.toUpperCase()}"`,
                value: searchText.toUpperCase(),
                icon: 'add-circle',
                tipo: 'veiculo',
                isCustom: true
            });
        }

        return dados;
    };

    const handleSearchTextChange = (text: string) => {
        setSearchText(text);
    };

    const [formData, setFormData] = useState({
        responsavel: '',
        veiculo: '',
        tipoLavagem: '',
        observacoes: '',
    });

    // Efeito para definir o responsável quando o userInfo estiver disponível
    useEffect(() => {
        console.log(lavagem);
        console.log(placa);

        if (userInfo) {
            setFormData(prev => ({
                ...prev,
                responsavel: userInfo.user
            }));
        }

        // Novo bloco para tratar placa e lavagem
        if (placa) {
            // Encontrar o veículo correspondente na lista de veículos
            const veiculoEncontrado = formatarDadosDropdown().find(
                v => v.value.toUpperCase() === placa.toUpperCase()
            );

            if (veiculoEncontrado) {
                // Setar o veículo selecionado
                setVeiculoSelecionado(veiculoEncontrado.value);
                setTipoVeiculo(veiculoEncontrado.tipo);

                // Desabilitar a seleção de veículo
                setIsVeiculoDisabled(true);
                console.log("veiculo encontrado")
            }
        }

        if (lavagem) {
            // Verificar se o tipo de lavagem é válido
            const tipoLavagemValido = TIPOS_LAVAGEM.some(
                tipo => tipo.value === lavagem.toLowerCase()
            );

            if (tipoLavagemValido) {
                // Setar o tipo de lavagem
                setTipoLavagemSelecionado(lavagem.toLowerCase());
                setFormData(prev => ({
                    ...prev,
                    tipoLavagem: lavagem.toLowerCase()
                }));
            }
        }
    }, [userInfo, placa, lavagem]);

    const validateForm = () => {
        const errors: string[] = [];

        // Validação do responsável
        if (!formData.responsavel) {
            errors.push("Informe o responsável");
        }

        // Validação do veículo
        if (!veiculoSelecionado) {
            errors.push("Selecione um veículo");
        }

        // Validação do número do equipamento
        if (tipoVeiculo === 'equipamento' && !numeroEquipamento) {
            errors.push("Informe o número do equipamento");
        }

        // Validação do tipo de lavagem
        if (!tipoLavagemSelecionado) {
            errors.push("Selecione o tipo de lavagem");
        }

        // Validação dos produtos
        if (produtosSelecionados.length > 0) {
            const produtosInvalidos = produtosSelecionados.some(
                p => (p.produto && (!p.quantidade || p.quantidade === '0')) || // Se tem produto, precisa ter quantidade
                    (!p.produto && p.quantidade) // Se tem quantidade, precisa ter produto
            );

            if (produtosInvalidos) {
                errors.push("Preencha a quantidade para os produtos selecionados");
            }
        }

        setFormErrors(errors);
        return errors.length === 0;
    };

    const handleSave = async () => {
        // Primeiro, valide o formulário
        if (!validateForm()) {
            return;
        }

        try {
            // Mostrar toast de carregamento
            showGlobalToast('info', 'Aguarde', 'Fazendo upload das fotos...', 15000);

            // Primeiro fazer o upload das fotos e obter as URLs
            const uploadPromises = photos.map(async (photo) => {
                try {
                    const timestamp = Date.now();
                    const random = Math.random().toString(36).substring(7);
                    const filename = `lavagens/${timestamp}_${random}.jpg`;
                    const reference = storage().ref(filename);

                    // Converter URI para blob
                    const response = await fetch(photo.uri);
                    const blob = await response.blob();

                    // Fazer upload do blob
                    await reference.put(blob);

                    // Retornar a URL do arquivo
                    const url = await reference.getDownloadURL();
                    return {
                        url,
                        timestamp,
                        path: filename
                    };
                } catch (error) {
                    console.error('Erro no upload da foto:', error);
                    throw new Error('Falha no upload da foto');
                }
            });

            // Aguardar todos os uploads terminarem
            const fotosUpload = await Promise.all(uploadPromises);

            // Mostrar toast de salvamento
            showGlobalToast('info', 'Aguarde', 'Salvando informações...', 2000);

            // Agora preparar os dados para salvar no Firestore com as URLs das fotos
            const registroLavagem = {
                responsavel: formData.responsavel,
                data: formatDate(selectedDate),
                hora: formatTime(selectedDate),
                veiculo: {
                    placa: veiculoSelecionado,
                    tipo: tipoVeiculo,
                    numeroEquipamento: tipoVeiculo === 'equipamento' ? numeroEquipamento : null
                },
                tipoLavagem: tipoLavagemSelecionado,
                produtos: produtosSelecionados.map(p => ({
                    nome: p.produto,
                    quantidade: parseInt(p.quantidade)
                })),
                fotos: fotosUpload.map(foto => ({
                    url: foto.url,
                    timestamp: foto.timestamp,
                    path: foto.path
                })),
                observacoes: formData.observacoes,
                status: "concluido",
                createdAt: firestore.Timestamp.now(),
                createdBy: userInfo?.id || null,
                agendamentoId: agendamentoId || null
            };

            // Criar ID customizado com prefixo e timestamp
            const timestamp = Date.now();
            const customId = `0_ADM_${timestamp}`;

            // Salvar no Firestore com ID customizado
            await firestore()
                .collection('registroLavagens')
                .doc(customId)
                .set(registroLavagem);

            // Se um agendamentoId foi passado, vamos marcar como concluído
            if (agendamentoId && marcarAgendamentoComoConcluido) {
                await marcarAgendamentoComoConcluido(agendamentoId);
            }

            // Após salvar, navegue de volta
            navigation?.goBack();

            // Exiba um toast de sucesso
            showGlobalToast('success', 'Sucesso', 'Lavagem registrada com sucesso', 4000);

        } catch (error: any) {
            console.error('Erro ao finalizar lavagem:', error);

            // Exiba um toast de erro mais específico baseado no tipo de erro
            const errorMessage = error.message === 'Falha no upload da foto'
                ? 'Erro no upload das fotos. Verifique sua conexão.'
                : 'Não foi possível finalizar a lavagem';

            showGlobalToast('error', 'Erro', errorMessage, 4000);
        }
    };

    const handleDateChange = (event: any, date?: Date) => {
        setShowDatePicker(false);
        if (date) {
            // Mantém a hora atual ao mudar a data
            const newDate = new Date(date);
            newDate.setHours(selectedDate.getHours());
            newDate.setMinutes(selectedDate.getMinutes());
            setSelectedDate(newDate);
        }
    };

    const handleTimeChange = (event: any, date?: Date) => {
        setShowTimePicker(false);
        if (date) {
            // Mantém a data atual ao mudar a hora
            const newDate = new Date(selectedDate);
            newDate.setHours(date.getHours());
            newDate.setMinutes(date.getMinutes());
            setSelectedDate(newDate);
        }
    };

    // Funções de controle
    const adicionarProduto = () => {
        setProdutosSelecionados([...produtosSelecionados, { produto: '', quantidade: '' }]);
        // Adiciona uma nova ref ao array de refs
        setDropdownRefs(refs => [...refs, React.createRef()]);
    };

    // Modifique a função removerProduto para também remover a ref
    const removerProduto = (index: number) => {
        const novosProdutos = produtosSelecionados.filter((_, idx) => idx !== index);
        setProdutosSelecionados(novosProdutos);

        // Remove a ref correspondente
        const novasRefs = dropdownRefs.filter((_, idx) => idx !== index);
        setDropdownRefs(novasRefs);
    };

    const atualizarProduto = (index: number, atualizacoes: Partial<{ produto: string; quantidade: string }>) => {
        const novosProdutos = [...produtosSelecionados];
        novosProdutos[index] = {
            ...novosProdutos[index],
            ...atualizacoes
        };
        setProdutosSelecionados(novosProdutos);
    };

    // Função para formatar a data no formato brasileiro
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR');
    };

    // Função para formatar a hora
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Modifique a função selectImage
    const selectImage = () => {
        const options: any = {
            mediaType: 'photo',
            quality: 1,
        };

        launchImageLibrary(options, (response: any) => {
            if (response.didCancel) {
                console.log('Seleção de imagem cancelada');
            } else if (response.error) {
                console.log('Erro ImagePicker:', response.error);
                showGlobalToast(
                    'error',
                    'Não foi possível selecionar a imagem',
                    'Tente novamente',
                    4000
                );
            } else if (response.assets && response.assets.length > 0) {
                const newPhotoUri = response.assets[0].uri;
                // Criando um objeto com uri e id único
                const newPhoto = {
                    uri: newPhotoUri,
                    id: Date.now().toString(), // Usando timestamp como id único
                };
                setPhotos(prevPhotos => [...prevPhotos, newPhoto]);
            }
        });
    };

    const LaunchCustomCamera = () => {
        const options: any = {
            mediaType: 'photo',
            quality: 1,
        };

        launchCamera(options, (response: any) => {
            if (response.didCancel) {
                console.log('Captura de foto cancelada');
            } else if (response.error) {
                console.log('Erro Camera:', response.error);
                Toast.show({
                    type: 'error',
                    text1: 'Erro',
                    text2: 'Não foi possível capturar a foto',
                });
            } else if (response.assets && response.assets.length > 0) {
                const newPhotoUri = response.assets[0].uri;
                // Criando um objeto com uri e id único
                const newPhoto = {
                    uri: newPhotoUri,
                    id: Date.now().toString(), // Usando timestamp como id único
                };
                setPhotos(prevPhotos => [...prevPhotos, newPhoto]);
            }
        });
    };

    const handleDeletePhoto = (photoId: string) => {
        setPhotos(currentPhotos => currentPhotos.filter(photo => photo.id !== photoId));
    };

    // Atualize a função handlePhotoPress
    const handlePhotoPress = (photo: { uri: string; id: string }) => {
        setSelectedPhoto(photo);
        setIsFullScreenVisible(true);
    };

    // Adicione a função para fechar o modal
    const handleCloseFullScreen = () => {
        setIsFullScreenVisible(false);
        setSelectedPhoto(null);
    };

    // Useefects
    useEffect(() => {
        if (dropdownRefs.length === 0 && produtosSelecionados.length > 0) {
            setDropdownRefs([React.createRef()]);
        }
    }, []);

    useEffect(() => {
        validateForm();
    }, [
        formData,
        veiculoSelecionado,
        tipoLavagemSelecionado,
        produtosSelecionados,
        photos
    ]);

    return (
        <SafeAreaView style={styles.safeArea}>

            {/* Header */}
            <ModernHeader
                title="Nova Lavagem"
                iconName="car-wash"
                onBackPress={() => navigation?.goBack()}
            />

            <FullScreenImage
                visible={isFullScreenVisible}
                photo={selectedPhoto}
                onClose={handleCloseFullScreen}
            />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {/* Form Container */}
                <Surface style={styles.formContainer}>

                    {/* Informações Gerais */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="info"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Informações Gerais
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <TextInput
                                mode="outlined"
                                placeholder="Responsável"
                                value={formData.responsavel}
                                disabled={!!userInfo} // Desabilita se houver usuário logado
                                onChangeText={(text) =>
                                    setFormData({ ...formData, responsavel: text })
                                }
                                left={<TextInput.Icon icon={() => (
                                    <Icon name="account-circle" size={24} color={customTheme.colors.primary} />
                                )} />}
                                style={[
                                    styles.input,
                                    !!userInfo && styles.disabledInput // Aplica estilo adicional se estiver desabilitado
                                ]}
                            />

                            <View style={styles.rowInputs}>
                                <TouchableOpacity
                                    style={styles.dateTimeContainer}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <TextInput
                                        mode="outlined"
                                        label="Data"
                                        value={formatDate(selectedDate)}
                                        editable={false}
                                        style={[styles.input, styles.rowInput]}
                                        left={<TextInput.Icon icon={() => (
                                            <Icon name="calendar-today" size={24} color={customTheme.colors.primary} />
                                        )} />}
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.dateTimeContainer}
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <TextInput
                                        mode="outlined"
                                        label="Hora"
                                        value={formatTime(selectedDate)}
                                        editable={false}
                                        style={[styles.input, styles.rowInput]}
                                        left={<TextInput.Icon icon={() => (
                                            <Icon name="access-time" size={24} color={customTheme.colors.primary} />
                                        )} />}
                                    />
                                </TouchableOpacity>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={selectedDate}
                                        mode="date"
                                        is24Hour={true}
                                        display="default"
                                        onChange={handleDateChange}
                                    />
                                )}

                                {showTimePicker && (
                                    <DateTimePicker
                                        value={selectedDate}
                                        mode="time"
                                        is24Hour={true}
                                        display="default"
                                        onChange={handleTimeChange}
                                    />
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Seção de Veículo */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="directions-car"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Veículo
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.dropdownContainer}
                            activeOpacity={0.7}
                            onPress={!isVeiculoDisabled ? () => veiculoRef.current?.open() : undefined}
                        >
                            <Dropdown
                                ref={veiculoRef}
                                style={[
                                    styles.dropdown,
                                    isVeiculoDisabled && styles.disabledDropdown
                                ]}
                                placeholderStyle={[
                                    styles.placeholderStyle,
                                    isVeiculoDisabled && styles.disabledPlaceholderStyle
                                ]}
                                selectedTextStyle={[
                                    styles.selectedTextStyle,
                                    isVeiculoDisabled && styles.disabledSelectedTextStyle
                                ]}
                                disable={isVeiculoDisabled}
                                inputSearchStyle={styles.inputSearchStyle}
                                iconStyle={styles.iconStyle}
                                data={formatarDadosDropdown()}
                                search
                                maxHeight={300}
                                labelField="label"
                                valueField="value"
                                placeholder="Selecione ou digite uma placa"
                                searchPlaceholder="Digite para buscar ou adicionar..."
                                value={veiculoSelecionado}
                                onChangeText={handleSearchTextChange}
                                onChange={item => {
                                    if (item.isCustom) {
                                        handleAddCustomItem(searchText);
                                    } else {
                                        handleSelectItem(item);
                                    }
                                }}
                                renderLeftIcon={() => (
                                    <Icon
                                        style={styles.dropdownIcon}
                                        name={tipoVeiculo === 'equipamento' ? 'build' : 'directions-car'}
                                        size={20}
                                        color={customTheme.colors.primary}
                                    />
                                )}
                                renderItem={item => (
                                    <View style={[
                                        styles.dropdownItem,
                                        item.isCustom && styles.dropdownItemCustom
                                    ]}>
                                        <Icon
                                            name={item.icon}
                                            size={20}
                                            color={item.isCustom ? customTheme.colors.primary :
                                                item.tipo === 'equipamento' ? customTheme.colors.secondary :
                                                    customTheme.colors.primary}
                                        />
                                        <Text style={[
                                            styles.dropdownLabel,
                                            item.isCustom && styles.dropdownLabelCustom
                                        ]}>
                                            {item.label}
                                        </Text>
                                    </View>
                                )}
                            />
                        </TouchableOpacity>

                        {/* Novo input condicional para número do equipamento */}
                        {showEquipmentNumber && (
                            <TextInput
                                mode="outlined"
                                placeholder="Número do Equipamento"
                                value={numeroEquipamento}
                                onChangeText={setNumeroEquipamento}
                                keyboardType="numeric"
                                style={[styles.input, styles.equipmentNumberInput]}
                                left={<TextInput.Icon icon={() => (
                                    <Icon name="pin" size={24} color={customTheme.colors.primary} />
                                )} />}
                            />
                        )}

                    </View>

                    {/* Tipo de Lavagem */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="local-car-wash"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Tipo de Lavagem
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <TouchableOpacity
                                style={styles.dropdownContainer} // Novo estilo
                                activeOpacity={0.7}
                                onPress={() => lavagemRef.current?.open()}
                            >
                                <Dropdown
                                    ref={lavagemRef}
                                    style={[styles.dropdown, { borderWidth: 0 }]} // Removemos a borda do dropdown
                                    placeholderStyle={styles.placeholderStyle}
                                    selectedTextStyle={styles.selectedTextStyle}
                                    iconStyle={styles.iconStyle}
                                    data={TIPOS_LAVAGEM}
                                    maxHeight={300}
                                    labelField="label"
                                    valueField="value"
                                    placeholder="Selecione o tipo de lavagem"
                                    value={tipoLavagemSelecionado}
                                    onChange={item => {
                                        setTipoLavagemSelecionado(item.value);
                                        setFormData(prev => ({
                                            ...prev,
                                            tipoLavagem: item.value
                                        }));
                                    }}
                                    renderLeftIcon={() => (
                                        <Icon
                                            style={styles.dropdownIcon}
                                            name="local-car-wash"
                                            size={20}
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
                                            <Text style={styles.dropdownLabel}>
                                                {item.label}
                                            </Text>
                                        </View>
                                    )}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Seção de Produtos */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="local-pharmacy"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Produtos Utilizados
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            {produtosSelecionados.map((item, index) => (
                                <View key={`produto-${index}`} style={styles.produtoRow}>
                                    <View style={styles.produtoMain}>
                                        <TouchableOpacity
                                            style={styles.dropdownContainer}
                                            onPress={() => dropdownRefs[index]?.current?.open()}
                                        >
                                            <Dropdown
                                                ref={dropdownRefs[index]}
                                                style={[styles.dropdown, { borderWidth: 0 }]}
                                                placeholderStyle={styles.placeholderStyle}
                                                selectedTextStyle={styles.selectedTextStyle}
                                                iconStyle={styles.iconStyle}
                                                data={PRODUTOS_ESTOQUE.filter(p =>
                                                    !produtosSelecionados.some(ps => ps.produto === p.nome) ||
                                                    p.nome === item.produto
                                                )}
                                                labelField="nome"
                                                valueField="nome"
                                                placeholder="Selecione o produto"
                                                value={item.produto}
                                                onChange={value => {
                                                    atualizarProduto(index, {
                                                        produto: value.nome,
                                                        quantidade: '1'
                                                    });
                                                }}
                                                renderLeftIcon={() => (
                                                    <Icon
                                                        name="inventory"
                                                        size={20}
                                                        color={customTheme.colors.primary}
                                                        style={styles.dropdownIcon}
                                                    />
                                                )}
                                                renderItem={item => (
                                                    <View style={styles.dropdownItem}>
                                                        <Icon
                                                            name="inventory"
                                                            size={20}
                                                            color={customTheme.colors.primary}
                                                        />
                                                        <Text style={styles.dropdownLabel}>
                                                            {item.nome}
                                                        </Text>
                                                    </View>
                                                )}
                                            />
                                        </TouchableOpacity>

                                        <TextInput
                                            mode="outlined"
                                            placeholder="Qtd"
                                            value={item.quantidade}
                                            onChangeText={value => {
                                                const produtoEstoque = PRODUTOS_ESTOQUE.find(p => p.nome === item.produto);
                                                if (produtoEstoque) {
                                                    const quantidadeEstoque = parseInt(produtoEstoque.quantidade);
                                                    let quantidadeDigitada = parseInt(value) || 0;

                                                    if (quantidadeDigitada > quantidadeEstoque) {
                                                        quantidadeDigitada = quantidadeEstoque;
                                                        value = quantidadeEstoque.toString();
                                                    }
                                                }
                                                atualizarProduto(index, { quantidade: value });
                                            }}
                                            keyboardType="numeric"
                                            style={styles.quantidadeInput}
                                            left={<TextInput.Icon
                                                icon={() => (
                                                    <Icon
                                                        name="123"
                                                        size={24}
                                                        color={customTheme.colors.primary}
                                                    />
                                                )}
                                            />}
                                        />

                                        <TouchableOpacity
                                            onPress={() => removerProduto(index)}
                                            style={styles.removeButton}
                                        >
                                            <Icon name="delete-outline" size={24} color={customTheme.colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            <Button
                                mode="outlined"
                                onPress={adicionarProduto}
                                icon="plus"
                                style={styles.addButton}
                            >
                                Adicionar Produto
                            </Button>
                        </View>
                    </View>

                    {/* Seção de Fotos */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="camera-alt"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Registro Fotográfico
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.photoButtonsContainer}>
                                <TouchableOpacity
                                    style={styles.dropdownContainer}
                                    activeOpacity={0.7}
                                    onPress={LaunchCustomCamera}
                                >
                                    <View style={styles.photoButton}>
                                        <Icon
                                            name="camera-alt"
                                            size={24}
                                            color={customTheme.colors.primary}
                                        />
                                        <Text style={styles.photoButtonText}>Tirar Foto</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.dropdownContainer}
                                    activeOpacity={0.7}
                                    onPress={selectImage}
                                >
                                    <View style={styles.photoButton}>
                                        <Icon
                                            name="photo-library"
                                            size={24}
                                            color={customTheme.colors.primary}
                                        />
                                        <Text style={styles.photoButtonText}>Galeria</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Componente de Galeria */}
                            <View style={styles.photoGalleryContainer}>
                                <PhotoGallery
                                    photos={photos}
                                    onDeletePhoto={handleDeletePhoto}
                                    onPhotoPress={handlePhotoPress}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Observações */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="note"
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
                                label="Observações"
                                value={formData.observacoes}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, observacoes: text })
                                }
                                left={<TextInput.Icon icon={() => (
                                    <Icon name="note" size={24} color={customTheme.colors.primary} />
                                )} />}
                                multiline
                                numberOfLines={4}
                                style={[styles.input, styles.textArea]}
                                textAlignVertical="top"
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
                                            name="error-outline"
                                            size={16}
                                            color={customTheme.colors.error}
                                        />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        <Button
                            mode="contained"
                            disabled={formErrors.length > 0}
                            onPress={handleSave}
                            style={styles.button}
                            contentStyle={styles.buttonContent}
                        >
                            Salvar Lavagem
                        </Button>
                    </View>

                </Surface>
            </ScrollView>

        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    vehicleInputsContainer: {
        gap: 16,
    },
    equipmentNumberInput: {
        backgroundColor: '#FFFFFF',
        marginTop: 8,
    },
    disabledDropdown: {
        backgroundColor: customTheme.colors.surfaceDisabled,
        opacity: 0.7,
    },
    disabledPlaceholderStyle: {
        color: customTheme.colors.onSurfaceVariant,
        opacity: 0.7,
    },
    disabledSelectedTextStyle: {
        color: customTheme.colors.onSurfaceVariant,
        opacity: 0.7,
    },
    errorContainer: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: customTheme.colors.errorContainer,
        borderRadius: 8,
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
    textArea: {
        minHeight: 150,  // Isso dará espaço para aproximadamente 4 linhas
        textAlignVertical: 'top',
        paddingTop: 12,  // Adiciona um padding superior para melhor aparência
        paddingBottom: 2, // Adiciona um padding inferior para melhor aparência
    },
    photoButtonsContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    photoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 16,
        height: 56,
    },
    photoButtonText: {
        fontSize: 16,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    photoGalleryContainer: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderStyle: 'dashed',
        padding: 16,
        minHeight: 200,
        backgroundColor: '#FFFFFF',
    },
    produtoRow: {
        marginBottom: 16,
    },
    produtoMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dropdownContainer: {
        flex: 2,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
    },
    quantidadeInput: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    removeButton: {
        padding: 8,
    },
    addButton: {
        marginTop: 8,
        borderColor: customTheme.colors.primary,
        borderStyle: 'dashed',
    },
    dropdown: {
        height: 56,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
    },
    dropdownIcon: {
        marginRight: 12,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    dropdownItemCustom: {
        backgroundColor: customTheme.colors.primaryContainer + '20', // Mais sutil
    },
    dropdownLabel: {
        flex: 1,
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    dropdownLabelCustom: {
        color: customTheme.colors.primary,
        fontWeight: '500',
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
    inputSearchStyle: {
        height: 48,
        fontSize: 16,
        borderRadius: 8,
        color: customTheme.colors.onSurface,
    },
    iconStyle: {
        width: 24,
        height: 24,
    },

    // Estilos principais do layout
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    container: {
        flex: 1,
        padding: 20,
    },

    // Estilos das seções
    section: {
        marginBottom: 32, // Aumentado para melhor separação
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
        fontSize: 18, // Aumentado para melhor hierarquia
    },

    // Estilos dos inputs
    inputGroup: {
        gap: 16, // Aumentado para melhor espaçamento
    },
    input: {
        backgroundColor: '#FFFFFF',
        height: 56, // Altura consistente
    },
    rowInputs: {
        flexDirection: 'row',
        gap: 16,
    },
    rowInput: {
        flex: 1,
    },
    dateTimeContainer: {
        flex: 1,
    },
    disabledInput: {
        opacity: 0.7,
        backgroundColor: customTheme.colors.surfaceDisabled,
    },

    // Estilo do botão
    buttonContainer: {
        marginTop: 32,
        marginBottom: 24,
    },
    button: {
        borderRadius: 8,
        elevation: 0, // Remove sombra
    },
    buttonContent: {
        height: 56, // Aumentado para melhor toque
        paddingHorizontal: 24,
    },
    suggestionItemPressed: {
        backgroundColor: customTheme.colors.surfaceVariant,
        opacity: 0.8,
    },
    noMatchItemPressed: {
        opacity: 0.7,
    },
    autocompleteContainer: {
        position: 'relative',
        zIndex: 1,
    },
    suggestionsList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        maxHeight: 250,
        marginTop: 4,
        borderRadius: 8,
        backgroundColor: customTheme.colors.surface,
        overflow: 'hidden',
    },
    suggestionsScroll: {
        flex: 1,
    },
    suggestionsSection: {
        paddingVertical: 8,
    },
    suggestionsSectionTitle: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 12,
        color: customTheme.colors.primary,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    suggestionContent: {
        flex: 1,
    },
    suggestionTitle: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    suggestionSubtitle: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    noMatchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        backgroundColor: customTheme.colors.errorContainer,
    },
    noMatchText: {
        flex: 1,
        fontSize: 14,
        color: customTheme.colors.error,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: customTheme.colors.surface,
        elevation: 2,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        color: customTheme.colors.onSurface,
        fontWeight: '600',
    },
    formContainer: {
        padding: 16,
        backgroundColor: customTheme.colors.surface,
        elevation: 2,
    },
});