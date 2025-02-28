import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { debounce } from 'lodash';
import storage from '@react-native-firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import types and utils
import {
    FormDataInterface,
    RootStackParamList,
    Profissional,
    Equipamento,
    Atividade,
    Ocorrencia,
    Photo
} from './Types/rdoTypes';

// Import components
import GeneralInfo from './Components/GeneralInfo';
import ModernHeader from '../../../../assets/components/ModernHeader';
import { useUser } from '../../../../contexts/userContext';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import { customTheme } from '../../../../theme/theme';
import Comments from './Components/Comments';
import Occurrences from './Components/Occurrences';
import OperationHours from './Components/OperationHours';
import PhotoSection from './Components/PhotoSection';
import Professionals from './Components/Professionals';
import WeatherConditions from './Components/WeatherConditions';
import Equipment from './Components/Equipment';
import Activities from './Components/Activities';
import SaveButton from '../../../../assets/components/SaveButton';
import PhotoGalleryEnhanced from '../../Lavagem/Components/PhotoGallery';
import FullScreenImage from '../../../../assets/components/FullScreenImage';
import { User } from '../../../Adm/components/admTypes';
import { loadRdoDraft, clearRdoDraft, saveRdoDraft, formatDate } from './Utils/draftUtils';
import { validateForm, formatTime } from './Utils/formUtils';

type RdoFormRouteProp = RouteProp<RootStackParamList, 'RdoForm'> & {
    params: {
        cliente?: string;
        servico?: string;
        mode?: string;
        relatorioData?: FormDataInterface;
    };
};

interface RdoFormProps {
    navigation?: StackNavigationProp<RootStackParamList, 'RdoForm'>;
    route?: RdoFormRouteProp;
}

// TODO Corrigir os farmdata nos components e aplciar oDraft para voltar a prenencher
export default function RdoForm({ navigation, route }: RdoFormProps) {
    const { userInfo } = useUser();
    const { cliente, servico, mode, relatorioData } = route?.params || {};
    const isEditMode = mode === 'edit';

    // Estados principais
    const [formData, setFormData] = useState<FormDataInterface>({
        id: '',
        cliente: cliente || '',
        servico: servico || '',
        responsavel: userInfo?.user || '',
        material: '',
        numeroRdo: '',
        funcao: '',
        inicioOperacao: '',
        terminoOperacao: '',
        data: '',
        condicaoTempo: { manha: "", tarde: "", noite: "" },
        diaSemana: '',
        cargo: '',
        profissionais: [],
        equipamentos: [],
        atividades: [],
        ocorrencias: [],
        createdAt: null,
        createdBy: '',
        comentarioGeral: '',
        updatedBy: '',
        updatedAt: null,
        photos: [],
    });

    // Estados do formulário
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [horaInicio, setHoraInicio] = useState(new Date());
    const [horaTermino, setHoraTermino] = useState(new Date());
    const [formErrors, setFormErrors] = useState<string[]>([]);
    const [numeroRdo, setNumeroRdo] = useState('');
    const [relatorioId, setRelatorioId] = useState<string | null>(null);
    const [hasDraft, setHasDraft] = useState(false);
    const [lastSavedState, setLastSavedState] = useState<string | null>(null);
    const [isClienteDisabled, setIsClienteDisabled] = useState(false);
    const [isServicoDisabled, setIsServicoDisabled] = useState(false);

    // Estados de coleções
    const [atividadesRealizadas, setAtividadesRealizadas] = useState<Atividade[]>([
        { descricao: '', observacao: '' }
    ]);

    const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
    const [comentarioGeral, setComentarioGeral] = useState('');
    const [photos, setPhotos] = useState<Photo[]>([]);

    // Estados de visualização
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);

    // ALGO AQUI
    const saveFormData = useCallback((updates: Partial<FormDataInterface>) => {
        setFormData(prevData => ({
            ...prevData,
            ...updates
        }));
    }, []);

    const saveNestedFormData = useCallback(<K extends keyof FormDataInterface>(
        key: K,
        updates: Partial<FormDataInterface[K]>
    ) => {
        setFormData(prevData => ({
            ...prevData,
            [key]: {
                ...(prevData[key] as object),
                ...updates
            }
        }));
    }, []);

    // Update the checkForDraft function
    const checkForDraft = useCallback(async () => {
        if (isEditMode) return;

        const draft = await loadRdoDraft();
        if (draft) {
            setHasDraft(true);
            setLastSavedState(draft.lastSaved);

            Alert.alert(
                "Rascunho encontrado",
                `Existe um formulário não finalizado de ${new Date(draft.lastSaved).toLocaleString()}. Deseja continuar de onde parou?`,
                [
                    {
                        text: "Não, começar novo",
                        style: "cancel",
                        onPress: () => clearRdoDraft()
                    },
                    {
                        text: "Sim, carregar",
                        onPress: () => {
                            // Usar a função loadDraftData
                            //loadDraftData(draft.data, userInfo);

                            showGlobalToast(
                                "success",
                                "Rascunho carregado com sucesso",
                                "Continuando de onde parou...",
                                5000
                            );
                        }
                    }
                ]
            );
        }
    }, [isEditMode, userInfo]);

    // Validação em tempo real
    const debouncedValidate = useRef(
        debounce(
            (
                formData: FormDataInterface,
            ) => {
                const errors = validateForm(
                    formData,
                );
                setFormErrors(errors);
            },
            300
        )
    ).current;

    // Salvar rascunho com debounce
    const saveDraftDebounced = useRef(
        debounce(async () => {
            if (isEditMode) return;

            try {
                await saveRdoDraft(formData);
                setLastSavedState(new Date().toISOString());
            } catch (error) {
                console.error('Erro ao salvar rascunho automaticamente:', error);
            }
        }, 2000)
    ).current;

    // Manipuladores de eventos para fotos
    const handleAddPhoto = (newPhoto: Photo) => {
        setPhotos(prev => [...prev, newPhoto]);
    };

    const handleDeletePhoto = (photoId: string) => {
        setPhotos(prev => prev.filter(foto => foto.id !== photoId));
    };

    const handlePhotoPress = (photo: Photo) => {
        // Normalizar para o formato esperado pelo FullScreenImage
        const photoForViewer = {
            uri: photo.uri || photo.url || '',
            id: photo.id || photo.timestamp?.toString() || Date.now().toString()
        };

        setSelectedPhoto(photoForViewer);
        setIsFullScreenVisible(true);
    };

    const handleCloseFullScreen = () => {
        setIsFullScreenVisible(false);
        setSelectedPhoto(null);
    };

    // Upload de imagens para Firebase
    const uploadImagesToFirebase = async (photos: Photo[], relatorioId: string): Promise<Photo[]> => {
        try {
            const uploadedPhotos: Photo[] = [];
            let currentPhotoIndex = 0;

            for (const photo of photos) {
                currentPhotoIndex++;

                // Verificar se a foto já é uma URL do Firebase
                if (photo?.uri?.startsWith('https://firebasestorage.googleapis.com')) {
                    // Se já for uma URL do Firebase, adicionar diretamente
                    uploadedPhotos.push(photo);
                    continue;
                }

                // Caso contrário, fazer upload apenas de fotos locais
                if (photo?.uri?.startsWith('file://') || photo?.uri?.startsWith('content://')) {
                    // Extrair o nome do arquivo da URI
                    const filename = photo.filename || photo.uri.substring(photo.uri.lastIndexOf('/') + 1);

                    // Criar nome único para evitar colisões
                    const uniqueFilename = `${Date.now()}_${filename}`;

                    // Criar referência no Storage com caminho personalizado para o relatório
                    const storageRef = storage().ref(`relatorios/${relatorioId}/fotos/${uniqueFilename}`);

                    // Fazer upload da imagem com monitoramento de progresso
                    const task = storageRef.putFile(photo.uri);

                    // Monitorar progresso
                    task.on('state_changed', snapshot => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log(`Upload da imagem ${currentPhotoIndex}/${photos.length}: ${progress.toFixed(0)}%`);
                    });

                    // Aguardar conclusão do upload
                    await task;

                    // Obter a URL de download
                    const downloadURL = await storageRef.getDownloadURL();

                    // Adicionar a foto com URL do Firebase na lista
                    uploadedPhotos.push({
                        id: photo.id || Date.now().toString(),
                        uri: downloadURL,
                        filename: uniqueFilename
                    });
                }
            }

            return uploadedPhotos;
        } catch (error: any) {
            console.error('Erro ao fazer upload das imagens:', error);

            // Mostrar mensagem de erro mais específica
            let errorMsg = 'Erro ao fazer upload das imagens.';

            if (error.code === 'storage/unauthorized') {
                errorMsg = 'Permissão negada para upload de imagens.';
            } else if (error.code === 'storage/canceled') {
                errorMsg = 'Upload de imagens cancelado.';
            } else if (error.code === 'storage/retry-limit-exceeded') {
                errorMsg = 'Tempo de upload excedido. Verifique sua conexão.';
            } else if (error.code === 'storage/invalid-checksum') {
                errorMsg = 'Erro no arquivo de imagem. Tente novamente.';
            } else if (error.code === 'storage/unknown') {
                errorMsg = 'Erro desconhecido durante o upload. Tente novamente.';
            }

            showGlobalToast('error', 'Erro', errorMsg, 4000);
            throw error;
        }
    };

    // Salvar formulário
    const handleSave = async () => {
        if (formErrors.length > 0) return;

        try {
            const toastMessage = isEditMode ? 'Atualizando relatório...' : 'Salvando relatório...';
            showGlobalToast('info', 'Aguarde', toastMessage, 2000);

            // Defina um ID para o documento caso seja uma nova criação
            const docId = isEditMode && relatorioId ? relatorioId : numeroRdo;

            // Upload das imagens para o Firebase Storage
            let uploadedPhotos: Photo[] = [];
            if (photos.length > 0) {
                showGlobalToast('info', 'Aguarde', 'Enviando imagens...', 15000);
                uploadedPhotos = await uploadImagesToFirebase(photos, docId);
            }

            // Preparar dados do RDO
            const rdo: FormDataInterface = {
                id: docId,
                cliente: formData.cliente,
                clienteNome: formData.clienteNome,
                servico: formData.servico,
                responsavel: formData.responsavel,
                material: formData.material,
                numeroRdo: formData.numeroRdo,
                funcao: formData.cargo,
                cargo: formData.cargo,
                inicioOperacao: formData.inicioOperacao,
                terminoOperacao: formData.terminoOperacao,
                data: formData.data,
                condicaoTempo: {
                    manha: formData.condicaoTempo.manha,
                    tarde: formData.condicaoTempo.tarde,
                    noite: formData.condicaoTempo.noite
                },
                profissionais: formData.profissionais?.map(p => ({
                    tipo: p.tipo,
                    quantidade: (p.quantidade),
                    id: p.id
                })),
                equipamentos: formData.equipamentos?.map(e => ({
                    tipo: e.tipo,
                    quantidade: (e.quantidade),
                    id: e.id
                })),
                atividades: atividadesRealizadas.map(a => ({
                    descricao: a.descricao,
                    observacao: a.observacao
                })),
                ocorrencias: ocorrencias.filter(o => o.tipo && o.descricao),
                comentarioGeral: comentarioGeral,
                diaSemana: formData.diaSemana,
                // Usar as URLs do Firebase em vez das URIs locais
                photos: uploadedPhotos.map(p => ({ uri: p.uri, id: p.id, filename: p.filename })),
                createdAt: "",
                createdBy: "",
                updatedAt: "",
                updatedBy: "",
            };

            // Se for modo de edição, manter dados originais de criação
            if (isEditMode && relatorioData) {
                rdo.createdAt = relatorioData.createdAt || firestore.Timestamp.now();
                rdo.createdBy = relatorioData.createdBy || userInfo?.user || '';
                // Adicionar campo de última atualização
                rdo.updatedAt = firestore.Timestamp.now();
                rdo.updatedBy = userInfo?.id || '';
            } else {
                // Criação normal
                rdo.createdAt = firestore.Timestamp.now();
                rdo.createdBy = userInfo?.id || '';
            }

            // Salvar no Firestore - atualizando ou criando novo documento
            if (isEditMode && relatorioId) {
                await firestore()
                    .collection('relatoriosRDO')
                    .doc(relatorioId)
                    .update(rdo);

                const sucessoMsg = 'Relatório atualizado com sucesso';
                showGlobalToast('success', 'Sucesso', sucessoMsg, 4000);
            } else {
                await firestore()
                    .collection('relatoriosRDO')
                    .doc(numeroRdo)
                    .set(rdo);

                const sucessoMsg = 'Relatório registrado com sucesso';
                showGlobalToast('success', 'Sucesso', sucessoMsg, 4000);
            }

            await clearRdoDraft();

            if (navigation) {
                navigation.goBack();
            }
        } catch (error: any) {
            console.error('Erro ao salvar relatório:', error);
            showGlobalToast(
                'error',
                'Erro',
                error.message || 'Não foi possível salvar o relatório',
                4000
            );
        }
    };

    // Gerar número de RDO
    useEffect(() => {
        if (!isEditMode) {
            const gerarNumeroRdo = async () => {
                try {
                    const snapshot = await firestore()
                        .collection('relatoriosRDO')
                        .orderBy('numeroRdo', 'desc')
                        .limit(1)
                        .get();

                    let proximoNumero = 1;
                    if (!snapshot.empty) {
                        const ultimoRdo = snapshot.docs[0].data();
                        if (ultimoRdo.numeroRdo) {
                            proximoNumero = parseInt(ultimoRdo.numeroRdo) + 1;
                        }
                    }

                    const numeroFormatado = proximoNumero.toString().padStart(4, '0');
                    setNumeroRdo(numeroFormatado);
                    setFormData((prev: FormDataInterface) => ({ ...prev, numeroRdo: numeroFormatado }));
                } catch (error) {
                    console.error('Erro ao gerar número do RDO:', error);
                    setNumeroRdo('0001');
                    setFormData((prev: FormDataInterface) => ({ ...prev, numeroRdo: '0001' }));
                }
            };

            gerarNumeroRdo();
        }
    }, [isEditMode]);

    // Definir dia da semana quando a data mudar
    useEffect(() => {
        const diaSemanaIndex = selectedDate.getDay();
        const diaSemanaValue = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][diaSemanaIndex];
        saveFormData({
            diaSemana: diaSemanaValue,
            data: formatDate(selectedDate)
        });
    }, [selectedDate]);

    // Preencher dados em modo de edição
    useEffect(() => {
        if (isEditMode && relatorioData) {
            // Guardar o ID do relatório para uso na atualização
            setRelatorioId(relatorioData.id);
            setNumeroRdo(relatorioData.numeroRdo || '');

            console.log("Toda a informação salva:", relatorioData)

            // Converter a data de string para Date
            if (relatorioData.data) {
                const [dia, mes, ano] = relatorioData.data.split('/').map(Number);
                const data = new Date(ano, mes - 1, dia);
                setSelectedDate(data);
            }

            // Preencher horas de operação
            if (relatorioData.inicioOperacao) {
                const [hora, minuto] = relatorioData.inicioOperacao.split(':').map(Number);
                const inicioTime = new Date();
                inicioTime.setHours(hora, minuto, 0);
                setHoraInicio(inicioTime);
            }

            if (relatorioData.terminoOperacao) {
                const [hora, minuto] = relatorioData.terminoOperacao.split(':').map(Number);
                const terminoTime = new Date();
                terminoTime.setHours(hora, minuto, 0);
                setHoraTermino(terminoTime);
            }

            // Preencher outros campos do formulário
            saveFormData({
                cliente: relatorioData.cliente || '',
                servico: relatorioData.servico || '',
                material: relatorioData.material || '',
                diaSemana: relatorioData.diaSemana || '',
                condicaoTempo: {
                    manha: relatorioData.condicaoTempo.manha || '',
                    tarde: relatorioData.condicaoTempo.tarde || '',
                    noite: relatorioData.condicaoTempo.noite || '',
                }
            });

            // Preencher arrays de dados
            saveFormData({
                profissionais: Array.isArray(relatorioData.profissionais) && relatorioData.profissionais.length > 0
                    ? relatorioData.profissionais.map(prof => ({
                        ...prof,
                        id: prof.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
                    }))
                    : [],
                equipamentos: Array.isArray(relatorioData.equipamentos) && relatorioData.equipamentos.length > 0
                    ? relatorioData.equipamentos.map(equip => ({
                        ...equip,
                        id: equip.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
                    }))
                    : []
            });

            if (Array.isArray(relatorioData.atividades) && relatorioData.atividades.length > 0) {
                setAtividadesRealizadas([...relatorioData.atividades]);
            } else {
                setAtividadesRealizadas([{ descricao: '', observacao: '' }]);
            }

            if (Array.isArray(relatorioData.ocorrencias) && relatorioData.ocorrencias.length > 0) {
                setOcorrencias([...relatorioData.ocorrencias]);
            }

            if (Array.isArray(relatorioData.photos) && relatorioData.photos.length > 0) {
                const existingPhotos = relatorioData.photos.map(photo => ({
                    uri: photo.uri || '',
                    id: photo.id || Date.now().toString(),
                    filename: photo.filename || ''
                }));
                setPhotos(existingPhotos);
            }

            setComentarioGeral(relatorioData.comentarioGeral || '');

            // Atualizar o formData principal
            setFormData(prev => ({
                ...prev,
                id: relatorioData.id || '',
                cliente: relatorioData.cliente || '',
                clienteNome: relatorioData.clienteNome || '',
                servico: relatorioData.servico || '',
                responsavel: relatorioData.responsavel || userInfo?.user || '',
                material: relatorioData.material || '',
                numeroRdo: relatorioData.numeroRdo || '',
                funcao: relatorioData.funcao || '',
                cargo: relatorioData.funcao || userInfo?.cargo || '',
                inicioOperacao: relatorioData.inicioOperacao || '',
                terminoOperacao: relatorioData.terminoOperacao || '',
                data: relatorioData.data || '',
                diaSemana: relatorioData.diaSemana || '',
                condicaoTempo: relatorioData.condicaoTempo || { manha: '', tarde: '', noite: '' },
                comentarioGeral: relatorioData.comentarioGeral || ''
            }));
        }
    }, [isEditMode, relatorioData, userInfo]);

    // Configurar usuário e parâmetros
    useEffect(() => {
        if (userInfo) {
            setFormData(prev => ({
                ...prev,
                responsavel: userInfo.user,
                cargo: userInfo.cargo
            }));
        }

        if (cliente) {
            saveFormData({
                cliente,
            });
        }

        if (servico) {
            saveFormData({
                servico,
            });
        }

        const generateUniqueId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

        if (formData.profissionais?.length === 0) {
            saveFormData({
                profissionais: [{ tipo: '', quantidade: '1', id: generateUniqueId() }]
            });
        }

        if (formData.equipamentos?.length === 0) {
            saveFormData({
                profissionais: [{ tipo: '', quantidade: '1', id: generateUniqueId() }]
            });
        }

    }, [userInfo, cliente, servico]);

    // Verificar rascunho ao montar
    useEffect(() => {
        checkForDraft();
    }, [checkForDraft]);

    // Efeito para validação do formulário
    useEffect(() => {
        debouncedValidate(
            formData,
        );
    }, [
        formData,
    ]);

    // Efeito para salvar rascunho
    useEffect(() => {
        saveDraftDebounced();
        console.log("Salvando draft apos uma alteração")
        return () => {
            saveDraftDebounced.cancel(); // Cancelar debounce ao desmontar
        };
    }, [
        formData,
    ]);

    useEffect(() => {
        console.log
            (formData.condicaoTempo.manha,
                formData.condicaoTempo.tarde,
                formData.condicaoTempo.noite)
    }, [
        formData.condicaoTempo.manha,
        formData.condicaoTempo.tarde,
        formData.condicaoTempo.noite,
    ]);

    const headerTitle = isEditMode ? "Editar Relatório RDO" : "Relatório Diário de Operação";

    return (
        <SafeAreaView style={styles.safeArea}>

            <ModernHeader
                title={headerTitle}
                iconName="clipboard-text"
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

                    {/* General Information */}
                    <GeneralInfo
                        formData={formData}
                        setFormData={setFormData}
                        userInfo={userInfo}
                        numeroRdo={numeroRdo}
                        mode={mode}
                    />

                    {/* Operation Hours */}
                    <OperationHours
                        horaInicio={horaInicio}
                        setHoraInicio={setHoraInicio}
                        horaTermino={horaTermino}
                        setHoraTermino={setHoraTermino}
                        formData={formData}
                        setFormData={setFormData}
                    />

                    {/* Weather Conditions */}
                    <WeatherConditions
                        formData={formData}
                        saveFormData={saveFormData}
                    />

                    {/* Professionals */}
                    <Professionals
                        formData={formData}
                        saveFormData={saveFormData}
                    />

                    {/* Equipment */}
                    <Equipment
                        formData={formData}
                        saveFormData={saveFormData}
                    />

                    {/* Activities */}
                    <Activities
                        formData={formData}
                        saveFormData={saveFormData}
                    />

                    {/* Occurrences */}
                    <Occurrences
                        formData={formData}
                        saveFormData={saveFormData}
                    />

                    {/* Comments */}
                    <Comments
                        comentarioGeral={comentarioGeral}
                        setComentarioGeral={setComentarioGeral}
                    />

                    {/* Photo Gallery */}
                    <PhotoGalleryEnhanced
                        photos={photos}
                        onAddPhoto={handleAddPhoto}
                        onDeletePhoto={handleDeletePhoto}
                        onPhotoPress={handlePhotoPress}
                        sectionTitle="Registro Fotográfico"
                    />

                    {/* Error and Submit Buttons */}
                    <View style={styles.buttonContainer}>
                        {formErrors.length > 0 && (
                            <View style={styles.errorContainer}>
                                {formErrors.map((error, index) => (
                                    <View key={index} style={styles.errorItem}>
                                        <MaterialCommunityIcons
                                            name="alert-circle-outline"
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
                            text="Salvar Relatório"
                            iconName="content-save"
                            disabled={formErrors.length > 0}
                        />
                    </View>
                </Surface>
            </ScrollView>
        </SafeAreaView>
    );
}

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
    buttonContainer: {
        marginTop: 32,
        marginBottom: 24,
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
});