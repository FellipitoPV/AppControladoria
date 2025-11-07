import { ActivityIndicator, Alert, Linking, Platform, SafeAreaView, View } from 'react-native';
import { CameraOptions, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { FormConfig, FormSectionConfig, FormValues } from '../../../assets/components/Fomulario/FormularioConfig';
import { PERMISSIONS, RESULTS, check, request } from 'react-native-permissions';
import React, { useEffect, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { saveCompostagemData, showGlobalToast } from '../../../helpers/GlobalApi';

import { Compostagem } from '../../../helpers/Types';
import FormularioComponent from '../../../assets/components/Fomulario/FormularioComponent';
import ModernHeader from '../../../assets/components/ModernHeader';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Timestamp } from 'firebase/firestore';
import { customTheme } from '../../../theme/theme';
import { dbStorage } from '../../../../firebase';
import { useUser } from '../../../contexts/userContext';

type RootStackParamList = {
    Home: undefined;
    NovaMedicao: undefined;
};

interface Props {
    navigation: NativeStackNavigationProp<RootStackParamList, 'NovaMedicao'>;
}

const CompostagemForm: React.FC<Props> = ({ navigation }) => {
    const { userInfo } = useUser();

    const [values, setValues] = useState<FormValues>({
        dataEHora: dayjs(),
        leira: '',
        tempAmb: '',
        tempBase: '',
        tempMeio: '',
        tempTopo: '',
        umidadeAmb: '',
        umidadeLeira: '',
        ph: '',
        odor: null,
        observacao: '',
        photos: [],
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isMedicaoRotina, setIsMedicaoRotina] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; id: string } | null>(null);
    const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);

    const odorItems = [
        { label: 'Imperceptível', value: 'imperceptivel' },
        { label: 'Ruim', value: 'ruim' },
        { label: 'Muito Ruim', value: 'muito_ruim' },
    ];

    const baseSections: FormSectionConfig[] = [
        {
            title: 'Informações Gerais',
            icon: 'information',
            fields: [
                {
                    name: 'dataEHora',
                    label: 'Data e Hora',
                    type: 'datetime',
                    icon: 'calendar',
                    required: true,
                },
            ],
        },
        {
            title: 'Leira',
            icon: 'database',
            fields: [
                {
                    name: 'leira',
                    label: 'Número da Leira',
                    type: 'number',
                    icon: 'database',
                    required: true,
                    keyboardType: 'numeric',
                },
            ],
        },
    ];

    const conditionalSections: FormSectionConfig[] = !isMedicaoRotina
        ? [
            {
                title: 'Temperaturas',
                icon: 'thermometer-lines',
                fields: [
                    {
                        name: 'tempAmb',
                        label: 'Ambiente (°C)',
                        type: 'number',
                        icon: 'thermometer',
                        required: true,
                        keyboardType: 'numeric',
                    },
                    {
                        name: 'tempBase',
                        label: 'Base (°C)',
                        type: 'number',
                        icon: 'thermometer-low',
                        required: true,
                        keyboardType: 'numeric',
                    },
                    {
                        name: 'tempMeio',
                        label: 'Meio (°C)',
                        type: 'number',
                        icon: 'thermometer',
                        required: true,
                        keyboardType: 'numeric',
                    },
                    {
                        name: 'tempTopo',
                        label: 'Topo (°C)',
                        type: 'number',
                        icon: 'thermometer-high',
                        required: true,
                        keyboardType: 'numeric',
                    },
                ],
            },
            {
                title: 'Umidade',
                icon: 'water-percent',
                fields: [
                    {
                        name: 'umidadeAmb',
                        label: 'Ambiente (%)',
                        type: 'number',
                        icon: 'water-outline',
                        required: true,
                        keyboardType: 'numeric',
                        infoText: 'Umidade do ambiente',
                    },
                    {
                        name: 'umidadeLeira',
                        label: 'Leira (%)',
                        type: 'number',
                        icon: 'water',
                        required: true,
                        keyboardType: 'numeric',
                        infoText: 'Umidade da leira',
                    },
                ],
            },
            {
                title: 'Análise',
                icon: 'test-tube',
                fields: [
                    {
                        name: 'ph',
                        label: 'pH',
                        type: 'number',
                        icon: 'flask',
                        required: true,
                        keyboardType: 'numeric',
                    },
                    {
                        name: 'odor',
                        label: 'Selecione o Odor',
                        type: 'dropdown',
                        icon: 'air-filter',
                        required: true,
                        options: odorItems,
                    },
                ],
            },
            {
                title: 'Registro Fotográfico',
                icon: 'camera',
                fields: [
                    {
                        name: 'photos',
                        label: 'Fotos',
                        type: 'photos',
                    },
                ],
            },
        ]
        : [];

    const PosConditionalSections: FormSectionConfig[] = [
        {
            title: 'Observações',
            icon: 'note-text',
            fields: [
                {
                    name: 'observacao',
                    label: 'Observações',
                    type: 'textarea',
                    icon: 'pencil',
                    multiline: true,
                    infoText: 'Registre aqui observações importantes sobre a medição',
                },
            ],
        },
    ];

    const formConfig: FormConfig = {
        sections: [...baseSections, ...conditionalSections, ...PosConditionalSections],
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (typeof values.leira !== 'string' || !values.leira?.trim()) {
            newErrors.leira = 'Digite o número da leira';
        }

        if (!isMedicaoRotina) {
            if (typeof values.tempAmb === 'string' && !values.tempAmb.trim()) newErrors.tempAmb = 'Digite a temperatura ambiente';
            if (typeof values.tempBase === 'string' && !values.tempBase.trim()) newErrors.tempBase = 'Digite a temperatura da base';
            if (typeof values.tempMeio === 'string' && !values.tempMeio.trim()) newErrors.tempMeio = 'Digite a temperatura do meio';
            if (typeof values.tempTopo === 'string' && !values.tempTopo.trim()) newErrors.tempTopo = 'Digite a temperatura do topo';
            if (typeof values.umidadeAmb === 'string' && !values.umidadeAmb.trim()) newErrors.umidadeAmb = 'Digite a umidade do ambiente';
            if (typeof values.umidadeLeira === 'string' && !values.umidadeLeira.trim()) newErrors.umidadeLeira = 'Digite a umidade da leira';
            if (typeof values.ph === 'string' && !values.ph.trim()) newErrors.ph = 'Digite o pH';
            if (!values.odor) newErrors.odor = 'Selecione o odor';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        validateForm();
    }, [values, isMedicaoRotina]);

    useEffect(() => {
        const initializeForm = async () => {
            setLoading(true);
            try {
                if (userInfo) {
                    setValues((prev) => ({ ...prev, responsavel: userInfo.user }));
                }
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (error) {
                showGlobalToast('error', 'Erro', 'Ocorreu um erro ao carregar o formulário', 3000);
            } finally {
                setLoading(false);
            }
        };
        initializeForm();
    }, [userInfo]);

    const checkCameraPermission = async () => {
        try {
            const permission = Platform.select({
                android: PERMISSIONS.ANDROID.CAMERA,
                ios: PERMISSIONS.IOS.CAMERA,
            });

            if (!permission) return false;

            const result = await check(permission);
            switch (result) {
                case RESULTS.GRANTED:
                    return true;
                case RESULTS.DENIED:
                    const requestResult = await request(permission);
                    return requestResult === RESULTS.GRANTED;
                case RESULTS.BLOCKED:
                case RESULTS.UNAVAILABLE:
                    Alert.alert(
                        'Permissão Necessária',
                        'Para tirar fotos, é necessário permitir o acesso à câmera nas configurações do aplicativo.',
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Abrir Configurações', onPress: () => Linking.openSettings() },
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

    const tirarFoto = async () => {
        const hasPermission = await checkCameraPermission();
        if (!hasPermission) {
            Alert.alert(
                'Permissão da Câmera Necessária',
                'Para tirar fotos, precisamos do acesso à câmera do seu celular.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Abrir Configurações', onPress: () => Linking.openSettings() },
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
                    id: Date.now().toString(),
                };
                setValues((prev) => ({
                    ...prev,
                    photos: [...(prev.photos as { uri: string; id: string }[]), newPhoto],
                }));
            }
        });
    };

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
                    id: Date.now().toString(),
                };
                setValues((prev) => ({
                    ...prev,
                    photos: [...(prev.photos as { uri: string; id: string }[]), newPhoto],
                }));
            }
        });
    };

    const handleDeletePhoto = (photoId: string) => {
        setValues((prev) => ({
            ...prev,
            photos: (prev.photos as { uri: string; id: string }[]).filter((photo) => photo.id !== photoId),
        }));
    };

    const handlePhotoPress = (photo: { uri: string; id: string }) => {
        setSelectedPhoto(photo);
        setIsFullScreenVisible(true);
    };

    const salvarMedicaoCompostagem = async () => {
        if (isSaving) return;
        showGlobalToast('info', 'Estabelecendo conexão', '', 10000);
        setIsSaving(true);

        try {
            if (!validateForm()) {
                showGlobalToast('error', 'Dados obrigatórios faltantes', 'Preencha todos os campos obrigatórios', 5000);
                setIsSaving(false);
                return;
            }

            const photoUrls: string[] = [];
            for (const photo of values.photos as { uri: string; id: string }[]) {
                try {
                    const fileName = `compostagem_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                    const reference = ref(dbStorage(), `compostagem_photos/${fileName}`);
                    const response = await fetch(photo.uri);
                    const blob = await response.blob();
                    await uploadBytes(reference, blob);
                    const url = await getDownloadURL(reference);
                    photoUrls.push(url);
                    showGlobalToast(
                        'info',
                        `Fazendo upload das imagens`,
                        `Carregando ${photoUrls.length} de ${(values.photos as { uri: string; id: string }[]).length} image${(values.photos as { uri: string; id: string }[]).length === 1 ? 'm' : 'ns'}`,
                        25000
                    );
                } catch (uploadError) {
                    console.error('Erro no upload da foto:', uploadError);
                    showGlobalToast('error', 'Erro no Upload', 'Falha ao fazer upload de uma das fotos', 7500);
                }
            }

            const compostagemData: Compostagem = {
                data: dayjs(values.dataEHora as Dayjs).format('YYYY-MM-DD'),
                responsavel: userInfo?.user ?? '',
                leira: values.leira as string,
                timestamp: Timestamp.now(),
                isMedicaoRotina,
                tempAmb: isMedicaoRotina ? '' : (values.tempAmb as string),
                tempBase: isMedicaoRotina ? '' : (values.tempBase as string),
                tempMeio: isMedicaoRotina ? '' : (values.tempMeio as string),
                tempTopo: isMedicaoRotina ? '' : (values.tempTopo as string),
                umidadeAmb: isMedicaoRotina ? '' : (values.umidadeAmb as string),
                umidadeLeira: isMedicaoRotina ? '' : (values.umidadeLeira as string),
                ph: isMedicaoRotina ? '' : (values.ph as string),
                odor: isMedicaoRotina ? null : (values.odor as string),
                observacao: values.observacao as string,
                photoUris: (values.photos as { uri: string; id: string; }[]).map((photo) => photo.uri),
                photoUrls,
                createdAt: undefined,
                hora: ''
            };

            const timestamp = Date.now();
            const compostagemId =
                userInfo?.cargo.toLowerCase() === 'administrador' ? `0_ADM_${timestamp}` : timestamp.toString();
            compostagemData.id = compostagemId;

            const result = await saveCompostagemData(compostagemData, userInfo?.cargo);

            if (result.success) {
                showGlobalToast(
                    result.isOffline ? 'info' : 'success',
                    result.isOffline ? 'Salvamento Offline' : 'Salvamento Concluído',
                    result.message,
                    10000
                );

                setValues({
                    dataEHora: dayjs(),
                    leira: '',
                    tempAmb: '',
                    tempBase: '',
                    tempMeio: '',
                    tempTopo: '',
                    umidadeAmb: '',
                    umidadeLeira: '',
                    ph: '',
                    odor: null,
                    observacao: '',
                    photos: [],
                });
                navigation?.goBack();
            } else {
                showGlobalToast('error', 'Erro ao Salvar', result.message, 4000);
            }
        } catch (error) {
            console.error('Erro ao salvar medição:', error);
            showGlobalToast('error', 'Erro', 'Houve um problema ao salvar os dados. Por favor, tente novamente.', 4000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTipoMedicaoSelect = async (isRotina: boolean) => {
        setLoading(true);
        try {
            showGlobalToast('info', 'Alterando modo', `Mudando para medição ${isRotina ? 'de rotina' : 'completa'}`, 2000);
            if (isRotina) {
                setValues((prev) => ({
                    ...prev,
                    tempAmb: '',
                    tempBase: '',
                    tempMeio: '',
                    tempTopo: '',
                    umidadeAmb: '',
                    umidadeLeira: '',
                    ph: '',
                    odor: null,
                }));
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
            setIsMedicaoRotina(isRotina);
        } catch (error) {
            console.error('Erro ao alterar modo:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível alterar o modo de medição', 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (name: string, value: any) => {
        setValues((prev) => ({ ...prev, [name]: value }));
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
                <ModernHeader
                    title={isMedicaoRotina ? 'Nova Medição de Rotina' : 'Nova Medição Completa'}
                    iconName="thermometer"
                    onBackPress={() => navigation.goBack()}
                    rightAction={() => handleTipoMedicaoSelect(!isMedicaoRotina)}
                    rightIcon={isMedicaoRotina ? 'clipboard-list' : 'clipboard-outline'}
                />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={customTheme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <FormularioComponent
            config={formConfig}
            values={values}
            errors={errors}
            onChange={handleChange}
            onSubmit={salvarMedicaoCompostagem}
            navigation={navigation}
            isSubmitting={isSaving}
            title={isMedicaoRotina ? 'Nova Medição de Rotina' : 'Nova Medição Completa'}
            iconName="thermometer"
            rightIcon={isMedicaoRotina ? 'clipboard-list' : 'clipboard-outline'}
            rightAction={() => handleTipoMedicaoSelect(!isMedicaoRotina)}
            photos={values.photos as { uri: string; id: string }[]}
            onPhotoPress={handlePhotoPress}
            onDeletePhoto={handleDeletePhoto}
            tirarFoto={tirarFoto}
            selecionarDaGaleria={selecionarDaGaleria}
            selectedPhoto={selectedPhoto}
            isFullScreenVisible={isFullScreenVisible}
            setIsFullScreenVisible={setIsFullScreenVisible}
        />
    );
};

export default CompostagemForm;