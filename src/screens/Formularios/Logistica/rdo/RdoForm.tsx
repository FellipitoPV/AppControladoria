import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { Surface, Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { debounce } from 'lodash';

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

type RdoFormRouteProp = RouteProp<RootStackParamList, 'RdoForm'>;

interface RdoFormProps {
    navigation: StackNavigationProp<RootStackParamList, 'RdoForm'>;
    route: RdoFormRouteProp;
}

export default function RdoForm({ navigation, route }: RdoFormProps) {
    const { userInfo } = useUser();
    const { cliente, servico } = route?.params || {};

    // Form state
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [horaInicio, setHoraInicio] = useState(new Date());
    const [horaTermino, setHoraTermino] = useState(new Date());
    const [formErrors, setFormErrors] = useState<string[]>([]);
    const [numeroRdo, setNumeroRdo] = useState('');
    const [isClienteDisabled, setIsClienteDisabled] = useState(!!cliente);
    const [isServicoDisabled, setIsServicoDisabled] = useState(!!servico);

    // Main form data
    const [formData, setFormData] = useState<FormDataInterface>({
        cliente: cliente || '',
        servico: servico || '',
        responsavel: userInfo?.user || '',
        material: '',
        numeroRdo: '',
        funcao: '',
        inicioOperacao: '',
        terminoOperacao: '',
        data: '',
        condicaoTempoManha: '',
        condicaoTempoTarde: '',
        condicaoTempoNoite: '',
        diaSemana: '',
        cargo: userInfo?.cargo
    });

    // Selected items
    const [clienteSelecionado, setClienteSelecionado] = useState(cliente || '');
    const [servicoSelecionado, setServicoSelecionado] = useState(servico || '');
    const [materialSelecionado, setMaterialSelecionado] = useState('');
    const [tempoManha, setTempoManha] = useState('');
    const [tempoTarde, setTempoTarde] = useState('');
    const [tempoNoite, setTempoNoite] = useState('');
    const [diaSemanaSelecionado, setDiaSemanaSelecionado] = useState('');

    // Collections
    const [profissionaisSelecionados, setProfissionaisSelecionados] = useState<Profissional[]>([]);
    const [equipamentosSelecionados, setEquipamentosSelecionados] = useState<Equipamento[]>([]);
    const [atividadesRealizadas, setAtividadesRealizadas] = useState<Atividade[]>([
        { descricao: '', observacao: '' }
    ]);
    const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
    const [comentarioGeral, setComentarioGeral] = useState('');
    const [photos, setPhotos] = useState<Photo[]>([]);

    // Generate RDO number
    useEffect(() => {
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
            setProfissionaisSelecionados([{ profissional: '', quantidade: '1' }]);
        }

        if (equipamentosSelecionados.length === 0) {
            setEquipamentosSelecionados([{ equipamento: '', quantidade: '1' }]);
        }
    }, [userInfo, cliente, servico]);

    // Validate form in realtime
    useEffect(() => {
        const errors = validateForm(
            formData,
            materialSelecionado,
            tempoManha,
            tempoTarde,
            tempoNoite,
            profissionaisSelecionados,
            equipamentosSelecionados,
            atividadesRealizadas
        );
        setFormErrors(errors);
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
            showGlobalToast('info', 'Aguarde', 'Salvando relatório...', 2000);

            // Prepare RDO data
            const rdo = {
                cliente: clienteSelecionado,
                servico: servicoSelecionado,
                responsavel: formData.responsavel,
                material: materialSelecionado,
                numeroRdo: numeroRdo,
                funcao: formData.cargo,
                inicioOperacao: formatTime(horaInicio),
                terminoOperacao: formatTime(horaTermino),
                data: formatDate(selectedDate),
                condicaoTempo: {
                    manha: tempoManha,
                    tarde: tempoTarde,
                    noite: tempoNoite
                },
                profissionais: profissionaisSelecionados.map(p => ({
                    tipo: p.profissional,
                    quantidade: parseInt(p.quantidade)
                })),
                equipamentos: equipamentosSelecionados.map(e => ({
                    tipo: e.equipamento,
                    quantidade: parseInt(e.quantidade)
                })),
                atividades: atividadesRealizadas.map(a => ({
                    descricao: a.descricao,
                    observacao: a.observacao
                })),
                ocorrencias: ocorrencias.filter(o => o.tipo && o.descricao),
                comentarioGeral: comentarioGeral,
                diaSemana: diaSemanaSelecionado,
                createdAt: firestore.Timestamp.now(),
                createdBy: userInfo?.id || null,
                // We would handle photos separately in a real implementation
                photos: photos.map(p => p.uri)
            };

            // Save to Firestore
            await firestore()
                .collection('relatoriosRDO')
                .doc(numeroRdo)
                .set(rdo);

            navigation.goBack();
            showGlobalToast('success', 'Sucesso', 'Relatório registrado com sucesso', 4000);
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

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <ModernHeader
                title="Relatório Diário de Operação"
                iconName="clipboard-text"
                onBackPress={() => navigation.goBack()}
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
                    <PhotoSection
                        photos={photos}
                        setPhotos={setPhotos}
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
                        <Button
                            mode="contained"
                            disabled={formErrors.length > 0}
                            onPress={handleSave}
                            style={styles.button}
                            contentStyle={styles.buttonContent}
                        >
                            Salvar Relatório
                        </Button>
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
    button: {
        borderRadius: 8,
        elevation: 0,
    },
    buttonContent: {
        height: 56,
        paddingHorizontal: 24,
    },
});