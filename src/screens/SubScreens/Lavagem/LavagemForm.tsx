import { ActivityIndicator, Alert, Linking, Platform, SafeAreaView, View } from 'react-native';
import { CameraOptions, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { EQUIPAMENTOS, PLACAS_VEICULOS, ProdutoEstoque, TIPOS_LAVAGEM } from './Components/lavagemTypes';
import { FormConfig, FormValues } from '../../../assets/components/Fomulario/FormularioConfig';
import { PERMISSIONS, RESULTS, check, request } from 'react-native-permissions';
import React, { useEffect, useState } from 'react';
import { Timestamp, doc, setDoc, updateDoc } from 'firebase/firestore';
import dayjs, { Dayjs } from 'dayjs';
import { db, dbStorage } from '../../../../firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import FormularioComponent from '../../../assets/components/Fomulario/FormularioComponent';
import ModernHeader from '../../../assets/components/ModernHeader';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { customTheme } from '../../../theme/theme';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import { useBackgroundSync } from '../../../contexts/backgroundSyncContext';
import { useUser } from '../../../contexts/userContext';

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
        lavagemData,
    } = route?.params || {};

    const { produtos, forceSync, marcarAgendamentoComoConcluido } = useBackgroundSync();

    const [values, setValues] = useState<FormValues>({
        responsavel: userInfo?.user || '',
        dataEHora: dayjs(),
        veiculo: placa || '',
        numeroEquipamento: '',
        tipoLavagem: lavagem || '',
        produtos: [],
        photos: [],
        observacoes: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; id: string } | null>(null);
    const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);
    const [tipoVeiculo, setTipoVeiculo] = useState('');
    const [showEquipmentNumber, setShowEquipmentNumber] = useState(false);
    const [customItems, setCustomItems] = useState<
        Array<{ label: string; value: string; icon: string; tipo: string; isCustom: boolean }>
    >([]);
    const [searchText, setSearchText] = useState('');

    const veiculoItems = [
        ...PLACAS_VEICULOS.map((item) => ({
            label: `${item.value} - ${item.tipo}`,
            value: item.value,
            icon: 'car',
            tipo: 'veiculo',
            isCustom: false,
        })),
        ...EQUIPAMENTOS.map((item) => ({
            label: `${item.value} - ${item.tipo}`,
            value: item.value,
            icon: 'build',
            tipo: 'equipamento',
            isCustom: false,
        })),
        ...customItems.map((item) => ({
            ...item,
            icon: item.tipo === 'veiculo' ? 'car' : item.tipo === 'equipamento' ? 'build' : 'category',
        })),
    ];

    const tipoLavagemItems = TIPOS_LAVAGEM;

    const formConfig: FormConfig = {
        sections: [
            {
                title: 'Informações Gerais',
                icon: 'information',
                fields: [
                    {
                        name: 'responsavel',
                        label: 'Responsável',
                        type: 'text',
                        icon: 'account',
                        disabled: !!userInfo,
                        required: true,
                    },
                    {
                        name: 'dataEHora',
                        label: 'Data e Hora',
                        type: 'datetime',
                        icon: 'calendar-today',
                        required: true,
                    },
                ],
            },
            {
                title: 'Veículo/Equipamento',
                icon: 'car',
                fields: [
                    {
                        name: 'veiculo',
                        label: 'Placa ou Equipamento',
                        type: 'dropdown',
                        icon: tipoVeiculo === 'equipamento' ? 'wrench' : tipoVeiculo === 'veiculo' ? 'car' : 'shape', // Corrigido
                        options: veiculoItems,
                        required: true,
                        search: true,
                        searchPlaceholder: 'Digite para buscar ou adicionar uma placa...',
                        onSearch: setSearchText,
                        onAddCustom: (value: string) => {
                            const tipoDetectado = determinarTipoVeiculo(value.toUpperCase());
                            const novoItem = {
                                label: `${value.toUpperCase()} - ${tipoDetectado === 'veiculo' ? 'Veículo' : 'Outro'}`,
                                value: value.toUpperCase(),
                                icon: tipoDetectado === 'veiculo' ? 'truck' : 'shape', // Corrigido
                                tipo: tipoDetectado,
                                isCustom: false,
                            };
                            setCustomItems((prev) => [...prev, novoItem]);
                            setValues((prev) => ({ ...prev, veiculo: novoItem.value }));
                            setTipoVeiculo(novoItem.tipo);
                            setShowEquipmentNumber(novoItem.tipo === 'equipamento');
                        },
                        disabled: !!placa,
                    },
                    ...(showEquipmentNumber
                        ? [
                            {
                                name: 'numeroEquipamento',
                                label: 'Número do Equipamento',
                                type: 'number' as const,
                                icon: 'pin',
                                keyboardType: 'numeric' as const,
                                required: true,
                            },
                        ]
                        : []),
                ],
            },
            {
                title: 'Tipo de Lavagem',
                icon: 'car-wash',
                fields: [
                    {
                        name: 'tipoLavagem',
                        label: 'Tipo de Lavagem',
                        type: 'dropdown',
                        icon: 'car-wash',
                        options: tipoLavagemItems,
                        required: true,
                        disabled: !!lavagem,
                    },
                ],
            },
            {
                title: 'Produtos Utilizados',
                icon: 'package',
                fields: [
                    {
                        name: 'produtos',
                        label: 'Produtos',
                        type: 'products',
                        products: {
                            availableProducts: produtos.map((p: ProdutoEstoque) => ({ ...p, produto: p.nome })),
                            onAddProduct: (produto: ProdutoEstoque) => {
                                setValues((prev) => ({
                                    ...prev,
                                    produtos: [...(prev.produtos as ProdutoEstoque[]), produto],
                                }));
                            },
                            onRemoveProduct: (index: number) => {
                                setValues((prev) => ({
                                    ...prev,
                                    produtos: (prev.produtos as ProdutoEstoque[]).filter((_, idx) => idx !== index),
                                }));
                            },
                            onUpdateProduct: (index: number, produto: ProdutoEstoque) => {
                                setValues((prev) => {
                                    const newProducts = [...(prev.produtos as ProdutoEstoque[])];
                                    newProducts[index] = produto;
                                    return { ...prev, produtos: newProducts };
                                });
                            },
                        },
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
            {
                title: 'Observações',
                icon: 'note',
                fields: [
                    {
                        name: 'observacoes',
                        label: 'Observações',
                        type: 'textarea',
                        icon: 'note',
                        multiline: true,
                    },
                ],
            },
        ],
    };

    const determinarTipoVeiculo = (placa: string): string => {
        const placaRegexAntiga = /^[A-Z]{3}-?\d{4}$/;
        const placaRegexMercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/;
        if (placaRegexAntiga.test(placa) || placaRegexMercosul.test(placa)) {
            return 'veiculo';
        }
        if (placa.includes('-')) {
            const partes = placa.split('-');
            if (partes.length === 2 && partes[0].length === 3 && partes[1].length === 4) {
                return 'veiculo';
            }
        }
        return 'outros';
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!values.responsavel) {
            newErrors.responsavel = 'Informe o responsável';
        }
        if (!values.dataEHora) {
            newErrors.dataEHora = 'Selecione a data e hora';
        }
        if (!values.veiculo) {
            newErrors.veiculo = 'Selecione um veículo ou equipamento';
        }
        if (showEquipmentNumber && !values.numeroEquipamento) {
            newErrors.numeroEquipamento = 'Informe o número do equipamento';
        }
        if (!values.tipoLavagem) {
            newErrors.tipoLavagem = 'Selecione o tipo de lavagem';
        }
        if ((values.produtos as ProdutoEstoque[])?.length > 0) {
            const produtosIncompletos = (values.produtos as ProdutoEstoque[]).filter(
                (p) => (p.nome && (!p.quantidade || p.quantidade === '0')) || (!p.nome && p.quantidade)
            );
            if (produtosIncompletos.length > 0) {
                newErrors.produtos = 'Preencha nome e quantidade para todos os produtos';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        validateForm();
    }, [values, showEquipmentNumber]);

    useEffect(() => {
        const initializeForm = async () => {
            setLoading(true);
            try {
                if (mode === 'edit' && lavagemData) {
                    const newValues: FormValues = {
                        responsavel: lavagemData.responsavel || userInfo?.user || '',
                        observacoes: lavagemData.observacoes || '',
                        dataEHora: lavagemData.data,
                        veiculo: lavagemData.veiculo?.placa || lavagemData.placaVeiculo || '',
                        numeroEquipamento: lavagemData.veiculo?.numeroEquipamento || '',
                        tipoLavagem: lavagemData.tipoLavagem || '',
                        produtos: lavagemData.produtos
                            ? lavagemData.produtos.map((p: any) => ({
                                nome: p.nome || p.produto,
                                quantidade: p.quantidade?.toString() || '',
                                quantidadeMinima: '',
                                unidadeMedida: 'litro',
                                photoUrl: '',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                            }))
                            : [],
                        photos: lavagemData.fotos
                            ? lavagemData.fotos.map((foto: any) => ({
                                uri: foto.url,
                                id: foto.timestamp?.toString() || Date.now().toString(),
                            }))
                            : [],
                    };
                    setValues(newValues);
                    setTipoVeiculo(lavagemData.veiculo?.tipo || 'veiculo');
                    setShowEquipmentNumber(lavagemData.veiculo?.tipo === 'equipamento');
                } else {
                    setValues((prev) => ({
                        ...prev,
                        responsavel: userInfo?.user || '',
                        veiculo: placa || '',
                        tipoLavagem: lavagem || '',
                    }));
                    if (placa) {
                        const tipoDetectado = determinarTipoVeiculo(placa.toUpperCase());
                        setTipoVeiculo(tipoDetectado);
                        setShowEquipmentNumber(tipoDetectado === 'equipamento');
                    }
                }
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (error) {
                showGlobalToast('error', 'Erro', 'Ocorreu um erro ao carregar o formulário', 3000);
            } finally {
                setLoading(false);
            }
        };
        initializeForm();
    }, [userInfo, mode, lavagemData, placa, lavagem]);

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

    const handleSave = async () => {
        if (isSaving) return;

        console.log(values.dataEHora, 'dataEHora antes do parse');
        if (!validateForm()) {
            showGlobalToast('error', 'Dados obrigatórios faltantes', 'Preencha todos os campos obrigatórios', 5000);
            return;
        }

        setIsSaving(true);
        showGlobalToast('info', 'Aguarde', 'Salvando informações da lavagem...', 10000);

        try {
            let fotosUpload = (values.photos as { uri: string; id: string }[]).map((foto) => ({
                url: foto.uri,
                id: foto.id,
                timestamp: parseInt(foto.id),
                path: '',
            }));

            if ((values.photos as { uri: string; id: string }[]).length > 0) {
                showGlobalToast('info', 'Aguarde', 'Fazendo upload das fotos...', 15000);
                const uploadPromises = (values.photos as { uri: string; id: string }[]).map(async (photo) => {
                    const timestamp = Date.now();
                    const random = Math.random().toString(36).substring(7);
                    const filename = `lavagens/${timestamp}_${random}.jpg`;
                    const reference = ref(dbStorage(), filename);
                    const response = await fetch(photo.uri);
                    const blob = await response.blob();
                    await uploadBytes(reference, blob);
                    const url = await getDownloadURL(reference);
                    return { url, timestamp, path: filename, id: photo.id };
                });
                fotosUpload = await Promise.all(uploadPromises);
            }

            let produtosAnteriores = [];
            if (mode === 'edit' && lavagemData?.produtos) {
                produtosAnteriores = lavagemData.produtos;
            }

            const produtosAnterioresMap: { [key: string]: number } = {};
            produtosAnteriores.forEach((prod: { nome: string; quantidade: number }) => {
                produtosAnterioresMap[prod.nome] = prod.quantidade;
            });

            for (const produtoSelecionado of values.produtos as ProdutoEstoque[]) {
                const produtoEstoque = produtos.find((p: ProdutoEstoque) => p.nome === produtoSelecionado.nome);
                if (produtoEstoque && userInfo?.cargo?.toLowerCase() !== 'administrador') {
                    const quantidadeAtual = parseInt(produtoEstoque.quantidade);
                    const quantidadeUsada = parseInt(produtoSelecionado.quantidade);
                    const novaQuantidade = quantidadeAtual - quantidadeUsada;
                    if (novaQuantidade < 0) {
                        throw new Error(`Quantidade insuficiente do produto ${produtoEstoque.nome}`);
                    }
                    if (produtoEstoque.id) {
                        await updateDoc(doc(db(), 'produtos', produtoEstoque.id), {
                            quantidade: novaQuantidade.toString(),
                            updatedAt: new Date().toISOString(),
                        });
                    }
                }
            }

            await forceSync('produtos');

            const registroLavagem = {
                responsavel: values.responsavel as string,
                data: Timestamp.fromDate((values.dataEHora as Dayjs).toDate()),
                veiculo: {
                    placa: values.veiculo as string,
                    tipo: tipoVeiculo,
                    numeroEquipamento: tipoVeiculo === 'equipamento' ? values.numeroEquipamento : null,
                },
                tipoLavagem: values.tipoLavagem as string,
                produtos: (values.produtos as ProdutoEstoque[]).map((p) => ({
                    nome: p.nome,
                    quantidade: parseInt(p.quantidade),
                })),
                fotos: fotosUpload,
                observacoes: values.observacoes as string,
                status: 'concluido',
                updatedAt: Timestamp.now(),
                createdAt: Timestamp.now(),
                createdBy: userInfo?.id || null,
                agendamentoId: agendamentoId || null,
            };

            if (mode === 'create') {
                registroLavagem.createdAt = Timestamp.now();
                registroLavagem.createdBy = userInfo?.id || null;
                registroLavagem.agendamentoId = agendamentoId || null;
            }

            if (mode === 'edit' && lavagemData?.id) {
                await updateDoc(doc(db(), 'registroLavagens', lavagemData.id), registroLavagem);
                showGlobalToast('success', 'Sucesso', 'Lavagem atualizada com sucesso', 4000);
            } else {
                const timestamp = Date.now();
                const customId = userInfo?.cargo.toLowerCase() === 'administrador'
                    ? `0_ADM_${timestamp}`
                    : timestamp.toString();
                await setDoc(doc(db(), 'registroLavagens', customId), registroLavagem);
                if (agendamentoId && marcarAgendamentoComoConcluido) {
                    await marcarAgendamentoComoConcluido(agendamentoId);
                }
                showGlobalToast('success', 'Sucesso', 'Lavagem registrada com sucesso', 4000);
            }

            setValues({
                responsavel: userInfo?.user || '',
                dataEHora: dayjs(),
                veiculo: '',
                numeroEquipamento: '',
                tipoLavagem: '',
                produtos: [],
                photos: [],
                observacoes: '',
            });
            navigation?.goBack();
        } catch (error: any) {
            console.error('Erro ao processar lavagem:', error);
            showGlobalToast('error', 'Erro', error.message || 'Não foi possível finalizar a lavagem', 4000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (name: string, value: any) => {
        console.log(`handleChange chamado - name: ${name}, value:`, value); // Log detalhado
        setValues((prev) => ({ ...prev, [name]: value }));
        if (name === 'veiculo') {
            const selectedItem = veiculoItems.find((item) => item.value === value);
            if (selectedItem) {
                setTipoVeiculo(selectedItem.tipo);
                setShowEquipmentNumber(selectedItem.tipo === 'equipamento');
            }
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
                <ModernHeader
                    title="Nova Lavagem"
                    iconName="car-wash"
                    onBackPress={() => navigation?.goBack()}
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
            onSubmit={handleSave}
            navigation={navigation}
            isSubmitting={isSaving}
            title="Nova Lavagem"
            iconName="car-wash"
            rightIcon="" // Adiciona rightIcon vazio
            rightAction={() => { }} // Adiciona rightAction vazia
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
}