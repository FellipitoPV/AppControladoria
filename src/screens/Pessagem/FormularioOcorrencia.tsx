import React, { useEffect, useState } from 'react';
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
import { customTheme } from '../../theme/theme';
import { useUser } from '../../contexts/userContext';
import { showGlobalToast } from '../../helpers/GlobalApi';
import { clientes, RelatorioData } from '../../helpers/Types';
import api, { generateWordDocument } from '../../helpers/generateApi';
import { Asset, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from '@react-native-firebase/storage';
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import storage from '@react-native-firebase/storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { DropdownClientes } from '../../assets/components/DropdownClientes';



const inputTheme = {
    colors: {
        onSurface: "black",
        onSurfaceVariant: customTheme.colors.primary,
        primary: customTheme.colors.primary,
    }
};

const classificacaoList = [
    { label: 'Qualidade', value: 'qualidade' },
    { label: 'Ambiental', value: 'ambiental' },
    { label: 'Segurança e Saúde Ocupacional', value: 'sso' },
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

export default function FormularioOcorrencia({ navigation }: { navigation: any }) {
    const { userInfo } = useUser();
    const [loading, setLoading] = useState(false);

    // Estados para os campos do formulário
    const [classificacao, setClassificacao] = useState('');
    const [numero, setNumero] = useState('');
    const [cliente, setCliente] = useState('');
    const [tipoOcorrencia, setTipoOcorrencia] = useState<TipoOcorrencia | ''>('');
    const [numeroOS, setNumeroOS] = useState('');
    const [data, setData] = useState(new Date());
    const [dataOcorrencia, setDataOcorrencia] = useState(new Date());
    const [mostrarSeletorData, setMostrarSeletorData] = useState(false);
    const [mostrarSeletorDataOcorrencia, setMostrarSeletorDataOcorrencia] = useState(false);


    // Estados para fotos
    const [photos, setPhotos] = useState<Array<{
        img: string;
        imgName: string;
    }>>([]);
    const [photoModalVisible, setPhotoModalVisible] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [photoName, setPhotoName] = useState('');
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
        // Faça algo com o cliente selecionado
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

    const handleTakePhoto = async () => {
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
                includeBase64: false, // Não precisamos mais do base64
                maxWidth: 800,
                maxHeight: 800,
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

    // Quando adiciona a foto ao array
    const handleAddPhoto = () => {
        if (tempPhotoUri && photoName) {
            setPhotos(prev => [...prev, {
                img: tempPhotoUri, // Já está em base64
                imgName: `imagem - ${photos.length + 1} - ${photoName}`
            }]);
            setPhotoName('');
            setTempPhotoUri(null);
            setShowPhotoNameDialog(false);
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

                        // Depois atualizamos as fotos
                        setTimeout(() => {
                            setPhotos(prev => {
                                const newPhotos = prev.filter((_, i) => i !== index);
                                // Renomear as fotos restantes
                                return newPhotos.map((photo, i) => ({
                                    ...photo,
                                    name: `imagem - ${i + 1} - ${photo.imgName.split(' - ')[2]}`
                                }));
                            });
                        }, 100);
                    }
                }
            ]
        );
    };

    const handleTipoOcorrenciaSelect = (tipo: TipoOcorrencia) => {
        setTipoOcorrencia(tipo);
        setShowTipoOcorrenciaModal(false);
        setTipoOcorrenciaError(false);
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

    const handleSalvar = async () => {
        if (loading) return;
        setLoading(true);

        try {
            let hasError = false;

            // Validações
            if (!classificacao) {
                setClassificacaoError(true);
                hasError = true;
            }
            if (!numero.trim()) {
                setNumeroError(true);
                hasError = true;
            }
            if (!cliente) {
                setClienteError(true);
                hasError = true;
            }
            if (!tipoOcorrencia) {
                setTipoOcorrenciaError(true);
                hasError = true;
            }

            if (hasError) {
                showGlobalToast(
                    'error',
                    'Campos obrigatórios',
                    'Por favor, preencha todos os campos obrigatórios',
                    4000
                );
                setLoading(false);
                return;
            }

            // Primeiro, vamos fazer upload das imagens para o Firebase
            showGlobalToast(
                'info',
                'Processando',
                'Fazendo upload das imagens...',
                2000
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
                2000
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
            const documentPath = await generateWordDocument(relatorioData);

            // Após gerar o documento com sucesso, deletar as imagens
            await deleteImagesFolder();

            showGlobalToast(
                'success',
                'Sucesso',
                `Relatório gerado com sucesso em: ${documentPath}`,
                4000
            );

            // Limpar o formulário após sucesso
            //navigation.goBack();

            return documentPath;
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);

            // Feedback mais específico de erro para o usuário
            let errorMessage = 'Erro ao gerar relatório. ';
            if (error instanceof Error) {
                if (error.message.includes('Network')) {
                    errorMessage += 'Verifique sua conexão com a internet.';
                } else {
                    errorMessage += error.message;
                }
            }

            showGlobalToast(
                'error',
                'Erro',
                errorMessage,
                4000
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Surface style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <MaterialIcons name="post-add" size={32} color={customTheme.colors.primary} />

                <Text variant="headlineMedium" style={styles.headerTitle}>
                    Novo Relatório de Ocorrência
                </Text>
            </View>

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
                    <DropDownPicker
                        open={openClassificacao}
                        value={classificacao}
                        items={classificacaoList}
                        setOpen={setOpenClassificacao}
                        setValue={setClassificacao}
                        listMode="MODAL"
                        placeholder="Selecione a Classificação"
                        style={[styles.dropdown, classificacaoError && styles.dropdownError]}
                        textStyle={styles.dropdownText}
                        containerStyle={styles.dropdownContainer}
                    />

                    {/* Número */}
                    <TextInput
                        mode="outlined"
                        label="Número do Relatório"
                        value={numero}
                        onChangeText={(text) => {
                            setNumero(text);
                            setNumeroError(false);
                        }}
                        error={numeroError}
                        style={styles.textInput}
                        theme={inputTheme}
                        left={<TextInput.Icon icon={() => (
                            <MaterialIcons name="description" size={24} color={customTheme.colors.primary} />
                        )} />
                        }
                    />

                    {/* Cliente */}
                    <DropdownClientes
                        clientes={clientes}
                        onSelect={handleSelectCliente}
                        placeholder="Selecione um cliente"
                    />

                    {/* Tipo de Ocorrência */}
                    <Button
                        mode="outlined"
                        onPress={() => setShowTipoOcorrenciaModal(true)}
                        style={[
                            styles.tipoOcorrenciaButton,
                            tipoOcorrenciaError && styles.buttonError
                        ]}
                    >
                        {tipoOcorrencia ?
                            tiposOcorrencia.find(t => t.value === tipoOcorrencia)?.label :
                            "Selecione o Tipo de Ocorrência"
                        }
                    </Button>

                    {/* Campos condicionais baseados no tipo de ocorrência */}
                    {tipoOcorrencia && (
                        <View style={styles.ocorrenciaDetalhes}>
                            <TextInput
                                mode="outlined"
                                label="Número da OS"
                                value={numeroOS}
                                onChangeText={setNumeroOS}
                                style={styles.textInput}
                                theme={inputTheme}
                                left={<TextInput.Icon icon={() => (
                                    <MaterialIcons name="123" size={30} color={customTheme.colors.primary} />
                                )} />}
                            />

                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => setMostrarSeletorDataOcorrencia(true)}
                            >
                                <MaterialIcons name="calendar-month" size={20} color={customTheme.colors.primary} />
                                <Text style={styles.inputText}>
                                    Data da OS: {dataOcorrencia.toLocaleDateString()}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Responsável */}
                    <TextInput
                        mode="outlined"
                        label="Responsável"
                        value={userInfo?.user || ''}
                        disabled
                        style={[styles.textInput, styles.inputDisabled]}
                        theme={inputTheme}
                        left={<TextInput.Icon icon={() => (
                            <MaterialIcons name="person" size={20} color={customTheme.colors.primary} />
                        )} />}
                    />

                    {/* Data do Relatório */}
                    <TouchableOpacity
                        style={styles.input}
                        onPress={() => setMostrarSeletorData(true)}
                    >
                        <MaterialIcons name="calendar-today" size={20} color={customTheme.colors.primary} />
                        <Text style={styles.inputText}>
                            Data do Relatório: {data.toLocaleDateString()}
                        </Text>
                    </TouchableOpacity>
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
                        <Button
                            style={styles.photoButton}
                            mode="contained-tonal"
                            onPress={handleTakePhoto}
                            icon={() => <MaterialIcons name="camera-alt" size={24} color={customTheme.colors.primary} />}
                        >
                            Tirar Foto
                        </Button>
                        <Button
                            style={styles.photoButton}
                            mode="contained-tonal"
                            onPress={handleSelectPhoto}
                            icon={() => <MaterialIcons name="photo-library" size={24} color={customTheme.colors.primary} />}
                        >
                            Galeria
                        </Button>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.photoList}
                    >
                        {photos.map((photo, index) => (
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
                        ))}
                    </ScrollView>
                </View>

                {/* Seção: Observações */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="notes" size={24} color={customTheme.colors.primary} />
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Observações / Ações Tomadas
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
                    />
                </View>

                {/* Botão Salvar */}
                <Button
                    style={styles.saveButton}
                    mode="contained"
                    onPress={handleSalvar}
                    icon={() => <MaterialIcons name="save" size={24} color={customTheme.colors.onPrimary} />}
                >
                    Salvar Relatório
                </Button>
            </ScrollView>

            {/* Modal de Tipo de Ocorrência */}
            <Portal>
                <Dialog
                    visible={showTipoOcorrenciaModal}
                    onDismiss={() => setShowTipoOcorrenciaModal(false)}
                    style={styles.dialog}
                >
                    <Dialog.Title style={styles.dialogTitle}>Tipo de Ocorrência</Dialog.Title>
                    <Dialog.Content>
                        <View style={styles.tiposGrid}>
                            {tiposOcorrencia.map((tipo) => (
                                <TouchableOpacity
                                    key={tipo.value}
                                    style={styles.tipoCard}
                                    onPress={() => handleTipoOcorrenciaSelect(tipo.value as TipoOcorrencia)}
                                >
                                    <View style={styles.tipoIconContainer}>
                                        <MaterialIcons
                                            name={tipo.icon}
                                            size={24}
                                            color={customTheme.colors.primary}
                                        />
                                    </View>
                                    <Text style={styles.tipoText}>{tipo.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Dialog.Content>
                </Dialog>
            </Portal>

            {/* DateTimePickers */}
            {mostrarSeletorData && (
                <DateTimePicker
                    value={data}
                    mode="date"
                    onChange={(_, selectedDate) => {
                        setMostrarSeletorData(false);
                        if (selectedDate) setData(selectedDate);
                    }}
                />
            )}

            {mostrarSeletorDataOcorrencia && (
                <DateTimePicker
                    value={dataOcorrencia}
                    mode="date"
                    onChange={(_, selectedDate) => {
                        setMostrarSeletorDataOcorrencia(false);
                        if (selectedDate) setDataOcorrencia(selectedDate);
                    }}
                />
            )}

            {/* Modal de Nome da Foto */}
            <Portal>
                <Dialog
                    visible={showPhotoNameDialog}
                    onDismiss={() => {
                        setShowPhotoNameDialog(false);
                        setTempPhotoUri(null);
                        setPhotoName('');
                    }}
                    style={styles.photoNameDialog}
                >
                    <Dialog.Title>Nome da Foto</Dialog.Title>
                    <Dialog.Content>
                        {tempPhotoUri && (
                            <View style={styles.photoPreviewContainer}>
                                <Image
                                    source={{ uri: tempPhotoUri }}
                                    style={styles.photoPreview}
                                    resizeMode="cover"
                                />
                            </View>
                        )}

                        <Text style={styles.photoNameInfo}>
                            O nome final será formatado como:{'\n'}
                            <Text style={styles.photoNameExample}>
                                IMAGEM - {photos.length + 1} - {photoName || 'nome da foto'}
                            </Text>
                        </Text>

                        <TextInput
                            mode="outlined"
                            label="Digite um nome para a foto"
                            value={photoName}
                            onChangeText={setPhotoName}
                            style={[styles.textInput, styles.photoNameInput]}
                            placeholder="Ex: Vista frontal do local"
                            theme={inputTheme}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button
                            onPress={() => {
                                setShowPhotoNameDialog(false);
                                setTempPhotoUri(null);
                                setPhotoName('');
                            }}
                            textColor={customTheme.colors.error}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onPress={handleAddPhoto}
                            disabled={!photoName.trim()}
                            textColor={customTheme.colors.primary}
                        >
                            Confirmar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Modal de Visualização de Foto */}
            <Modal
                visible={photoModalVisible}
                transparent={true}
                onRequestClose={() => {
                    setPhotoModalVisible(false);
                    setSelectedPhotoIndex(null);
                }}
            >
                <View style={styles.modalContainer}>
                    {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
                        <View style={styles.modalContent}>
                            <Image
                                source={{ uri: photos[selectedPhotoIndex].img }}
                                style={styles.fullScreenImage}
                                resizeMode="contain"
                            />
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalPhotoName}>
                                    {photos[selectedPhotoIndex].imgName}
                                </Text>
                            </View>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.deleteButton]}
                                    onPress={() => handleDeletePhoto(selectedPhotoIndex)}
                                >
                                    <MaterialIcons name="delete" size={24} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={() => {
                                        setPhotoModalVisible(false);
                                        setSelectedPhotoIndex(null);
                                    }}
                                >
                                    <MaterialIcons name="close" size={24} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
        </Surface>
    );
};

const styles = StyleSheet.create({
    searchContainer: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    searchInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        backgroundColor: '#f9f9f9',
    },
    dropdownItem: {
        padding: 10,
    },
    dropdownItemMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dropdownItemSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 32, // para alinhar com o texto acima
        marginTop: 4,
        gap: 4,
    },
    dropdownItemLabel: {
        fontSize: 16,
        color: '#000',
        flex: 1,
    },
    dropdownItemCnpj: {
        fontSize: 12,
        color: customTheme.colors.primary,
    },
    photoNameDialog: {
        maxWidth: '90%',
        width: 350,
        color: customTheme.colors.primary,
    },
    photoPreviewContainer: {
        alignItems: 'center',
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
        elevation: 2,
    },
    photoPreview: {
        width: '100%',
        height: 200,
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    photoNameInfo: {
        marginBottom: 16,
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center',
    },
    photoNameExample: {
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    photoNameInput: {
        marginTop: 8,
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
    },
    headerTitle: {
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
    },
    sectionTitle: {
        marginLeft: 8,
        color: customTheme.colors.onSurface,
        fontWeight: '600',
    },
    dropdown: {
        backgroundColor: customTheme.colors.surface,
        borderColor: customTheme.colors.outline,
        marginBottom: 12,
        height: 56,
    },
    dropdownText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    dropdownContainer: {
        marginBottom: 12,
    },
    dropdownError: {
        borderColor: customTheme.colors.error,
        borderWidth: 2,
    },
    textInput: {
        backgroundColor: customTheme.colors.surface,
        marginBottom: 12,
    },
    inputDisabled: {
        backgroundColor: customTheme.colors.surfaceVariant,
        opacity: 0.8,
    },
    input: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 12,
        elevation: 2,
    },
    inputText: {
        marginLeft: 12,
        color: customTheme.colors.primary,
        fontSize: 16,
    },
    buttonError: {
        borderColor: customTheme.colors.error,
        borderWidth: 2,
    },
    tipoOcorrenciaButton: {
        marginBottom: 12,
        borderColor: customTheme.colors.primary,
        borderWidth: 1,
    },
    ocorrenciaDetalhes: {
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    saveButton: {
        backgroundColor: customTheme.colors.primary,
        marginBottom: 24,
        paddingVertical: 8,
    },
    dialog: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 28,
        marginHorizontal: 24,
    },
    dialogTitle: {
        textAlign: 'center',
        color: customTheme.colors.primary,
        fontSize: 20,
        fontWeight: 'bold',
    },
    tiposGrid: {
        gap: 12,
    },
    tipoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    tipoIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: customTheme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    tipoText: {
        flex: 1,
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    photoButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 12,
    },
    photoButton: {
        flex: 1,
        backgroundColor: customTheme.colors.secondaryContainer,
    },
    photoList: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    photoContainer: {
        marginRight: 12,
        alignItems: 'center',
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
        color: customTheme.colors.onSurface,
        textAlign: 'center',
        width: '100%',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 16,
    },
    modalPhotoName: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
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
    observacoesInput: {
        minHeight: 120,
        textAlignVertical: 'top',
    },
});