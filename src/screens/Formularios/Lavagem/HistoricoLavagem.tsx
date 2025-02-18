import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
    Alert,
    Modal,
} from 'react-native';
import {
    Surface,
    Button,
    Text,
    Divider,
    IconButton,
    useTheme,
    Card,
    Chip,
    TextInput,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import { customTheme } from '../../../theme/theme';
import ModernHeader from '../../../assets/components/ModernHeader';
import FullScreenImage from '../../../assets/components/FullScreenImage';
import { Dropdown } from 'react-native-element-dropdown';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import { EQUIPAMENTOS, PLACAS_VEICULOS, TIPOS_LAVAGEM } from './Components/lavagemTypes';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DropdownRef } from '../../../helpers/Types';

interface Lavagem {
    id: string;
    responsavel: string;
    data: string;
    hora: string;
    veiculo: {
        placa: string;
        tipo: string;
        numeroEquipamento?: string;
    };
    tipoLavagem: string;
    produtos: Array<{
        nome: string;
        quantidade: number;
    }>;
    fotos: Array<{
        url: string;
        timestamp: number;
        path: string;
    }>;
    observacoes: string;
    status: string;
    createdAt: number;
}

interface HistoricoLavagemProps {
    navigation: any;
}

export default function HistoricoLavagem({ navigation }: HistoricoLavagemProps) {
    const [lavagens, setLavagens] = useState<Lavagem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; id: string } | null>(null);
    const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);

    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 20;

    const [todasLavagens, setTodasLavagens] = useState<Lavagem[]>([]);
    const [lavagensVisiveis, setLavagensVisiveis] = useState<Lavagem[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedLavagem, setSelectedLavagem] = useState<Lavagem | null>(null);

    // Função para normalizar os produtos
    const normalizarProdutos = (produtos: any[]) => {
        if (!Array.isArray(produtos)) return [];

        return produtos.map(prod => {
            // Se for formato antigo (tem 'produto' ao invés de 'nome')
            if ('produto' in prod) {
                return {
                    nome: prod.produto,
                    quantidade: parseInt(prod.quantidade) || 1 // Converte para número
                };
            }
            // Formato novo
            return {
                nome: prod.nome || 'Produto não especificado',
                quantidade: prod.quantidade || 1
            };
        });
    };

    // Função para normalizar os dados de lavagem
    const normalizarLavagem = (doc: any): Lavagem => {

        // Verifica se é o formato antigo (pela presença de placaVeiculo)
        const isFormatoAntigo = 'placaVeiculo' in doc;

        // Normaliza as fotos
        const fotos = isFormatoAntigo
            ? (doc.photoUrls || []).map((url: string, index: number) => ({
                url,
                path: `legacy_${index}`,
                timestamp: new Date(doc.createdAt).getTime()
            }))
            : (doc.fotos || []).map((foto: any, index: number) => ({
                url: foto.url || '',
                path: foto.path || `new_${index}`,
                timestamp: foto.timestamp || (doc.createdAt?.toDate?.()?.getTime() || Date.now())
            }));

        // Normaliza o veículo
        const veiculo = isFormatoAntigo
            ? {
                placa: doc.placaVeiculo,
                tipo: doc.placaVeiculo.includes('COMPACTADORA') || doc.placaVeiculo.includes('EQUIPAMENTO')
                    ? 'equipamento'
                    : 'veiculo',
                numeroEquipamento: doc.placaVeiculo.includes('COMPACTADORA') || doc.placaVeiculo.includes('EQUIPAMENTO')
                    ? doc.placaVeiculo.split('-')[1]
                    : null
            }
            : doc.veiculo || {
                placa: '',
                tipo: 'veiculo',
                numeroEquipamento: null
            };

        // Normaliza a data de criação
        let createdAtTime;
        if (isFormatoAntigo) {
            createdAtTime = new Date(doc.createdAt).getTime();
        } else {
            createdAtTime = doc.createdAt?.toDate?.()?.getTime() || Date.now();
        }

        // Normaliza os produtos
        const produtos = normalizarProdutos(doc.produtos || []);

        // Constrói o objeto normalizado
        const lavagem: Lavagem = {
            id: doc.id,
            responsavel: doc.responsavel || '',
            data: doc.data || '',
            hora: doc.hora || '',
            veiculo: veiculo,
            tipoLavagem: doc.tipoLavagem || '',
            produtos: produtos,
            fotos: fotos,
            observacoes: doc.observacoes || '',
            status: doc.status || 'concluido',
            createdAt: createdAtTime
        };

        return lavagem;
    };

    // Modifique a função buscarLavagens para usar apenas um campo de ordenação por enquanto
    const buscarLavagens = async () => {
        try {
            setLoading(true);

            // Buscar todos os registros sem limite
            let queryAntigos = firestore()
                .collection('registroLavagens')
                .orderBy('createdAt', 'desc');

            let queryNovos = firestore()
                .collection('lavagens')
                .orderBy('data', 'desc');

            const [snapshotNovos, snapshotAntigos] = await Promise.all([
                queryNovos.get(),
                queryAntigos.get()
            ]);

            console.log('===== DIAGNÓSTICO DE LAVAGENS =====');
            console.log(`Quantidade de documentos NOVOS (lavagens): ${snapshotNovos.size}`);
            console.log(`Quantidade de documentos ANTIGOS (registroLavagens): ${snapshotAntigos.size}`);

            // Processar os dados
            const dadosNovos = snapshotNovos.docs.map(doc => normalizarLavagem({
                id: doc.id,
                ...doc.data()
            }));

            const dadosAntigos = snapshotAntigos.docs.map(doc => normalizarLavagem({
                id: doc.id,
                ...doc.data()
            }));

            // Combinar e ordenar todos os dados
            const todosDados = [...dadosNovos, ...dadosAntigos].sort((a, b) => {
                if (a.createdAt && b.createdAt) {
                    return b.createdAt - a.createdAt;
                }

                const dataA = new Date(a.data.split('/').reverse().join('-') + ' ' + a.hora);
                const dataB = new Date(b.data.split('/').reverse().join('-') + ' ' + b.hora);
                return dataB.getTime() - dataA.getTime();
            });

            // Guardar todos os dados em um estado
            setTodasLavagens(todosDados);
            // Mostrar apenas os primeiros 20
            setLavagensVisiveis(todosDados.slice(0, LIMIT));
            // Atualizar se ainda há mais para mostrar
            setHasMore(todosDados.length > LIMIT);

        } catch (error) {
            console.error('Erro ao buscar lavagens:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleLoadMore = () => {
        const nextPage = currentPage + 1;
        const startIndex = 0;
        const endIndex = nextPage * LIMIT;

        setLavagensVisiveis(todasLavagens.slice(startIndex, endIndex));
        setCurrentPage(nextPage);
        setHasMore(endIndex < todasLavagens.length);
    };

    const handleEdit = (lavagem: Lavagem) => {
        setSelectedLavagem(lavagem);
        setEditModalVisible(true);
    };

    // Modifique a função de refresh para resetar os estados
    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setLastVisible(null);
        setHasMore(true);
        buscarLavagens();
    }, []);

    useEffect(() => {
        buscarLavagens();
    }, []);

    const handlePhotoPress = (url: string, id: string) => {
        setSelectedPhoto({ uri: url, id });
        setIsFullScreenVisible(true);
    };

    const getOptimizedImageUrl = (url: string, width: number = 100) => {
        // Verifica se é uma URL do Firebase Storage
        if (url.includes('firebasestorage.googleapis.com')) {
            // Adiciona parâmetros de redimensionamento
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}w=${width}&h=${width}&alt=media`;
        }
        return url;
    };

    const getTipoLavagemChipColor = (tipo: string) => {
        switch (tipo.toLowerCase()) {
            case 'completa':
                return { bg: customTheme.colors.primaryContainer, text: customTheme.colors.primary };
            case 'simples':
                return { bg: customTheme.colors.secondaryContainer, text: customTheme.colors.secondary };
            default:
                return { bg: customTheme.colors.surfaceVariant, text: customTheme.colors.onSurfaceVariant };
        }
    };

    const ThumbnailImage = ({ uri, style }: { uri: string; style?: any }) => {
        const [isLoading, setIsLoading] = useState(true);
        // Gera URL otimizada para thumbnail
        const thumbnailUrl = getOptimizedImageUrl(uri, 80); // 2x o tamanho para telas retina

        return (
            <View style={[style, styles.thumbnailContainer]}>
                <Image
                    source={{ uri: thumbnailUrl }}
                    style={[style, { position: 'absolute' }]}
                    onLoadStart={() => setIsLoading(true)}
                    onLoadEnd={() => setIsLoading(false)}
                />
                {isLoading && (
                    <View style={[style, styles.loadingContainer]}>
                        <ActivityIndicator
                            size="small"
                            color={customTheme.colors.primary}
                        />
                    </View>
                )}
            </View>
        );
    };

    const renderLavagemCard = (lavagem: Lavagem) => {
        if (!lavagem || !lavagem.veiculo) {
            return null;
        }

        const chipColor = getTipoLavagemChipColor(lavagem.tipoLavagem || 'default');

        // Helper function to check if the plate is valid
        const isValidPlate = (placa: string) => {
            return PLACAS_VEICULOS.some(item => item.value === placa);
        };

        // Helper function to get vehicle display info
        const getVehicleDisplayInfo = (veiculo: {
            placa: string;
            tipo: string;
            numeroEquipamento?: string;
        }) => {
            if (!veiculo) return null;

            const isEquipment = veiculo.tipo === 'equipamento';
            const isValidVehicle = isValidPlate(veiculo.placa);

            // Define icon and label based on conditions
            let icon = 'inventory'; // Ícone para outros tipos
            let label = 'Outros';

            if (isEquipment) {
                icon = 'build';
                label = 'Equipamento';
            } else if (isValidVehicle) {
                icon = 'directions-car';
                label = 'Veículo';
            }

            return {
                icon,
                label,
                displayText: isEquipment
                    ? `Equipamento${veiculo.numeroEquipamento ? ` #${veiculo.numeroEquipamento}` : ''}`
                    : (isValidVehicle ? 'Veículo' : 'Outros')
            };
        };

        const vehicleInfo = getVehicleDisplayInfo(lavagem.veiculo);

        return (
            <Card style={styles.card} key={lavagem.id}>
                {/* Barra colorida superior */}
                <View style={[styles.cardGradient, { backgroundColor: chipColor.bg }]} />

                <Card.Content style={styles.cardContent}>
                    {/* Linha 1: Placa, Tipo Lavagem, Data/Hora */}
                    <View style={styles.headerRow}>
                        <Text style={styles.placa} numberOfLines={1}>
                            {lavagem.veiculo?.placa || 'Não informado'}
                        </Text>

                        <View style={styles.headerRight}>
                            <Chip
                                style={[styles.tipoChip, { backgroundColor: chipColor.bg }]}
                                textStyle={{ color: chipColor.text }}
                            >
                                {(lavagem.tipoLavagem || 'Não definido').toUpperCase()}
                            </Chip>
                            <Text style={styles.dataHora}>
                                {`${lavagem.data} às ${lavagem.hora.split(':').slice(0, 2).join(':')}`}
                            </Text>
                        </View>
                    </View>

                    {vehicleInfo ?
                        <>
                            {/* Linha 2: Tipo de Veículo/Equipamento */}
                            < View style={styles.veiculoRow}>
                                <Icon
                                    name={vehicleInfo.icon}
                                    size={16}
                                    color={customTheme.colors.primary}
                                />
                                <Text style={styles.veiculoText} numberOfLines={1}>
                                    {vehicleInfo.displayText}
                                </Text>
                            </View>
                        </>
                        : null}

                    {/* Linha 3: Fotos em miniatura (se houver) */}
                    {Array.isArray(lavagem.fotos) && lavagem.fotos.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.fotosRow}
                        >
                            {lavagem.fotos.map((foto, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handlePhotoPress(foto.url, foto.path)}
                                >
                                    <ThumbnailImage
                                        uri={foto.url}
                                        style={styles.miniThumbnail}
                                    />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    {/* Linha 3: Observações (opcional) */}
                    {lavagem.observacoes && (
                        <View style={styles.observacoesRow}>
                            <Icon name="comment" size={16} color={customTheme.colors.primary} />
                            <Text numberOfLines={2} style={styles.observacoesText}>
                                {lavagem.observacoes}
                            </Text>
                        </View>
                    )}

                    {/* Linha 4: Responsável e Ações */}
                    <View style={styles.footerRow}>
                        <View style={styles.responsavelContainer}>
                            <Icon name="person" size={16} color={customTheme.colors.primary} />
                            <Text style={styles.responsavelText} numberOfLines={1}>
                                {lavagem.responsavel || 'Não informado'}
                            </Text>
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                onPress={() => handleEdit(lavagem)}
                                style={styles.actionButton}>
                                <Icon name="edit" size={20} color={customTheme.colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleDelete(lavagem.id)}
                                style={styles.actionButton}>
                                <Icon name="delete" size={20} color={customTheme.colors.error} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                </Card.Content>
            </Card >
        );
    };

    const handleDelete = async (id: string) => {
        try {
            // Mostra um alerta de confirmação
            Alert.alert(
                "Confirmar exclusão",
                "Tem certeza que deseja excluir este registro?",
                [
                    {
                        text: "Cancelar",
                        style: "cancel"
                    },
                    {
                        text: "Sim, excluir",
                        style: "destructive",
                        onPress: async () => {
                            // Tenta excluir dos dois locais possíveis (novo e antigo)
                            await firestore().collection('registroLavagens').doc(id).delete();
                            await firestore().collection('lavagens').doc(id).delete();

                            // Atualiza a lista local removendo o item
                            setLavagens(prevLavagens =>
                                prevLavagens.filter(lavagem => lavagem.id !== id)
                            );
                            onRefresh()
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Erro ao excluir lavagem:', error);
            Alert.alert("Erro", "Não foi possível excluir o registro.");
        }
    };

    const EditLavagemModal = ({ visible, lavagem, onDismiss, onSave }: any) => {
        const [loading, setLoading] = useState(false);
        const [formData, setFormData] = useState({
            responsavel: lavagem?.responsavel || '',
            placa: lavagem?.veiculo?.placa || '',
            tipoVeiculo: lavagem?.veiculo?.tipo || '',
            numeroEquipamento: lavagem?.veiculo?.numeroEquipamento || '',
            tipoLavagem: lavagem?.tipoLavagem || '',
            observacoes: lavagem?.observacoes || '',
            produtos: lavagem?.produtos || []
        });
        const [selectedDate, setSelectedDate] = useState(new Date());
        const [showDatePicker, setShowDatePicker] = useState(false);
        const [showTimePicker, setShowTimePicker] = useState(false);
        const [searchText, setSearchText] = useState('');

        const isValidPlate = (placa: string) => {
            return PLACAS_VEICULOS.some(item => item.value === placa);
        };

        // Refs para abrir os dropdowns
        const lavagemRef = useRef<DropdownRef>(null);
        const veiculoRef = useRef<DropdownRef>(null);

        const [customItems, setCustomItems] = useState<Array<{
            label: string;
            value: string;
            icon: string;
            tipo: string;
            isCustom: boolean;
        }>>([]);

        // Helper function to get vehicle display info
        const getVehicleDisplayInfo = (veiculo: {
            placa: string;
            tipo: string;
            numeroEquipamento?: string;
        }) => {
            if (!veiculo) return null;

            const isEquipment = veiculo.tipo === 'equipamento';
            const isValidVehicle = isValidPlate(veiculo.placa);

            // Define icon and label based on conditions
            let icon = 'help-outline'; // Default icon for unknown/other
            let label = 'Outros';

            if (isEquipment) {
                icon = 'build';
                label = 'Equipamento';
            } else if (isValidVehicle) {
                icon = 'directions-car';
                label = 'Veículo';
            }

            return {
                icon,
                label,
                displayValue: veiculo.placa + (veiculo.numeroEquipamento ? ` (#${veiculo.numeroEquipamento})` : '')
            };
        };

        // Configurar data inicial baseada na lavagem
        useEffect(() => {
            if (lavagem) {
                const [dia, mes, ano] = lavagem.data.split('/');
                const [hora, minuto] = lavagem.hora.split(':');
                const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
                data.setHours(parseInt(hora), parseInt(minuto));
                setSelectedDate(data);
                setFormData({
                    responsavel: lavagem.responsavel,
                    placa: lavagem.veiculo.placa,
                    tipoVeiculo: lavagem.veiculo.tipo,
                    numeroEquipamento: lavagem.veiculo.numeroEquipamento || '',
                    tipoLavagem: lavagem.tipoLavagem,
                    observacoes: lavagem.observacoes,
                    produtos: lavagem.produtos
                });
            }
        }, [lavagem]);

        const handleSaveEdit = async () => {
            try {
                setLoading(true);

                // Verifica se é um registro novo (tem createdBy) ou antigo (tem responsavel)
                const isFormatoNovo = 'createdBy' in lavagem;

                // Base comum de dados atualizados
                const dadosBase = {
                    data: formatDate(selectedDate),
                    hora: formatTime(selectedDate),
                    tipoLavagem: formData.tipoLavagem,
                    observacoes: formData.observacoes,
                    fotos: lavagem.fotos,
                    status: lavagem.status,
                };

                // Prepara dados específicos baseado no formato
                let dadosAtualizados;
                if (isFormatoNovo) {
                    dadosAtualizados = {
                        ...dadosBase,
                        createdBy: lavagem.createdBy,
                        createdAt: lavagem.createdAt,
                        agendamentoId: lavagem.agendamentoId || null,
                        veiculo: {
                            placa: formData.placa,
                            tipo: formData.tipoVeiculo,
                            numeroEquipamento: formData.tipoVeiculo === 'equipamento' ? formData.numeroEquipamento : null
                        }
                    };
                } else {
                    dadosAtualizados = {
                        ...dadosBase,
                        responsavel: lavagem.responsavel,
                        createdAt: lavagem.createdAt,
                        placaVeiculo: formData.placa, // Formato antigo usa placaVeiculo direto
                        produtos: formData.produtos || []
                    };
                }

                // Determina a coleção correta
                const colecao = isFormatoNovo ? 'lavagens' : 'registroLavagens';

                // Atualizar no Firestore
                await firestore()
                    .collection(colecao)
                    .doc(lavagem.id)
                    .update(dadosAtualizados);

                showGlobalToast('success', 'Sucesso', 'Lavagem atualizada com sucesso', 4000);
                onSave();
            } catch (error) {
                console.error('Erro ao atualizar lavagem:', error);
                showGlobalToast('error', 'Erro', 'Não foi possível atualizar a lavagem', 4000);
            } finally {
                setLoading(false);
            }
        };

        const formatDate = (date: Date) => {
            return date.toLocaleDateString('pt-BR');
        };

        const formatTime = (date: Date) => {
            return date.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        return (
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                onRequestClose={onDismiss}
                transparent
                animationType="slide"
            >
                <View style={styles.modalContainer}>
                    <Surface style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderContent}>
                                <Icon name="edit" size={24} color={customTheme.colors.primary} />
                                <Text variant="titleLarge">Editar Lavagem</Text>
                            </View>

                            <TouchableOpacity
                                onPress={onDismiss}
                                style={styles.actionButton}>
                                <Icon name="close" size={24} color={customTheme.colors.error} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formContainer}>

                            {/* Campos Informativos (Não editáveis) */}
                            {lavagem && (
                                <View style={styles.infoSection}>
                                    <View style={styles.infoField}>
                                        <Icon name="person" size={20} color={customTheme.colors.primary} />
                                        <View style={styles.infoContent}>
                                            <Text style={styles.infoLabel}>Responsável</Text>
                                            <Text style={styles.infoValue}>{lavagem.responsavel || 'Não informado'}</Text>
                                        </View>
                                    </View>

                                    {lavagem.veiculo && (() => {
                                        const vehicleInfo = getVehicleDisplayInfo(lavagem.veiculo);
                                        if (!vehicleInfo) return null;

                                        return (
                                            <View style={styles.infoField}>
                                                <Icon
                                                    name={vehicleInfo.icon}
                                                    size={20}
                                                    color={customTheme.colors.primary}
                                                />
                                                <View style={styles.infoContent}>
                                                    <Text style={styles.infoLabel}>
                                                        {vehicleInfo.label}
                                                    </Text>
                                                    <Text style={styles.infoValue}>
                                                        {vehicleInfo.displayValue}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })()}
                                </View>
                            )}

                            {/* Campos Editáveis */}
                            <View style={styles.editableSection}>
                                {/* Data e Hora */}
                                <View style={styles.row}>
                                    <TouchableOpacity
                                        style={[styles.input, { flex: 1 }]}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <TextInput
                                            mode="outlined"
                                            label="Data"
                                            value={formatDate(selectedDate)}
                                            editable={false}
                                            left={<TextInput.Icon icon={() => (
                                                <Icon name="calendar-today" size={24} color={customTheme.colors.primary} />
                                            )} />}
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.input, { flex: 1 }]}
                                        onPress={() => setShowTimePicker(true)}
                                    >
                                        <TextInput
                                            mode="outlined"
                                            label="Hora"
                                            value={formatTime(selectedDate)}
                                            editable={false}
                                            left={<TextInput.Icon icon={() => (
                                                <Icon name="access-time" size={24} color={customTheme.colors.primary} />
                                            )} />}
                                        />
                                    </TouchableOpacity>
                                </View>

                                {/* Tipo de Lavagem */}
                                <View style={styles.row}>
                                    <TouchableOpacity
                                        style={styles.dropdownContainer}
                                        activeOpacity={0.7}
                                        onPress={() => lavagemRef.current?.open()}
                                    >
                                        <Dropdown
                                            ref={lavagemRef}
                                            style={[
                                                styles.dropdown
                                            ]}
                                            placeholderStyle={[
                                                styles.placeholderStyle,
                                            ]}
                                            selectedTextStyle={[
                                                styles.selectedTextStyle,
                                            ]}
                                            itemTextStyle={[
                                                styles.dropdownItem,
                                                { color: customTheme.colors.onSurface }  // Garantindo que o texto dos itens seja visível
                                            ]}
                                            data={TIPOS_LAVAGEM}
                                            labelField="label"
                                            valueField="value"
                                            placeholder="Selecione o tipo de lavagem"
                                            value={formData.tipoLavagem}
                                            onChange={item => setFormData({ ...formData, tipoLavagem: item.value })}
                                            renderLeftIcon={() => (
                                                <Icon
                                                    style={styles.dropdownIcon}
                                                    name="local-car-wash"
                                                    size={20}
                                                    color={customTheme.colors.primary}
                                                />
                                            )}
                                        />
                                    </TouchableOpacity>
                                </View>

                                {/* Observações */}
                                <View style={styles.row}>
                                    <TextInput
                                        mode="outlined"
                                        label="Observações"
                                        value={formData.observacoes}
                                        onChangeText={(text) => setFormData({ ...formData, observacoes: text })}
                                        style={[styles.input, { height: 80 }]}
                                        multiline
                                        numberOfLines={4}
                                        left={<TextInput.Icon icon={() => (
                                            <Icon name="comment" size={24} color={customTheme.colors.primary} />
                                        )} />}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Botões de Ação */}
                        <View style={styles.modalFooter}>
                            <Button
                                mode="outlined"
                                onPress={onDismiss}
                                style={styles.footerButton}
                            >
                                Cancelar
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleSaveEdit}
                                loading={loading}
                                style={styles.footerButton}
                            >
                                Salvar
                            </Button>
                        </View>
                    </Surface>

                    {showDatePicker && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            onChange={(event, date) => {
                                setShowDatePicker(false);
                                if (date) setSelectedDate(date);
                            }}
                        />
                    )}

                    {showTimePicker && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="time"
                            onChange={(event, date) => {
                                setShowTimePicker(false);
                                if (date) setSelectedDate(date);
                            }}
                        />
                    )}
                </View>
            </Modal>
        );

    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ModernHeader
                title="Histórico de Lavagens"
                iconName="history"
                onBackPress={() => navigation.goBack()}
            />

            <FullScreenImage
                visible={isFullScreenVisible}
                photo={selectedPhoto}
                onClose={() => {
                    setIsFullScreenVisible(false);
                    setSelectedPhoto(null);
                }}
            />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customTheme.colors.primary} />
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[customTheme.colors.primary]}
                        />
                    }
                >
                    <View style={styles.container}>
                        {/* Lista de lavagens */}
                        {lavagensVisiveis.map(lavagem => renderLavagemCard(lavagem))}

                        {/* Botão Carregar Mais */}
                        {hasMore && (
                            <View style={styles.loadMoreWrapper}>
                                <TouchableOpacity
                                    style={styles.loadMoreButton}
                                    onPress={handleLoadMore}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? (
                                        <ActivityIndicator size="small" color={customTheme.colors.primary} />
                                    ) : (
                                        <>
                                            <Text style={styles.loadMoreText}>
                                                Carregar mais ({todasLavagens.length - lavagensVisiveis.length} restantes)
                                            </Text>
                                            <Icon
                                                name="expand-more"
                                                size={20}
                                                color={customTheme.colors.primary}
                                            />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView>
            )}

            <EditLavagemModal
                visible={editModalVisible}
                lavagem={selectedLavagem}
                onDismiss={() => {
                    setEditModalVisible(false);
                    setSelectedLavagem(null);
                }}
                onSave={() => {
                    setEditModalVisible(false);
                    setSelectedLavagem(null);
                    // Recarrega a lista de lavagens
                    buscarLavagens();
                }}
            />

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    dropdown: {
        height: 56,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
    },
    dropdownIcon: {
        marginRight: 12,
    }, dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 12,
        color: customTheme.colors.onSurface, // Garantindo que o texto seja sempre visível
    },

    dropdownItemCustom: {
        backgroundColor: customTheme.colors.primaryContainer + '20', // Mais sutil
    },
    dropdownLabel: {
        flex: 1,
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    dropdownLabelCustom: {
        color: customTheme.colors.primary,
        fontWeight: '500',
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
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        padding: 16,
    },
    modalContent: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 28,
        padding: 20,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    formContainer: {
        gap: 16,
    },
    infoSection: {
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    infoField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoContent: {
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
    editableSection: {
        gap: 12,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    input: {
        backgroundColor: customTheme.colors.surface,
        width: "100%",
    },
    dropdownContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        backgroundColor: customTheme.colors.surface,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outlineVariant,
    },
    footerButton: {
        flex: 1,
    },
    modalScroll: {
        maxHeight: '60%',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        marginBottom: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    rowContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    dateInput: {
        flex: 1,
    },
    textArea: {
        minHeight: 100,
    },
    thumbnailContainer: {
        backgroundColor: customTheme.colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    miniThumbnail: {
        width: 40,
        height: 40,
        borderRadius: 4,
        marginRight: 4,
    },
    loadMoreWrapper: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    loadMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        backgroundColor: customTheme.colors.primaryContainer,
        borderRadius: 8,
        gap: 8,
    },
    loadMoreText: {
        color: customTheme.colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    containerWithFooter: {
        flex: 1,
    },
    loadMoreContainer: {
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outline,
    },
    card: {
        marginBottom: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    cardGradient: {
        height: 4,
        width: '100%',
    },
    cardContent: {
        padding: 12,
        gap: 8, // Espaçamento uniforme entre as linhas
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    placa: {
        fontSize: 16,
        fontWeight: 'bold',
        color: customTheme.colors.onSurface,
        flex: 1,
        marginRight: 12,
    },
    tipoChip: {
        paddingHorizontal: 8,
    },
    dataHora: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    veiculoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    veiculoText: {
        fontSize: 13,
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    observacoesRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,
    },
    observacoesText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        flex: 1,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    responsavelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    responsavelText: {
        fontSize: 13,
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 4,
    },
    infoText: {
        fontSize: 13,
        color: customTheme.colors.onSurface,
        flex: 1, // Garante que o texto não ultrapasse o espaço disponível
    },
    mainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    placaContainer: {
        flex: 1,
        marginRight: 12,
    },
    rightContainer: {
        alignItems: 'flex-end',
        gap: 4,
    },
    dataContainer: {
        alignItems: 'flex-end',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    produtosRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    produtosScroll: {
        flex: 1,
    },
    produtoText: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    fotosRow: {
        marginTop: 4,
        marginBottom: 8,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    container: {
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    divider: {
        marginVertical: 12,
    },
    produtosContainer: {
        marginTop: 16,
    },
    produtoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    fotosContainer: {
        marginTop: 16,
    },
    thumbnail: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 8,
    },
    observacoesContainer: {
        marginTop: 16,
    },
});
