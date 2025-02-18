import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    ScrollView,
    Image,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import {
    Text,
    TextInput,
    Button,
    Surface,
    useTheme,
    FAB,
    Card,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import firestore, { updateDoc } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import Toast from 'react-native-toast-message';
import { useNetwork } from '../../../contexts/NetworkContext';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import { customTheme } from '../../../theme/theme';
import { ProdutoEstoque, UnidadeMedida } from './Components/lavagemTypes';
import { useBackgroundSync } from '../../../contexts/backgroundSyncContext';
import ModernHeader from '../../../assets/components/ModernHeader';

export default function ControleEstoque({ navigation }: any) {
    const { isOnline } = useNetwork();
    const { produtos, isLoading, forceSync } = useBackgroundSync(); // Usar o contexto de produtos

    // Estados
    const [modalVisible, setModalVisible] = useState(false);
    const [nome, setNome] = useState('');
    const [quantidade, setQuantidade] = useState('');
    //const [descricao, setDescricao] = useState('');
    const [photoUri, setPhotoUri] = useState<string | undefined | null>();
    const [isSaving, setIsSaving] = useState(false);
    const [isUpdatePhoto, setIsUpdatePhoto] = useState(false);

    const [isImagePickerVisible, setIsImagePickerVisible] = useState(false);

    const [selectedProduto, setSelectedProduto] = useState<ProdutoEstoque | null>(null);
    const [isDetalhesVisible, setIsDetalhesVisible] = useState(false);
    const [novaQuantidade, setNovaQuantidade] = useState('');
    const [novoNome, setNovoNome] = useState('');
    const [isEditingNome, setIsEditingNome] = useState(false);

    const [isQuantidadeModalVisible, setIsQuantidadeModalVisible] = useState(false);
    const [tipoAtualizacao, setTipoAtualizacao] = useState<'somar' | 'atualizar' | null>(null);
    const [quantidadeMinima, setQuantidadeMinima] = useState('');

    const [isEditMinimoVisible, setIsEditMinimoVisible] = useState(false);
    const [novaQuantidadeMinima, setNovaQuantidadeMinima] = useState('');

    const [isSavingPhoto, setIsSavingPhoto] = useState(false);
    const [unidadeMedida, setUnidadeMedida] = useState<'unidade' | 'kilo' | 'litro'>('unidade');
    const [isEditingUnidade, setIsEditingUnidade] = useState(false);
    const [isUpdatingUnidade, setIsUpdatingUnidade] = useState(false);

    const ordernarProdutos = (produtos: ProdutoEstoque[]): ProdutoEstoque[] => {
        // Verifica se produtos é undefined ou null
        if (!produtos) return [];

        // Filtra produtos inválidos antes de ordenar
        const produtosValidos = produtos.filter(produto =>
            produto &&
            typeof produto.quantidade !== 'undefined' &&
            typeof produto.quantidadeMinima !== 'undefined' &&
            typeof produto.nome !== 'undefined'
        );

        return [...produtosValidos].sort((a, b) => {
            // Converte para número e usa 0 como fallback se inválido
            const aQuantidade = parseInt(a.quantidade) || 0;
            const aMinimo = parseInt(a.quantidadeMinima) || 0;
            const bQuantidade = parseInt(b.quantidade) || 0;
            const bMinimo = parseInt(b.quantidadeMinima) || 0;

            // Verifica se está abaixo do mínimo
            const aAbaixoMinimo = aQuantidade <= aMinimo;
            const bAbaixoMinimo = bQuantidade <= bMinimo;

            // Produtos abaixo do mínimo vêm primeiro
            if (aAbaixoMinimo && !bAbaixoMinimo) return -1;
            if (!aAbaixoMinimo && bAbaixoMinimo) return 1;

            // Se ambos estão (ou não estão) abaixo do mínimo, ordena por nome
            return (a.nome || '').localeCompare(b.nome || '');
        });
    };

    const produtosOrdenados = ordernarProdutos(produtos);

    // Funções para manipulação de imagens
    const selectImage = (forUpdate: boolean = false) => {
        const options: any = {
            mediaType: 'photo',
            quality: 1,
        };

        launchImageLibrary(options, (response: any) => {
            if (response.didCancel) {
                console.log('Seleção de imagem cancelada');
            } else if (response.error) {
                console.log('Erro ImagePicker:', response.error);
                showGlobalToast(
                    'error',
                    'Não foi possível selecionar a imagem',
                    'Tente novamente',
                    4000
                );
            } else if (response.assets && response.assets.length > 0) {
                if (forUpdate) {
                    setIsUpdatePhoto(true);
                }
                setPhotoUri(response.assets[0].uri);
            }
        });
    };

    const launchCustomCamera = (forUpdate: boolean = false) => {
        const options: any = {
            mediaType: 'photo',
            quality: 1,
        };

        launchCamera(options, (response: any) => {
            if (response.didCancel) {
                console.log('Captura de foto cancelada');
            } else if (response.error) {
                console.log('Erro Camera:', response.error);
                showGlobalToast(
                    'error',
                    'Não foi possível capturar a foto',
                    'Tente novamente',
                    4000
                );
            } else if (response.assets && response.assets.length > 0) {
                if (forUpdate) {
                    setIsUpdatePhoto(true);
                }
                setPhotoUri(response.assets[0].uri);
            }
        });
    };

    const showImagePickerOptions = (forUpdate: boolean = false) => {
        setIsImagePickerVisible(true);
    };

    const handleUpdateNome = async () => {
        if (!checkOnlineStatus()) return;
        if (!selectedProduto || !novoNome.trim()) return;

        try {
            await firestore()
                .collection('produtos')
                .doc(selectedProduto.id)
                .update({
                    nome: novoNome.trim(),
                    updatedAt: new Date().toISOString(),
                });

            await forceSync(); // Força sincronização após atualizar

            setSelectedProduto(prev => prev ? {
                ...prev,
                nome: novoNome.trim()
            } : null);

            showGlobalToast(
                'success',
                'Nome atualizado com sucesso',
                '',
                4000
            );

            setIsEditingNome(false);
        } catch (error) {
            console.error('Erro ao atualizar nome:', error);
            showGlobalToast('error', 'Erro ao atualizar nome', 'Tente novamente', 4000);
        }
    };

    const handleUpdatePhoto = async () => {
        if (!checkOnlineStatus()) return;
        if (!selectedProduto || !photoUri || !isUpdatePhoto) return;

        setIsSavingPhoto(true); // Inicia o loading
        try {
            const now = new Date().toISOString();
            const filename = `produtos/${now}_${selectedProduto.nome.trim()}.jpg`;
            const reference = storage().ref(filename);

            await reference.putFile(photoUri);
            const photoUrl = await reference.getDownloadURL();

            // Atualizar no Firestore
            await firestore()
                .collection('produtos')
                .doc(selectedProduto.id)
                .update({
                    photoUrl,
                    updatedAt: now,
                });

            // Atualizar o produto selecionado
            setSelectedProduto(prev => prev ? {
                ...prev,
                photoUrl
            } : null);

            showGlobalToast(
                'success',
                'Foto atualizada com sucesso',
                '',
                4000
            );

            setIsUpdatePhoto(false);
        } catch (error) {
            console.error('Erro ao atualizar foto:', error);
            showGlobalToast('error', 'Erro ao atualizar foto', 'Tente novamente', 4000);
        } finally {
            setIsSavingPhoto(false); // Finaliza o loading independente do resultado
        }
    };

    const handleUpdateQuantidade = async () => {
        if (!isOnline) {
            showGlobalToast(
                'info',
                'Modo Offline',
                'É necessário estar online para atualizar quantidade',
                4000
            );
            return;
        }
        if (!selectedProduto || !novaQuantidade) return;

        try {
            let novaQuantidadeTotal: string;

            if (tipoAtualizacao === 'somar') {
                const quantidadeAtual = parseInt(selectedProduto.quantidade) || 0;
                const quantidadeAdicional = parseInt(novaQuantidade) || 0;
                novaQuantidadeTotal = (quantidadeAtual + quantidadeAdicional).toString();
            } else {
                novaQuantidadeTotal = novaQuantidade;
            }

            await firestore()
                .collection('produtos')
                .doc(selectedProduto.id)
                .update({
                    quantidade: novaQuantidadeTotal,
                    updatedAt: new Date().toISOString(),
                });

            await forceSync(); // Força sincronização após atualizar

            showGlobalToast(
                'success',
                'Quantidade atualizada com sucesso',
                tipoAtualizacao === 'somar' ? 'Quantidade somada ao estoque' : 'Estoque atualizado',
                4000
            );

            setNovaQuantidade('');
            setIsQuantidadeModalVisible(false);
            setTipoAtualizacao(null);
            setIsDetalhesVisible(false);
            setSelectedProduto(null);
        } catch (error) {
            console.error('Erro ao atualizar quantidade:', error);
            showGlobalToast('error', 'Erro ao atualizar quantidade', 'Tente novamente', 4000);
        }
    };

    const handleUpdateUnidade = async (novaUnidade: UnidadeMedida) => {
        if (!checkOnlineStatus()) return;
        if (!selectedProduto) return;

        try {
            setIsUpdatingUnidade(true);

            await firestore()
                .collection('produtos')
                .doc(selectedProduto.id)
                .update({
                    unidadeMedida: novaUnidade,
                    updatedAt: new Date().toISOString(),
                });

            await forceSync(); // Força sincronização após atualizar

            setSelectedProduto(prev => prev ? {
                ...prev,
                unidadeMedida: novaUnidade
            } : null);

            showGlobalToast(
                'success',
                'Unidade de medida atualizada com sucesso',
                '',
                4000
            );

            setIsEditingUnidade(false);
        } catch (error) {
            console.error('Erro ao atualizar unidade de medida:', error);
            showGlobalToast(
                'error',
                'Erro ao atualizar unidade de medida',
                'Tente novamente',
                4000
            );
        } finally {
            setIsUpdatingUnidade(false);
        }
    };

    // Salvar novo produto
    const handleSave = async () => {
        if (!isOnline) {
            showGlobalToast(
                'info',
                'Modo Offline',
                'É necessário estar online para adicionar produtos',
                4000
            );
            return;
        }

        if (!nome.trim() || !quantidade.trim() || !quantidadeMinima.trim() || !unidadeMedida) {
            showGlobalToast(
                'info',
                'Preencha todos os campos obrigatórios',
                'Nome, quantidade inicial, quantidade mínima e unidade de medida são obrigatórios',
                4000
            );
            return;
        }

        setIsSaving(true);
        try {
            const now = new Date().toISOString();
            let photoUrl: string | null = null;

            if (photoUri) {
                const filename = `produtos/${now}_${nome.trim()}.jpg`;
                const reference = storage().ref(filename);
                await reference.putFile(photoUri);
                photoUrl = await reference.getDownloadURL();
            }

            const novoProduto: ProdutoEstoque = {
                nome: nome.trim(),
                quantidade: quantidade.trim(),
                quantidadeMinima: quantidadeMinima.trim(),
                unidadeMedida,
                //descricao: descricao.trim() || '',
                photoUrl,
                createdAt: now,
                updatedAt: now,
            };

            await firestore().collection('produtos').add(novoProduto);
            await forceSync(); // Força sincronização após adicionar

            showGlobalToast('success', 'Produto adicionado com sucesso', '', 4000);

            // Limpar formulário
            setNome('');
            setQuantidade('');
            setQuantidadeMinima('');
            //setDescricao('');
            setPhotoUri(null);
            setUnidadeMedida('unidade');
            setIsDetalhesVisible(false);

        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            showGlobalToast('error', 'Erro ao salvar produto', 'Tente novamente mais tarde', 4000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateQuantidadeMinima = async () => {
        if (!checkOnlineStatus()) return;
        if (!selectedProduto || !novaQuantidadeMinima) return;

        try {
            // Atualizar no Firestore
            await firestore()
                .collection('produtos')
                .doc(selectedProduto.id)
                .update({
                    quantidadeMinima: novaQuantidadeMinima,
                    updatedAt: new Date().toISOString(),
                });

            showGlobalToast(
                'success',
                'Quantidade mínima atualizada',
                'Alerta de estoque atualizado com sucesso',
                4000
            );

            setNovaQuantidadeMinima('');
            setIsEditMinimoVisible(false);
            setSelectedProduto(prev => prev ? {
                ...prev,
                quantidadeMinima: novaQuantidadeMinima
            } : null);
        } catch (error) {
            console.error('Erro ao atualizar quantidade mínima:', error);
            showGlobalToast('error', 'Erro ao atualizar', 'Tente novamente', 4000);
        }
    };

    const checkOnlineStatus = () => {
        if (!isOnline) {
            showGlobalToast(
                'info',
                'Modo Offline',
                'Esta operação requer conexão com internet',
                4000
            );
            return false;
        }
        return true;
    };

    return (
        <View style={styles.mainContainer}>

            <ModernHeader
                title="Controle de Estoque"
                iconName="history"
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView style={styles.content}>
                {isLoading ? (
                    <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
                        <Text>Carregando produtos...</Text>
                    </View>
                ) : (
                    produtosOrdenados.map((produto) => {
                        const estoqueBaixo = parseInt(produto.quantidade) <= parseInt(produto.quantidadeMinima);

                        return (
                            <TouchableOpacity
                                key={produto.id}
                                onPress={isOnline ? () => {
                                    setSelectedProduto(produto);
                                    setNovoNome(produto.nome);
                                    setPhotoUri(produto.photoUrl);
                                    setIsDetalhesVisible(true);
                                    setIsUpdatePhoto(false);
                                } : () => {
                                    // Quando offline, mostra mensagem explicativa
                                    showGlobalToast(
                                        'info',
                                        'Modo Offline',
                                        'Edições só estão disponíveis quando online',
                                        4000
                                    );
                                }}
                            >
                                <Card
                                    style={[
                                        styles.produtoCard,
                                        estoqueBaixo && styles.produtoCardAlerta,
                                        !isOnline && styles.produtoCardOffline
                                    ]}
                                >
                                    <Card.Content style={styles.produtoRow}>
                                        <View style={styles.produtoImageContainer}>
                                            {produto.photoUrl ? (
                                                <Image
                                                    source={{ uri: produto.photoUrl }}
                                                    style={styles.produtoImage}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View style={[styles.produtoImage, { justifyContent: 'center', alignItems: 'center' }]}>
                                                    <Icon
                                                        name="image-off"
                                                        size={24}
                                                        color={customTheme.colors.onSurfaceVariant}
                                                    />
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.produtoInfo}>
                                            <View style={styles.produtoTituloContainer}>
                                                <Text style={styles.produtoNome}>
                                                    {produto.nome}
                                                </Text>
                                                {estoqueBaixo && (
                                                    <Icon
                                                        name="alert"
                                                        size={20}
                                                        color={customTheme.colors.error}
                                                    />
                                                )}
                                            </View>
                                            <View style={styles.produtoQuantidadeContainer}>
                                                <Text style={styles.produtoQuantidade}>
                                                    {produto.quantidade} {
                                                        produto.unidadeMedida === 'unidade' ? 'unidades' :
                                                            produto.unidadeMedida === 'kilo' ? 'kg' : 'L'
                                                    }
                                                </Text>
                                                {estoqueBaixo && (
                                                    <Text style={styles.produtoQuantidadeMinima}>
                                                        (Mínimo: {produto.quantidadeMinima} {
                                                            produto.unidadeMedida === 'unidade' ? 'unidades' :
                                                                produto.unidadeMedida === 'kilo' ? 'kg' : 'L'
                                                        })
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        {/* Indicador de modo offline */}
                                        {!isOnline && (
                                            <View style={styles.offlineIndicator}>
                                                <Icon
                                                    name="cloud-off-outline"
                                                    size={20}
                                                    color={customTheme.colors.onSurfaceVariant}
                                                />
                                            </View>
                                        )}
                                    </Card.Content>
                                </Card>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            {isOnline && (
                <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    style={styles.fab}
                >
                    <Icon name="plus" size={24} color={customTheme.colors.onPrimary} />
                </TouchableOpacity>
            )}

            {/* Modal para criar novo produto */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <Surface style={styles.modalContent}>
                        <ScrollView>
                            <Text variant="headlineSmall" style={styles.modalTitle}>
                                Novo Produto
                            </Text>

                            {/* Container principal com layout modificado */}
                            <View style={styles.mainInfoContainer}>
                                {/* Área da foto agora em container próprio */}
                                <View style={styles.photoContainer}>
                                    <TouchableOpacity
                                        style={styles.photoSelector}
                                        onPress={() => showImagePickerOptions()}
                                    >
                                        {photoUri ? (
                                            <Image
                                                source={{ uri: photoUri }}
                                                style={styles.photoPreview}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={styles.photoPlaceholder}>
                                                <Icon
                                                    name="camera"
                                                    size={32}
                                                    color={customTheme.colors.primary}
                                                />
                                                <Text
                                                    style={styles.photoPlaceholderText}
                                                    variant="bodySmall"
                                                >
                                                    Foto (opcional)
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {/* Container dos inputs */}
                                <View style={styles.inputsSection}>
                                    <TextInput
                                        mode="outlined"
                                        placeholder="Nome do Produto *"
                                        placeholderTextColor={"gray"}
                                        value={nome}
                                        onChangeText={setNome}
                                        style={styles.input}
                                        theme={{ colors: { onSurface: customTheme.colors.onSurface } }}
                                    />

                                    <View style={styles.quantidadesContainer}>
                                        <TextInput
                                            mode="outlined"
                                            placeholder="Quantidade Inicial *"
                                            placeholderTextColor={"gray"}
                                            value={quantidade}
                                            onChangeText={setQuantidade}
                                            keyboardType="numeric"
                                            style={styles.input}
                                            right={<TextInput.Affix text={
                                                unidadeMedida === 'unidade' ? 'un' :
                                                    unidadeMedida === 'kilo' ? 'kg' : 'L'
                                            } />}
                                            theme={{ colors: { onSurface: customTheme.colors.onSurface } }}
                                        />

                                        <TextInput
                                            mode="outlined"
                                            placeholder="Quantidade Mínima *"
                                            placeholderTextColor={"gray"}
                                            value={quantidadeMinima}
                                            onChangeText={setQuantidadeMinima}
                                            keyboardType="numeric"
                                            style={styles.input}
                                            right={<TextInput.Affix text={
                                                unidadeMedida === 'unidade' ? 'un' :
                                                    unidadeMedida === 'kilo' ? 'kg' : 'L'
                                            } />}
                                            theme={{ colors: { onSurface: customTheme.colors.onSurface } }}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Resto do conteúdo permanece o mesmo */}
                            <View style={styles.unidadeMedidaSection}>
                                <Text style={styles.unidadeMedidaLabel}>Unidade de Medida *</Text>
                                <View style={styles.unidadeMedidaButtons}>
                                    <TouchableOpacity
                                        style={[
                                            styles.unidadeMedidaButton,
                                            unidadeMedida === 'unidade' && styles.unidadeMedidaButtonActive
                                        ]}
                                        onPress={() => setUnidadeMedida('unidade')}
                                    >
                                        <Icon
                                            name="package"
                                            size={24}
                                            color={unidadeMedida === 'unidade' ? customTheme.colors.onPrimary : customTheme.colors.onSurface}
                                        />
                                        <Text style={[
                                            styles.unidadeMedidaButtonText,
                                            unidadeMedida === 'unidade' && styles.unidadeMedidaButtonTextActive
                                        ]}>
                                            Unidade
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.unidadeMedidaButton,
                                            unidadeMedida === 'kilo' && styles.unidadeMedidaButtonActive
                                        ]}
                                        onPress={() => setUnidadeMedida('kilo')}
                                    >
                                        <Icon
                                            name="weight-kilogram"
                                            size={24}
                                            color={unidadeMedida === 'kilo' ? customTheme.colors.onPrimary : customTheme.colors.onSurface}
                                        />
                                        <Text style={[
                                            styles.unidadeMedidaButtonText,
                                            unidadeMedida === 'kilo' && styles.unidadeMedidaButtonTextActive
                                        ]}>
                                            Kilo
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.unidadeMedidaButton,
                                            unidadeMedida === 'litro' && styles.unidadeMedidaButtonActive
                                        ]}
                                        onPress={() => setUnidadeMedida('litro')}
                                    >
                                        <Icon
                                            name="bottle-tonic"
                                            size={24}
                                            color={unidadeMedida === 'litro' ? customTheme.colors.onPrimary : customTheme.colors.onSurface}
                                        />
                                        <Text style={[
                                            styles.unidadeMedidaButtonText,
                                            unidadeMedida === 'litro' && styles.unidadeMedidaButtonTextActive
                                        ]}>
                                            Litro
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* <View style={styles.descricaoContainer}>
                                <TextInput
                                    mode="outlined"
                                    placeholder="Descrição (opcional)"
                                    placeholderTextColor={"gray"}
                                    value={descricao}
                                    onChangeText={setDescricao}
                                    multiline
                                    numberOfLines={4}
                                    style={[styles.input, styles.descricaoInput]}
                                    theme={{ colors: { onSurface: customTheme.colors.onSurface } }}
                                />
                            </View> */}

                            <View style={styles.modalButtons}>
                                <Button
                                    mode="outlined"
                                    onPress={() => {
                                        setModalVisible(false);
                                        setNome('');
                                        setQuantidade('');
                                        setQuantidadeMinima('');
                                        //setDescricao('');
                                        setPhotoUri(null);
                                        setUnidadeMedida('unidade');
                                    }}
                                    disabled={isSaving}
                                    style={styles.modalButton}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    mode="contained"
                                    onPress={handleSave}
                                    loading={isSaving}
                                    disabled={isSaving || !nome.trim() || !quantidade.trim() || !quantidadeMinima.trim()}
                                    style={styles.modalButton}
                                >
                                    Salvar
                                </Button>
                            </View>
                        </ScrollView>
                    </Surface>
                </View>
            </Modal>

            {/* Modal de escolha de câmera/galeria */}
            <Modal
                visible={isImagePickerVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsImagePickerVisible(false)}
            >
                <TouchableOpacity
                    style={styles.imagePickerModal}
                    activeOpacity={1}
                    onPress={() => setIsImagePickerVisible(false)}
                >
                    <Surface style={styles.imagePickerContent}>
                        <Button
                            mode="contained-tonal"
                            onPress={() => {
                                setIsImagePickerVisible(false);
                                launchCustomCamera(!!selectedProduto);
                            }}
                            icon="camera"
                            style={styles.imagePickerButton}
                        >
                            Tirar Foto
                        </Button>
                        <Button
                            mode="contained-tonal"
                            onPress={() => {
                                setIsImagePickerVisible(false);
                                selectImage(!!selectedProduto);
                            }}
                            icon="image"
                            style={styles.imagePickerButton}
                        >
                            Escolher da Galeria
                        </Button>
                        {photoUri && (
                            <Button
                                mode="contained-tonal"
                                onPress={() => {
                                    setPhotoUri(null); // Alterado de undefined para null
                                    setIsImagePickerVisible(false);
                                    setIsUpdatePhoto(false);
                                }}
                                icon="trash-can"
                                style={[styles.imagePickerButton, { marginTop: 8 }]}
                                textColor={customTheme.colors.error}
                            >
                                Remover Foto
                            </Button>
                        )}
                    </Surface>
                </TouchableOpacity>
            </Modal>

            {/* Modal de detalhes do produto */}
            <Modal
                visible={isDetalhesVisible}
                transparent={false}
                animationType="slide"
                onRequestClose={() => {
                    setIsDetalhesVisible(false);
                    setSelectedProduto(null);
                    setNovaQuantidade('');
                    setNovoNome('');
                    setIsEditingNome(false);
                    setPhotoUri(null);
                    setIsUpdatePhoto(false);
                    setIsEditingUnidade(false);
                }}
            >
                <SafeAreaView style={styles.safeArea}>
                    {/* Header Fixo */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => {
                                setIsDetalhesVisible(false);
                                setSelectedProduto(null);
                                setNovoNome('');
                                setIsEditingNome(false);
                                setPhotoUri(null);
                                setIsUpdatePhoto(false);
                            }}
                            style={styles.backButton}
                        >
                            <Icon name="arrow-left" size={24} color={customTheme.colors.onSurface} />
                            <Text style={styles.headerText}>Voltar</Text>
                        </TouchableOpacity>

                        <Text variant="titleLarge" style={styles.headerTitle}>
                            Detalhes do Produto
                        </Text>

                        <View style={styles.headerSpacer} />
                    </View>

                    {/* Conteúdo Rolável */}
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollViewContent}
                        showsVerticalScrollIndicator={true}
                        bounces={true}
                    >
                        {/* Área da Foto */}
                        <View style={styles.photoSection}>
                            <TouchableOpacity
                                onPress={() => showImagePickerOptions(true)}
                                style={styles.photoContainer}
                            >
                                {photoUri ? (
                                    <Image
                                        source={{ uri: photoUri }}
                                        style={styles.productImage}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={styles.placeholderContainer}>
                                        <Icon
                                            name="image-off"
                                            size={48}
                                            color={customTheme.colors.onSurfaceVariant}
                                        />
                                    </View>
                                )}
                                <View style={styles.imageOverlay}>
                                    <Icon
                                        name="camera-plus"
                                        size={32}
                                        color={customTheme.colors.inverseSurface}
                                    />
                                    <Text style={styles.overlayText}>Alterar Foto</Text>
                                </View>
                            </TouchableOpacity>

                            {isUpdatePhoto && (
                                <Button
                                    mode="contained"
                                    onPress={handleUpdatePhoto}
                                    loading={isSavingPhoto}
                                    disabled={isSavingPhoto}
                                    style={styles.updatePhotoButton}
                                    icon={isSavingPhoto ? undefined : "content-save"}
                                >
                                    {isSavingPhoto ? 'Salvando Imagem...' : 'Salvar Nova Foto'}
                                </Button>
                            )}
                        </View>

                        {/* Nome do Produto */}
                        <Card style={styles.card}>
                            <Card.Content>
                                {isEditingNome ? (
                                    <View style={styles.editNameContainer}>
                                        <TextInput
                                            mode="outlined"
                                            value={novoNome}
                                            onChangeText={setNovoNome}
                                            style={styles.nameInput}
                                            theme={{ colors: { onSurface: customTheme.colors.onSurface } }}
                                        />
                                        <View style={styles.editButtons}>
                                            <Button
                                                mode="outlined"
                                                onPress={() => {
                                                    setNovoNome(selectedProduto?.nome || '');
                                                    setIsEditingNome(false);
                                                }}
                                                style={styles.editButton}
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                mode="contained"
                                                onPress={handleUpdateNome}
                                                disabled={!novoNome.trim() || novoNome === selectedProduto?.nome}
                                                style={styles.editButton}
                                            >
                                                Salvar
                                            </Button>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.nameDisplay}>
                                        <Text style={styles.productName}>{selectedProduto?.nome}</Text>
                                        <TouchableOpacity
                                            onPress={() => setIsEditingNome(true)}
                                            style={styles.editIcon}
                                        >
                                            <Icon
                                                name="pencil"
                                                size={20}
                                                color={customTheme.colors.primary}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </Card.Content>
                        </Card>

                        {/* Estoque */}
                        <Card style={styles.card}>
                            <Card.Content>
                                <View style={styles.stockSection}>
                                    <View>
                                        <Text style={styles.sectionLabel}>
                                            Quantidade em Estoque
                                        </Text>
                                        <Text style={[
                                            styles.stockValue,
                                            parseInt(selectedProduto?.quantidade || '0') <=
                                            parseInt(selectedProduto?.quantidadeMinima || '0') &&
                                            styles.lowStock
                                        ]}>
                                            {selectedProduto?.quantidade} {
                                                selectedProduto?.unidadeMedida === 'unidade' ? 'unidades' :
                                                    selectedProduto?.unidadeMedida === 'kilo' ? 'kg' : 'L'
                                            }
                                        </Text>
                                    </View>
                                    <Button
                                        mode="contained"
                                        onPress={() => setIsQuantidadeModalVisible(true)}
                                        icon="plus-circle"
                                    >
                                        Atualizar
                                    </Button>
                                </View>

                                <View style={styles.minStockSection}>
                                    <View style={styles.minStockInfo}>
                                        <Text style={styles.sectionLabel}>
                                            Quantidade Mínima
                                        </Text>
                                        <Text style={styles.minStockValue}>
                                            {selectedProduto?.quantidadeMinima} {
                                                selectedProduto?.unidadeMedida === 'unidade' ? 'unidades' :
                                                    selectedProduto?.unidadeMedida === 'kilo' ? 'kg' : 'L'
                                            }
                                        </Text>
                                    </View>
                                    <Button
                                        mode="outlined"
                                        onPress={() => {
                                            setNovaQuantidadeMinima(selectedProduto?.quantidadeMinima || '');
                                            setIsEditMinimoVisible(true);
                                        }}
                                        icon="pencil"
                                    >
                                        Alterar Mínimo
                                    </Button>
                                </View>
                            </Card.Content>
                        </Card>

                        {/* Unidade de Medida */}
                        <Card style={styles.card}>
                            <Card.Content>
                                {isEditingUnidade ? (
                                    <View style={styles.unitEditContainer}>
                                        <Text style={styles.sectionLabel}>
                                            Selecione a nova unidade de medida:
                                        </Text>
                                        <View style={styles.unitButtons}>
                                            {/* Botão Unidade */}
                                            <TouchableOpacity
                                                style={[
                                                    styles.unidadeMedidaButton,
                                                    selectedProduto?.unidadeMedida === 'unidade' && styles.unidadeMedidaButtonActive
                                                ]}
                                                onPress={() => handleUpdateUnidade('unidade')}
                                                disabled={isUpdatingUnidade} // Desabilita durante o loading
                                            >
                                                <Icon
                                                    name="package-variant"
                                                    size={24}
                                                    color={selectedProduto?.unidadeMedida === 'unidade' ?
                                                        customTheme.colors.onPrimary :
                                                        isUpdatingUnidade ? customTheme.colors.outline : customTheme.colors.onSurface
                                                    }
                                                />
                                                <Text style={[
                                                    styles.unidadeMedidaButtonText,
                                                    selectedProduto?.unidadeMedida === 'unidade' && styles.unidadeMedidaButtonTextActive,
                                                    isUpdatingUnidade && styles.unidadeMedidaButtonTextDisabled
                                                ]}>
                                                    Unidade
                                                </Text>
                                            </TouchableOpacity>

                                            {/* Botão Kilo */}
                                            <TouchableOpacity
                                                style={[
                                                    styles.unidadeMedidaButton,
                                                    selectedProduto?.unidadeMedida === 'kilo' && styles.unidadeMedidaButtonActive
                                                ]}
                                                onPress={() => handleUpdateUnidade('kilo')}
                                                disabled={isUpdatingUnidade}
                                            >
                                                <Icon
                                                    name="weight-kilogram"
                                                    size={24}
                                                    color={selectedProduto?.unidadeMedida === 'kilo' ?
                                                        customTheme.colors.onPrimary :
                                                        isUpdatingUnidade ? customTheme.colors.outline : customTheme.colors.onSurface
                                                    }
                                                />
                                                <Text style={[
                                                    styles.unidadeMedidaButtonText,
                                                    selectedProduto?.unidadeMedida === 'kilo' && styles.unidadeMedidaButtonTextActive,
                                                    isUpdatingUnidade && styles.unidadeMedidaButtonTextDisabled
                                                ]}>
                                                    Kilo
                                                </Text>
                                            </TouchableOpacity>

                                            {/* Botão Litro */}
                                            <TouchableOpacity
                                                style={[
                                                    styles.unidadeMedidaButton,
                                                    selectedProduto?.unidadeMedida === 'litro' && styles.unidadeMedidaButtonActive
                                                ]}
                                                onPress={() => handleUpdateUnidade('litro')}
                                                disabled={isUpdatingUnidade}
                                            >
                                                <Icon
                                                    name="bottle-tonic"
                                                    size={24}
                                                    color={selectedProduto?.unidadeMedida === 'litro' ?
                                                        customTheme.colors.onPrimary :
                                                        isUpdatingUnidade ? customTheme.colors.outline : customTheme.colors.onSurface
                                                    }
                                                />
                                                <Text style={[
                                                    styles.unidadeMedidaButtonText,
                                                    selectedProduto?.unidadeMedida === 'litro' && styles.unidadeMedidaButtonTextActive,
                                                    isUpdatingUnidade && styles.unidadeMedidaButtonTextDisabled
                                                ]}>
                                                    Litro
                                                </Text>
                                            </TouchableOpacity>

                                            {/* Overlay de Loading */}
                                            {isUpdatingUnidade && (
                                                <View style={styles.loadingOverlay}>
                                                    <ActivityIndicator
                                                        size="large"
                                                        color={customTheme.colors.primary}
                                                    />
                                                    <Text style={styles.loadingText}>
                                                        Salvando alteração...
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        <Button
                                            mode="outlined"
                                            onPress={() => setIsEditingUnidade(false)}
                                            style={styles.cancelUnitButton}
                                            disabled={isUpdatingUnidade}
                                        >
                                            Cancelar
                                        </Button>
                                    </View>
                                ) : (
                                    <View style={styles.unitDisplay}>
                                        <View>
                                            <Text style={styles.sectionLabel}>
                                                Unidade de Medida
                                            </Text>
                                            <Text style={styles.unitValue}>
                                                {selectedProduto?.unidadeMedida === 'unidade' ? 'Unidade' :
                                                    selectedProduto?.unidadeMedida === 'kilo' ? 'Quilograma (kg)' :
                                                        'Litro (L)'}
                                            </Text>
                                        </View>
                                        <Button
                                            mode="outlined"
                                            onPress={() => setIsEditingUnidade(true)}
                                            icon="pencil"
                                        >
                                            Alterar
                                        </Button>
                                    </View>
                                )}
                            </Card.Content>
                        </Card>

                        {/* Descrição */}
                        {/* {selectedProduto?.descricao && (
                            <Card style={styles.card}>
                                <Card.Content>
                                    <Text style={styles.sectionLabel}>Descrição</Text>
                                    <Text style={styles.descriptionText}>
                                        {selectedProduto.descricao || 'Nenhuma descrição cadastrada'}
                                    </Text>
                                </Card.Content>
                            </Card>
                        )} */}

                        {/* Espaço extra no final para garantir que o último item seja visível */}
                        <View style={styles.bottomSpacer} />
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Modal para escolher tipo de atualização */}
            <Modal
                visible={isQuantidadeModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setIsQuantidadeModalVisible(false);
                    setTipoAtualizacao(null);
                    setNovaQuantidade('');
                }}
            >
                <View style={styles.quantidadeModalContainer}>
                    <Card style={styles.quantidadeModalContent}>
                        {/* Título da Modal */}
                        <View style={styles.quantidadeModalHeader}>
                            <Text variant="titleLarge" style={styles.quantidadeModalTitle}>
                                {tipoAtualizacao
                                    ? tipoAtualizacao === 'somar'
                                        ? 'Adicionar ao Estoque'
                                        : 'Atualizar Estoque'
                                    : 'Atualização de Estoque'
                                }
                            </Text>

                            {/* Informação atual do estoque quando estiver editando */}
                            {tipoAtualizacao && (
                                <View style={styles.estoqueAtualInfo}>
                                    <Text style={styles.estoqueAtualLabel}>Quantidade Atual</Text>
                                    <Text style={styles.estoqueAtualValue}>
                                        {selectedProduto?.quantidade} unidades
                                    </Text>
                                </View>
                            )}
                        </View>

                        {tipoAtualizacao ? (
                            <>
                                {/* Input de quantidade */}
                                <TextInput
                                    mode="outlined"
                                    placeholder={tipoAtualizacao === 'somar' ? 'Quantidade a adicionar' : 'Nova quantidade total'}
                                    placeholderTextColor={"gray"}
                                    value={novaQuantidade}
                                    onChangeText={setNovaQuantidade}
                                    keyboardType="numeric"
                                    style={styles.quantidadeModalInput}
                                    right={<TextInput.Affix text="unidades" />}
                                    theme={{ colors: { onSurface: customTheme.colors.onSurface } }}
                                />

                                {/* Botões de ação */}
                                <View style={styles.quantidadeModalButtons}>
                                    <Button
                                        mode="outlined"
                                        onPress={() => {
                                            setTipoAtualizacao(null);
                                            setNovaQuantidade('');
                                        }}
                                        style={styles.quantidadeModalButton}
                                        contentStyle={styles.quantidadeModalButtonContent}
                                    >
                                        Voltar
                                    </Button>
                                    <Button
                                        mode="contained"
                                        onPress={handleUpdateQuantidade}
                                        style={[
                                            styles.quantidadeModalButton,
                                            styles.somarButton
                                        ]}
                                        contentStyle={styles.quantidadeModalButtonContent}
                                        disabled={!novaQuantidade}
                                    >
                                        Confirmar
                                    </Button>
                                </View>
                            </>
                        ) : (
                            <>
                                {/* Opções de tipo de atualização */}
                                <View style={styles.tipoAtualizacaoContainer}>
                                    {/* Opção Somar */}
                                    <TouchableOpacity
                                        style={[styles.tipoAtualizacaoButton, styles.somarContainer]}
                                        onPress={() => setTipoAtualizacao('somar')}
                                    >
                                        <View style={styles.tipoAtualizacaoContent}>
                                            <Icon name="plus-circle" size={32} color={customTheme.colors.primary} />
                                            <Text style={[styles.tipoAtualizacaoTitle, { color: customTheme.colors.primary }]}>
                                                Somar ao Estoque
                                            </Text>
                                            <Text style={styles.tipoAtualizacaoDescription}>
                                                Adicionar mais quantidade ao estoque atual
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Opção Atualizar */}
                                    <TouchableOpacity
                                        style={[styles.tipoAtualizacaoButton, styles.atualizarContainer]}
                                        onPress={() => setTipoAtualizacao('atualizar')}
                                    >
                                        <View style={styles.tipoAtualizacaoContent}>
                                            <Icon name="pencil-circle" size={32} color={customTheme.colors.secondary} />
                                            <Text style={[styles.tipoAtualizacaoTitle, { color: customTheme.colors.secondary }]}>
                                                Atualizar Total
                                            </Text>
                                            <Text style={styles.tipoAtualizacaoDescription}>
                                                Definir uma nova quantidade total no estoque
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </Card>
                </View>
            </Modal>

            {/* Modal de edição de quantidade mínima */}
            <Modal
                visible={isEditMinimoVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    setIsEditMinimoVisible(false);
                    setNovaQuantidadeMinima('');
                }}
            >
                <View style={styles.modalContainer}>
                    <Card style={styles.editMinimoModal}>
                        <Card.Content>
                            <Text style={styles.editMinimoTitle}>
                                Alterar Quantidade Mínima
                            </Text>

                            <View style={styles.editMinimoContent}>
                                <Text style={styles.editMinimoDesc}>
                                    Define a quantidade mínima para alertar sobre baixo estoque
                                </Text>

                                <View style={styles.editMinimoCurrentContainer}>
                                    <Text style={styles.editMinimoCurrentLabel}>
                                        Quantidade Mínima Atual
                                    </Text>
                                    <Text style={styles.editMinimoCurrentValue}>
                                        {selectedProduto?.quantidadeMinima} {selectedProduto?.unidadeMedida}
                                    </Text>
                                </View>

                                <TextInput
                                    mode="outlined"
                                    placeholder='Nova Quantidade Mínima'
                                    placeholderTextColor={"gray"}
                                    value={novaQuantidadeMinima}
                                    onChangeText={setNovaQuantidadeMinima}
                                    keyboardType="numeric"
                                    style={styles.quantidadeModalInput}
                                    theme={{ colors: { onSurface: customTheme.colors.onSurface } }}
                                />
                            </View>

                            <View style={styles.editMinimoButtons}>
                                <Button
                                    mode="outlined"
                                    onPress={() => {
                                        setIsEditMinimoVisible(false);
                                        setNovaQuantidadeMinima('');
                                    }}
                                    style={styles.editMinimoButtonCancel}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    mode="contained"
                                    onPress={handleUpdateQuantidadeMinima}
                                    disabled={!novaQuantidadeMinima}
                                    style={styles.editMinimoButtonConfirm}
                                >
                                    Confirmar
                                </Button>
                            </View>
                        </Card.Content>
                    </Card>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    // Estilos existentes...
    produtoCardOffline: {
        opacity: 0.8, // Reduz um pouco a opacidade para indicar estado offline
    },
    offlineIndicator: {
        marginLeft: 8,
        opacity: 0.6,
    },


    unitEditContainer: {
        gap: 16,
        width: '100%',
        position: 'relative', // Importante para o posicionamento do overlay
    },

    // Estilos para o overlay de loading
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // Fundo semi-transparente
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        zIndex: 1000,
    },
    loadingText: {
        marginTop: 8,
        color: customTheme.colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },

    // Estado desabilitado para textos e botões
    unidadeMedidaButtonTextDisabled: {
        color: customTheme.colors.outline,
    },

    // Ajuste do container dos botões para suportar o overlay
    unitButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        position: 'relative', // Importante para o posicionamento do overlay
    },
    unidadeMedidaButton: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        backgroundColor: customTheme.colors.surface,
    },
    unidadeMedidaButtonActive: {
        backgroundColor: customTheme.colors.primary,
        borderColor: customTheme.colors.primary,
    },
    unidadeMedidaButtonText: {
        color: customTheme.colors.onSurface,
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    unidadeMedidaButtonTextActive: {
        color: customTheme.colors.onPrimary,
    },

    // Estilos para o botão de cancelar
    cancelUnitButton: {
        marginTop: 8,
        width: '100%',
    },

    safeArea: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    header: {
        width: '100%',
        backgroundColor: customTheme.colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        elevation: 4,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outline,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minWidth: 80,
    },
    headerText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        color: customTheme.colors.onSurface,
    },
    headerSpacer: {
        minWidth: 80,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: 16,
    },
    card: {
        marginBottom: 16,
        elevation: 2,
    },
    photoSection: {
        marginBottom: 24,
    },
    photoContainer: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: customTheme.colors.surfaceVariant,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0,
    },
    overlayText: {
        color: customTheme.colors.inverseSurface,
        marginTop: 8,
    },
    updatePhotoButton: {
        marginTop: 12,
    },
    nameDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    productName: {
        fontSize: 24,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    editNameContainer: {
        gap: 12,
    },
    nameInput: {
        backgroundColor: customTheme.colors.surface,
    },
    editButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    editButton: {
        minWidth: 100,
    },
    editIcon: {
        padding: 8,
    },
    stockSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 4,
    },
    stockValue: {
        fontSize: 24,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
    lowStock: {
        color: customTheme.colors.error,
    },
    minStockSection: {
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outline,
        paddingTop: 16,
    },
    minStockInfo: {
        marginBottom: 12,
    },
    minStockValue: {
        fontSize: 18,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    unitDisplay: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    unitValue: {
        fontSize: 18,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    descriptionText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        lineHeight: 24,
    },
    bottomSpacer: {
        height: 32,
    },

    detalheContainer: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    detalheHeader: {
        width: '100%',
        backgroundColor: customTheme.colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        elevation: 4,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outline,
        // Removido flex para não interferir no layout
    },
    detalheContent: {
        flex: 1, // Importante para permitir a rolagem
    },
    detalheContentContainer: {
        padding: 16,
        paddingBottom: 32, // Adiciona um espaço extra no final do conteúdo
    },

    mainInfoContainer: {
        width: '100%',
        gap: 24,
    },
    photoSelector: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderStyle: 'dashed',
    },
    photoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        gap: 8,
    },
    photoPreview: {
        width: '100%',
        height: '100%',
    },
    inputsSection: {
        width: '100%',
        gap: 16,
    },
    unidadeMedidaEditContainer: {
        gap: 16,
    },
    unitInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    unidadeMedidaButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelEditUnidadeButton: {
        marginTop: 8,
    },

    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    nameSection: {
        marginBottom: 16,
    },
    stockCard: {
        marginBottom: 16,
    },
    stockInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    stockLabel: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    stockAlert: {
        color: customTheme.colors.error,
    },
    minStockContainer: {
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outline,
        paddingTop: 16,
    },
    minStockLabel: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 4,
    },
    unitCard: {
        marginBottom: 16,
    },
    unitLabel: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 4,
    },
    descriptionCard: {
        marginBottom: 16,
    },
    descriptionLabel: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 8,
    },
    infoSection: {
        padding: 8,
        gap: 16,
        flex: 1,
        width: '100%',
    },


    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
        padding: 20,
        maxHeight: '90%',
        elevation: 4,
    },
    modalTitle: {
        textAlign: 'center',
        marginBottom: 24,
        color: customTheme.colors.onSurface,
        fontWeight: '600',
    },
    photoPlaceholderText: {
        color: customTheme.colors.primary,
        textAlign: 'center',
        paddingHorizontal: 8,
        fontSize: 12,
    },
    mainInputsContainer: {
        flex: 1,
        gap: 12,
    },
    input: {
        backgroundColor: customTheme.colors.surface,
    },
    quantidadesContainer: {
        gap: 12,
    },
    unidadeMedidaSection: {
        marginBottom: 24,
    },
    unidadeMedidaLabel: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        fontWeight: '500',
        marginBottom: 12,
    },
    descricaoContainer: {
        marginBottom: 24,
    },
    descricaoInput: {
        minHeight: 100,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButton: {
        minWidth: 100,
    },

    formContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    inputsContainer: {
        flex: 1,
        gap: 16,
    },
    unidadeMedidaContainer: {
        gap: 8,
    },
    editNomeContainer: {
        marginBottom: 16,
    },
    editNomeInputContainer: {
        gap: 12,
    },
    editNomeInput: {
        backgroundColor: customTheme.colors.surface,
    },
    editNomeButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    editNomeButton: {
        minWidth: 100,
    },
    nomeDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    editNomeIcon: {
        padding: 8,
    },
    imageEditButton: {
        width: '100%',
        height: '100%',
    },
    imageEditOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0,
    },
    imageEditText: {
        color: customTheme.colors.inverseSurface,
        marginTop: 8,
    },
    mainContainer: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    content: {
        flex: 1,
        padding: 16,
        backgroundColor: customTheme.colors.background,
    },
    produtoCard: {
        marginBottom: 16,
        elevation: 2,
        backgroundColor: customTheme.colors.surface,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        overflow: 'hidden',
    },
    produtoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        minHeight: 56,
    },
    produtoImageContainer: {
        width: 56,
        height: 56,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: customTheme.colors.surfaceVariant,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
    },
    produtoImage: {
        width: '100%',
        height: '100%',
    },
    produtoInfo: {
        flex: 1,
        justifyContent: 'center',
        gap: 4,
    },
    produtoNome: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        fontWeight: '500',
    },
    produtoQuantidade: {
        fontSize: 12,
        color: customTheme.colors.secondary,
    },
    fab: {
        position: 'absolute',
        borderRadius: 50,
        padding: 14,
        right: 16,
        bottom: 16,
        backgroundColor: customTheme.colors.primary,
    },
    formRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    inputColumn: {
        flex: 1,
        gap: 16,
    },
    imagePickerModal: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    imagePickerContent: {
        padding: 16,
        borderRadius: 8,
        width: '80%',
        backgroundColor: customTheme.colors.surface,
    },
    imagePickerButton: {
        marginBottom: 8,
    },
    detalheTitulo: {
        fontSize: 24,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        flex: 1,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 24,
        elevation: 2,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
    },
    detalheImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    infoContainer: {
        gap: 16,
        paddingHorizontal: 4,
    },
    quantidadeInfo: {
        backgroundColor: customTheme.colors.surface,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        elevation: 2,
    },
    quantidadeContainer: {
        padding: 16,
    },
    quantidadeLabel: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 8,
        fontWeight: '500',
    },
    quantidadeValue: {
        fontSize: 24,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
    descricaoInfo: {
        backgroundColor: customTheme.colors.surface,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        elevation: 2,
    },
    descricaoLabel: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 8,
        marginTop: 16,
        marginHorizontal: 16,
        fontWeight: '500',
    },
    descricaoValue: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        marginBottom: 16,
        marginHorizontal: 16,
        lineHeight: 24,
    },
    updateButton: {
        marginTop: 8,
        marginBottom: 24,
        borderRadius: 8,
    },
    buttonContent: {
        height: 48,
        paddingHorizontal: 16,
    },
    quantidadeModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        padding: 16,
    },
    quantidadeModalContent: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 4,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    quantidadeModalHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outline,
        backgroundColor: customTheme.colors.surface,
    },
    quantidadeModalTitle: {
        fontSize: 20,
        color: customTheme.colors.onSurface,
        fontWeight: '600',
        textAlign: 'center',
    },
    estoqueAtualInfo: {
        marginTop: 16,
        padding: 12,
        backgroundColor: customTheme.colors.secondaryContainer,
        borderRadius: 8,
        alignItems: 'center',
    },
    estoqueAtualLabel: {
        fontSize: 14,
        color: customTheme.colors.onSecondaryContainer,
        marginBottom: 4,
    },
    estoqueAtualValue: {
        fontSize: 20,
        fontWeight: '600',
        color: customTheme.colors.onSecondaryContainer,
    },
    quantidadeModalInput: {
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 16,
        backgroundColor: customTheme.colors.surface,
    },
    quantidadeModalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outline,
    },
    quantidadeModalButton: {
        flex: 1,
        borderRadius: 8,
    },
    somarButton: {
        backgroundColor: customTheme.colors.primary,
    },
    atualizarButton: {
        backgroundColor: customTheme.colors.secondary,
    },
    quantidadeModalButtonContent: {
        height: 48,
        paddingHorizontal: 8,
    },
    tipoAtualizacaoContainer: {
        padding: 20,
        gap: 16,
    },
    tipoAtualizacaoButton: {
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
    },
    somarContainer: {
        backgroundColor: customTheme.colors.primaryContainer,
        borderWidth: 1,
        borderColor: customTheme.colors.primary,
    },
    atualizarContainer: {
        backgroundColor: customTheme.colors.secondaryContainer,
        borderWidth: 1,
        borderColor: customTheme.colors.secondary,
    },
    tipoAtualizacaoContent: {
        padding: 20,
        alignItems: 'center',
        gap: 12,
    },
    tipoAtualizacaoTitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    tipoAtualizacaoDescription: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    quantidadeMinimaContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outline,
    },
    quantidadeMinimaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    quantidadeMinimaLabel: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        fontWeight: '500',
    },
    quantidadeMinimaValue: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
    editMinimoButton: {
        borderRadius: 8,
    },
    editMinimoModal: {
        margin: 16,
        maxWidth: 400,
        width: '100%',
        alignSelf: 'center',
    },
    editMinimoTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginBottom: 16,
        textAlign: 'center',
    },
    editMinimoContent: {
        gap: 16,
    },
    editMinimoDesc: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center',
    },
    editMinimoCurrentContainer: {
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    editMinimoCurrentLabel: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 4,
    },
    editMinimoCurrentValue: {
        fontSize: 20,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
    editMinimoButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 24,
    },
    editMinimoButtonCancel: {
        flex: 1,
    },
    editMinimoButtonConfirm: {
        flex: 1,
        backgroundColor: customTheme.colors.primary,
    },
    quantidadeBaixa: {
        color: customTheme.colors.error,
    },
    produtoCardAlerta: {
        borderColor: customTheme.colors.error,
        borderWidth: 1,
        backgroundColor: customTheme.colors.errorContainer,
    },
    produtoTituloContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    produtoQuantidadeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    produtoQuantidadeAlerta: {
        color: customTheme.colors.error,
        fontWeight: 'bold',
    },
    produtoQuantidadeMinima: {
        fontSize: 12,
        color: customTheme.colors.error,
        fontStyle: 'italic',
    },
});