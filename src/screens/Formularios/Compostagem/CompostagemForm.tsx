import React, { useEffect, useState } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    Image,
    Modal,
    Dimensions,
    StyleSheet,
    Alert,
    Linking,
    Platform,
    SafeAreaView,
    ActivityIndicator
} from 'react-native';
import {
    Text,
    Surface,
    TextInput,
    Button,
    Divider,
    Dialog,
    Portal,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CameraOptions, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { PERMISSIONS, check, RESULTS, request } from 'react-native-permissions';
import { useUser } from '../../../contexts/userContext';
import { customTheme } from '../../../theme/theme';
import { showGlobalToast, saveCompostagemData } from '../../../helpers/GlobalApi';
import { allResponsaveis, Compostagem } from '../../../helpers/Types';
import { Dropdown } from 'react-native-element-dropdown';
import PhotoGallery from '../Lavagem/Components/PhotoGallery';
import FullScreenImage from '../../../assets/components/FullScreenImage';
import storage from '@react-native-firebase/storage';
import ModernHeader from '../../../assets/components/ModernHeader';

type RootStackParamList = {
    Home: undefined;
    NovaMedicao: undefined;
};

interface Props {
    navigation: NativeStackNavigationProp<RootStackParamList, 'NovaMedicao'>;
}

const CompostagemForm: React.FC<Props> = ({ navigation }) => {
    const { userInfo } = useUser();

    const [data, setData] = useState<Date>(new Date());
    const [mostrarSeletorData, setMostrarSeletorData] = useState<boolean>(false);
    const [hora, setHora] = useState<Date>(new Date());
    const [mostrarSeletorHora, setMostrarSeletorHora] = useState<boolean>(false);
    const [tempAmb, setTempAmb] = useState<string>('');
    const [tempBase, setTempBase] = useState<string>('');
    const [tempMeio, setTempMeio] = useState<string>('');
    const [tempTopo, setTempTopo] = useState<string>('');
    const [umidadeAmb, setUmidadeAmb] = useState<string>('');
    const [umidadeLeira, setUmidadeLeira] = useState<string>('');
    const [ph, setPh] = useState<string>('');
    const [observacao, setObservacao] = useState<string>('');
    const [imagemTelaCheia, setImagemTelaCheia] = useState<string | null>(null);
    const [photoUris, setPhotoUris] = useState<string[]>([]);

    const [formErrors, setFormErrors] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Fotos
    const [photos, setPhotos] = useState<Array<{ uri: string; id: string }>>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; id: string } | null>(null);
    const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);

    // Estados para dropdowns
    const [openResponsavel, setOpenResponsavel] = useState(false);
    const [responsavel, setResponsavel] = useState<string>("");
    const [responsavelError, setResponsavelError] = useState(false);

    const [loading, setLoading] = useState(true);
    const [showTipoMedicaoModal, setShowTipoMedicaoModal] = useState(false);
    const [isMedicaoRotina, setIsMedicaoRotina] = useState(false);

    const [responsaveisList, setResponsaveisList] = useState(allResponsaveis);

    const [openOdor, setOpenOdor] = useState(false);
    const [odor, setOdor] = useState<string | null>(null);
    const [odorItems] = useState([
        { label: 'Imperceptível', value: 'imperceptivel' },
        { label: 'Ruim', value: 'ruim' },
        { label: 'Muito Ruim', value: 'muito_ruim' },
    ]);

    const [leira, setLeira] = useState<string>("");
    const [leiraError, setLeiraError] = useState(false);

    // Adicione esta função de validação antes do salvarMedicaoCompostagem
    const validateForm = () => {
        const errors: string[] = [];

        // Validação do responsável
        if ((userInfo?.user === 'Convidado' || userInfo?.user === undefined) && (responsavel === null || responsavel.trim() === "")) {
            errors.push("Selecione o responsável");
        }

        // Validação da leira
        if (leira.trim() === "") {
            errors.push("Digite o número da leira");
        }

        // Validações adicionais apenas para medição completa
        if (!isMedicaoRotina) {
            // Validação das temperaturas
            if (!tempAmb.trim()) errors.push("Digite a temperatura ambiente");
            if (!tempBase.trim()) errors.push("Digite a temperatura da base");
            if (!tempMeio.trim()) errors.push("Digite a temperatura do meio");
            if (!tempTopo.trim()) errors.push("Digite a temperatura do topo");

            // Validação das umidades
            if (!umidadeAmb.trim()) errors.push("Digite a umidade do ambiente");
            if (!umidadeLeira.trim()) errors.push("Digite a umidade da leira");

            // Validação do pH e odor
            if (!ph.trim()) errors.push("Digite o pH");
            if (!odor) errors.push("Selecione o odor");
        }

        setFormErrors(errors);
        return errors.length === 0;
    };

    // Adicione este useEffect para validação em tempo real
    useEffect(() => {
        validateForm();
    }, [
        responsavel,
        leira,
        tempAmb,
        tempBase,
        tempMeio,
        tempTopo,
        umidadeAmb,
        umidadeLeira,
        ph,
        odor,
        isMedicaoRotina
    ]);

    useEffect(() => {
        if (userInfo)
            setResponsavel(userInfo.user)
    }, []);

    // Função para excluir foto
    const handleDeletePhoto = (photoId: string) => {
        setPhotos(currentPhotos => currentPhotos.filter(photo => photo.id !== photoId));
    };

    // Função para abrir foto em tela cheia
    const handlePhotoPress = (photo: { uri: string; id: string }) => {
        setSelectedPhoto(photo);
        setIsFullScreenVisible(true);
    };

    // Modifique a função tirarFoto para incluir o id
    const tirarFoto = async () => {
        const hasPermission = await checkCameraPermission();

        if (!hasPermission) {
            Alert.alert(
                "Permissão da Câmera Necessária",
                "Para tirar fotos, precisamos do acesso à câmera do seu celular.",
                [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Abrir Configurações", onPress: () => Linking.openSettings() }
                ]
            );
            return;
        }

        const options: CameraOptions = {
            mediaType: 'photo',
            saveToPhotos: true,
            includeBase64: false,
            includeExtra: true,
            quality: 1,
        };

        launchCamera(options, (response: any) => {
            if (!response.didCancel && !response.error) {
                const newPhoto = {
                    uri: response.assets[0].uri,
                    id: Date.now().toString(), // Adicionando um id único
                };
                setPhotos(prevPhotos => [...prevPhotos, newPhoto]);
            }
        });
    };

    // Modifique a função selecionarDaGaleria para incluir o id
    const selecionarDaGaleria = () => {
        const options: any = {
            title: 'Selecionar Imagem',
            storageOptions: {
                skipBackup: true,
                path: 'images',
            },
        };

        launchImageLibrary(options, (response: any) => {
            if (!response.didCancel && !response.error) {
                const newPhoto = {
                    uri: response.assets[0].uri,
                    id: Date.now().toString(), // Adicionando um id único
                };
                setPhotos(prevPhotos => [...prevPhotos, newPhoto]);
            }
        });
    };

    // Adicione esta função no início do seu componente
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

            // Primeiro, verifica o status atual da permissão
            const result = await check(permission);

            switch (result) {
                case RESULTS.GRANTED:
                    return true;

                case RESULTS.DENIED:
                    // Se foi negado, solicita a permissão
                    const requestResult = await request(permission);
                    return requestResult === RESULTS.GRANTED;

                case RESULTS.BLOCKED:
                case RESULTS.UNAVAILABLE:
                    // Se bloqueado ou indisponível, mostra alerta para abrir configurações
                    Alert.alert(
                        'Permissão Necessária',
                        'Para tirar fotos, é necessário permitir o acesso à câmera nas configurações do aplicativo.',
                        [
                            {
                                text: 'Cancelar',
                                style: 'cancel'
                            },
                            {
                                text: 'Abrir Configurações',
                                onPress: () => Linking.openSettings()
                            }
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

    // Data e hora
    const onChangeDate = (event: any, selectedDate?: Date) => {
        setMostrarSeletorData(false);
        if (selectedDate) {
            setData(selectedDate);
        }
    };

    const onChangeTime = (event: any, selectedTime?: Date) => {
        setMostrarSeletorHora(false);
        if (selectedTime) {
            setHora(selectedTime);
        }
    };

    // Salva a medição
    const salvarMedicaoCompostagem = async () => {
        if (isSaving) return;
        showGlobalToast(
            'info',
            'Estabelecendo conexão',
            '',
            10000
        );

        setIsSaving(true);

        try {
            let hasError = false;

            // Validação do responsável
            if ((userInfo?.user === 'Convidado' || userInfo?.user === undefined) && (responsavel === null || responsavel.trim() === "")) {
                setResponsavelError(true);
                showGlobalToast(
                    'error',
                    'Dados obrigatórios faltantes',
                    'Selecione o responsável antes de salvar a medição',
                    5000
                );
                hasError = true;
            } else {
                setResponsavelError(false);
            }

            // Validação da leira
            if (leira.trim() == "") {
                setLeiraError(true);
                showGlobalToast(
                    'info',
                    'Dados obrigatórios faltantes',
                    'Selecione a leira da medição antes de salvar',
                    5000
                );
                hasError = true;
            } else {
                setLeiraError(false);
            }

            if (hasError) {
                setIsSaving(false);
                return;
            }

            // Upload de fotos para o Firebase Storage
            const photoUrls: string[] = [];
            for (const photo of photos) {
                try {
                    // Gera um nome único para a foto
                    const fileName = `compostagem_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

                    // Referência para o local de armazenamento no Firebase
                    const reference = storage().ref(`compostagem_photos/${fileName}`);

                    // Faz o upload do arquivo
                    await reference.putFile(photo.uri);

                    // Obtém a URL de download
                    const url = await reference.getDownloadURL();

                    photoUrls.push(url);

                    showGlobalToast(
                        'info',
                        `Fazendo upload das imagens`,
                        `Carregando ${photoUrls.length} de ${photos.length} image${photos.length === 1 ? 'm' : 'ns'}`,
                        25000
                    );

                } catch (uploadError) {
                    console.error('Erro no upload da foto:', uploadError);
                    showGlobalToast(
                        'error',
                        'Erro no Upload',
                        'Falha ao fazer upload de uma das fotos',
                        7500
                    );
                }
            }

            const dataFormatted = data.toISOString().split('T')[0];
            const horaFormatted = hora.toTimeString().split(' ')[0].slice(0, 5);

            const compostagemData: Compostagem = {
                data: dataFormatted,
                hora: horaFormatted,
                responsavel: userInfo?.user ?? '',
                leira,
                isMedicaoRotina,
                tempAmb: isMedicaoRotina ? "" : tempAmb,
                tempBase: isMedicaoRotina ? "" : tempBase,
                tempMeio: isMedicaoRotina ? "" : tempMeio,
                tempTopo: isMedicaoRotina ? "" : tempTopo,
                umidadeAmb: isMedicaoRotina ? "" : umidadeAmb,
                umidadeLeira: isMedicaoRotina ? "" : umidadeLeira,
                ph: isMedicaoRotina ? "" : ph,
                odor: isMedicaoRotina ? null : odor,
                observacao,
                photoUris: photos.map(photo => photo.uri), // URIs locais
                photoUrls, // URLs do Firebase Storage
            };

            // Gerar ID customizado com prefixo apenas para administradores
            const timestamp = Date.now();
            const compostagemId = userInfo?.cargo.toLowerCase() === 'administrador' ? `0_ADM_${timestamp}` : timestamp.toString();

            // Atribuir o ID customizado ao campo 'id' na compostagem
            compostagemData.id = compostagemId;

            // Salvar no Firestore com o ID customizado
            // await firestore().collection('compostagens').doc(compostagemId).set(compostagemData);

            const result = await saveCompostagemData(compostagemData, userInfo?.cargo);

            if (result.success) {

                showGlobalToast(
                    result.isOffline ? 'info' : 'success',
                    result.isOffline ? 'Salvamento Offline' : 'Salvamento Concluído',
                    result.message,
                    10000
                );

                // Limpa os campos após salvar com sucesso
                setResponsavel("");
                setLeira("");
                setLeiraError(false);
                setResponsavelError(false);
                if (!isMedicaoRotina) {
                    setTempAmb("");
                    setTempBase("");
                    setTempMeio("");
                    setTempTopo("");
                    setUmidadeAmb("");
                    setUmidadeLeira("");
                    setPh("");
                    setOdor("");
                }
                setObservacao("");
                setPhotoUris([]);

                navigation?.goBack();
            } else {
                showGlobalToast(
                    'error',
                    'Erro ao Salvar',
                    result.message,
                    4000
                );
            }
        } catch (error) {
            console.error('Erro ao salvar medição:', error);
            showGlobalToast(
                'error',
                'Erro',
                'Houve um problema ao salvar os dados. Por favor, tente novamente.',
                4000
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleLeiraChange = (text: string) => {
        // Remove qualquer caractere que não seja número
        const numericValue = text.replace(/[^0-9]/g, '');
        setLeira(numericValue);
        if (numericValue.trim() !== "") {
            setLeiraError(false);
        }
    };

    const handleTipoMedicaoSelect = async (isRotina: boolean) => {
        setLoading(true); // Ativa loading durante a transição

        try {
            showGlobalToast(
                'info',
                'Alterando modo',
                `Mudando para medição ${isRotina ? 'de rotina' : 'completa'}`,
                2000
            );

            // Limpa os campos se estiver mudando para modo rotina
            if (isRotina) {
                setTempAmb("");
                setTempBase("");
                setTempMeio("");
                setTempTopo("");
                setUmidadeAmb("");
                setUmidadeLeira("");
                setPh("");
                setOdor(null);
            }

            // Pequeno delay para transição suave
            await new Promise(resolve => setTimeout(resolve, 500));

            setIsMedicaoRotina(isRotina);
            setShowTipoMedicaoModal(false);

        } catch (error) {
            console.error('Erro ao alterar modo:', error);
            showGlobalToast(
                'error',
                'Erro',
                'Não foi possível alterar o modo de medição',
                3000
            );
        } finally {
            setLoading(false);
        }
    };

    // Função para inicialização
    const initializeForm = async () => {
        setLoading(true);
        try {
            // Simula carregamento inicial
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Se tiver userInfo, define o responsável
            if (userInfo) {
                setResponsavel(userInfo.user);
            }

            // Outras inicializações necessárias...

        } catch (error) {
            console.error('Erro na inicialização:', error);
            showGlobalToast(
                'error',
                'Erro',
                'Ocorreu um erro ao carregar o formulário',
                3000
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initializeForm();
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <ModernHeader
                    title={isMedicaoRotina ? 'Nova Medição de Rotina' : 'Nova Medição Completa'}
                    iconName="thermometer"
                    onBackPress={() => navigation.goBack()}
                    rightAction={() => handleTipoMedicaoSelect(!isMedicaoRotina)}
                    rightIcon={isMedicaoRotina ? "clipboard-list" : "clipboard-outline"}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customTheme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>

            {/* Header Moderno */}
            <ModernHeader
                title={isMedicaoRotina ? 'Nova Medição de Rotina' : 'Nova Medição Completa'}
                iconName="thermometer"
                onBackPress={() => navigation.goBack()}
                rightAction={() => handleTipoMedicaoSelect(!isMedicaoRotina)}
                rightIcon={isMedicaoRotina ? "clipboard-list" : "clipboard-outline"}
            />

            <FullScreenImage
                visible={isFullScreenVisible}
                photo={selectedPhoto}
                onClose={() => {
                    setIsFullScreenVisible(false);
                    setSelectedPhoto(null);
                }}
            />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                <Surface style={styles.formContainer}>
                    {/* Seção: Informações Gerais */}
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
                            <TextInput
                                mode="outlined"
                                placeholder="Responsável"
                                value={responsavel}
                                disabled={!!userInfo}
                                onChangeText={setResponsavel}
                                left={<TextInput.Icon icon={() => (
                                    <Icon
                                        name="account-circle"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                )} />}
                                style={[
                                    styles.input,
                                    !!userInfo && styles.disabledInput
                                ]}
                            />

                            <View style={styles.rowInputs}>
                                <TouchableOpacity
                                    style={styles.dateTimeContainer}
                                    onPress={() => setMostrarSeletorData(true)}
                                >
                                    <TextInput
                                        mode="outlined"
                                        label="Data"
                                        value={data.toLocaleDateString()}
                                        editable={false}
                                        style={[styles.input, styles.rowInput]}
                                        left={<TextInput.Icon icon={() => (
                                            <Icon
                                                name="calendar"
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                        )} />}
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.dateTimeContainer}
                                    onPress={() => setMostrarSeletorHora(true)}
                                >
                                    <TextInput
                                        mode="outlined"
                                        label="Hora"
                                        value={hora.toLocaleTimeString().slice(0, 5)}
                                        editable={false}
                                        style={[styles.input, styles.rowInput]}
                                        left={<TextInput.Icon icon={() => (
                                            <Icon
                                                name="clock"
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                        )} />}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Seção: Número da Leira */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="database"
                                size={20}
                                color={customTheme.colors.primary}
                            />
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                Leira
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <TextInput
                                mode="outlined"
                                label="Número da Leira"
                                value={leira}
                                onChangeText={handleLeiraChange}
                                keyboardType="numeric"
                                style={[styles.input, leiraError && styles.inputError]}
                                error={leiraError}
                                placeholder="Digite o número da leira"
                                left={<TextInput.Icon icon={() => (
                                    <Icon
                                        name="database"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                )} />}
                            />
                            {leiraError && (
                                <View style={styles.errorContainer}>
                                    <Icon
                                        name="alert-circle"
                                        size={16}
                                        color={customTheme.colors.error}
                                    />
                                    <Text style={styles.errorText}>
                                        Digite o número da leira
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Seção: Temperaturas */}
                    {!isMedicaoRotina && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Icon
                                    name="thermometer-lines"
                                    size={20}
                                    color={customTheme.colors.primary}
                                />
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Temperaturas
                                </Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <TextInput
                                    mode="outlined"
                                    label="Ambiente (°C)"
                                    value={tempAmb}
                                    onChangeText={setTempAmb}
                                    keyboardType="numeric"
                                    style={styles.input}
                                    left={<TextInput.Icon icon={() => (
                                        <Icon
                                            name="thermometer"
                                            size={24}
                                            color={customTheme.colors.primary}
                                        />
                                    )} />}
                                />

                                <View style={styles.temperatureInputsContainer}>
                                    <TextInput
                                        mode="outlined"
                                        label="Base (°C)"
                                        value={tempBase}
                                        onChangeText={setTempBase}
                                        keyboardType="numeric"
                                        style={[styles.input, styles.temperatureInput]}
                                        left={<TextInput.Icon icon={() => (
                                            <Icon
                                                name="thermometer-low"
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                        )} />}
                                    />

                                    <TextInput
                                        mode="outlined"
                                        label="Meio (°C)"
                                        value={tempMeio}
                                        onChangeText={setTempMeio}
                                        keyboardType="numeric"
                                        style={[styles.input, styles.temperatureInput]}
                                        left={<TextInput.Icon icon={() => (
                                            <Icon
                                                name="thermometer"
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                        )} />}
                                    />

                                    <TextInput
                                        mode="outlined"
                                        label="Topo (°C)"
                                        value={tempTopo}
                                        onChangeText={setTempTopo}
                                        keyboardType="numeric"
                                        style={[styles.input, styles.temperatureInput]}
                                        left={<TextInput.Icon icon={() => (
                                            <Icon
                                                name="thermometer-high"
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                        )} />}
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Seção: Umidade */}
                    {!isMedicaoRotina && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Icon
                                    name="water-percent"
                                    size={20}
                                    color={customTheme.colors.primary}
                                />
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Umidade
                                </Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <View style={styles.humidityContainer}>
                                    <View style={styles.humidityInputWrapper}>
                                        <TextInput
                                            mode="outlined"
                                            label="Ambiente (%)"
                                            value={umidadeAmb}
                                            onChangeText={setUmidadeAmb}
                                            keyboardType="numeric"
                                            style={[styles.input, styles.humidityInput]}
                                            left={<TextInput.Icon icon={() => (
                                                <Icon
                                                    name="water-outline"
                                                    size={24}
                                                    color={customTheme.colors.primary}
                                                />
                                            )} />}
                                        />
                                        <View style={styles.inputInfo}>
                                            <Icon
                                                name="information"
                                                size={16}
                                                color={customTheme.colors.primary}
                                            />
                                            <Text style={styles.infoText}>
                                                Umidade do ambiente
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.humidityInputWrapper}>
                                        <TextInput
                                            mode="outlined"
                                            label="Leira (%)"
                                            value={umidadeLeira}
                                            onChangeText={setUmidadeLeira}
                                            keyboardType="numeric"
                                            style={[styles.input, styles.humidityInput]}
                                            left={<TextInput.Icon icon={() => (
                                                <Icon
                                                    name="water"
                                                    size={24}
                                                    color={customTheme.colors.primary}
                                                />
                                            )} />}
                                        />
                                        <View style={styles.inputInfo}>
                                            <Icon
                                                name="information"
                                                size={16}
                                                color={customTheme.colors.primary}
                                            />
                                            <Text style={styles.infoText}>
                                                Umidade da leira
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Seção: Análise (pH e Odor) */}
                    {!isMedicaoRotina && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Icon
                                    name="test-tube"
                                    size={20}
                                    color={customTheme.colors.primary}
                                />
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Análise
                                </Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <TextInput
                                    mode="outlined"
                                    label="pH"
                                    value={ph}
                                    onChangeText={setPh}
                                    keyboardType="numeric"
                                    style={styles.input}
                                    left={<TextInput.Icon icon={() => (
                                        <Icon
                                            name="flask"
                                            size={24}
                                            color={customTheme.colors.primary}
                                        />
                                    )} />}
                                />

                                <TouchableOpacity
                                    style={styles.dropdownContainer}
                                    activeOpacity={0.7}
                                    onPress={() => setOpenOdor(true)}
                                >
                                    <Dropdown
                                        style={styles.dropdown}
                                        placeholderStyle={styles.placeholderStyle}
                                        selectedTextStyle={styles.selectedTextStyle}
                                        inputSearchStyle={styles.inputSearchStyle}
                                        iconStyle={styles.iconStyle}
                                        data={odorItems}
                                        maxHeight={300}
                                        labelField="label"
                                        valueField="value"
                                        placeholder="Selecione o Odor"
                                        value={odor}
                                        onChange={item => setOdor(item.value)}
                                        renderLeftIcon={() => (
                                            <Icon
                                                name="air-filter"
                                                size={20}
                                                color={customTheme.colors.primary}
                                                style={styles.dropdownIcon}
                                            />
                                        )}
                                        renderItem={item => (
                                            <View style={styles.dropdownItem}>
                                                <Icon
                                                    name="air-filter"
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
                    )}

                    {/* Seção: Fotos */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="camera"
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
                                    style={styles.photoButtonWrapper}
                                    activeOpacity={0.7}
                                    onPress={tirarFoto}
                                >
                                    <View style={styles.photoButton}>
                                        <Icon
                                            name="camera"
                                            size={24}
                                            color={customTheme.colors.primary}
                                        />
                                        <Text style={styles.photoButtonText}>
                                            Tirar Foto
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.photoButtonWrapper}
                                    activeOpacity={0.7}
                                    onPress={selecionarDaGaleria}
                                >
                                    <View style={styles.photoButton}>
                                        <Icon
                                            name="image"
                                            size={24}
                                            color={customTheme.colors.primary}
                                        />
                                        <Text style={styles.photoButtonText}>
                                            Galeria
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.photoGalleryContainer}>
                                <PhotoGallery
                                    photos={photos}
                                    onDeletePhoto={handleDeletePhoto}
                                    onPhotoPress={handlePhotoPress}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Seção: Observações */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon
                                name="note-text"
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
                                value={observacao}
                                onChangeText={setObservacao}
                                multiline
                                numberOfLines={4}
                                style={[styles.input, styles.textArea]}
                                textAlignVertical="top"
                                left={<TextInput.Icon icon={() => (
                                    <Icon
                                        name="pencil"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                )} />}
                            />
                            <View style={styles.inputInfo}>
                                <Icon
                                    name="information"
                                    size={16}
                                    color={customTheme.colors.primary}
                                />
                                <Text style={styles.infoText}>
                                    Registre aqui observações importantes sobre a medição
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Seção: Botão Salvar */}
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
                                        <Text style={styles.errorText}>
                                            {error}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <Button
                            mode="contained"
                            onPress={salvarMedicaoCompostagem}
                            style={[
                                styles.saveButton,
                                (formErrors.length > 0 || isSaving) && styles.saveButtonDisabled
                            ]}
                            contentStyle={styles.buttonContent}
                            loading={isSaving}
                            disabled={formErrors.length > 0 || isSaving}
                            icon="content-save"
                        >
                            <Text style={[
                                styles.buttonText,
                                (formErrors.length > 0 || isSaving) && styles.buttonTextDisabled
                            ]}>
                                Salvar {isMedicaoRotina ? 'Medição de Rotina' : 'Medição Completa'}
                            </Text>
                        </Button>
                    </View>

                </Surface>

                {mostrarSeletorData && (
                    <DateTimePicker
                        testID="dateTimePicker"
                        value={data}
                        mode="date"
                        is24Hour={true}
                        display="default"
                        onChange={onChangeDate}
                    />
                )}

                {mostrarSeletorHora && (
                    <DateTimePicker
                        testID="timeTimePicker"
                        value={hora}
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={onChangeTime}
                    />
                )}

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: customTheme.colors.background,
    },
    photoButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16,
    },
    photoButtonWrapper: {
        width: '45%', // Cada botão ocupa 45% da largura
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
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
    buttonContent: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,  // Adicionado para dar espaço
    },
    buttonText: {
        color: customTheme.colors.onPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    buttonContainer: {
        marginTop: 32,
        marginBottom: 24,
        gap: 16,
    },
    saveButton: {
        borderRadius: 8,
        backgroundColor: customTheme.colors.primary,
        elevation: 2,
    },
    saveButtonDisabled: {
        backgroundColor: customTheme.colors.surfaceDisabled,
        elevation: 0,
    },
    buttonTextDisabled: {
        color: customTheme.colors.onSurfaceDisabled,
    },
    errorContainer: {
        padding: 12,
        backgroundColor: customTheme.colors.errorContainer,
        borderRadius: 8,
        gap: 8,
    },
    errorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    errorText: {
        color: customTheme.colors.error,
        fontSize: 14,
        flex: 1,
    },
    photoGalleryContainer: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderStyle: 'dashed',
        padding: 16,
        backgroundColor: '#FFFFFF',
    },
    photoGalleryContent: {
        gap: 16,
        flexDirection: 'row',
    },
    photoContainer: {
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        elevation: 2,
    },
    photoThumbnail: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    deletePhotoButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
    },
    textArea: {
        minHeight: 120,
        textAlignVertical: 'top',
        paddingTop: 12,
        paddingBottom: 12,
    },
    dropdownContainer: {
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
    dropdownLabel: {
        flex: 1,
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    humidityContainer: {
        gap: 24,
    },
    humidityInputWrapper: {
        gap: 4,
    },
    humidityInput: {
        backgroundColor: '#FFFFFF',
    },
    inputInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 8,
    },
    infoText: {
        fontSize: 12,
        color: customTheme.colors.primary,
        opacity: 0.8,
    },
    temperatureInputsContainer: {
        flexDirection: 'column',
        gap: 16,
    },
    temperatureInput: {
        backgroundColor: '#FFFFFF',
    },
    inputError: {
        borderColor: customTheme.colors.error,
        borderWidth: 2,
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
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
    backButton: {
        padding: 8,
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
    input: {
        backgroundColor: '#FFFFFF',
        height: 56,
    },
    disabledInput: {
        opacity: 0.7,
        backgroundColor: customTheme.colors.surfaceDisabled,
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
});


export default CompostagemForm;