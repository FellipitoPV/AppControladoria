import React, { useEffect, useRef, useState, useMemo, memo } from 'react';
import {
    View,
    TouchableOpacity,
    Modal,
    Animated,
    Dimensions,
    StyleSheet,
    FlatList,
    Image,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { Surface, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../../../theme/theme';
import { FormDataInterface, MATERIAIS, CONDICOES_TEMPO, DIAS_SEMANA, Photo } from '../Types/rdoTypes';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import FullScreenImage from '../../../../../assets/components/FullScreenImage';
import { hasAccess } from '../../../../Adm/types/admTypes';
import { useUser } from '../../../../../contexts/userContext';
import { showGlobalToast, verificarConectividadeAPI } from '../../../../../helpers/GlobalApi';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { ref as storageRef, getDownloadURL, uploadBytes } from 'firebase/storage';
import { collection, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, dbStorage } from '../../../../../../firebase';

interface DetalheRdoModalProps {
    visible: boolean;
    onClose: () => void;
    refresh: () => void;
    relatorio: FormDataInterface;
}

const DetalheRdoModal: React.FC<DetalheRdoModalProps> = ({
    visible,
    onClose,
    relatorio,
    refresh,
}) => {
    const { userInfo } = useUser();
    const navigation = useNavigation<NavigationProp<ParamListBase>>();

    const [loadingPhotos, setLoadingPhotos] = useState<{ [key: string]: boolean }>({});
    const [isEditLoading, setIsEditLoading] = useState(false);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
    const [isPdfAtualizado, setIsPdfAtualizado] = useState<boolean>(false);

    const canEdit = useMemo(() => userInfo && hasAccess(userInfo, 'operacao', 2), [userInfo]);

    // Animação simplificada
    const screenHeight = Dimensions.get('screen').height;
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: screenHeight,
                duration: 200,
                useNativeDriver: true
            }).start();
        }
    }, [visible, screenHeight]);

    const getPrimeiroNome = useMemo(() => (nomeCompleto: string): string => {
        if (!nomeCompleto) return "Cliente";
        const nomes = nomeCompleto.trim().split(' ');
        return nomes[0];
    }, []);

    const getTempoLabel = useMemo(() => (tempo: string) => {
        if (!tempo) return 'Não informado';
        const tempoItem = CONDICOES_TEMPO.find(item => item.value === tempo);
        return tempoItem ? tempoItem.label : tempo;
    }, []);

    const getMaterialLabel = useMemo(() => () => {
        if (!relatorio.material) return 'Não informado';
        const materialItem = MATERIAIS.find(item => item.value === relatorio.material);
        return materialItem ? materialItem.label : relatorio.material;
    }, [relatorio.material]);

    const getDiaSemanaLabel = useMemo(() => () => {
        if (!relatorio.diaSemana) return 'Não informado';
        const diaItem = DIAS_SEMANA.find(item => item.value === relatorio.diaSemana);
        return diaItem ? diaItem.label : relatorio.diaSemana;
    }, [relatorio.diaSemana]);

    const handleDismiss = () => {
        Animated.timing(slideAnim, {
            toValue: screenHeight,
            duration: 200,
            useNativeDriver: true
        }).start(() => onClose());
    };

    const handleGeneratePdf = async () => {
        try {
            setIsPdfLoading(true);

            if (relatorio?.pdfUrl && isPdfAtualizado) {
                const clienteNome = getPrimeiroNome(relatorio?.clienteNome || "");
                const numeroRdo = relatorio.numeroRdo;
                const fileName = `${clienteNome}-${numeroRdo}.pdf`;
                const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

                await RNFS.downloadFile({
                    fromUrl: relatorio.pdfUrl,
                    toFile: filePath
                }).promise;

                await Share.open({
                    url: `file://${filePath}`,
                    type: 'application/pdf',
                    filename: fileName
                });

                await RNFS.unlink(filePath);
                setIsPdfLoading(false);
                onClose();
                return;
            }

            const conectado = await verificarConectividadeAPI();
            if (!conectado) {
                showGlobalToast(
                    'error',
                    'Sem conexão com o servidor.',
                    'O Servidor para gerar documentos se encontra fora do alcance...',
                    10000
                );
                return;
            }

            showGlobalToast(
                'info',
                'Gerando PDF',
                'O servidor está processando seu relatório...',
                15000
            );

            const apiUrl = 'http://192.168.1.222:3000/gerar-relatorio-rdo';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(relatorio)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro na resposta do servidor: ${errorText}`);
            }

            const data = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(data);

            reader.onload = async () => {
                try {
                    const base64Data = reader.result?.toString().split(',')[1];
                    if (!base64Data) throw new Error('Erro ao processar arquivo PDF');

                    const clienteNome = getPrimeiroNome(relatorio?.clienteNome || "");
                    const numeroRdo = relatorio.numeroRdo;
                    const fileName = `${clienteNome}-${numeroRdo}.pdf`;
                    const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

                    await RNFS.writeFile(filePath, base64Data, 'base64');

 
                    const reference = storageRef(dbStorage(), `RelatoriosRDO/${numeroRdo}.pdf`);
                    // Função para upload de arquivo local para o Firebase Storage
                    const uploadFile = async (reference: any, filePath: string) => {
                        const fileData = await RNFS.readFile(filePath, 'base64');
                        const blob = Buffer.from(fileData, 'base64');
                        await uploadBytes(reference, blob);
                    };
                    await uploadFile(reference, filePath);
                    const downloadUrl = await getDownloadURL(reference);

                    await updateDoc(doc(collection(db(), 'relatoriosRDO'), relatorio.id), {
                        pdfUrl: downloadUrl,
                        lastPdfGenerated: serverTimestamp()
                    });

                    refresh();

                    try {
                        await Share.open({
                            url: `file://${filePath}`,
                            type: 'application/pdf',
                            filename: fileName
                        });
                    } catch (shareError) {
                        console.log('Usuário cancelou compartilhamento:', shareError);
                    }

                    showGlobalToast('success', 'Sucesso', 'PDF gerado com sucesso!', 4000);
                    await RNFS.unlink(filePath);
                } catch (error) {
                    console.warn('Erro ao processar ou compartilhar PDF:', error);
                    showGlobalToast('error', 'Erro', 'Erro ao processar o PDF', 4000);
                }
            };
        } catch (error) {
            console.warn('Aviso ao compartilhar PDF:', error);
        } finally {
            setIsPdfLoading(false);
            onClose();
        }
    };

    const handleOpenPhoto = (photo: Photo) => {
        setSelectedPhoto(photo);
        setIsPhotoModalVisible(true);
    };

    const handleClosePhoto = () => {
        setIsPhotoModalVisible(false);
        setSelectedPhoto(null);
    };

    useEffect(() => {
        if (relatorio?.pdfUrl) {
            const lastPdfGenerated = relatorio.lastPdfGenerated
                ? new Date(relatorio.lastPdfGenerated.seconds * 1000)
                : null;
            const lastUpdated = relatorio.updatedAt
                ? new Date(relatorio.updatedAt.seconds * 1000)
                : relatorio.createdAt
                    ? new Date(relatorio.createdAt.seconds * 1000)
                    : null;

            setIsPdfAtualizado(!!(lastPdfGenerated && lastUpdated && lastPdfGenerated > lastUpdated));
        } else {
            setIsPdfAtualizado(false);
        }
    }, [relatorio]);

    const InfoItem = memo(({ icon, label, value }: { icon: string; label: string; value: string }) => (
        <View style={styles.infoItem}>
            <MaterialCommunityIcons
                name={icon}
                size={22}
                color={customTheme.colors.primary}
                style={styles.infoIcon}
            />
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || 'Não informado'}</Text>
            </View>
        </View>
    ));

    const SectionHeader = memo(({ icon, title }: { icon: string; title: string }) => (
        <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
                name={icon}
                size={24}
                color={customTheme.colors.primary}
            />
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    ));

    const renderPhotoItem = ({ item, index }: { item: Photo; index: number }) => (
        <View style={styles.photoItemContainer}>
            <TouchableOpacity
                style={styles.photoItem}
                onPress={() => handleOpenPhoto(item)}
                activeOpacity={0.8}
            >
                <Image
                    source={{ uri: item.uri }}
                    style={styles.photoThumbnail}
                    resizeMode="cover"
                    onLoadStart={() => setLoadingPhotos(prev => ({ ...prev, [item.id || index]: true }))}
                    onLoadEnd={() => setLoadingPhotos(prev => ({ ...prev, [item.id || index]: false }))}
                />
                {loadingPhotos[item.id || index] && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator
                            size="large"
                            color={customTheme.colors.primary}
                        />
                    </View>
                )}
                <View style={styles.photoOverlay}>
                    <MaterialCommunityIcons
                        name="magnify-plus"
                        size={20}
                        color="#FFFFFF"
                    />
                </View>
            </TouchableOpacity>
        </View>
    );

    if (!relatorio) {
        return null;
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleDismiss}
        >
            <FullScreenImage
                visible={isPhotoModalVisible}
                photo={selectedPhoto}
                onClose={handleClosePhoto}
            />
            <View style={styles.modalOverlay}>
                <Animated.View
                    style={[
                        styles.modalContainer,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <Surface style={styles.modalContent}>
                        <ScrollView>
                            <View style={styles.modalHeader}>
                                <View style={styles.modalHeaderContent}>
                                    <MaterialCommunityIcons
                                        name="clipboard-text"
                                        size={24}
                                        color={customTheme.colors.primary}
                                    />
                                    <Text variant="titleLarge">Detalhes do RDO</Text>
                                </View>
                                <View style={styles.headerActions}>
                                    <TouchableOpacity
                                        onPress={handleGeneratePdf}
                                        style={styles.pdfButton}
                                        activeOpacity={0.7}
                                        disabled={isPdfLoading}
                                    >
                                        {isPdfLoading ? (
                                            <ActivityIndicator
                                                size="small"
                                                color={customTheme.colors.primary}
                                            />
                                        ) : isPdfAtualizado ? (
                                            <MaterialCommunityIcons
                                                name="file-download"
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                        ) : (
                                            <MaterialCommunityIcons
                                                name="file-cog"
                                                size={24}
                                                color={customTheme.colors.primary}
                                            />
                                        )}
                                    </TouchableOpacity>
                                    {canEdit && (
                                        <TouchableOpacity
                                            onPress={async () => {
                                                setIsEditLoading(true);
                                                try {
                                                    await new Promise(resolve => setTimeout(resolve, 300));
                                                    navigation.navigate('RdoForm', {
                                                        mode: 'edit',
                                                        relatorioData: relatorio,
                                                        cliente: relatorio.cliente,
                                                        servico: relatorio.servico,
                                                        onGoBack: refresh,
                                                    });
                                                } catch (error) {
                                                    console.error('Error navigating to edit form:', error);
                                                } finally {
                                                    setIsEditLoading(false);
                                                    onClose();
                                                }
                                            }}
                                            style={styles.editButton}
                                            activeOpacity={0.7}
                                            disabled={isEditLoading}
                                        >
                                            {isEditLoading ? (
                                                <ActivityIndicator
                                                    size="small"
                                                    color={customTheme.colors.primary}
                                                />
                                            ) : (
                                                <MaterialCommunityIcons
                                                    name="pencil"
                                                    size={24}
                                                    color={customTheme.colors.primary}
                                                />
                                            )}
                                        </TouchableOpacity>
                                    )}
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
                            </View>
                            <View style={styles.contentWrapper}>
                                <View style={styles.sectionContainer}>
                                    <SectionHeader icon="information" title="Informações Básicas" />
                                    <InfoItem icon="pound" label="Número do RDO" value={relatorio.numeroRdo} />
                                    <InfoItem icon="domain" label="Cliente" value={relatorio.clienteNome || relatorio.cliente} />
                                    <InfoItem icon="account" label="Responsável" value={relatorio.responsavel} />
                                    <InfoItem icon="account-hard-hat" label="Função" value={relatorio.funcao} />
                                    <InfoItem icon="calendar" label="Data" value={relatorio.data} />
                                    <InfoItem icon="calendar-week" label="Dia da Semana" value={getDiaSemanaLabel()} />
                                </View>
                                <View style={styles.sectionContainer}>
                                    <SectionHeader icon="clock" title="Detalhes da Operação" />
                                    <InfoItem icon="hammer-wrench" label="Serviço" value={relatorio.servico} />
                                    <InfoItem icon="package-variant" label="Material" value={getMaterialLabel()} />
                                    <InfoItem icon="clock-start" label="Início da Operação" value={relatorio.inicioOperacao} />
                                    <InfoItem icon="clock-end" label="Término da Operação" value={relatorio.terminoOperacao} />
                                </View>
                                {relatorio.condicaoTempo && (
                                    <View style={styles.sectionContainer}>
                                        <SectionHeader icon="weather-partly-cloudy" title="Condições do Tempo" />
                                        <View style={styles.tempoContainer}>
                                            <View style={styles.tempoItem}>
                                                <MaterialCommunityIcons
                                                    name="weather-sunset-up"
                                                    size={28}
                                                    color={customTheme.colors.primary}
                                                />
                                                <Text style={styles.tempoLabel}>Manhã</Text>
                                                <Text style={styles.tempoValue}>{getTempoLabel(relatorio.condicaoTempo.manha)}</Text>
                                            </View>
                                            <View style={styles.tempoItem}>
                                                <MaterialCommunityIcons
                                                    name="weather-sunny"
                                                    size={28}
                                                    color={customTheme.colors.primary}
                                                />
                                                <Text style={styles.tempoLabel}>Tarde</Text>
                                                <Text style={styles.tempoValue}>{getTempoLabel(relatorio.condicaoTempo.tarde)}</Text>
                                            </View>
                                            <View style={styles.tempoItem}>
                                                <MaterialCommunityIcons
                                                    name="weather-night"
                                                    size={28}
                                                    color={customTheme.colors.primary}
                                                />
                                                <Text style={styles.tempoLabel}>Noite</Text>
                                                <Text style={styles.tempoValue}>{getTempoLabel(relatorio.condicaoTempo.noite)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}
                                {Array.isArray(relatorio.profissionais) && relatorio.profissionais.length > 0 && (
                                    <View style={styles.sectionContainer}>
                                        <SectionHeader icon="account-group" title="Profissionais" />
                                        {relatorio.profissionais.map((prof, index) => (
                                            <View key={`prof-${index}`} style={styles.listItem}>
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
                                        ))}
                                    </View>
                                )}
                                {Array.isArray(relatorio.equipamentos) && relatorio.equipamentos.length > 0 && (
                                    <View style={styles.sectionContainer}>
                                        <SectionHeader icon="tools" title="Equipamentos" />
                                        {relatorio.equipamentos.map((equip, index) => (
                                            <View key={`equip-${index}`} style={styles.listItem}>
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
                                        ))}
                                    </View>
                                )}
                                {Array.isArray(relatorio.atividades) && relatorio.atividades.length > 0 && (
                                    <View style={styles.sectionContainer}>
                                        <SectionHeader icon="clipboard-list" title="Atividades" />
                                        {relatorio.atividades.map((ativ, index) => (
                                            <View key={`ativ-${index}`} style={styles.detailCard}>
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
                                        ))}
                                    </View>
                                )}
                                {Array.isArray(relatorio.ocorrencias) && relatorio.ocorrencias.length > 0 && (
                                    <View style={styles.sectionContainer}>
                                        <SectionHeader icon="alert-circle" title="Ocorrências" />
                                        {relatorio.ocorrencias.map((ocor, index) => (
                                            <View key={`ocor-${index}`} style={styles.detailCard}>
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
                                        ))}
                                    </View>
                                )}
                                {relatorio.comentarioGeral && (
                                    <View style={styles.sectionContainer}>
                                        <SectionHeader icon="comment-text" title="Comentários Gerais" />
                                        <View style={styles.commentCard}>
                                            <Text style={styles.commentText}>
                                                {relatorio.comentarioGeral}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                                {Array.isArray(relatorio.photos) && relatorio.photos.length > 0 && (
                                    <View style={styles.sectionContainer}>
                                        <SectionHeader icon="image" title="Fotos" />
                                        <FlatList
                                            data={relatorio.photos}
                                            renderItem={renderPhotoItem}
                                            keyExtractor={(item, index) => `photo-${item.id || index}`}
                                            numColumns={3}
                                            initialNumToRender={6}
                                            maxToRenderPerBatch={6}
                                            windowSize={5}
                                            contentContainerStyle={styles.photosGrid}
                                            getItemLayout={(data, index) => ({
                                                length: Dimensions.get('window').width / 3,
                                                offset: (Dimensions.get('window').width / 3) * index,
                                                index
                                            })}
                                        />
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    </Surface>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    pdfButton: {
        padding: 8,
        marginRight: 8,
    },
    photoItemContainer: {
        width: '33.3%',
        aspectRatio: 1,
        padding: 4,
        position: 'relative',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        zIndex: 10,
    },
    photosGrid: {
        marginHorizontal: -4,
    },
    photoItem: {
        width: '100%',
        aspectRatio: 1,
        padding: 4,
        position: 'relative',
    },
    photoThumbnail: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    photoOverlay: {
        position: 'absolute',
        top: 4,
        right: 4,
        bottom: 4,
        left: 4,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0,
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editButton: {
        padding: 8,
        marginRight: 8,
    },
    closeButton: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        width: '100%',
        maxHeight: '95%',
    },
    modalContent: {
        backgroundColor: customTheme.colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '100%',
    },
    contentWrapper: {
        paddingBottom: 20,
        maxHeight: '90%',
    },
    sectionContainer: {
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: customTheme.colors.primary,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoIcon: {
        marginRight: 10,
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
    tempoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: customTheme.colors.surface,
        borderRadius: 10,
        padding: 16,
    },
    tempoItem: {
        alignItems: 'center',
        flex: 1,
    },
    tempoLabel: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 6,
    },
    tempoValue: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
        marginTop: 2,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    listItemIcon: {
        marginRight: 10,
    },
    listItemText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    detailCard: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
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
    commentCard: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        padding: 14,
    },
    commentText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        lineHeight: 20,
    }
});

export default DetalheRdoModal;