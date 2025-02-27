import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { Surface, Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { debounce } from 'lodash';
import storage from '@react-native-firebase/storage';

type ValidateParams = [
    FormDataInterface,
    string,
    string,
    string,
    string,
    Profissional[],
    Equipamento[],
    Atividade[]
];

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
import { formatDate, formatTime, validateForm } from './Utils/formUtils';

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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SaveButton from '../../../../assets/components/SaveButton';
import PhotoGalleryEnhanced from '../../Lavagem/Components/PhotoGallery';
import FullScreenImage from '../../../../assets/components/FullScreenImage';

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
    route?: RdoFormRouteProp; // { cliente, servico, mode, relatorioData }
}


export default function RdoForm({ navigation, route }: RdoFormProps) {
    const { userInfo } = useUser();
    const { cliente, servico, mode, relatorioData } = route?.params || {};
    const isEditMode = mode === 'edit';

    // Form state
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [horaInicio, setHoraInicio] = useState(new Date());
    const [horaTermino, setHoraTermino] = useState(new Date());
    const [formErrors, setFormErrors] = useState<string[]>([]);
    const [numeroRdo, setNumeroRdo] = useState('');
    const [isClienteDisabled, setIsClienteDisabled] = useState(!!cliente);
    const [isServicoDisabled, setIsServicoDisabled] = useState(!!servico);

    const [relatorioId, setRelatorioId] = useState<string | null>(null);

    // Main form data
    const [formData, setFormData] = useState<FormDataInterface>({
        id: '', // Add an empty string for id
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
        profissionais: [], // Add empty arrays for these
        equipamentos: [],
        atividades: [],
        ocorrencias: [],
        createdAt: null, // Add null for createdAt
        createdBy: '', // Add empty string for createdBy
        comentarioGeral: '', // Optional field
        updatedBy: '', // Add empty string for updatedBy
        updatedAt: null, // Add null for updatedAt
        photos: [],
    });

    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);

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

    // Selected items
    const [clienteSelecionado, setClienteSelecionado] = useState(cliente || '');
    const [servicoSelecionado, setServicoSelecionado] = useState(servico || '');
    const [materialSelecionado, setMaterialSelecionado] = useState('');
    const [tempoManha, setTempoManha] = useState('');
    const [tempoTarde, setTempoTarde] = useState('');
    const [tempoNoite, setTempoNoite] = useState('');
    const [diaSemanaSelecionado, setDiaSemanaSelecionado] = useState('');

    // Collections
    const [profissionaisSelecionados, setProfissionaisSelecionados] = useState<Profissional[]>([
        { tipo: '', quantidade: '1', id: 'initial' } // ID inicial para garantir renderização
    ]);
    const [equipamentosSelecionados, setEquipamentosSelecionados] = useState<Equipamento[]>([
        { tipo: '', quantidade: '1', id: 'initial' } // ID inicial para garantir renderização
    ]); const [atividadesRealizadas, setAtividadesRealizadas] = useState<Atividade[]>([
        { descricao: '', observacao: '' }
    ]);
    const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
    const [comentarioGeral, setComentarioGeral] = useState('');
    const [photos, setPhotos] = useState<Photo[]>([]);

    // Preencher automaticamente os dados caso em modo edição
    useEffect(() => {
        if (isEditMode && relatorioData) {
            // Guardar o ID do relatório para uso na atualização
            setRelatorioId(relatorioData.id);
            setNumeroRdo(relatorioData.numeroRdo || '');

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
            setClienteSelecionado(relatorioData.cliente || '');
            setServicoSelecionado(relatorioData.servico || '');
            setMaterialSelecionado(relatorioData.material || '');
            setDiaSemanaSelecionado(relatorioData.diaSemana || '');

            // Preencher condições do tempo
            if (relatorioData.condicaoTempo) {
                setTempoManha(relatorioData.condicaoTempo.manha || '');
                setTempoTarde(relatorioData.condicaoTempo.tarde || '');
                setTempoNoite(relatorioData.condicaoTempo.noite || '');
            }

            // Preencher arrays de dados
            if (Array.isArray(relatorioData.profissionais) && relatorioData.profissionais.length > 0) {
                const profissionaisComId = relatorioData.profissionais.map(prof => ({
                    ...prof,
                    id: prof.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
                }));
                console.log('Profissionais com ID:', profissionaisComId);
                setProfissionaisSelecionados(profissionaisComId);
            }

            if (Array.isArray(relatorioData.equipamentos) && relatorioData.equipamentos.length > 0) {
                // Garantir que cada equipamento tenha um ID
                const equipamentosComId = relatorioData.equipamentos.map(equip => ({
                    ...equip,
                    id: equip.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
                }));
                setEquipamentosSelecionados(equipamentosComId);
            }

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
                cargo: relatorioData.funcao || userInfo?.cargo || '', // Note que funcao e cargo parecem ser o mesmo
                inicioOperacao: relatorioData.inicioOperacao || '',
                terminoOperacao: relatorioData.terminoOperacao || '',
                data: relatorioData.data || '',
                diaSemana: relatorioData.diaSemana || '',
                condicaoTempo: relatorioData.condicaoTempo || { manha: '', tarde: '', noite: '' },
                comentarioGeral: relatorioData.comentarioGeral || ''
            }));
        }
    }, [isEditMode, relatorioData, userInfo]);

    // Generate RDO number
    useEffect(() => {
        console.log(relatorioData)
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
                    setFormData(prev => ({ ...prev, numeroRdo: numeroFormatado }));
                } catch (error) {
                    console.error('Erro ao gerar número do RDO:', error);
                    setNumeroRdo('0001');
                    setFormData(prev => ({ ...prev, numeroRdo: '0001' }));
                }
            };

            gerarNumeroRdo();
        }
    }, []);

    // Set weekday when date changes
    useEffect(() => {
        const diaSemanaIndex = selectedDate.getDay();
        const diaSemanaValue = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][diaSemanaIndex];
        setDiaSemanaSelecionado(diaSemanaValue);
        setFormData(prev => ({ ...prev, diaSemana: diaSemanaValue }));
    }, [selectedDate]);

    // Set user and params
    useEffect(() => {
        if (userInfo) {
            setFormData(prev => ({
                ...prev,
                responsavel: userInfo.user,
                cargo: userInfo.cargo
            }));
        }

        if (cliente) {
            setClienteSelecionado(cliente);
            setFormData(prev => ({ ...prev, cliente }));
            setIsClienteDisabled(true);
        }

        if (servico) {
            setServicoSelecionado(servico);
            setFormData(prev => ({ ...prev, servico }));
            setIsServicoDisabled(true);
        }

        // Initialize default items
        if (profissionaisSelecionados.length === 0) {
            setProfissionaisSelecionados([{ tipo: '', quantidade: '1' }]);
        }

        if (equipamentosSelecionados.length === 0) {
            setEquipamentosSelecionados([{ tipo: '', quantidade: '1' }]);
        }
    }, [userInfo, cliente, servico]);

    // Validate form in realtime
    const debouncedValidate = useRef(
        debounce(
            (params: ValidateParams) => {
                const errors = validateForm(...params);
                setFormErrors(errors);
            },
            300
        )
    ).current;

    useEffect(() => {
        debouncedValidate([
            formData,
            materialSelecionado,
            tempoManha,
            tempoTarde,
            tempoNoite,
            profissionaisSelecionados,
            equipamentosSelecionados,
            atividadesRealizadas
        ]);
    }, [
        formData,
        materialSelecionado,
        tempoManha,
        tempoTarde,
        tempoNoite,
        profissionaisSelecionados,
        equipamentosSelecionados,
        atividadesRealizadas
    ]);

    // Form submission handler
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
                cliente: clienteSelecionado,
                clienteNome: formData.clienteNome,
                servico: servicoSelecionado,
                responsavel: formData.responsavel,
                material: materialSelecionado,
                numeroRdo: numeroRdo,
                funcao: formData.cargo,
                cargo: formData.cargo,
                inicioOperacao: formatTime(horaInicio),
                terminoOperacao: formatTime(horaTermino),
                data: formatDate(selectedDate),
                condicaoTempo: {
                    manha: tempoManha,
                    tarde: tempoTarde,
                    noite: tempoNoite
                },
                profissionais: profissionaisSelecionados.map(p => ({
                    tipo: p.tipo,
                    quantidade: (p.quantidade)
                })),
                equipamentos: equipamentosSelecionados.map(e => ({
                    tipo: e.tipo,
                    quantidade: (e.quantidade)
                })),
                atividades: atividadesRealizadas.map(a => ({
                    descricao: a.descricao,
                    observacao: a.observacao
                })),
                ocorrencias: ocorrencias.filter(o => o.tipo && o.descricao),
                comentarioGeral: comentarioGeral,
                diaSemana: diaSemanaSelecionado,
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

    const headerTitle = isEditMode ? "Editar Relatório RDO" : "Relatório Diário de Operação";

    return (
        <SafeAreaView style={styles.safeArea}>

            {/* Header */}
            <ModernHeader
                title={headerTitle}
                iconName="clipboard-text"
                onBackPress={() => {
                    if (navigation) {
                        navigation.goBack();
                    }
                }}
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
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        clienteSelecionado={clienteSelecionado}
                        setClienteSelecionado={setClienteSelecionado}
                        servicoSelecionado={servicoSelecionado}
                        setServicoSelecionado={setServicoSelecionado}
                        materialSelecionado={materialSelecionado}
                        setMaterialSelecionado={setMaterialSelecionado}
                        diaSemanaSelecionado={diaSemanaSelecionado}
                        setDiaSemanaSelecionado={setDiaSemanaSelecionado}
                        isClienteDisabled={isClienteDisabled}
                        isServicoDisabled={isServicoDisabled}
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
                        tempoManha={tempoManha}
                        setTempoManha={setTempoManha}
                        tempoTarde={tempoTarde}
                        setTempoTarde={setTempoTarde}
                        tempoNoite={tempoNoite}
                        setTempoNoite={setTempoNoite}
                        formData={formData}
                        setFormData={setFormData}
                    />

                    {/* Professionals */}
                    <Professionals
                        profissionaisSelecionados={profissionaisSelecionados}
                        setProfissionaisSelecionados={setProfissionaisSelecionados}
                    />

                    {/* Equipment */}
                    <Equipment
                        equipamentosSelecionados={equipamentosSelecionados}
                        setEquipamentosSelecionados={setEquipamentosSelecionados}
                    />

                    {/* Activities */}
                    <Activities
                        atividadesRealizadas={atividadesRealizadas}
                        setAtividadesRealizadas={setAtividadesRealizadas}
                    />

                    {/* Occurrences */}
                    <Occurrences
                        ocorrencias={ocorrencias}
                        setOcorrencias={setOcorrencias}
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