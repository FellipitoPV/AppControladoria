import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Image,
    Modal,
    Alert,
    Linking,
} from 'react-native';
import {
    Text,
    Surface,
    TextInput,
    Button,
    Dialog,
    Portal,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PERMISSIONS, check, request, RESULTS } from 'react-native-permissions';
import DropDownPicker from 'react-native-dropdown-picker';
import { customTheme } from '../../../theme/theme';
import { useUser } from '../../../contexts/userContext';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import { clientes, RelatorioData } from '../../../helpers/Types';
import api, { generateWordDocument } from '../../../helpers/generateApi';
import { Asset, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import storage from '@react-native-firebase/storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Share from 'react-native-share';
import { Dropdown } from 'react-native-element-dropdown';
import ModernHeader from '../../../assets/components/ModernHeader';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';


const inputTheme = {
    colors: {
        onSurface: customTheme.colors.onSurface,
        onSurfaceVariant: customTheme.colors.primary,
        primary: customTheme.colors.primary,
        background: customTheme.colors.surface,
        placeholder: customTheme.colors.onSurfaceDisabled,
        disabled: customTheme.colors.onSurface, // Alterado para garantir visibilidade
        error: customTheme.colors.error,
        // Adicionando cores específicas para o estado desabilitado
        onSurfaceDisabled: customTheme.colors.onSurface, // Cor do texto quando desabilitado
        surfaceDisabled: customTheme.colors.surfaceVariant // Cor do fundo quando desabilitado
    }
};


const classificacaoList = [
    { label: 'Qualidade', value: 'Qualidade' },
    { label: 'Ambiental', value: 'Ambiental' },
    { label: 'Segurança e Saúde Ocupacional', value: 'Segurança e Saúde Ocupacional' },
];

interface ClienteInterface {
    cnpjCpf: string;
    razaoSocial: string;
}

interface DropdownClientesProps {
    clientes: ClienteInterface[];
    onSelect: (cliente: ClienteInterface) => void;
    placeholder?: string;
}

type TipoOcorrencia = 'triagem' | 'reclassificacao' | 'diferenca_peso' | 'outros';

const tiposOcorrencia = [
    {
        label: 'Resíduo oriundo de triagem',
        value: 'triagem',
        icon: 'recycling'  // antes faRecycle
    },
    {
        label: 'Resíduo de reclassificação',
        value: 'reclassificacao',
        icon: 'swap-horizontal-circle'  // antes faArrowsRotate
    },
    {
        label: 'Diferença de peso (KG ou TN)',
        value: 'diferenca_peso',
        icon: 'scale'  // antes faScaleBalanced
    },
    {
        label: 'Outros motivos',
        value: 'outros',
        icon: 'more-horiz'  // antes faEllipsisH
    }
];

interface PhotoNameDialogProps {
    visible: boolean;
    onDismiss: () => void;
    onConfirm: (photoName: string) => void;
    tempPhotoUri: string | null;
    initialName?: string; // Novo prop para o nome inicial
}

const PhotoNameDialog: React.FC<PhotoNameDialogProps> = ({
    visible,
    onDismiss,
    onConfirm,
    tempPhotoUri,
    initialName = '' // Valor padrão vazio
}) => {
    const [localPhotoName, setLocalPhotoName] = useState('');

    // Atualiza o nome local quando o diálogo é aberto
    useEffect(() => {
        if (visible) {
            setLocalPhotoName(initialName);
        } else {
            setLocalPhotoName('');
        }
    }, [visible, initialName]);

    return (
        <Dialog
            visible={visible}
            onDismiss={onDismiss}
            style={styles.photoNameDialog}
        >
            <Dialog.Title>Nome da Foto</Dialog.Title>
            <Dialog.Content>
                {tempPhotoUri && (
                    <View style={styles.photoPreviewContainer}>
                        <Image
                            source={{ uri: tempPhotoUri }}
                            style={styles.photoPreviewImage}
                            resizeMode="cover"
                        />
                    </View>
                )}

                <TextInput
                    mode="outlined"
                    label="Nome da foto"
                    value={localPhotoName}
                    onChangeText={setLocalPhotoName}
                    style={styles.photoNameInput}
                />
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={onDismiss}>
                    Cancelar
                </Button>
                <Button
                    onPress={() => {
                        onConfirm(localPhotoName);
                        setLocalPhotoName('');
                    }}
                    disabled={!localPhotoName.trim()}
                >
                    Confirmar
                </Button>
            </Dialog.Actions>
        </Dialog>
    );
};

export default function FormularioOcorrencia() {
    const { userInfo } = useUser();
    const navigation = useNavigation<NavigationProp<ParamListBase>>();

    const [loading, setLoading] = useState(false);

    // Estados para os campos do formulário
    const [classificacao, setClassificacao] = useState('');
    const [numero, setNumero] = useState('');
    const [cliente, setCliente] = useState('');
    const [tipoOcorrencia, setTipoOcorrencia] = useState<TipoOcorrencia | ''>('');
    const [numeroOS, setNumeroOS] = useState('');
    const [dataOcorrencia, setDataOcorrencia] = useState(new Date());

    //Datas
    const [data, setData] = useState(new Date());
    const [mostrarSeletorData, setMostrarSeletorData] = useState(false);


    const [selectedClientValue, setSelectedClientValue] = useState('');

    const [mostrarSeletorDataOcorrencia, setMostrarSeletorDataOcorrencia] = useState(false);

    const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false)
    const [documentPath, setDocumentPath] = useState<string | null>(null);

    const classificacaoItems = classificacaoList.map(item => item.label);

    // Estados para fotos
    const [photos, setPhotos] = useState<Array<{
        img: string;
        imgName: string;
    }>>([]);
    const [photoModalVisible, setPhotoModalVisible] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [showPhotoNameDialog, setShowPhotoNameDialog] = useState(false);
    const [tempPhotoUri, setTempPhotoUri] = useState<string | null>(null);

    // Estado para observações
    const [observacoes, setObservacoes] = useState('');

    // Estados para os dropdowns
    const [openClassificacao, setOpenClassificacao] = useState(false);
    const [openCliente, setOpenCliente] = useState(false);
    const [showTipoOcorrenciaModal, setShowTipoOcorrenciaModal] = useState(false);

    // Estados para validação
    const [classificacaoError, setClassificacaoError] = useState(false);
    const [numeroError, setNumeroError] = useState(false);
    const [clienteError, setClienteError] = useState(false);
    const [tipoOcorrenciaError, setTipoOcorrenciaError] = useState(false);

    const handleSelectCliente = (cliente: ClienteInterface) => {
        console.log('Cliente selecionado:', cliente);
        setCliente(` ${cliente.razaoSocial} (${cliente.cnpjCpf})`);
    };

    const checkCameraPermission = async () => {
        try {
            const permission = Platform.select({
                android: PERMISSIONS.ANDROID.CAMERA,
                ios: PERMISSIONS.IOS.CAMERA,
            });

            if (!permission) {
                console.error('Plataforma não suportada');
                return false;
            }

            const result = await check(permission);

            switch (result) {
                case RESULTS.GRANTED:
                    return true;
                case RESULTS.DENIED:
                    const requestResult = await request(permission);
                    return requestResult === RESULTS.GRANTED;
                case RESULTS.BLOCKED:
                    Alert.alert(
                        'Permissão Necessária',
                        'Para tirar fotos, é necessário permitir o acesso à câmera nas configurações do aplicativo.',
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Abrir Configurações', onPress: Linking.openSettings }
                        ]
                    );
                    return false;
                default:
                    return false;
            }
        } catch (error) {
            console.error('Erro ao verificar permissão da câmera:', error);
            return false;
        }
    };

    const generateOcorrenciaDescription = (tipo: TipoOcorrencia, numeroOS: string, dataOS: Date): string => {
        const dataFormatada = formatDate(dataOS);

        switch (tipo) {
            case 'triagem':
                return `RESÍDUO ORIUNDO DE TRIAGEM REFERENTE À O.S: ${numeroOS} DO DIA: ${dataFormatada}`;
            case 'reclassificacao':
                return `RESÍDUO DE RECLASSIFICAÇÃO REFERENTE À O.S: ${numeroOS} DO DIA: ${dataFormatada}`;
            case 'diferenca_peso':
                return `DIFERENÇA DE PESO (KG ou TN) ENTRE O CLIENTE E A ECOLOGIKA REFERENTE À O.S: ${numeroOS} DO DIA: ${dataFormatada}`;
            case 'outros':
                return `OUTROS MOTIVOS, REFERENTE À O.S: ${numeroOS} DO DIA: ${dataFormatada}`;
            default:
                return '';
        }
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const handleDataChange = (event: any, selectedDate?: Date) => {
        setMostrarSeletorData(false); // Fecha o seletor

        if (selectedDate) {
            setDataOcorrencia(selectedDate); // Atualiza a data se uma foi selecionada
        }
    };


    const handleTakePhoto = async () => {
        console.log('Iniciando captura de foto');
        if (photos.length >= 4) {
            Alert.alert('Limite de Fotos', 'Você já atingiu o limite de 4 fotos.');
            return;
        }

        const hasPermission = await checkCameraPermission();
        if (!hasPermission) return;

        try {
            const result = await launchCamera({
                mediaType: 'photo',
                quality: 0.5,
                includeBase64: false,
                maxWidth: 800,
                maxHeight: 800,
            });

            console.log('Resultado da câmera:', result);

            if (result.assets && result.assets[0]) {
                const asset = result.assets[0];
                if (!asset.uri) {
                    throw new Error('URI não disponível');
                }

                console.log('URI da foto:', asset.uri);
                setTempPhotoUri(asset.uri);
                setShowPhotoNameDialog(true);
            }
        } catch (error) {
            console.error('Erro ao capturar foto:', error);
            Alert.alert('Erro', 'Não foi possível processar a imagem');
        }
    };

    const handleSelectPhoto = async () => {
        if (photos.length >= 4) {
            Alert.alert('Limite de Fotos', 'Você já atingiu o limite de 4 fotos.');
            return;
        }

        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.7,
                includeBase64: false, // Não precisamos mais do base64
                maxWidth: 1200,
                maxHeight: 1200,
            });

            if (result.assets && result.assets[0]) {
                const asset = result.assets[0];
                if (!asset.uri) {
                    throw new Error('URI não disponível');
                }

                setTempPhotoUri(asset.uri); // Guardamos a URI ao invés do base64
                setShowPhotoNameDialog(true);
            }
        } catch (error) {
            console.error('Erro ao selecionar foto:', error);
            Alert.alert('Erro', 'Não foi possível processar a imagem');
        }
    };

    const handleDeletePhoto = (index: number) => {
        Alert.alert(
            'Confirmar Exclusão',
            'Deseja realmente excluir esta foto?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: () => {
                        // Primeiro fechamos o modal
                        setPhotoModalVisible(false);
                        setSelectedPhotoIndex(null);

                        // Depois atualizamos as fotos com a renumeração
                        setTimeout(() => {
                            setPhotos(prev => {
                                // Remove a foto selecionada
                                const updatedPhotos = prev.filter((_, i) => i !== index);

                                // Renumera todas as fotos restantes
                                return updatedPhotos.map((photo, newIndex) => {
                                    // Pega o nome original da foto (após o último hífen)
                                    const originalName = photo.imgName.split(' - ')[2];

                                    // Retorna o objeto foto atualizado com o novo número
                                    return {
                                        ...photo,
                                        imgName: `imagem - ${newIndex + 1} - ${originalName}`
                                    };
                                });
                            });
                        }, 100);
                    }
                }
            ]
        );
    };

    // Adicione as funções de manipulação
    const handleEditPhotoName = () => {
        if (selectedPhotoIndex !== null) {
            // Primeiro, guarda a referência da foto atual
            const currentPhoto = photos[selectedPhotoIndex];

            // Fecha o modal de visualização
            setPhotoModalVisible(false);

            // Pequeno delay para garantir uma transição suave
            setTimeout(() => {
                // Define a foto temporária para preview
                setTempPhotoUri(currentPhoto.img);

                // Abre o diálogo de edição do nome
                setShowPhotoNameDialog(true);
            }, 100);
        }
    };

    // Modifique a função handlePhotoConfirm para atualizar o nome da foto
    const handlePhotoConfirm = (name: string) => {
        if (selectedPhotoIndex !== null && name) {
            // Atualiza o nome da foto existente
            setPhotos(prev => prev.map((photo, index) =>
                index === selectedPhotoIndex
                    ? { ...photo, imgName: `imagem - ${selectedPhotoIndex + 1} - ${name}` }
                    : photo
            ));
        } else if (tempPhotoUri && name) {
            // Adiciona nova foto (comportamento existente)
            setPhotos(prev => [...prev, {
                img: tempPhotoUri,
                imgName: `imagem - ${prev.length + 1} - ${name}`
            }]);
        }

        // Limpa os estados
        setShowPhotoNameDialog(false);
        setTempPhotoUri(null);
        setSelectedPhotoIndex(null);
    };

    const handleClosePhotoViewer = () => {
        setPhotoModalVisible(false);
        setSelectedPhotoIndex(null);
    };

    // Parte para salvar no storage e chamar API
    const uploadImageToFirebase = async (imageUri: string, fileName: string) => {
        try {
            const timestamp = new Date().getTime();
            const fileNameSafe = `relatorio-images/${timestamp}-${fileName}`;
            const reference = storage().ref(fileNameSafe);

            // Upload do arquivo diretamente da URI
            await reference.putFile(imageUri);

            // Obter a URL de download
            const downloadURL = await reference.getDownloadURL();

            console.log('URL de download:', downloadURL);
            return downloadURL;

        } catch (error: any) {
            console.error('Erro detalhado no upload:', error);
            throw new Error(`Falha ao fazer upload da imagem: ${error.message}`);
        }
    };

    const deleteImagesFolder = async () => {
        try {
            // Referência para a pasta de imagens
            const folderRef = storage().ref('relatorio-images');

            // Listar todos os itens na pasta
            const items = await folderRef.listAll();

            // Deletar cada item
            await Promise.all(items.items.map(item => item.delete()));

            console.log('Pasta de imagens limpa com sucesso');
        } catch (error) {
            console.error('Erro ao limpar pasta de imagens:', error);
        }
    };

    const uploadPDFToFirebase = async (pdfPath: string, fileName: string) => {
        try {
            // Criamos um nome único com timestamp para evitar conflitos
            const timestamp = new Date().getTime();
            const cleanClientName = cliente.replace(/\s*\([^)]*\)/, '').trim();
            const storagePath = `relatorios/${cleanClientName}/RO-${numero}-${timestamp}.pdf`;

            // Cria a referência no storage
            const reference = storage().ref(storagePath);

            // Faz o upload do arquivo
            await reference.putFile(pdfPath);

            // Obtém a URL do documento
            const downloadURL = await reference.getDownloadURL();

            return {
                url: downloadURL,
                path: storagePath,
                fileName: fileName
            };

        } catch (error) {
            console.error('Erro ao fazer upload do PDF:', error);
            throw new Error(`Falha ao fazer upload do documento: ${error}`);
        }
    };


    const handleSalvar = async () => {
        if (loading) return;
        setLoading(true);

        try {

            try {
                const response = await api.get('/test');
                console.log('Teste de conexão:', response.data);

                // Mostra toast de sucesso na conexão
                showGlobalToast(
                    'info',
                    'Conectado',
                    'Conexão com servidor estabelecida',
                    3000
                );
            } catch (error: any) {
                console.error('Erro de conexão com servidor:', {
                    message: error.message,
                    code: error.code,
                    response: error.response
                });

                showGlobalToast(
                    'error',
                    'Erro de Conexão',
                    'Não foi possível conectar ao servidor local. Verifique se o servidor está rodando.',
                    7000
                );
                setLoading(false);
                return;
            }

            let hasError = false;
            let message = [];  // Mudamos para um array para acumular as mensagens

            // Validações
            if (!classificacao) {
                setClassificacaoError(true);
                message.push("Classificação");
                hasError = true;
            }
            if (!numero.trim()) {
                setNumeroError(true);
                message.push("Número");
                hasError = true;
            }
            if (!cliente) {
                setClienteError(true);
                message.push("Cliente");
                hasError = true;
            }
            if (!tipoOcorrencia) {
                setTipoOcorrenciaError(true);
                message.push("Tipo de Ocorrência");
                hasError = true;
            }

            if (hasError) {
                const camposFaltantes = message.join(", ");
                showGlobalToast(
                    'error',
                    'Campos obrigatórios',
                    `Por favor, preencha os seguintes campos: ${camposFaltantes}`,
                    7000
                );
                setLoading(false);
                return;
            }

            // Primeiro, vamos fazer upload das imagens para o Firebase
            showGlobalToast(
                'info',
                'Processando',
                'Fazendo upload das imagens...',
                7000
            );

            // Fazer upload de cada foto e obter as URLs
            const uploadedPhotos = await Promise.all(photos.map(async photo => {
                // Aqui precisamos da URI da imagem, não do base64
                // Se você tiver acesso à URI original da foto, use ela aqui
                const downloadURL = await uploadImageToFirebase(photo.img, photo.imgName);
                return {
                    image: downloadURL,
                    name: photo.imgName
                };
            }));

            showGlobalToast(
                'info',
                'Processando',
                'Gerando documento...',
                20000
            );

            // Preparar os dados para o relatório com o novo formato
            const relatorioData: RelatorioData = {
                class: classificacao,
                num: numero,
                cliente: cliente,
                ocoOsDia: generateOcorrenciaDescription(
                    tipoOcorrencia as TipoOcorrencia,
                    numeroOS,
                    dataOcorrencia
                ),
                resp: userInfo?.user || '',
                dataOm: formatDate(data),
                obs: observacoes,
                images: uploadedPhotos  // Agora usando o mesmo formato do teste
            };

            // Gera o documento usando a API
            const localDocumentPath = await generateWordDocument(relatorioData);
            setDocumentPath(localDocumentPath);

            // Mostra mensagem de upload do PDF
            showGlobalToast(
                'info',
                'Processando',
                'Salvando documento no servidor...',
                7000
            );

            // Faz o upload do PDF
            const cleanClientName = cliente.replace(/\s*\([^)]*\)/, '').trim();
            const fileName = `RO-${numero}-${cleanClientName}.pdf`;

            const uploadedPDF = await uploadPDFToFirebase(localDocumentPath, fileName);

            // Salvando informações do PDF no firebase
            await firestore().collection('relatoriosOcorrencia').add({
                numeroRO: numero,
                cliente: cleanClientName,
                resp: userInfo?.user || '',
                classificacao: classificacao,
                data: formatDate(data),
                pdfUrl: uploadedPDF.url,
                storagePath: uploadedPDF.path,
                createdAt: firestore.FieldValue.serverTimestamp()
            });

            showGlobalToast(
                'success',
                'Sucesso',
                'Relatório salvo com sucesso!',
                7000
            );

            // Continua com o compartilhamento e limpeza
            await handleShare(localDocumentPath);
            await deleteImagesFolder();

            // Opcionalmente, navegue para a tela inicial
            // navigation.navigate('Home');

        } catch (error: any) {
            console.error('Erro detalhado:', {
                message: error.message,
                code: error.code,
                stack: error.stack,
                response: error.response
            });

            // Mensagem mais específica baseada no tipo de erro
            let errorMessage = 'Erro ao salvar o relatório. Tente novamente.';
            if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Servidor não está acessível. Verifique a conexão.';
            } else if (error.message?.includes('Firebase')) {
                errorMessage = 'Erro ao fazer upload das imagens. Verifique sua conexão.';
            }

            showGlobalToast(
                'error',
                'Erro',
                errorMessage,
                7000
            );
        } finally {
            setLoading(false);
        }
    };


    const handleShare = async (localPath: string) => {
        try {
            if (!localPath) {
                showGlobalToast(
                    'error',
                    'Erro',
                    'Nenhum documento disponível para compartilhar',
                    7000
                );
                return;
            }

            // Verifica se o arquivo existe
            const fileExists = await RNFS.exists(localPath);
            if (!fileExists) {
                showGlobalToast(
                    'error',
                    'Erro',
                    'Arquivo não encontrado',
                    7000
                );
                return;
            }

            // Ajusta o caminho do arquivo para o formato correto dependendo da plataforma
            const filePath = Platform.OS === 'ios' ? localPath : `file://${localPath}`;

            const shareOptions = {
                title: 'Compartilhar Relatório',
                url: filePath,
                type: 'application/pdf',  // Tipo para PDF
                failOnCancel: false,
            };

            const result = await Share.open(shareOptions); // Usa o `Share.open` ao invés do `Share.share`

            if (result) {
                showGlobalToast(
                    'success',
                    'Sucesso',
                    'Documento compartilhado com sucesso!',
                    3000
                );
            }
            navigation.navigate("Home")
        } catch (error: any) {
            console.error('Erro ao compartilhar:', error);
            showGlobalToast(
                'info',
                'Documento salvo',
                'O documento pode ser encontrado na pasta de Relatorios na pasta Documents do aparelho',
                7000
            );
            navigation.navigate("Home")
        }
    };

    return (
        <Surface style={styles.container}>

            {/* Header */}
            <ModernHeader
                title="Novo Relatório de Ocorrência"
                iconName="plus"
                onBackPress={() => navigation?.goBack()}
            />

            {/* Conteúdo Principal */}
            <ScrollView style={styles.content}>

                {/* Seção: Informações Gerais */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="info" size={24} color={customTheme.colors.primary} />
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Informações Gerais
                        </Text>
                    </View>

                    {/* Classificação */}
                    <View style={styles.inputRow}>
                        <MaterialIcons
                            name="category"
                            size={24}
                            color={customTheme.colors.primary}
                        />
                        <Dropdown
                            style={[
                                styles.dropdown,
                                classificacaoError && styles.dropdownError
                            ]}
                            containerStyle={styles.dropdownList}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            data={classificacaoList.map(item => ({
                                label: item.label,
                                value: item.value
                            }))}
                            maxHeight={350}
                            labelField="label"
                            valueField="value"
                            placeholder="Selecione a Classificação"
                            value={classificacao}
                            onChange={item => {
                                setClassificacao(item.value);
                                setClassificacaoError(false);
                            }}
                            renderItem={item => (
                                <View style={styles.dropdownItem}>
                                    <Text style={styles.dropdownItemText}>{item.label}</Text>
                                </View>
                            )}
                        />
                    </View>

                    {/* Cliente */}
                    <View style={styles.inputRow}>
                        <MaterialIcons
                            name="business"
                            size={24}
                            color={customTheme.colors.primary}
                        />
                        <Dropdown
                            style={[
                                styles.dropdown,
                                classificacaoError && styles.dropdownError
                            ]}
                            containerStyle={styles.dropdownList}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            itemTextStyle={styles.dropdownText}
                            data={clientes.map(cliente => ({
                                label: `${cliente.razaoSocial} (${cliente.cnpjCpf})`,
                                value: cliente.cnpjCpf
                            }))}
                            search
                            searchPlaceholder="Buscar cliente..."
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            placeholder="Selecione o Cliente"
                            inputSearchStyle={{ color: customTheme.colors.tertiary }}
                            value={selectedClientValue} // Adicione esta linha
                            onChange={item => {
                                setSelectedClientValue(item.value); // Adicione esta linha
                                const selectedClient = clientes.find(c => c.cnpjCpf === item.value);
                                if (selectedClient) {
                                    handleSelectCliente(selectedClient);
                                }
                            }}
                        />
                    </View>

                    {/* Tipo de Ocorrência */}
                    <View style={styles.inputRow}>
                        <MaterialIcons
                            name="assignment"
                            size={24}
                            color={customTheme.colors.primary}
                        />
                        <Dropdown
                            style={styles.dropdown}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            itemTextStyle={styles.dropdownText}
                            data={tiposOcorrencia.map(item => ({
                                label: item.label,
                                value: item.value
                            }))}
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            placeholder="Selecione o Tipo de Ocorrência"
                            value={tipoOcorrencia}
                            onChange={item => {
                                setTipoOcorrencia(item.value as TipoOcorrencia);
                                setTipoOcorrenciaError(false);
                            }}
                        />
                    </View>

                    {/* Número OS */}
                    {tipoOcorrencia && (
                        <View style={styles.inputRow}>
                            <MaterialIcons
                                name="receipt"
                                size={24}
                                color={customTheme.colors.primary}
                            />
                            <TextInput
                                mode="outlined"
                                label="Número da OS"
                                value={numeroOS}
                                onChangeText={setNumeroOS}
                                keyboardType="numeric"
                                style={styles.textInputStyle}
                                theme={inputTheme}
                            />
                        </View>
                    )}

                    {/* Número do Relatório */}
                    <View style={styles.inputRow}>
                        <MaterialIcons
                            name="description"
                            size={24}
                            color={customTheme.colors.primary}
                        />
                        <TextInput
                            mode="outlined"
                            label="Número do Relatório"
                            value={numero}
                            keyboardType='numeric'
                            onChangeText={(text) => {
                                setNumero(text);
                                setNumeroError(false);
                            }}
                            error={numeroError}
                            style={styles.textInputStyle}
                            theme={inputTheme}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <MaterialIcons
                            name="calendar-today"
                            size={24}
                            color={customTheme.colors.primary}
                        />
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => setMostrarSeletorData(true)}
                        >
                            <Text style={styles.dateText}>
                                Data da ocorrência: {dataOcorrencia.toLocaleDateString('pt-BR')}
                            </Text>
                        </TouchableOpacity>

                        {/* DatePicker */}
                        {mostrarSeletorData && (
                            <DateTimePicker
                                value={dataOcorrencia}
                                mode="date"
                                onChange={handleDataChange}
                                maximumDate={new Date()} // Impede seleção de datas futuras
                                locale="pt-BR" // Define o locale para português
                                // Para iOS, adicione mais estilização
                                textColor={customTheme.colors.onSurface}
                            />
                        )}
                    </View>
                </View>

                {/* Seção: Registro Fotográfico */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="camera-alt" size={24} color={customTheme.colors.primary} />
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Registro Fotográfico
                        </Text>
                    </View>

                    <View style={styles.photoButtons}>
                        <TouchableOpacity
                            style={styles.photoButton}
                            onPress={handleTakePhoto}
                        >
                            <View style={styles.photoButtonContent}>
                                <MaterialIcons name="camera-alt" size={24} color={customTheme.colors.onPrimary} />
                                <Text style={styles.photoButtonText}>Tirar Foto</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.photoButton}
                            onPress={handleSelectPhoto}
                        >
                            <View style={styles.photoButtonContent}>
                                <MaterialIcons name="photo-library" size={24} color={customTheme.colors.onPrimary} />
                                <Text style={styles.photoButtonText}>Galeria</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Adicione esta linha aqui */}
                    <Text style={styles.photoTip}>
                        É recomendado capturar fotos na horizontal para melhor visualização no documento
                    </Text>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.photoList}
                    >
                        {photos.length === 0 ? (
                            <View style={styles.emptyPhotos}>
                                <Text>Nenhuma foto adicionada</Text>
                            </View>
                        ) : (
                            photos.map((photo, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        setSelectedPhotoIndex(index);
                                        setPhotoModalVisible(true);
                                    }}
                                    style={styles.photoContainer}
                                >
                                    <Image
                                        source={{ uri: photo.img }}
                                        style={styles.photoThumbnail}
                                    />
                                    <Text style={styles.photoName} numberOfLines={1}>
                                        {photo.imgName}
                                    </Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                </View>

                {/* Seção: Observações */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="note-add" size={24} color={customTheme.colors.primary} />
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
                        numberOfLines={6}
                        style={[styles.textInput, styles.observacoesInput]}
                        theme={inputTheme}
                        left={<TextInput.Icon icon={() => (
                            <MaterialIcons name="edit" size={24} color={customTheme.colors.primary} />
                        )} />}
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
                            {loading ? 'Salvando...' : 'Salvar Relatório'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>

            {/* Dialog para nomear a foto */}
            <PhotoNameDialog
                visible={showPhotoNameDialog}
                onDismiss={() => {
                    setShowPhotoNameDialog(false);
                    setTempPhotoUri(null);
                    setSelectedPhotoIndex(null);
                }}
                onConfirm={handlePhotoConfirm}
                tempPhotoUri={tempPhotoUri}
                initialName={selectedPhotoIndex !== null ?
                    photos[selectedPhotoIndex].imgName.split(' - ')[2] : ''} // Pega apenas a parte do nome personalizado
            />

            {/* <PhotoViewerModal
                visible={photoModalVisible}
                photo={selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null}
                onClose={handleClosePhotoViewer}
                onDelete={() => handleDeletePhoto(selectedPhotoIndex!)}
                onEdit={handleEditPhotoName}
            /> */}

        </Surface>
    );
};

const styles = StyleSheet.create({
    photoTip: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        fontStyle: 'italic',
        marginBottom: 12,
        textAlign: 'center',
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
    placeholderStyle: {
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
        position: 'relative', // Adicione isto
    },
    selectedTextStyle: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        position: 'relative', // Adicione isto
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    dropdown: {
        flex: 1,
        minHeight: 50,
        borderColor: customTheme.colors.outline,
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 12,
        backgroundColor: customTheme.colors.surface,
    },
    dropdownList: {
        borderRadius: 4,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        backgroundColor: customTheme.colors.surface,
        color: customTheme.colors.tertiary,
    },
    dropdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdownItemText: {
        flex: 1,
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    dropdownError: {
        borderColor: customTheme.colors.error,
        borderWidth: 2,
    },
    textInputStyle: {
        flex: 1,
        backgroundColor: customTheme.colors.surface,
        width: '85%', // Mantém consistência com os dropdowns
    },
    textInput: {
        backgroundColor: customTheme.colors.surface,
        marginBottom: 12,
        height: 56,
    },
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
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
    dropdownText: {
        flex: 1,
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
});

