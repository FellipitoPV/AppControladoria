import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Dimensions, TouchableOpacity } from 'react-native';
import { Surface, Text, TextInput, Button, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { customTheme } from '../../../theme/theme';
import { useUser } from '../../../contexts/userContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';
import ModernHeader from '../../../assets/components/ModernHeader';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import PhotoGallery from './Components/PhotoGallery';
import FullScreenImage from '../../../assets/components/FullScreenImage';
import { EQUIPAMENTOS, PLACAS_VEICULOS, ProdutoEstoque, TIPOS_LAVAGEM } from './Components/lavagemTypes';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useBackgroundSync } from '../../../contexts/backgroundSyncContext';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import SaveButton from '../../../assets/components/SaveButton';
import PhotoGalleryEnhanced from './Components/PhotoGallery';
import { ProductsContainer } from './Components/ProductSelection';
import { Photo } from '../Logistica/rdo/Types/rdoTypes';

const { width } = Dimensions.get('window');

interface DropdownRef {
    open: () => void;
    close: () => void;
}

type RootStackParamList = {
    LavagemForm: {
        placa?: string;
        lavagem?: string;
        agendamentoId?: string;
        mode?: 'edit' | 'create';
        lavagemData?: any;
    };
};

type LavagemFormRouteProp = RouteProp<RootStackParamList, 'LavagemForm'>;


interface LavagemFormInterface {
    navigation?: StackNavigationProp<RootStackParamList, 'LavagemForm'>;
    route?: LavagemFormRouteProp;
}

export default function LavagemForm({ navigation, route }: LavagemFormInterface) {
    const { userInfo } = useUser();
    const {
        placa,
        lavagem,
        agendamentoId,
        mode = 'create',
        lavagemData
    } = route?.params || {};

    const {
        produtos,
        forceSync,
        marcarAgendamentoComoConcluido
    } = useBackgroundSync();

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [searchText, setSearchText] = useState('');
    const [veiculoSelecionado, setVeiculoSelecionado] = useState('');
    const [tipoVeiculo, setTipoVeiculo] = useState('');
    const [tipoLavagemSelecionado, setTipoLavagemSelecionado] = useState('');
    const [formErrors, setFormErrors] = useState<string[]>([]);
    const [isVeiculoDisabled, setIsVeiculoDisabled] = useState(false);

    // Estados das fotos
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [existingPhotos, setExistingPhotos] = useState<Photo[]>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
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

    const [availableProducts, setAvailableProducts] = useState<ProdutoEstoque[]>(produtos);
    const [selectedProducts, setSelectedProducts] = useState<ProdutoEstoque[]>([]);


    // Refs para abrir os dropdowns
    const lavagemRef = useRef<DropdownRef>(null);
    const veiculoRef = useRef<DropdownRef>(null);

    // Refs para os itens
    const [dropdownRefs, setDropdownRefs] = useState<Array<React.RefObject<any>>>([]);

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

    // Substitua a função handleAddCustomItem existente por esta versão
    const handleAddCustomItem = (searchValue: string) => {
        // Determina o tipo baseado na placa
        const tipoDetectado = determinarTipoVeiculo(searchValue.toUpperCase());

        const novoItem = {
            label: `${searchValue.toUpperCase()} - ${tipoDetectado === 'veiculo' ? 'Veículo' : 'Outro'}`,
            value: searchValue.toUpperCase(),
            icon: tipoDetectado === 'veiculo' ? 'directions-car' : 'category',
            tipo: tipoDetectado,
            isCustom: false
        };

        setCustomItems(prev => [...prev, novoItem]);
        handleSelectItem(novoItem);
    };

    // Modifique a função formatarDadosDropdown para incluir diferentes ícones
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

        const outros = customItems.map(item => ({
            ...item,
            icon: item.tipo === 'veiculo' ? 'directions-car' :
                item.tipo === 'equipamento' ? 'build' : 'category'
        }));

        const dados = [...veiculos, ...equipamentos, ...outros];

        // Adiciona opção de novo item apenas se houver texto de busca
        if (searchText && !dados.some(item =>
            item.label.toLowerCase().includes(searchText.toLowerCase()) ||
            item.value.toLowerCase().includes(searchText.toLowerCase())
        )) {
            dados.push({
                label: `Adicionar "${searchText.toUpperCase()}"`,
                value: searchText.toUpperCase(),
                icon: 'add-circle',
                tipo: determinarTipoVeiculo(searchText.toUpperCase()),
                isCustom: true
            });
        }

        return dados;
    };

    // Função auxiliar para determinar o tipo de veículo pela placa
    function determinarTipoVeiculo(placa: string): string {
        // Padrão tradicional de placas brasileiras (ABC-1234 ou ABC1D23)
        const placaRegexAntiga = /^[A-Z]{3}-?\d{4}$/;
        const placaRegexMercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/;

        // Se segue o formato de uma placa, é um veículo
        if (placaRegexAntiga.test(placa) || placaRegexMercosul.test(placa)) {
            return 'veiculo';
        }

        // Checa se contém traço (possível indicativo de placa personalizada)
        if (placa.includes('-')) {
            // Se tem traço mas não segue o formato padrão, verificamos o comprimento
            const partes = placa.split('-');
            // Se tem formato semelhante a placa (parte1-parte2 onde parte1 tem 3 chars e parte2 tem 4)
            if (partes.length === 2 && partes[0].length === 3 && partes[1].length === 4) {
                return 'veiculo';
            }
        }

        // Se não segue nenhum formato de placa, é classificado como "outros"
        return 'outros';
    }

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

    // Efeito para carregar dados de edição, quando disponíveis
    useEffect(() => {
        if (mode === 'edit' && lavagemData) {
            console.log('Modo edição: carregando dados existentes');

            // Preencher responsável
            setFormData(prev => ({
                ...prev,
                responsavel: lavagemData.responsavel || '',
                observacoes: lavagemData.observacoes || ''
            }));

            // Preencher data e hora
            if (lavagemData.data && lavagemData.hora) {
                const [dia, mes, ano] = lavagemData.data.split('/').map(Number);
                const [hora, minutos] = lavagemData.hora.split(':').map(Number);

                if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano) && !isNaN(hora) && !isNaN(minutos)) {
                    const dataHora = new Date(ano, mes - 1, dia, hora, minutos);
                    setSelectedDate(dataHora);
                }
            }

            // Preencher veículo
            if (lavagemData.veiculo) {
                if (lavagemData.veiculo.placa) {
                    setVeiculoSelecionado(lavagemData.veiculo.placa);
                    setTipoVeiculo(lavagemData.veiculo.tipo || 'veiculo');
                    setIsVeiculoDisabled(true);

                    // Verificar se é equipamento
                    if (lavagemData.veiculo.tipo === 'equipamento') {
                        setShowEquipmentNumber(true);
                        setNumeroEquipamento(lavagemData.veiculo.numeroEquipamento || '');
                    }
                }
                // Compatibilidade com formato antigo
                else if (lavagemData.placaVeiculo) {
                    setVeiculoSelecionado(lavagemData.placaVeiculo);
                    setTipoVeiculo('veiculo');
                    setIsVeiculoDisabled(true);
                }
            }

            // Preencher tipo de lavagem
            if (lavagemData.tipoLavagem) {
                setTipoLavagemSelecionado(lavagemData.tipoLavagem);
                setFormData(prev => ({
                    ...prev,
                    tipoLavagem: lavagemData.tipoLavagem
                }));
            }

            // Preencher produtos
            if (lavagemData.produtos && Array.isArray(lavagemData.produtos)) {
                // Processar produtos do formato novo
                if (lavagemData.produtos.some((p: { nome?: string }) => p.nome)) {
                    const produtos: Array<{ produto: string; quantidade: string }> = lavagemData.produtos
                        .filter((p: { nome?: string; quantidade?: number }) => p.nome && !isNaN(p.quantidade as number))
                        .map((p: { nome: string; quantidade: number }) => ({
                            produto: p.nome,
                            quantidade: p.quantidade.toString()
                        }));

                    const formattedProducts: ProdutoEstoque[] = produtos.map(p => ({
                        ...p,
                        nome: p.produto,
                        quantidadeMinima: '',
                        unidadeMedida: 'litro',
                        photoUrl: '',
                        createdAt: new Date().toISOString(), // Add createdAt property
                        updatedAt: new Date().toISOString()  // Add updatedAt property
                    }));
                    setSelectedProducts(formattedProducts);
                    setDropdownRefs(Array(produtos.length).fill(0).map(() => React.createRef()));
                }
                // Processar produtos do formato antigo
                else if (lavagemData.produtos.some((p: { produto?: string }) => p.produto)) {
                    const produtos: Array<{ produto: string; quantidade: string }> = lavagemData.produtos
                        .filter((p: { produto?: string; quantidade?: number }) => p.produto && p.quantidade)
                        .map((p: { produto: string; quantidade: number }) => ({
                            produto: p.produto,
                            quantidade: p.quantidade.toString()
                        }));

                    const formattedProducts: ProdutoEstoque[] = produtos.map(p => ({
                        ...p,
                        nome: p.produto,
                        quantidadeMinima: '',
                        unidadeMedida: 'litro',
                        photoUrl: '',
                        createdAt: new Date().toISOString(), // Add createdAt property
                        updatedAt: new Date().toISOString()  // Add updatedAt property
                    }));
                    setSelectedProducts(formattedProducts);
                    setDropdownRefs(Array(produtos.length).fill(0).map(() => React.createRef()));
                }
            }

            // Preencher fotos existentes
            if (mode === 'edit' && lavagemData?.fotos) {
                interface FotoProcessada {
                    url: string;
                    id: string;
                    timestamp: number;
                    path: string;
                }

                const fotosProcessadas: FotoProcessada[] = lavagemData.fotos.map((foto: any) => ({
                    url: foto.url,
                    id: foto.timestamp?.toString() || Date.now().toString(),
                    timestamp: foto.timestamp || Date.now(),
                    path: foto.path || ''
                }));

                setExistingPhotos(fotosProcessadas);
            }
        }
    }, [mode, lavagemData])

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
        if (selectedProducts.length > 0) {
            // Verificar produtos incompletos (com nome mas sem quantidade ou vice-versa)
            const produtosIncompletos = selectedProducts.filter(
                p => (p.nome && (!p.quantidade || p.quantidade === '0')) ||
                    (!p.nome && p.quantidade)
            );

            // Verificar produtos vazios (sem nome e sem quantidade)
            const produtosVazios = selectedProducts.filter(
                p => !p.nome && (!p.quantidade || p.quantidade === '0')
            );

            // Se tiver produtos incompletos, mostrar erro
            if (produtosIncompletos.length > 0) {
                errors.push("Preencha nome e quantidade para todos os produtos adicionados");
            }

            // Remover produtos vazios da lista antes de salvar
            if (produtosVazios.length > 0) {
                setSelectedProducts(selectedProducts.filter(
                    p => p.nome || (p.quantidade && p.quantidade !== '0')
                ));
            }
        }

        setFormErrors(errors);
        return errors.length === 0;
    };

    // TODO quando offline, apos salvar localmente, sair do formulario
    const handleSave = async () => {
        if (!validateForm()) return;
        setIsLoading(true);

        try {
            let fotosUpload = [...existingPhotos];

            if (photos.length > 0) {
                showGlobalToast('info', 'Aguarde', 'Fazendo upload das fotos...', 15000);
                const uploadPromises = photos.map(async (photo) => {
                    try {
                        const timestamp = Date.now();
                        const random = Math.random().toString(36).substring(7);
                        const filename = `lavagens/${timestamp}_${random}.jpg`;
                        const reference = storage().ref(filename);
                        const response = await fetch(photo.uri || '');
                        const blob = await response.blob();
                        await reference.put(blob);
                        const url = await reference.getDownloadURL();
                        return { url, timestamp, path: filename };
                    } catch (error) {
                        console.error('Erro no upload da foto:', error);
                        throw new Error('Falha no upload da foto');
                    }
                });

                const novasFotos = await Promise.all(uploadPromises);
                fotosUpload = [...fotosUpload, ...novasFotos.map(foto => ({ ...foto, id: foto.timestamp.toString() }))];
            }

            showGlobalToast('info', 'Aguarde', 'Atualizando estoque de produtos...', 2000);

            // Se for uma edição, buscar os produtos usados anteriormente
            let produtosAnteriores = [];
            if (mode === 'edit' && lavagemData?.produtos) {
                produtosAnteriores = lavagemData.produtos;
            }

            // Criar um mapa dos produtos anteriores
            const produtosAnterioresMap: { [key: string]: number } = {};
            produtosAnteriores.forEach((prod: { nome: string; quantidade: number }) => {
                (produtosAnterioresMap as any)[prod.nome] = prod.quantidade;
            });

            // Atualizar estoque dos produtos
            for (const produtoSelecionado of selectedProducts) {
                const produtoEstoque = produtos.find(p => p.nome === produtoSelecionado.nome);

                if (produtoEstoque) {
                    const quantidadeAtual = parseInt(produtoEstoque.quantidade);
                    const quantidadeUsada = parseInt(produtoSelecionado.quantidade);

                    // Se for administrador, não altera o estoque
                    if (userInfo?.cargo?.toLowerCase() === 'administrador') {
                        continue;
                    }

                    const novaQuantidade = quantidadeAtual - quantidadeUsada;

                    if (novaQuantidade < 0) {
                        throw new Error(`Quantidade insuficiente do produto ${produtoEstoque.nome}`);
                    }

                    // Atualizar no Firestore
                    await firestore()
                        .collection('produtos')
                        .doc(produtoEstoque.id)
                        .update({
                            quantidade: novaQuantidade.toString(),
                            updatedAt: new Date().toISOString()
                        });
                }
            }

            await forceSync('produtos');

            showGlobalToast('info', 'Aguarde', mode === 'edit' ? 'Atualizando informações da lavagem...' : 'Salvando informações da lavagem...', 2000);

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
                produtos: selectedProducts.map(p => ({
                    nome: p.nome,
                    quantidade: parseInt(p.quantidade)
                })),
                fotos: fotosUpload,
                observacoes: formData.observacoes,
                status: "concluido",
                updatedAt: firestore.Timestamp.now(),
                createdAt: firestore.Timestamp.now(),
                createdBy: userInfo?.id || null,
                agendamentoId: agendamentoId || null
            };

            console.log("Salvo como um:", registroLavagem.veiculo.tipo)

            if (mode === 'create') {
                registroLavagem.createdAt = firestore.Timestamp.now();
                registroLavagem.createdBy = userInfo?.id || null;
                registroLavagem.agendamentoId = agendamentoId || null;
            }

            if (mode === 'edit' && lavagemData?.id) {
                await firestore()
                    .collection('registroLavagens')
                    .doc(lavagemData.id)
                    .update(registroLavagem);
                showGlobalToast('success', 'Sucesso', 'Lavagem atualizada com sucesso', 4000);
            } else {
                const timestamp = Date.now();
                const customId = userInfo?.cargo.toLowerCase() === 'administrador'
                    ? `0_ADM_${timestamp}`
                    : timestamp.toString();

                await firestore()
                    .collection('registroLavagens')
                    .doc(customId)
                    .set(registroLavagem);

                if (agendamentoId && marcarAgendamentoComoConcluido) {
                    await marcarAgendamentoComoConcluido(agendamentoId);
                }

                showGlobalToast('success', 'Sucesso', 'Lavagem registrada com sucesso', 4000);
            }

            navigation?.goBack();
        } catch (error: any) {
            console.error('Erro ao processar lavagem:', error);
            const errorMessage = error.message === 'Falha no upload da foto'
                ? 'Erro no upload das fotos. Verifique sua conexão.'
                : error.message || 'Não foi possível finalizar a lavagem';

            showGlobalToast('error', 'Erro', errorMessage, 4000);
        } finally {
            setIsLoading(false);
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

    const handleAddPhoto = (newPhoto: Photo) => {
        setPhotos(prev => [...prev, newPhoto]);
    };

    const handleDeletePhoto = (photoId: string) => {
        // Verificar se é uma foto existente
        const isExistingPhoto = existingPhotos.some(foto =>
            (foto.id === photoId) || (foto.timestamp?.toString() === photoId)
        );

        if (isExistingPhoto) {
            setExistingPhotos(prev => prev.filter(foto =>
                (foto.id !== photoId) && (foto.timestamp?.toString() !== photoId)
            ));
        } else {
            // É uma foto nova
            setPhotos(prev => prev.filter(foto => foto.id !== photoId));
        }
    };

    const handlePhotoPress = (photo: Photo) => {
        // Normalizar para o formato esperado pelo FullScreenImage
        const photoForViewer = {
            uri: photo.uri || photo.url || '', // Garante que uri é uma string
            id: photo.id || photo.timestamp?.toString() || Date.now().toString()
        };

        setSelectedPhoto(photoForViewer);
        setIsFullScreenVisible(true);
    };

    const handleCloseFullScreen = () => {
        setIsFullScreenVisible(false);
        setSelectedPhoto(null);
    };

    // Produtos
    const handleAddProduct = (ProdutoEstoque: ProdutoEstoque) => {
        setSelectedProducts(prev => [...prev, ProdutoEstoque]);
        setAvailableProducts(prev => prev.filter(p => p.id !== ProdutoEstoque.id)); // Comparar por ID evita conflitos
    };

    const handleRemoveProduct = (index: number) => {
        setSelectedProducts(prev => {
            const removedProduct = prev[index];
            setAvailableProducts(prev => [...prev, removedProduct]); // Adiciona de volta
            return prev.filter((_, idx) => idx !== index);
        });
    };

    const handleUpdateProduct = (index: number, updatedProduct: ProdutoEstoque) => {
        setSelectedProducts(prev => {
            const newProducts = [...prev];
            const oldProduct = newProducts[index];

            newProducts[index] = updatedProduct;

            setAvailableProducts(prev => {
                let updatedAvailable = prev.filter(p => p.id !== updatedProduct.id); // Remover o novo caso já esteja
                if (!prev.some(p => p.id === oldProduct.id)) {
                    updatedAvailable = [...updatedAvailable, oldProduct]; // Adicionar o antigo de volta
                }
                return updatedAvailable;
            });

            return newProducts;
        });
    };

    // Useefects
    useEffect(() => {
        if (dropdownRefs.length === 0 && selectedProducts.length > 0) {
            setDropdownRefs([React.createRef()]);
        }
    }, []);

    useEffect(() => {
        validateForm();
    }, [
        formData,
        veiculoSelecionado,
        tipoLavagemSelecionado,
        selectedProducts,
        numeroEquipamento,
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
                photo={selectedPhoto?.uri ? selectedPhoto : null}
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
                                        name={
                                            tipoVeiculo === 'equipamento' ? 'build' :
                                                tipoVeiculo === 'veiculo' ? 'directions-car' : 'category'
                                        }
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
                                            color={
                                                item.isCustom ? customTheme.colors.primary :
                                                    item.tipo === 'equipamento' ? customTheme.colors.secondary :
                                                        item.tipo === 'veiculo' ? customTheme.colors.primary :
                                                            customTheme.colors.tertiary
                                            }
                                        />
                                        <Text style={[
                                            styles.dropdownLabel,
                                            item.isCustom && styles.dropdownLabelCustom
                                        ]}>
                                            {item.label}
                                        </Text>
                                        {item.tipo === 'outros' && !item.isCustom && (
                                            <Chip
                                                style={styles.chipOutros}
                                                textStyle={styles.chipTextOutros}
                                            >
                                                Outros
                                            </Chip>
                                        )}
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
                    <ProductsContainer
                        produtos={availableProducts.map(ProdutoEstoque => ({ ...ProdutoEstoque, produto: ProdutoEstoque.nome }))}
                        selectedProducts={selectedProducts}
                        onAddProduct={handleAddProduct}
                        onRemoveProduct={handleRemoveProduct}
                        onUpdateProduct={handleUpdateProduct}
                    />

                    {/* Seção de Fotos */}
                    <PhotoGalleryEnhanced
                        photos={photos}
                        existingPhotos={existingPhotos}
                        onAddPhoto={handleAddPhoto}
                        onDeletePhoto={handleDeletePhoto}
                        onPhotoPress={handlePhotoPress}
                        sectionTitle="Registro Fotográfico"
                    />

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
                                numberOfLines={6}
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
                        <SaveButton
                            onPress={handleSave}
                            text="Salvar Lavagem"
                            iconName="content-save"
                            disabled={formErrors.length > 0}
                            loading={isLoading}
                        />
                    </View>
                </Surface>
            </ScrollView>

        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    chipOutros: {
        backgroundColor: customTheme.colors.tertiaryContainer,
        height: 24,
        marginLeft: 8,
    },
    chipTextOutros: {
        fontSize: 12,
        color: customTheme.colors.tertiary,
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
        paddingTop: 10,  // Adiciona um padding superior para melhor aparência
    },
    dropdownContainer: {
        flex: 2,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
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
        gap: 10, // Aumentado para melhor espaçamento
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
    formContainer: {
        padding: 16,
        backgroundColor: customTheme.colors.surface,
        elevation: 2,
    },
});