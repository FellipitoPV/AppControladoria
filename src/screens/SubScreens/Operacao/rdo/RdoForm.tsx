import { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { debounce } from 'lodash';
import storage from '@react-native-firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import types and utils
import { FormDataInterface, RootStackParamList, Photo } from './Types/rdoTypes';

// Import components
import GeneralInfo from './Components/GeneralInfo';
import ModernHeader from '../../../../assets/components/ModernHeader';
import { useUser } from '../../../../contexts/userContext';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import { customTheme } from '../../../../theme/theme';
import Comments from './Components/Comments';
import Occurrences from './Components/Occurrences';
import OperationHours from './Components/OperationHours';
import Professionals from './Components/Professionals';
import WeatherConditions from './Components/WeatherConditions';
import Equipment from './Components/Equipment';
import Activities from './Components/Activities';
import SaveButton from '../../../../assets/components/SaveButton';
import PhotoGalleryEnhanced from '../../Lavagem/Components/PhotoGallery';
import FullScreenImage from '../../../../assets/components/FullScreenImage';
import { validateForm, formatDate, formatTime } from './Utils/formUtils';
import {
    loadRdoDraft,
    clearRdoDraftWithId,
    clearRdoDraft,
    saveRdoDraftWithId,
    saveRdoDraft,
} from './Utils/draftUtils';
import DraftConfirmationModal from '../../../../assets/components/DraftConfirmationModal';
import { removeAllNotifications } from '../../../../helpers/notificationChannel';
import NotificationService from '../../../../service/NotificationService';

// Funções de utilidade para o draft system
const DRAFT_KEY = 'rdoDraft';

type RdoFormRouteProp = RouteProp<RootStackParamList, 'RdoForm'> & {
    params: {
        cliente?: string;
        servico?: string;
        mode?: string;
        relatorioData?: FormDataInterface;
        onGoBack: () => void;
    };
};

interface RdoFormProps {
    navigation?: StackNavigationProp<RootStackParamList, 'RdoForm'>;
    route?: RdoFormRouteProp & {
        params?: {
            cliente?: string;
            servico?: string;
            mode?: string;
            relatorioData?: FormDataInterface;
            // Novos parâmetros para notificação
            source?: string;
            openDraft?: boolean;
        };
    };
}

export default function RdoForm({ navigation, route }: RdoFormProps) {
    const { userInfo } = useUser();
    const {
        cliente,
        servico,
        mode,
        relatorioData,
        source,
        openDraft
    } = route?.params || {};
    const isEditMode = mode === 'edit';

    // Estado principal do formulário
    const [formData, setFormData] = useState<FormDataInterface>({
        id: '',
        cliente: cliente || '',
        servico: servico || '',
        responsavel: userInfo?.user || '',
        material: '',
        numeroRdo: '',
        funcao: userInfo?.cargo || "",
        inicioOperacao: '',
        terminoOperacao: '',
        data: '',
        condicaoTempo: { manha: "", tarde: "", noite: "" },
        diaSemana: '',
        cargo: '',
        profissionais: [],
        equipamentos: [],
        atividades: [], // Inicializar com uma atividade vazia
        ocorrencias: [], // Inicializar com array vazio
        createdAt: null,
        createdBy: '',
        comentarioGeral: '',
        updatedBy: '',
        updatedAt: null,
        photos: [],
    });

    // Estados adicionais necessários
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [horaInicio, setHoraInicio] = useState(new Date());
    const [horaTermino, setHoraTermino] = useState(new Date());
    const [formErrors, setFormErrors] = useState<string[]>([]);
    const [numeroRdo, setNumeroRdo] = useState('');
    const [relatorioId, setRelatorioId] = useState<string | null>(null);
    const [lastSavedState, setLastSavedState] = useState<string | null>(null);

    const [comentarioGeral, setComentarioGeral] = useState('');
    const [photos, setPhotos] = useState<Photo[]>([]);

    // Estados de visualização
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);

    const [isDataLoaded, setIsDataLoaded] = useState(false);

    const [draftModalVisible, setDraftModalVisible] = useState(false);
    const [draftToLoad, setDraftToLoad] = useState<any>(null);

    const [userInteracted, setUserInteracted] = useState<boolean>(false);

    // Flag para evitar carregar draft duplicado
    const draftLoadedRef = useRef(false);

    // Helper para atualizar formData
    const saveFormData = useCallback((updates: Partial<FormDataInterface>) => {
        setUserInteracted(true); // Marcar que houve interação
        setFormData(prevData => ({
            ...prevData,
            ...updates
        }));
    }, []);

    // 2. Certifique-se de que o checkForDraft carrega atividades e ocorrências corretamente
    const checkForDraft = useCallback(async () => {
        if (isEditMode || draftLoadedRef.current) return;

        try {
            // Verificar draft específico primeiro
            let draftJson = null;
            if (cliente && servico) {
                const key = `${DRAFT_KEY}_${cliente}_${servico}`;
                draftJson = await AsyncStorage.getItem(key);
            }

            // Se não encontrar, tenta o draft geral
            if (!draftJson) {
                draftJson = await AsyncStorage.getItem(DRAFT_KEY);
            }

            // Se encontrou algum draft
            if (draftJson) {
                const draft = JSON.parse(draftJson);

                // Em vez do Alert, configuramos o estado e mostramos a modal
                setDraftToLoad(draft);
                setDraftModalVisible(true);
            }
        } catch (error) {
            console.error("Erro ao verificar rascunhos:", error);
        }
    }, [isEditMode, cliente, servico]);


    // Validação em tempo real com debounce
    const debouncedValidate = useRef(
        debounce((currentFormData: FormDataInterface) => {
            const errors = validateForm(currentFormData);
            setFormErrors(errors);
        }, 500)
    ).current;

    // Salvar rascunho com debounce
    const saveDraftDebounced = useRef(
        debounce(async () => {
            // Não salvar em modo de edição ou se não houve interação do usuário
            if (isEditMode || !userInteracted) return;

            try {
                // Criar um objeto completo de draft com todos os dados
                const completeDraft = {
                    ...formData,
                    comentarioGeral,
                    photos: photos,
                    inicioOperacao: formatTime(horaInicio),
                    terminoOperacao: formatTime(horaTermino),
                    data: formatDate(selectedDate)
                };

                // Salvar o draft específico se tiver cliente e serviço
                if (cliente && servico) {
                    const key = `${DRAFT_KEY}_${cliente}_${servico}`;
                    await AsyncStorage.setItem(key, JSON.stringify({
                        data: completeDraft,
                        lastSaved: new Date().toISOString()
                    }));
                }

                // Sempre salvar um draft geral também
                await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
                    data: completeDraft,
                    lastSaved: new Date().toISOString()
                }));

                setLastSavedState(new Date().toISOString());
                console.log("Aparentemente salvo?")
            } catch (error) {
                console.error('Erro ao salvar rascunho:', error);
            }
        }, 1000)
    ).current;

    // Handlers de foto
    const handleAddPhoto = (newPhoto: Photo) => {
        setUserInteracted(true);
        setPhotos(prev => [...prev, newPhoto]);
    };

    const handleDeletePhoto = (photoId: string) => {
        setUserInteracted(true);
        setPhotos(prev => prev.filter(foto => foto.id !== photoId));
    };

    const handlePhotoPress = (photo: Photo) => {
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

    // Upload de imagens para o Firebase
    const uploadImagesToFirebase = async (photos: Photo[], relatorioId: string): Promise<Photo[]> => {
        try {
            const uploadedPhotos: Photo[] = [];
            let currentPhotoIndex = 0;

            for (const photo of photos) {
                currentPhotoIndex++;

                // Pular fotos que já são URLs do Firebase
                if (photo?.uri?.startsWith('https://firebasestorage.googleapis.com')) {
                    uploadedPhotos.push(photo);
                    continue;
                }

                // Fazer upload apenas de fotos locais
                if (photo?.uri?.startsWith('file://') || photo?.uri?.startsWith('content://')) {
                    const filename = photo.filename || photo.uri.substring(photo.uri.lastIndexOf('/') + 1);
                    const uniqueFilename = `${Date.now()}_${filename}`;
                    const storageRef = storage().ref(`relatoriosPhotos/${relatorioId}/fotos/${uniqueFilename}`);

                    const task = storageRef.putFile(photo.uri);

                    // Monitorar progresso
                    task.on('state_changed', snapshot => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log(`Upload da imagem ${currentPhotoIndex}/${photos.length}: ${progress.toFixed(0)}%`);
                    });

                    await task;
                    const downloadURL = await storageRef.getDownloadURL();

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
        if (formErrors.length > 0) {
            showGlobalToast('error', 'Erro', 'Corrija os erros antes de salvar', 3000);
            return;
        }

        try {
            const toastMessage = isEditMode ? 'Atualizando relatório...' : 'Salvando relatório...';
            showGlobalToast('info', 'Aguarde', toastMessage, 2000);

            // Definir ID para o documento
            const docId = isEditMode && relatorioId ? relatorioId : numeroRdo;

            // Apenas definir horaTermino como o horário atual se NÃO estiver no modo de edição
            let terminoOperacaoValue = formatTime(horaTermino);

            if (!isEditMode) {
                const horaTerminoAtual = new Date();
                setHoraTermino(horaTerminoAtual);
                terminoOperacaoValue = formatTime(horaTerminoAtual);
            }

            // Upload de imagens para o Firebase Storage
            let uploadedPhotos: Photo[] = [];
            if (photos.length > 0) {
                showGlobalToast('info', 'Aguarde', 'Enviando imagens...', 15000);
                uploadedPhotos = await uploadImagesToFirebase(photos, docId);
            }

            // Preparar dados do RDO com validação para undefined
            let rdo: any = {
                id: docId || '',
                cliente: formData.cliente || '',
                clienteNome: formData.clienteNome || '',
                servico: formData.servico || '',
                responsavel: formData.responsavel || '',
                material: formData.material || '',
                numeroRdo: formData.numeroRdo || '',
                funcao: formData.cargo || '',
                cargo: formData.cargo || '',
                inicioOperacao: formatTime(horaInicio),
                // Usar o valor apropriado para terminoOperacao
                terminoOperacao: terminoOperacaoValue,
                data: formData.data,
                condicaoTempo: {
                    manha: formData.condicaoTempo?.manha || '',
                    tarde: formData.condicaoTempo?.tarde || '',
                    noite: formData.condicaoTempo?.noite || ''
                },
                profissionais: Array.isArray(formData.profissionais)
                    ? formData.profissionais.map(p => ({
                        tipo: p.tipo || '',
                        quantidade: p.quantidade || '1',
                        id: p.id || `prof_${Date.now()}`
                    }))
                    : [],
                equipamentos: Array.isArray(formData.equipamentos)
                    ? formData.equipamentos.map(e => ({
                        tipo: e.tipo || '',
                        quantidade: e.quantidade || '1',
                        id: e.id || `equip_${Date.now()}`
                    }))
                    : [],
                atividades: Array.isArray(formData.atividades)
                    ? formData.atividades.map(a => ({
                        descricao: a.descricao || '',
                        observacao: a.observacao || ''
                        // Removido o id daqui, pois pode estar causando problemas
                    }))
                    : [],
                ocorrencias: Array.isArray(formData.ocorrencias)
                    ? formData.ocorrencias
                        .filter(o => o.tipo && o.descricao)
                        .map(o => ({
                            tipo: o.tipo || '',
                            descricao: o.descricao || ''
                            // Removido o id daqui, pois pode estar causando problemas
                        }))
                    : [],
                comentarioGeral: formData.comentarioGeral || '',
                diaSemana: formData.diaSemana || '',
                photos: uploadedPhotos.map(p => ({
                    uri: p.uri || '',
                    id: p.id || `photo_${Date.now()}`,
                    filename: p.filename || ''
                }))
            };

            // Manter dados originais de criação em modo de edição
            if (isEditMode && relatorioData) {
                // Usar somente valores que sabemos que existem no documento original
                if (relatorioData.createdAt) {
                    rdo.createdAt = relatorioData.createdAt;
                } else {
                    rdo.createdAt = firestore.Timestamp.now();
                }

                if (relatorioData.createdBy) {
                    rdo.createdBy = relatorioData.createdBy;
                } else {
                    rdo.createdBy = userInfo?.user || '';
                }

                // Sempre definir updatedAt e updatedBy para valores conhecidos
                rdo.updatedAt = firestore.Timestamp.now();
                rdo.updatedBy = userInfo?.id || '';
            } else {
                // Para novos documentos
                rdo.createdAt = firestore.Timestamp.now();
                rdo.createdBy = userInfo?.id || '';
                rdo.updatedAt = null;
                rdo.updatedBy = '';
            }

            // Log antes de salvar
            console.log("Preparando para salvar. isEditMode:", isEditMode, "relatorioId:", relatorioId);

            // Como teste, remover manualmente qualquer propriedade undefined ou null
            // Esta abordagem rigorosa vai garantir que nenhum valor undefined chegue ao Firestore
            const cleanObject = (obj: any) => {
                Object.keys(obj).forEach(key => {
                    if (obj[key] === undefined) {
                        console.log(`Removendo propriedade undefined: ${key}`);
                        delete obj[key];
                    } else if (obj[key] === null && key !== 'updatedAt') {
                        // Permitimos null apenas para updatedAt
                        console.log(`Convertendo null para string vazia: ${key}`);
                        obj[key] = '';
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        cleanObject(obj[key]);
                    }
                });
                return obj;
            };

            // Limpar o objeto para garantir que não haja undefined
            rdo = cleanObject(rdo);

            // Salvar no Firestore
            if (isEditMode && relatorioId) {
                console.log("Atualizando documento existente");
                await firestore()
                    .collection('relatoriosRDO')
                    .doc(relatorioId)
                    .update(rdo);

                showGlobalToast('success', 'Sucesso', 'Relatório atualizado com sucesso', 4000);
            } else {
                console.log("Criando novo documento");
                await firestore()
                    .collection('relatoriosRDO')
                    .doc(numeroRdo)
                    .set(rdo);

                showGlobalToast('success', 'Sucesso', 'Relatório registrado com sucesso', 4000);
            }

            // Limpar rascunhos após salvar com sucesso
            if (cliente && servico) {
                await clearRdoDraftWithId(cliente, servico);
            }
            await clearDrafts();

            if (navigation) {

                if (route?.params?.onGoBack) {
                    route.params.onGoBack();
                }
                navigation.goBack();
            }
        } catch (error: any) {
            console.error('Erro ao salvar relatório:', error);
            console.error('Detalhes do erro:', JSON.stringify(error));

            showGlobalToast(
                'error',
                'Erro',
                error.message || 'Não foi possível salvar o relatório',
                4000
            );
        }
    };

    // Effect para gerar número do RDO
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

                    const numeroFormatado = proximoNumero.toString().padStart(3, '0');
                    setNumeroRdo(numeroFormatado);
                    setFormData((prev: FormDataInterface) => ({ ...prev, numeroRdo: numeroFormatado }));
                } catch (error) {
                    console.error('Erro ao gerar número do RDO:', error);
                    setNumeroRdo('001');
                    setFormData((prev: FormDataInterface) => ({ ...prev, numeroRdo: '001' }));
                }
            };

            gerarNumeroRdo();
        }
    }, [isEditMode]);

    // Effect para definir dia da semana quando a data mudar
    useEffect(() => {
        const diaSemanaIndex = selectedDate.getDay();
        const diaSemanaValue = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][diaSemanaIndex];
        saveFormData({
            diaSemana: diaSemanaValue,
            data: formatDate(selectedDate)
        });
    }, [selectedDate, saveFormData]);

    // Effect para preencher dados em modo de edição
    useEffect(() => {
        if (isEditMode && relatorioData) {
            // Marcar que os dados não estão carregados
            setIsDataLoaded(false);

            console.log("Iniciando carregamento do relatório para edição:", relatorioData.id);

            // 1. Definir ID do relatório e número do RDO
            setRelatorioId(relatorioData.id);
            setNumeroRdo(relatorioData.numeroRdo || '');

            // 2. Processar estados que estão fora do formData

            // Data
            if (relatorioData.data) {
                try {
                    const [dia, mes, ano] = relatorioData.data.split('/').map(Number);
                    if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano)) {
                        const data = new Date(ano, mes - 1, dia);
                        setSelectedDate(data);
                    }
                } catch (e) {
                    console.error("Erro ao processar data do relatório:", e);
                }
            }

            // Horários
            if (relatorioData.inicioOperacao) {
                try {
                    const [hora, minuto] = relatorioData.inicioOperacao.split(':').map(Number);
                    if (!isNaN(hora) && !isNaN(minuto)) {
                        const inicioTime = new Date();
                        inicioTime.setHours(hora, minuto, 0);
                        setHoraInicio(inicioTime);
                    }
                } catch (e) {
                    console.error("Erro ao processar hora de início:", e);
                }
            }

            if (relatorioData.terminoOperacao) {
                try {
                    const [hora, minuto] = relatorioData.terminoOperacao.split(':').map(Number);
                    if (!isNaN(hora) && !isNaN(minuto)) {
                        const terminoTime = new Date();
                        terminoTime.setHours(hora, minuto, 0);
                        setHoraTermino(terminoTime);
                    }
                } catch (e) {
                    console.error("Erro ao processar hora de término:", e);
                }
            }

            // Comentário e fotos
            setComentarioGeral(relatorioData.comentarioGeral || '');

            if (Array.isArray(relatorioData.photos) && relatorioData.photos.length > 0) {
                setPhotos(relatorioData.photos);
            }

            // 3. Usar setTimeout para aplicar o formData com um pequeno atraso
            setTimeout(() => {
                console.log("Aplicando dados do relatório ao formData com delay:", {
                    profissionais: relatorioData.profissionais?.length || 0,
                    equipamentos: relatorioData.equipamentos?.length || 0
                });

                // Aplicar relatorioData diretamente ao formData
                setFormData(relatorioData);

                // Marcar que os dados foram carregados após um curto período
                setTimeout(() => {
                    setIsDataLoaded(true);
                    console.log("Dados marcados como carregados!");
                }, 300);
            }, 500);
        } else if (!isEditMode) {
            // Se não estiver no modo de edição, marcar como carregado imediatamente
            setIsDataLoaded(true);
        }
    }, [isEditMode, relatorioData]);

    // Effect para configurar dados de usuário e parâmetros
    useEffect(() => {
        if (userInfo) {
            setFormData(prev => ({
                ...prev,
                responsavel: userInfo.user,
                cargo: userInfo.cargo
            }));
        }

        if (cliente) {
            setFormData(prev => ({
                ...prev,
                cliente
            }));
        }

        if (servico) {
            setFormData(prev => ({
                ...prev,
                servico
            }));
        }

        const generateUniqueId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

        if (!formData.profissionais || formData.profissionais.length === 0) {
            setFormData(prev => ({
                ...prev,
                profissionais: [{ tipo: '', quantidade: '1', id: generateUniqueId() }]
            }));
        }

        if (!formData.equipamentos || formData.equipamentos.length === 0) {
            setFormData(prev => ({
                ...prev,
                equipamentos: [{ tipo: '', quantidade: '1', id: generateUniqueId() }]
            }));
        }
    }, [userInfo, cliente, servico, formData.profissionais, formData.equipamentos]);

    // Effect para verificar rascunho ao montar
    useEffect(() => {
        if (!isEditMode && !draftLoadedRef.current) {
            checkForDraft();
        }
    }, [checkForDraft]);

    // Effect para validação do formulário
    useEffect(() => {
        debouncedValidate(formData);
        return () => {
            debouncedValidate.cancel();
        };
    }, [formData, debouncedValidate]);

    // Salvar Draft ao modificar algo
    useEffect(() => {
        // Não salvar em modo de edição, se não tiver cliente (formulário vazio) ou se não houve interação
        if (isEditMode || !formData.cliente || !userInteracted) return;

        // Salvar draft quando qualquer alteração importante acontecer
        saveDraftDebounced();

        // Criar um objeto completo que inclui as fotos do estado photos
        const formDataWithPhotos = {
            ...formData,
            photos: photos, // Incluir explicitamente as fotos do estado
            comentarioGeral: comentarioGeral,
        };

        // Passar o objeto completo para a função de salvamento
        saveRdoDraft(formDataWithPhotos);

        console.log("Salvando fotos no draft:", photos.length);

        return () => {
            saveDraftDebounced.cancel();
        };
    }, [
        isEditMode,
        formData,
        comentarioGeral,
        photos,
        selectedDate,
        horaInicio,
        horaTermino,
        userInteracted
    ]);

    const clearDrafts = async () => {
        try {
            if (cliente && servico) {
                await AsyncStorage.removeItem(`${DRAFT_KEY}_${cliente}_${servico}`);
            }
            await AsyncStorage.removeItem(DRAFT_KEY);
            setDraftModalVisible(false);
            NotificationService.cancelAllNotifications();
        } catch (error) {
            console.error("Erro ao limpar rascunhos:", error);
        }
    };

    // 4. Função para carregar os dados do rascunho
    const loadDraftData = () => {
        if (!draftToLoad) return;

        const draftData: FormDataInterface = draftToLoad.data;

        console.log("Data completa:", draftData)
        console.log("Photos dentro da data do draft:", draftData.photos)
        // 1. Atualizar o formData principal sem provocar nova interação
        setFormData(draftData);

        // 2. Atualizar os estados de suporte

        // Data
        if (draftData.data) {
            try {
                const [dia, mes, ano] = draftData.data.split('/').map(Number);
                if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano)) {
                    setSelectedDate(new Date(ano, mes - 1, dia));
                }
            } catch (e) {
                console.error("Erro ao converter data:", e);
            }
        }

        // Horários
        if (draftData.inicioOperacao) {
            try {
                const [hora, minuto] = draftData.inicioOperacao.split(':').map(Number);
                const time = new Date();
                time.setHours(hora, minuto, 0);
                setHoraInicio(time);
            } catch (e) {
                console.error("Erro ao converter hora início:", e);
            }
        }

        if (draftData.terminoOperacao) {
            try {
                const [hora, minuto] = draftData.terminoOperacao.split(':').map(Number);
                const time = new Date();
                time.setHours(hora, minuto, 0);
                setHoraTermino(time);
            } catch (e) {
                console.error("Erro ao converter hora término:", e);
            }
        }

        // Comentário e fotos
        setComentarioGeral(draftData.comentarioGeral || '');
        setPhotos(draftData.photos || []);

        // Manter o último horário salvo do draft carregado
        setLastSavedState(draftToLoad.lastSaved);

        draftLoadedRef.current = true;
        setDraftModalVisible(false);

        showGlobalToast(
            "success",
            "Rascunho carregado com sucesso",
            "",
            3000
        );

        // Importante: Não definimos userInteracted como true aqui, pois estamos apenas carregando dados, 
        // não é uma interação do usuário
    };

    // Effect para carregar rascunho da notificação
    useEffect(() => {
        const checkDraftFromNotification = async () => {
            if (source === 'draft_notification' && openDraft) {
                try {
                    const draft = await loadRdoDraft();
                    if (draft) {
                        loadDraftData();
                    }
                } catch (error) {
                    console.error('Erro ao carregar rascunho da notificação:', error);
                }
            }
        };
        checkDraftFromNotification();
    }, [source, openDraft]);

    // Preparação do título do header
    const headerTitle = isEditMode ? "Editar Relatório RDO" : "Relatório Diário de Operação";

    // Início do componente renderizado
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

            <DraftConfirmationModal
                visible={draftModalVisible}
                lastSavedDate={draftToLoad?.lastSaved || new Date().toISOString()}
                onCancel={clearDrafts}
                onConfirm={loadDraftData}
            />

            {lastSavedState && !isEditMode && (
                <View style={styles.draftIndicator}>
                    <MaterialCommunityIcons name="content-save-outline" size={16} color={customTheme.colors.onPrimary} />
                    <Text style={styles.draftText}>
                        Rascunho salvo: {new Date(lastSavedState).toLocaleTimeString()}
                    </Text>
                </View>
            )}

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
                        isEditing={mode}
                    />

                    {/* Weather Conditions */}
                    <WeatherConditions
                        formData={formData}
                        saveFormData={saveFormData}
                    />

                    {isEditMode && !isDataLoaded ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={customTheme.colors.primary} />
                            <Text style={{ marginTop: 10 }}>Carregando dados...</Text>
                        </View>
                    ) : (
                        <>
                            <Professionals
                                formData={formData}
                                saveFormData={saveFormData}
                            />
                            <Equipment
                                formData={formData}
                                saveFormData={saveFormData}
                            />
                        </>
                    )}

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
                            text={isEditMode ? "Salvar Alterações" : "Finalizar Relatório Diário"}
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
    draftIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 6,
        backgroundColor: customTheme.colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        justifyContent: 'center',
    },
    draftText: {
        fontSize: 12,
        marginLeft: 6,
        color: customTheme.colors.onPrimary,
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