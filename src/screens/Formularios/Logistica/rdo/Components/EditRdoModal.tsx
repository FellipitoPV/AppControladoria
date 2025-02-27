import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    TouchableOpacity,
    Modal,
    Animated,
    Dimensions,
    StyleSheet,
    ScrollView
} from 'react-native';
import { Surface, Button, Text, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import { showGlobalToast } from '../../../../../helpers/GlobalApi';
import { customTheme } from '../../../../../theme/theme';
import {
    MATERIAIS,
    CONDICOES_TEMPO,
    DIAS_SEMANA,
    DropdownRef,
    FormDataInterface
} from '../Types/rdoTypes';

interface EditRdoModalProps {
    visible: boolean;
    relatorio: FormDataInterface;
    onDismiss: () => void;
    onSave: () => void;
}

const EditRdoModal: React.FC<EditRdoModalProps> = ({
    visible,
    relatorio,
    onDismiss,
    onSave
}) => {
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [horaInicio, setHoraInicio] = useState(new Date());
    const [horaTermino, setHoraTermino] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showInicioTimePicker, setShowInicioTimePicker] = useState(false);
    const [showTerminoTimePicker, setShowTerminoTimePicker] = useState(false);

    // Estado para profissionais, equipamentos, atividades e ocorrências
    const [profissionais, setProfissionais] = useState<Array<{ tipo: string, quantidade: string }>>([]);
    const [equipamentos, setEquipamentos] = useState<Array<{ tipo: string, quantidade: string }>>([]);
    const [atividades, setAtividades] = useState<Array<{ descricao: string, observacao: string }>>([]);
    const [ocorrencias, setOcorrencias] = useState<Array<{ tipo: string, descricao: string }>>([]);

    // Estado para novo item a ser adicionado
    const [novoProfissional, setNovoProfissional] = useState({ tipo: '', quantidade: '1' });
    const [novoEquipamento, setNovoEquipamento] = useState({ tipo: '', quantidade: '1' });
    const [novaAtividade, setNovaAtividade] = useState({ descricao: '', observacao: '' });
    const [novaOcorrencia, setNovaOcorrencia] = useState({ tipo: '', descricao: '' });

    // Estado para controlar visibilidade dos formulários de adição
    const [showAddProfissional, setShowAddProfissional] = useState(false);
    const [showAddEquipamento, setShowAddEquipamento] = useState(false);
    const [showAddAtividade, setShowAddAtividade] = useState(false);
    const [showAddOcorrencia, setShowAddOcorrencia] = useState(false);

    const [formData, setFormData] = useState({
        funcao: relatorio?.funcao || '',
        material: relatorio?.material || '',
        diaSemana: relatorio?.diaSemana || '',
        comentarioGeral: relatorio?.comentarioGeral || '',
        condicaoManha: relatorio?.condicaoTempo?.manha || '',
        condicaoTarde: relatorio?.condicaoTempo?.tarde || '',
        condicaoNoite: relatorio?.condicaoTempo?.noite || '',
        servico: relatorio?.servico || ''
    });

    // Animação de slide
    const screenHeight = Dimensions.get('screen').height;
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;

    // Configurar dados iniciais baseados no relatório
    useEffect(() => {
        if (relatorio) {
            // Configurar data
            if (relatorio.data) {
                const [dia, mes, ano] = relatorio.data.split('/').map(Number);
                const data = new Date(ano, mes - 1, dia);
                setSelectedDate(data);
            }

            // Configurar hora de início
            if (relatorio.inicioOperacao) {
                const [hora, minuto] = relatorio.inicioOperacao.split(':').map(Number);
                const inicioTime = new Date();
                inicioTime.setHours(hora, minuto, 0);
                setHoraInicio(inicioTime);
            }

            // Configurar hora de término
            if (relatorio.terminoOperacao) {
                const [hora, minuto] = relatorio.terminoOperacao.split(':').map(Number);
                const terminoTime = new Date();
                terminoTime.setHours(hora, minuto, 0);
                setHoraTermino(terminoTime);
            }

            // Configurar outros campos
            setFormData({
                funcao: relatorio.funcao || '',
                material: relatorio.material || '',
                diaSemana: relatorio.diaSemana || '',
                comentarioGeral: relatorio.comentarioGeral || '',
                condicaoManha: relatorio.condicaoTempo?.manha || '',
                condicaoTarde: relatorio.condicaoTempo?.tarde || '',
                condicaoNoite: relatorio.condicaoTempo?.noite || '',
                servico: relatorio.servico || ''
            });

            // Configurar arrays complexos
            if (Array.isArray(relatorio.profissionais)) {
                setProfissionais([...relatorio.profissionais]);
            }

            if (Array.isArray(relatorio.equipamentos)) {
                setEquipamentos([...relatorio.equipamentos]);
            }

            if (Array.isArray(relatorio.atividades)) {
                setAtividades([...relatorio.atividades]);
            }

            if (Array.isArray(relatorio.ocorrencias)) {
                setOcorrencias([...relatorio.ocorrencias]);
            }
        }
    }, [relatorio]);

    useEffect(() => {
        if (visible) {
            // Animar entrada
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            }).start();
        } else {
            // Animar saída
            Animated.timing(slideAnim, {
                toValue: screenHeight,
                duration: 300,
                useNativeDriver: true
            }).start();
        }
    }, [visible]);

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('pt-BR');
    };

    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Funções para adicionar itens
    const adicionarProfissional = () => {
        if (novoProfissional.tipo.trim() === '') return;

        setProfissionais([...profissionais, { ...novoProfissional }]);
        setNovoProfissional({ tipo: '', quantidade: '1' });
        setShowAddProfissional(false);
    };

    const adicionarEquipamento = () => {
        if (novoEquipamento.tipo.trim() === '') return;

        setEquipamentos([...equipamentos, { ...novoEquipamento }]);
        setNovoEquipamento({ tipo: '', quantidade: '1' });
        setShowAddEquipamento(false);
    };

    const adicionarAtividade = () => {
        if (novaAtividade.descricao.trim() === '') return;

        setAtividades([...atividades, { ...novaAtividade }]);
        setNovaAtividade({ descricao: '', observacao: '' });
        setShowAddAtividade(false);
    };

    const adicionarOcorrencia = () => {
        if (novaOcorrencia.tipo.trim() === '' || novaOcorrencia.descricao.trim() === '') return;

        setOcorrencias([...ocorrencias, { ...novaOcorrencia }]);
        setNovaOcorrencia({ tipo: '', descricao: '' });
        setShowAddOcorrencia(false);
    };

    // Funções para remover itens
    const removerProfissional = (index: number) => {
        const novosProfissionais = [...profissionais];
        novosProfissionais.splice(index, 1);
        setProfissionais(novosProfissionais);
    };

    const removerEquipamento = (index: number) => {
        const novosEquipamentos = [...equipamentos];
        novosEquipamentos.splice(index, 1);
        setEquipamentos(novosEquipamentos);
    };

    const removerAtividade = (index: number) => {
        const novasAtividades = [...atividades];
        novasAtividades.splice(index, 1);
        setAtividades(novasAtividades);
    };

    const removerOcorrencia = (index: number) => {
        const novasOcorrencias = [...ocorrencias];
        novasOcorrencias.splice(index, 1);
        setOcorrencias(novasOcorrencias);
    };

    const handleSaveEdit = async () => {
        try {
            setLoading(true);

            // Formatar data e horas
            const formattedDate = formatDate(selectedDate);
            const formattedInicioTime = formatTime(horaInicio);
            const formattedTerminoTime = formatTime(horaTermino);

            // Dados atualizados
            const dadosAtualizados = {
                data: formattedDate,
                inicioOperacao: formattedInicioTime,
                terminoOperacao: formattedTerminoTime,
                material: formData.material,
                servico: formData.servico,
                diaSemana: formData.diaSemana,
                funcao: formData.funcao,
                comentarioGeral: formData.comentarioGeral,
                condicaoTempo: {
                    manha: formData.condicaoManha,
                    tarde: formData.condicaoTarde,
                    noite: formData.condicaoNoite
                },
                profissionais: profissionais,
                equipamentos: equipamentos,
                atividades: atividades,
                ocorrencias: ocorrencias,
                // Manter campos não editáveis inalterados
                cliente: relatorio.cliente,
                clienteNome: relatorio.clienteNome,
                responsavel: relatorio.responsavel,
                numeroRdo: relatorio.numeroRdo,
                createdAt: relatorio.createdAt,
                createdBy: relatorio.createdBy
            };

            // Atualizar no Firestore
            await firestore()
                .collection('relatoriosRDO')
                .doc(relatorio.id)
                .update(dadosAtualizados);

            showGlobalToast('success', 'Sucesso', 'Relatório atualizado com sucesso', 4000);
            onSave();
        } catch (error) {
            console.error('Erro ao atualizar relatório:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível atualizar o relatório', 4000);
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        Animated.spring(slideAnim, {
            toValue: 1200,
            bounciness: 2,
            speed: 20,
            useNativeDriver: true
        }).start();

        setTimeout(() => {
            onDismiss();
        }, 50);
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setSelectedDate(selectedDate);
        }
    };

    const handleInicioTimeChange = (event: any, selectedTime?: Date) => {
        setShowInicioTimePicker(false);
        if (selectedTime) {
            setHoraInicio(selectedTime);
        }
    };

    const handleTerminoTimeChange = (event: any, selectedTime?: Date) => {
        setShowTerminoTimePicker(false);
        if (selectedTime) {
            setHoraTermino(selectedTime);
        }
    };

    // Componente CustomDropdown envolvendo Dropdown com TouchableOpacity
    const CustomDropdown = ({
        iconName,
        placeholder,
        value,
        data,
        onChange
    }: {
        iconName: string,
        placeholder: string,
        value: string,
        data: any[],
        onChange: (item: any) => void
    }) => {
        const dropRef = useRef<DropdownRef>(null);

        return (
            <TouchableOpacity
                style={styles.dropdownWrapper}
                activeOpacity={0.7}
                onPress={() => dropRef.current?.open()}
            >
                <Dropdown
                    ref={dropRef}
                    style={styles.dropdown}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelectedText}
                    itemTextStyle={{ color: customTheme.colors.onSurface }}
                    data={data}
                    labelField="label"
                    valueField="value"
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    renderLeftIcon={() => (
                        <MaterialCommunityIcons
                            name={iconName}
                            size={20}
                            color={customTheme.colors.primary}
                            style={styles.dropdownIcon}
                        />
                    )}
                />
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleDismiss}
        >
            <View style={styles.modalOverlay}>
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{
                                translateY: slideAnim
                            }]
                        }
                    ]}
                >
                    <Surface style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <View style={styles.modalHeaderContent}>
                                    <MaterialCommunityIcons
                                        name="pencil"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text variant="titleLarge">Editar Relatório</Text>
                                </View>

                                <TouchableOpacity
                                    onPress={handleDismiss}
                                    style={styles.closeButton}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons
                                        name="close"
                                        size={24}
                                        color={customTheme.colors.error}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Informações Não Editáveis */}
                            <View style={styles.infoContainer}>
                                {/* Número do RDO */}
                                <View style={styles.infoRow}>
                                    <MaterialCommunityIcons
                                        name="pound"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                    <View style={styles.infoTextContainer}>
                                        <Text style={styles.infoLabel}>Número do RDO</Text>
                                        <Text style={styles.infoValue}>
                                            {relatorio?.numeroRdo || 'Não informado'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Cliente */}
                                <View style={styles.infoRow}>
                                    <MaterialCommunityIcons
                                        name="domain"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                    <View style={styles.infoTextContainer}>
                                        <Text style={styles.infoLabel}>Cliente</Text>
                                        <Text style={styles.infoValue}>
                                            {relatorio?.clienteNome || relatorio?.cliente || 'Não informado'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Responsável */}
                                <View style={styles.infoRow}>
                                    <MaterialCommunityIcons
                                        name="account"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                    <View style={styles.infoTextContainer}>
                                        <Text style={styles.infoLabel}>Responsável</Text>
                                        <Text style={styles.infoValue}>
                                            {relatorio?.responsavel || 'Não informado'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Campos Editáveis */}
                            <View style={styles.editContainer}>
                                {/* Função */}
                                <View style={styles.sectionContainer}>
                                    <Text style={styles.sectionTitle}>Função</Text>
                                    <TextInput
                                        mode="outlined"
                                        label="Função"
                                        value={formData.funcao}
                                        onChangeText={(text) => setFormData({ ...formData, funcao: text })}
                                        style={styles.textInput}
                                        left={<TextInput.Icon icon="account-hard-hat" />}
                                    />
                                </View>

                                {/* Serviço */}
                                <View style={styles.sectionContainer}>
                                    <Text style={styles.sectionTitle}>Serviço</Text>
                                    <TextInput
                                        mode="outlined"
                                        label="Serviço"
                                        value={formData.servico}
                                        onChangeText={(text) => setFormData({ ...formData, servico: text })}
                                        style={styles.textInput}
                                        left={<TextInput.Icon icon="hammer-wrench" />}
                                    />
                                </View>

                                {/* Data */}
                                <TouchableOpacity
                                    style={styles.dateTimeButton}
                                    onPress={() => setShowDatePicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons
                                        name="calendar"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                    <View style={styles.dateTimeTextContainer}>
                                        <Text style={styles.dateTimeLabel}>Data</Text>
                                        <Text style={styles.dateTimeValue}>
                                            {formatDate(selectedDate)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Dia da Semana */}
                                <View style={styles.sectionContainer}>
                                    <Text style={styles.sectionTitle}>Dia da Semana</Text>
                                    <CustomDropdown
                                        iconName="calendar-week"
                                        placeholder="Selecione o dia da semana"
                                        value={formData.diaSemana}
                                        data={DIAS_SEMANA}
                                        onChange={item => setFormData({
                                            ...formData,
                                            diaSemana: item.value
                                        })}
                                    />
                                </View>

                                {/* Horários de Operação */}
                                <View style={styles.timeContainer}>
                                    <Text style={styles.sectionTitle}>Horários de Operação</Text>
                                    <View style={styles.dateTimeContainer}>
                                        <TouchableOpacity
                                            style={styles.dateTimeButton}
                                            onPress={() => setShowInicioTimePicker(true)}
                                            activeOpacity={0.7}
                                        >
                                            <MaterialCommunityIcons
                                                name="clock-start"
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                            <View style={styles.dateTimeTextContainer}>
                                                <Text style={styles.dateTimeLabel}>Início</Text>
                                                <Text style={styles.dateTimeValue}>
                                                    {formatTime(horaInicio)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.dateTimeButton}
                                            onPress={() => setShowTerminoTimePicker(true)}
                                            activeOpacity={0.7}
                                        >
                                            <MaterialCommunityIcons
                                                name="clock-end"
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                            <View style={styles.dateTimeTextContainer}>
                                                <Text style={styles.dateTimeLabel}>Término</Text>
                                                <Text style={styles.dateTimeValue}>
                                                    {formatTime(horaTermino)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Material */}
                                <View style={styles.sectionContainer}>
                                    <Text style={styles.sectionTitle}>Material</Text>
                                    <CustomDropdown
                                        iconName="package-variant"
                                        placeholder="Selecione o material"
                                        value={formData.material}
                                        data={MATERIAIS}
                                        onChange={item => setFormData({
                                            ...formData,
                                            material: item.value
                                        })}
                                    />
                                </View>

                                {/* Condições do Tempo */}
                                <View style={styles.sectionContainer}>
                                    <Text style={styles.sectionTitle}>Condições do Tempo</Text>

                                    {/* Manhã */}
                                    <CustomDropdown
                                        iconName="weather-sunset-up"
                                        placeholder="Tempo pela manhã"
                                        value={formData.condicaoManha}
                                        data={CONDICOES_TEMPO}
                                        onChange={item => setFormData({
                                            ...formData,
                                            condicaoManha: item.value
                                        })}
                                    />

                                    {/* Tarde */}
                                    <View style={styles.spaceVertical} />
                                    <CustomDropdown
                                        iconName="weather-sunny"
                                        placeholder="Tempo pela tarde"
                                        value={formData.condicaoTarde}
                                        data={CONDICOES_TEMPO}
                                        onChange={item => setFormData({
                                            ...formData,
                                            condicaoTarde: item.value
                                        })}
                                    />

                                    {/* Noite */}
                                    <View style={styles.spaceVertical} />
                                    <CustomDropdown
                                        iconName="weather-night"
                                        placeholder="Tempo pela noite"
                                        value={formData.condicaoNoite}
                                        data={CONDICOES_TEMPO}
                                        onChange={item => setFormData({
                                            ...formData,
                                            condicaoNoite: item.value
                                        })}
                                    />
                                </View>

                                {/* Profissionais */}
                                <View style={styles.sectionContainer}>
                                    <View style={styles.sectionHeaderWithAction}>
                                        <Text style={styles.sectionTitle}>Profissionais</Text>
                                        <TouchableOpacity
                                            onPress={() => setShowAddProfissional(!showAddProfissional)}
                                            style={styles.addButton}
                                        >
                                            <MaterialCommunityIcons
                                                name={showAddProfissional ? "minus-circle" : "plus-circle"}
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                        </TouchableOpacity>
                                    </View>

                                    {profissionais.map((prof, index) => (
                                        <View key={`prof-${index}`} style={styles.listItemWithAction}>
                                            <View style={styles.listItemContent}>
                                                <MaterialCommunityIcons
                                                    name="account-hard-hat"
                                                    size={20}
                                                    color={customTheme.colors.primary}
                                                    style={styles.listItemIcon}
                                                />
                                                <Text style={styles.listItemText}>
                                                    {prof.tipo} - {prof.quantidade} profissional{parseInt(prof.quantidade) > 1 ? 'is' : ''}
                                                </Text>
                                            </View>
                                            <TouchableOpacity onPress={() => removerProfissional(index)}>
                                                <MaterialCommunityIcons
                                                    name="delete-outline"
                                                    size={22}
                                                    color={customTheme.colors.error}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    ))}

                                    {showAddProfissional && (
                                        <View style={styles.addItemForm}>
                                            <TextInput
                                                mode="outlined"
                                                label="Tipo de Profissional"
                                                value={novoProfissional.tipo}
                                                onChangeText={(text) => setNovoProfissional({ ...novoProfissional, tipo: text })}
                                                style={[styles.textInput, { flex: 2 }]}
                                            />
                                            <TextInput
                                                mode="outlined"
                                                label="Qtd"
                                                value={novoProfissional.quantidade}
                                                onChangeText={(text) => setNovoProfissional({ ...novoProfissional, quantidade: text })}
                                                keyboardType="number-pad"
                                                style={[styles.textInput, { flex: 1 }]}
                                            />
                                            <TouchableOpacity onPress={adicionarProfissional} style={styles.confirmAddButton}>
                                                <MaterialCommunityIcons
                                                    name="check-circle"
                                                    size={30}
                                                    color={customTheme.colors.primary}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>

                                {/* Equipamentos */}
                                <View style={styles.sectionContainer}>
                                    <View style={styles.sectionHeaderWithAction}>
                                        <Text style={styles.sectionTitle}>Equipamentos</Text>
                                        <TouchableOpacity
                                            onPress={() => setShowAddEquipamento(!showAddEquipamento)}
                                            style={styles.addButton}
                                        >
                                            <MaterialCommunityIcons
                                                name={showAddEquipamento ? "minus-circle" : "plus-circle"}
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                        </TouchableOpacity>
                                    </View>

                                    {equipamentos.map((equip, index) => (
                                        <View key={`equip-${index}`} style={styles.listItemWithAction}>
                                            <View style={styles.listItemContent}>
                                                <MaterialCommunityIcons
                                                    name="wrench"
                                                    size={20}
                                                    color={customTheme.colors.primary}
                                                    style={styles.listItemIcon}
                                                />
                                                <Text style={styles.listItemText}>
                                                    {equip.tipo} - {equip.quantidade} unidade{parseInt(equip.quantidade) > 1 ? 's' : ''}
                                                </Text>
                                            </View>
                                            <TouchableOpacity onPress={() => removerEquipamento(index)}>
                                                <MaterialCommunityIcons
                                                    name="delete-outline"
                                                    size={22}
                                                    color={customTheme.colors.error}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    ))}

                                    {showAddEquipamento && (
                                        <View style={styles.addItemForm}>
                                            <TextInput
                                                mode="outlined"
                                                label="Tipo de Equipamento"
                                                value={novoEquipamento.tipo}
                                                onChangeText={(text) => setNovoEquipamento({ ...novoEquipamento, tipo: text })}
                                                style={[styles.textInput, { flex: 2 }]}
                                            />
                                            <TextInput
                                                mode="outlined"
                                                label="Qtd"
                                                value={novoEquipamento.quantidade}
                                                onChangeText={(text) => setNovoEquipamento({ ...novoEquipamento, quantidade: text })}
                                                keyboardType="number-pad"
                                                style={[styles.textInput, { flex: 1 }]}
                                            />
                                            <TouchableOpacity onPress={adicionarEquipamento} style={styles.confirmAddButton}>
                                                <MaterialCommunityIcons
                                                    name="check-circle"
                                                    size={30}
                                                    color={customTheme.colors.primary}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>

                                {/* Atividades */}
                                <View style={styles.sectionContainer}>
                                    <View style={styles.sectionHeaderWithAction}>
                                        <Text style={styles.sectionTitle}>Atividades</Text>
                                        <TouchableOpacity
                                            onPress={() => setShowAddAtividade(!showAddAtividade)}
                                            style={styles.addButton}
                                        >
                                            <MaterialCommunityIcons
                                                name={showAddAtividade ? "minus-circle" : "plus-circle"}
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                        </TouchableOpacity>
                                    </View>

                                    {atividades.map((ativ, index) => (
                                        <View key={`ativ-${index}`} style={styles.detailCardWithAction}>
                                            <View style={styles.detailCardContent}>
                                                <Text style={styles.detailTitle}>{ativ.descricao}</Text>
                                                {ativ.observacao && (
                                                    <View style={styles.observationContainer}>
                                                        <MaterialCommunityIcons
                                                            name="information-outline"
                                                            size={16}
                                                            color={customTheme.colors.primary}
                                                        />
                                                        <Text style={styles.observationText}>{ativ.observacao}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <TouchableOpacity onPress={() => removerAtividade(index)}>
                                                <MaterialCommunityIcons
                                                    name="delete-outline"
                                                    size={22}
                                                    color={customTheme.colors.error}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    ))}

                                    {showAddAtividade && (
                                        <View style={styles.addAtividadeForm}>
                                            <TextInput
                                                mode="outlined"
                                                label="Descrição da Atividade"
                                                value={novaAtividade.descricao}
                                                onChangeText={(text) => setNovaAtividade({ ...novaAtividade, descricao: text })}
                                                style={styles.textInput}
                                            />
                                            <TextInput
                                                mode="outlined"
                                                label="Observação (opcional)"
                                                value={novaAtividade.observacao}
                                                onChangeText={(text) => setNovaAtividade({ ...novaAtividade, observacao: text })}
                                                multiline
                                                numberOfLines={2}
                                                style={[styles.textInput, { marginTop: 8 }]}
                                            />
                                            <View style={styles.addFormButtons}>
                                                <TouchableOpacity onPress={() => setShowAddAtividade(false)} style={styles.cancelAddButton}>
                                                    <MaterialCommunityIcons
                                                        name="close-circle"
                                                        size={24}
                                                        color={customTheme.colors.error}
                                                    />
                                                    <Text style={{ color: customTheme.colors.error }}>Cancelar</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={adicionarAtividade} style={styles.confirmAddButton}>
                                                    <MaterialCommunityIcons
                                                        name="check-circle"
                                                        size={24}
                                                        color={customTheme.colors.primary}
                                                    />
                                                    <Text style={{ color: customTheme.colors.primary }}>Adicionar</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </View>

                                {/* Ocorrências */}
                                <View style={styles.sectionContainer}>
                                    <View style={styles.sectionHeaderWithAction}>
                                        <Text style={styles.sectionTitle}>Ocorrências</Text>
                                        <TouchableOpacity
                                            onPress={() => setShowAddOcorrencia(!showAddOcorrencia)}
                                            style={styles.addButton}
                                        >
                                            <MaterialCommunityIcons
                                                name={showAddOcorrencia ? "minus-circle" : "plus-circle"}
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                        </TouchableOpacity>
                                    </View>

                                    {ocorrencias.map((ocor, index) => (
                                        <View key={`ocor-${index}`} style={styles.detailCardWithAction}>
                                            <View style={styles.detailCardContent}>
                                                <View style={styles.ocorrenciaHeader}>
                                                    <MaterialCommunityIcons
                                                        name="alert"
                                                        size={18}
                                                        color={customTheme.colors.error}
                                                    />
                                                    <Text style={styles.ocorrenciaTipo}>{ocor.tipo}</Text>
                                                </View>
                                                <Text style={styles.ocorrenciaDescricao}>{ocor.descricao}</Text>
                                            </View>
                                            <TouchableOpacity onPress={() => removerOcorrencia(index)}>
                                                <MaterialCommunityIcons
                                                    name="delete-outline"
                                                    size={22}
                                                    color={customTheme.colors.error}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    ))}

                                    {showAddOcorrencia && (
                                        <View style={styles.addOcorrenciaForm}>
                                            <TextInput
                                                mode="outlined"
                                                label="Tipo de Ocorrência"
                                                value={novaOcorrencia.tipo}
                                                onChangeText={(text) => setNovaOcorrencia({ ...novaOcorrencia, tipo: text })}
                                                style={styles.textInput}
                                            />
                                            <TextInput
                                                mode="outlined"
                                                label="Descrição da Ocorrência"
                                                value={novaOcorrencia.descricao}
                                                onChangeText={(text) => setNovaOcorrencia({ ...novaOcorrencia, descricao: text })}
                                                multiline
                                                numberOfLines={2}
                                                style={[styles.textInput, { marginTop: 8 }]}
                                            />
                                            <View style={styles.addFormButtons}>
                                                <TouchableOpacity onPress={() => setShowAddOcorrencia(false)} style={styles.cancelAddButton}>
                                                    <MaterialCommunityIcons
                                                        name="close-circle"
                                                        size={24}
                                                        color={customTheme.colors.error}
                                                    />
                                                    <Text style={{ color: customTheme.colors.error }}>Cancelar</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={adicionarOcorrencia} style={styles.confirmAddButton}>
                                                    <MaterialCommunityIcons
                                                        name="check-circle"
                                                        size={24}
                                                        color={customTheme.colors.primary}
                                                    />
                                                    <Text style={{ color: customTheme.colors.primary }}>Adicionar</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </View>

                                {/* Comentários Gerais */}
                                <View style={styles.sectionContainer}>
                                    <Text style={styles.sectionTitle}>Comentários Gerais</Text>
                                    <TextInput
                                        mode="outlined"
                                        label="Comentários"
                                        value={formData.comentarioGeral}
                                        onChangeText={(text) => setFormData({ ...formData, comentarioGeral: text })}
                                        multiline
                                        numberOfLines={4}
                                        style={styles.observacoesInput}
                                        left={<TextInput.Icon icon="comment-text" />}
                                    />
                                </View>
                            </View>

                            {/* Botões de Ação */}
                            <View style={styles.actionButtonsContainer}>
                                <TouchableOpacity
                                    style={[styles.actionButtonOutlined, styles.actionButton]}
                                    onPress={handleDismiss}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.actionButtonOutlinedText}>Cancelar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionButtonContained, styles.actionButton]}
                                    onPress={handleSaveEdit}
                                    activeOpacity={0.7}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Text style={styles.actionButtonContainedText}>Salvando...</Text>
                                    ) : (
                                        <Text style={styles.actionButtonContainedText}>Salvar</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </Surface>
                </Animated.View>
            </View>

            {/* Date Picker */}
            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}

            {/* Time Pickers */}
            {showInicioTimePicker && (
                <DateTimePicker
                    value={horaInicio}
                    mode="time"
                    display="default"
                    onChange={handleInicioTimeChange}
                />
            )}

            {showTerminoTimePicker && (
                <DateTimePicker
                    value={horaTermino}
                    mode="time"
                    display="default"
                    onChange={handleTerminoTimeChange}
                />
            )}
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        width: '100%',
        maxHeight: '85%',
    },
    modalContent: {
        backgroundColor: customTheme.colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '100%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    closeButton: {
        padding: 8,
    },
    infoContainer: {
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    infoValue: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    editContainer: {
        gap: 16,
        marginBottom: 20,
    },
    sectionContainer: {
        marginTop: 8,
    },
    sectionHeaderWithAction: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    addButton: {
        padding: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: customTheme.colors.primary,
        marginBottom: 8,
    },
    dateTimeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    timeContainer: {
        marginTop: 8,
    },
    dateTimeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 10,
        padding: 10,
        gap: 12,
    },
    dateTimeTextContainer: {
        flex: 1,
    },
    dateTimeLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    dateTimeValue: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    dropdownWrapper: {
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 10,
    },
    dropdown: {
        height: 56,
        paddingHorizontal: 16,
    },
    dropdownPlaceholder: {
        color: customTheme.colors.onSurfaceVariant,
    },
    dropdownSelectedText: {
        color: customTheme.colors.onSurface,
    },
    dropdownIcon: {
        marginRight: 12,
    },
    textInput: {
        backgroundColor: customTheme.colors.surface,
    },
    observacoesInput: {
        height: 120,
        color: customTheme.colors.onSurface,
    },
    listItemWithAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    listItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    listItemIcon: {
        marginRight: 10,
    },
    listItemText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    detailCardWithAction: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    detailCardContent: {
        flex: 1,
    },
    detailTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    observationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    observationText: {
        fontSize: 13,
        color: customTheme.colors.onSurfaceVariant,
        marginLeft: 6,
        flex: 1,
    },
    ocorrenciaHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    ocorrenciaTipo: {
        fontSize: 14,
        fontWeight: '500',
        color: customTheme.colors.error,
        marginLeft: 6,
    },
    ocorrenciaDescricao: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    addItemForm: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        marginBottom: 8,
    },
    addAtividadeForm: {
        marginTop: 8,
        marginBottom: 8,
    },
    addOcorrenciaForm: {
        marginTop: 8,
        marginBottom: 8,
    },
    addFormButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    cancelAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 8,
    },
    confirmAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 8,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        marginTop: 16,
    },
    actionButton: {
        flex: 1,
        height: 48,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonOutlined: {
        borderWidth: 1,
        borderColor: customTheme.colors.primary,
        backgroundColor: 'transparent',
    },
    actionButtonContained: {
        backgroundColor: customTheme.colors.primary,
    },
    actionButtonOutlinedText: {
        color: customTheme.colors.primary,
        fontWeight: '500',
        fontSize: 16,
    },
    actionButtonContainedText: {
        color: customTheme.colors.onPrimary,
        fontWeight: '500',
        fontSize: 16,
    },
    spaceVertical: {
        height: 8,
    }
});

export default EditRdoModal;