import {
    ActivityIndicator,
    Animated,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button, Card, Surface, Text, TextInput } from 'react-native-paper';
import { ProdutoEstoque, UnidadeMedida } from './Components/lavagemTypes';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db, dbStorage } from '../../../../firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useEffect, useRef, useState } from 'react';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../../assets/components/ModernHeader';
import { customTheme } from '../../../theme/theme';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import { useBackgroundSync } from '../../../contexts/backgroundSyncContext';
import { useNetwork } from '../../../contexts/NetworkContext';

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

    const [imageErrors, setImageErrors] = useState<{ [id: string]: boolean }>({});
    const [detailImageError, setDetailImageError] = useState(false);

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
            if (selectedProduto.id) {
                await updateDoc(doc(db(), 'produtos', selectedProduto.id), {
                    nome: novoNome.trim(),
                    updatedAt: new Date().toISOString(),
                });
            } else {
                console.error('Produto ID is undefined');
                showGlobalToast('error', 'Erro ao atualizar nome', 'ID do produto não encontrado', 4000);
            }
    
            await forceSync();
    
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
    
        setIsSavingPhoto(true);
        try {
            const now = new Date().toISOString();
            const filename = `produtos/${now}_${selectedProduto.nome.trim()}.jpg`;
            const reference = ref(dbStorage(), filename);
    
            const response = await fetch(photoUri);
            const blob = await response.blob();
            await uploadBytes(reference, blob);
            const photoUrl = await getDownloadURL(reference);
    
            if (selectedProduto.id) {
                await updateDoc(doc(db(), 'produtos', selectedProduto.id), {
                    photoUrl,
                    updatedAt: now,
                });
            } else {
                console.error('Produto ID is undefined');
                showGlobalToast('error', 'Erro ao atualizar foto', 'ID do produto não encontrado', 4000);
            }
    
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
            setIsSavingPhoto(false);
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
    
            if (selectedProduto.id) {
                await updateDoc(doc(db(), 'produtos', selectedProduto.id), {
                    quantidade: novaQuantidadeTotal,
                    updatedAt: new Date().toISOString(),
                });
            } else {
                console.error('Produto ID is undefined');
                showGlobalToast('error', 'Erro ao atualizar quantidade', 'ID do produto não encontrado', 4000);
            }
    
            await forceSync();
    
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
    
            if (selectedProduto.id) {
                await updateDoc(doc(db(), 'produtos', selectedProduto.id), {
                    unidadeMedida: novaUnidade,
                    updatedAt: new Date().toISOString(),
                });
            } else {
                console.error('Produto ID is undefined');
                showGlobalToast('error', 'Erro ao atualizar unidade de medida', 'ID do produto não encontrado', 4000);
            }
    
            await forceSync();
    
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
                const reference = ref(dbStorage(), filename);
                const response = await fetch(photoUri);
                const blob = await response.blob();
                await uploadBytes(reference, blob);
                photoUrl = await getDownloadURL(reference);
            }
    
            const novoProduto: ProdutoEstoque = {
                nome: nome.trim(),
                quantidade: quantidade.trim(),
                quantidadeMinima: quantidadeMinima.trim(),
                unidadeMedida,
                photoUrl,
                createdAt: now,
                updatedAt: now,
            };
    
            await addDoc(collection(db(), 'produtos'), novoProduto);
            await forceSync();
    
            showGlobalToast('success', 'Produto adicionado com sucesso', '', 4000);
    
            setNome('');
            setQuantidade('');
            setQuantidadeMinima('');
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
            if (selectedProduto.id) {
                await updateDoc(doc(db(), 'produtos', selectedProduto.id), {
                    quantidadeMinima: novaQuantidadeMinima,
                    updatedAt: new Date().toISOString(),
                });
            } else {
                console.error('Produto ID is undefined');
                showGlobalToast('error', 'Erro ao atualizar', 'ID do produto não encontrado', 4000);
            }
    
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

    // Função para tratar erros de carregamento de imagem
    const handleImageError = (produtoId?: string) => {
        if (produtoId) {
            setImageErrors(prev => ({
                ...prev,
                [produtoId]: true
            }));
        }
    };

    // Função para tratar erro de imagem na tela de detalhes
    const handleDetailImageError = () => {
        setDetailImageError(true);
    };

    // === ANIMATIONS ===
    const slideAnim = useRef(new Animated.Value(300)).current; // Começa fora da tela (300 é um exemplo)
    const productSlideAnim = useRef(new Animated.Value(500)).current;

    useEffect(() => {
        if (isImagePickerVisible) {
            // Quando a modal se torna visível, deslize para cima
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                speed: 12,
                bounciness: 2,
                overshootClamping: true
            }).start();
        } else {
            // Quando a modal se fecha, animamos de volta para baixo
            // Nota: isso só tem efeito se você gerenciar o fechamento da modal manualmente
            slideAnim.setValue(300);
        }
    }, [isImagePickerVisible]);

    const closeImagePicker = () => {
        Animated.spring(slideAnim, {
            toValue: 500,
            bounciness: 2,
            speed: 20,
            useNativeDriver: true
        }).start();

        // Definir um timeout um pouco menor que a duração esperada da animação
        setTimeout(() => {
            setIsImagePickerVisible(false);
        }, 150); // 300ms é geralmente suficiente para a animação com esses parâmetros
    };

    // ANIMAÇÂO DO NOVO PRODUTO
    useEffect(() => {
        if (modalVisible) {
            // Animação de entrada com spring para um efeito mais natural
            Animated.spring(productSlideAnim, {
                toValue: 0,
                useNativeDriver: true,
                speed: 12,
                bounciness: 5
            }).start();
        } else {
            // Reset para a próxima abertura
            productSlideAnim.setValue(500);
        }
    }, [modalVisible]);

    // Substitua a função que fecha a modal por esta:
    const closeProductModal = () => {
        // Inicia a animação de saída
        Animated.spring(productSlideAnim, {
            toValue: 800,
            speed: 20,
            bounciness: 2,
            useNativeDriver: true,
            overshootClamping: true
        }).start();

        // Usa setTimeout para fechar a modal após um curto período
        setTimeout(() => {
            setModalVisible(false);
            // Reset outros estados aqui se necessário
            setNome('');
            setQuantidade('');
            setQuantidadeMinima('');
            setPhotoUri(null);
            setUnidadeMedida('unidade');
        }, 150);
    };

    // ANIMAÇÂO DAS UNIDADES DE MEDIDA
    const unidadeIconAnim = {
        unidade: useRef(new Animated.Value(1)).current,
        kilo: useRef(new Animated.Value(1)).current,
        litro: useRef(new Animated.Value(1)).current
    };

    // 2. Adicione esta função para animar o ícone selecionado
    const animateIcon = (type: 'unidade' | 'kilo' | 'litro') => {
        // Reseta outros ícones
        (Object.keys(unidadeIconAnim) as Array<'unidade' | 'kilo' | 'litro'>).forEach(key => {
            if (key !== type) {
                Animated.timing(unidadeIconAnim[key], {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true
                }).start();
            }
        });

        // Anima o ícone selecionado
        Animated.spring(unidadeIconAnim[type], {
            toValue: 1.2,
            friction: 3,
            tension: 40,
            useNativeDriver: true
        }).start();
    };

    const handleUnidadeSelect = (type: UnidadeMedida) => {
        setUnidadeMedida(type);
        animateIcon(type);
    };

    // Adicione este useEffect para inicializar as animações quando a modal abrir
    useEffect(() => {
        if (modalVisible) {
            // Reseta todos os ícones para o estado inicial
            Object.keys(unidadeIconAnim).forEach(key => {
                (unidadeIconAnim[key as 'unidade' | 'kilo' | 'litro']).setValue(1);
            });

            // Se já tiver uma unidade selecionada, anima ela
            if (unidadeMedida) {
                // Pequeno delay para garantir que a UI já esteja renderizada
                setTimeout(() => {
                    animateIcon(unidadeMedida);
                }, 300);
            }
        }
    }, [modalVisible]);

    useEffect(() => {
        // Só executa se a modal estiver visível e se tiver uma unidade selecionada
        if (modalVisible && unidadeMedida) {
            animateIcon(unidadeMedida);
        }
    }, [unidadeMedida]);



    // Resetar erro de imagem de detalhe quando abrir/fechar o modal
    useEffect(() => {
        if (!isDetalhesVisible) {
            setDetailImageError(false);
        }
    }, [isDetalhesVisible]);

    // Resetar erro de imagem de detalhe quando selecionar uma nova imagem
    useEffect(() => {
        if (photoUri && isUpdatePhoto) {
            setDetailImageError(false);
        }
    }, [photoUri, isUpdatePhoto]);

    return (
        <View style={styles.mainContainer}>

            <ModernHeader
                title="Controle de Estoque"
                iconName="history"
                onBackPress={() => navigation.goBack()}
                rightIcon='plus-box'
                rightAction={() => setModalVisible(true)}
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
                                            {produto.photoUrl && !imageErrors[produto.id || ''] ? (
                                                <Image
                                                    source={{ uri: produto.photoUrl }}
                                                    style={styles.produtoImage}
                                                    resizeMode="cover"
                                                    onError={() => handleImageError(produto.id)}
                                                />
                                            ) : (
                                                <View style={[styles.produtoImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: customTheme.colors.errorContainer }]}>
                                                    {imageErrors[produto.id || ''] ? (
                                                        <>
                                                            <Icon
                                                                name="image-broken"
                                                                size={24}
                                                                color={customTheme.colors.error}
                                                            />
                                                            <Text style={styles.imageErrorText}>Erro na imagem</Text>
                                                        </>
                                                    ) : (
                                                        <Icon
                                                            name="image-off"
                                                            size={24}
                                                            color={customTheme.colors.onSurfaceVariant}
                                                        />
                                                    )}
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

            {/* Modal para criar novo produto com animação de slide */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="none"
                onRequestClose={closeProductModal}
            >
                <View style={styles.productModalOverlay}>
                    <TouchableOpacity
                        style={styles.productModalBackdrop}
                        activeOpacity={1}
                        onPress={closeProductModal}
                    />

                    <Animated.View
                        style={[
                            styles.productModalContainer,
                            { transform: [{ translateY: productSlideAnim }] }
                        ]}
                    >
                        <View style={styles.productModalHeader}>
                            <TouchableOpacity
                                onPress={closeProductModal}
                                style={styles.closeButton}
                            >
                                <Icon name="close" size={24} color={customTheme.colors.onSurface} />
                            </TouchableOpacity>

                            <Text style={styles.productModalTitle}>
                                Novo Produto
                            </Text>

                            <View style={styles.headerSpacer} />
                        </View>

                        <ScrollView
                            style={styles.productModalContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Área da foto */}
                            <View style={styles.photoSection}>
                                <TouchableOpacity
                                    onPress={() => showImagePickerOptions(true)}
                                    style={styles.photoContainer}
                                >
                                    {photoUri && !detailImageError ? (
                                        <Image
                                            source={{ uri: photoUri }}
                                            style={styles.productImage}
                                            resizeMode="cover"
                                            onError={handleDetailImageError}
                                        />
                                    ) : (
                                        <View style={styles.placeholderContainer}>
                                            {detailImageError ? (
                                                <>
                                                    <Icon
                                                        name="image-broken"
                                                        size={48}
                                                        color={customTheme.colors.error}
                                                    />
                                                    <Text style={styles.detailImageErrorText}>
                                                        Erro ao carregar imagem
                                                    </Text>
                                                    <Text style={styles.detailImageErrorSubtext}>
                                                        Clique para substituir a imagem
                                                    </Text>
                                                </>
                                            ) : (
                                                <>
                                                    <Icon
                                                        name="image-plus"
                                                        size={48}
                                                        color={customTheme.colors.primary}
                                                    />
                                                    <Text style={styles.addPhotoText}>
                                                        Adicionar foto do produto
                                                    </Text>
                                                </>
                                            )}
                                        </View>
                                    )}
                                    <View style={styles.imageOverlay}>
                                        <Icon
                                            name="camera-plus"
                                            size={32}
                                            color={customTheme.colors.inverseSurface}
                                        />
                                        <Text style={styles.overlayText}>
                                            {detailImageError ? 'Substituir Imagem' : 'Adicionar Foto'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Informações Principais */}
                            <View style={styles.inputsSection}>
                                <Text style={styles.sectionTitle}>Informações do Produto</Text>

                                <TextInput
                                    mode="outlined"
                                    label="Nome do Produto"
                                    placeholder="Ex: Detergente Líquido"
                                    placeholderTextColor="gray"
                                    value={nome}
                                    onChangeText={setNome}
                                    style={styles.input}
                                    theme={{ colors: { onSurface: customTheme.colors.onSurface } }}
                                />

                                <View style={styles.quantidadesContainer}>
                                    <TextInput
                                        mode="outlined"
                                        label="Quantidade Inicial"
                                        placeholder="Ex: 10"
                                        placeholderTextColor="gray"
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
                                        label="Quantidade Mínima"
                                        placeholder="Ex: 5"
                                        placeholderTextColor="gray"
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

                            {/* Unidade de Medida */}
                            <View style={styles.unidadeMedidaSection}>
                                <Text style={styles.sectionTitle}>Unidade de Medida</Text>
                                <View style={styles.unidadeMedidaButtons}>
                                    <TouchableOpacity
                                        style={[
                                            styles.unidadeMedidaButtonNew,
                                            unidadeMedida === 'unidade' && styles.unidadeMedidaButtonActiveNew
                                        ]}
                                        onPress={() => handleUnidadeSelect('unidade')}
                                    >
                                        <Animated.View style={{
                                            transform: [
                                                { scale: unidadeIconAnim.unidade },
                                                {
                                                    rotate: unidadeIconAnim.unidade.interpolate({
                                                        inputRange: [1, 1.2],
                                                        outputRange: ['0deg', '25deg']
                                                    })

                                                }
                                            ]
                                        }}>
                                            <Icon
                                                name="package-variant"
                                                size={24}
                                                color={unidadeMedida === 'unidade' ? customTheme.colors.onPrimary : customTheme.colors.onSurface}
                                            />
                                        </Animated.View>
                                        <Text style={[
                                            styles.unidadeMedidaButtonText,
                                            unidadeMedida === 'unidade' && styles.unidadeMedidaButtonTextActive
                                        ]}>
                                            Unidade
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.unidadeMedidaButtonNew,
                                            unidadeMedida === 'kilo' && styles.unidadeMedidaButtonActiveNew
                                        ]}
                                        onPress={() => handleUnidadeSelect('kilo')}
                                    >
                                        <Animated.View style={{
                                            transform: [
                                                { scale: unidadeIconAnim.kilo },
                                                {
                                                    rotate: unidadeIconAnim.kilo.interpolate({
                                                        inputRange: [1, 1.2],
                                                        outputRange: ['0deg', '25deg']
                                                    })
                                                }
                                            ]
                                        }}>
                                            <Icon
                                                name="weight-kilogram"
                                                size={24}
                                                color={unidadeMedida === 'kilo' ? customTheme.colors.onPrimary : customTheme.colors.onSurface}
                                            />
                                        </Animated.View>
                                        <Text style={[
                                            styles.unidadeMedidaButtonText,
                                            unidadeMedida === 'kilo' && styles.unidadeMedidaButtonTextActive
                                        ]}>
                                            Kilo
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.unidadeMedidaButtonNew,
                                            unidadeMedida === 'litro' && styles.unidadeMedidaButtonActiveNew
                                        ]}
                                        onPress={() => handleUnidadeSelect('litro')}
                                    >
                                        <Animated.View style={{
                                            transform: [
                                                { scale: unidadeIconAnim.litro },
                                                {
                                                    rotate: unidadeIconAnim.litro.interpolate({
                                                        inputRange: [1, 1.2],
                                                        outputRange: ['0deg', '25deg']
                                                    })

                                                }
                                            ]
                                        }}>
                                            <Icon
                                                name="bottle-tonic"
                                                size={24}
                                                color={unidadeMedida === 'litro' ? customTheme.colors.onPrimary : customTheme.colors.onSurface}
                                            />
                                        </Animated.View>
                                        <Text style={[
                                            styles.unidadeMedidaButtonText,
                                            unidadeMedida === 'litro' && styles.unidadeMedidaButtonTextActive
                                        ]}>
                                            Litro
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Espaço extra para garantir que o conteúdo seja visível */}
                            <View style={{ height: 100 }} />
                        </ScrollView>

                        {/* Footer com botões fixos */}
                        <View style={styles.productModalFooter}>
                            <Button
                                mode="outlined"
                                onPress={closeProductModal}
                                disabled={isSaving}
                                style={styles.footerButton}
                                contentStyle={styles.buttonContent}
                            >
                                Cancelar
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleSave}
                                loading={isSaving}
                                disabled={isSaving || !nome.trim() || !quantidade.trim() || !quantidadeMinima.trim()}
                                style={styles.footerButton}
                                contentStyle={styles.buttonContent}
                            >
                                Salvar
                            </Button>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* Modal de escolha de câmera/galeria */}
            <Modal
                visible={isImagePickerVisible}
                transparent
                animationType="none" // Mudamos para "none" para controlar a animação manualmente
                onRequestClose={() => closeImagePicker()}
            >
                <View style={styles.imagePickerModalOverlay}>
                    <TouchableOpacity
                        style={styles.imagePickerBackdrop}
                        activeOpacity={1}
                        onPress={() => closeImagePicker()}
                    />

                    {/* Componente deslizante */}
                    <Animated.View
                        style={[
                            styles.imagePickerModalContainer,
                            {
                                transform: [{
                                    translateY: slideAnim // Usaremos um valor Animated aqui
                                }]
                            }
                        ]}
                    >
                        <View style={styles.imagePickerHeader}>
                            <Text style={styles.imagePickerTitle}>Selecionar imagem</Text>
                            <TouchableOpacity
                                onPress={() => closeImagePicker()}
                                style={styles.closeButton}
                            >
                                <Icon name="close" size={24} color={customTheme.colors.onSurface} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.imagePickerOptions}>
                            <TouchableOpacity
                                style={styles.imagePickerOption}
                                onPress={() => {
                                    closeImagePicker();
                                    launchCustomCamera(!!selectedProduto);
                                }}
                            >
                                <View style={styles.imageOptionIconContainer}>
                                    <Icon name="camera" size={28} color={customTheme.colors.primary} />
                                </View>
                                <Text style={styles.imageOptionTitle}>Tirar Foto</Text>
                                <Text style={styles.imageOptionSubtitle}>Usar a câmera do dispositivo</Text>
                            </TouchableOpacity>

                            <View style={styles.optionDivider} />

                            <TouchableOpacity
                                style={styles.imagePickerOption}
                                onPress={() => {
                                    closeImagePicker();
                                    selectImage(!!selectedProduto);
                                }}
                            >
                                <View style={styles.imageOptionIconContainer}>
                                    <Icon name="image" size={28} color={customTheme.colors.secondary} />
                                </View>
                                <Text style={styles.imageOptionTitle}>Escolher da Galeria</Text>
                                <Text style={styles.imageOptionSubtitle}>Selecionar uma imagem existente</Text>
                            </TouchableOpacity>
                        </View>

                        {photoUri && (
                            <TouchableOpacity
                                style={styles.removePhotoButton}
                                onPress={() => {
                                    setPhotoUri(null);
                                    closeImagePicker();
                                    setIsUpdatePhoto(false);
                                }}
                            >
                                <Icon name="trash-can-outline" size={20} color={customTheme.colors.error} />
                                <Text style={styles.removePhotoText}>Remover foto atual</Text>
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                </View>
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
                                {photoUri && !detailImageError ? (
                                    <Image
                                        source={{ uri: photoUri }}
                                        style={styles.productImage}
                                        resizeMode="cover"
                                        onError={handleDetailImageError}
                                    />
                                ) : (
                                    <View style={[
                                        styles.placeholderContainer,
                                        detailImageError && { backgroundColor: customTheme.colors.errorContainer }
                                    ]}>
                                        {detailImageError ? (
                                            <>
                                                <Icon
                                                    name="image-broken"
                                                    size={48}
                                                    color={customTheme.colors.error}
                                                />
                                                <Text style={styles.detailImageErrorText}>
                                                    Erro ao carregar imagem
                                                </Text>
                                                <Text style={styles.detailImageErrorSubtext}>
                                                    Clique para substituir a imagem
                                                </Text>
                                            </>
                                        ) : (
                                            <Icon
                                                name="image-off"
                                                size={48}
                                                color={customTheme.colors.onSurfaceVariant}
                                            />
                                        )}
                                    </View>
                                )}
                                <View style={styles.imageOverlay}>
                                    <Icon
                                        name="camera-plus"
                                        size={32}
                                        color={customTheme.colors.inverseSurface}
                                    />
                                    <Text style={styles.overlayText}>
                                        {detailImageError ? 'Substituir Imagem' : 'Alterar Foto'}
                                    </Text>
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
    productModalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    productModalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    productModalContainer: {
        backgroundColor: customTheme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%', // Limita a altura máxima
        // Sombra para dar efeito de elevação
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    productModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outlineVariant || customTheme.colors.outline,
    },
    headerSpacer: {
        width: 40, // Para manter o título centralizado
    },
    productModalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        textAlign: 'center',
    },
    productModalContent: {
        padding: 20,
    },
    photoSection: {
        marginBottom: 24,
        alignItems: 'center',
    },
    photoContainer: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: customTheme.colors.surfaceVariant,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderStyle: 'dashed',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    addPhotoText: {
        fontSize: 14,
        fontWeight: '500',
        color: customTheme.colors.primary,
        marginTop: 8,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginBottom: 12,
    },
    inputsSection: {
        marginBottom: 24,
        gap: 16,
    },
    input: {
        backgroundColor: customTheme.colors.surface,
        marginBottom: 8,
    },
    quantidadesContainer: {
        gap: 12,
    },
    unidadeMedidaSection: {
        marginBottom: 24,
    },
    unidadeMedidaButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    // Novos estilos modernizados para botões de unidade
    unidadeMedidaButtonNew: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        backgroundColor: customTheme.colors.surface,
        elevation: 1,
    },
    unidadeMedidaButtonActiveNew: {
        backgroundColor: customTheme.colors.primary,
        borderColor: customTheme.colors.primary,
        elevation: 3,
    },
    productModalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outlineVariant || customTheme.colors.outline,
        backgroundColor: customTheme.colors.surface,
    },
    footerButton: {
        flex: 1,
        marginHorizontal: 8,
        borderRadius: 8,
    },
    buttonContent: {
        paddingVertical: 6,
    },
    imagePickerModalOverlay: {
        flex: 1,
        justifyContent: 'flex-end', // Mantém o conteúdo no final da tela
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Overlay escuro
    },
    imagePickerBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    imagePickerModalContainer: {
        backgroundColor: customTheme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24, // Espaço extra para iPhones com notch
        // Sombra para dar efeito de elevação
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        // Garantindo que a modal tenha uma posição fixa
        width: '100%',
        // Não definimos altura fixa para se adaptar ao conteúdo
    },
    imagePickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.outlineVariant || customTheme.colors.outline,
    },
    imagePickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
    closeButton: {
        padding: 8, // Aumentado para facilitar o toque
        marginRight: -8, // Compensa o padding
    },
    imagePickerOptions: {
        paddingVertical: 16,
    },
    imagePickerOption: {
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    imageOptionIconContainer: {
        width: 52, // Ligeiramente maior
        height: 52, // Ligeiramente maior
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        marginBottom: 12,
    },
    imageOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginBottom: 4,
    },
    imageOptionSubtitle: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    optionDivider: {
        height: 1,
        backgroundColor: customTheme.colors.outlineVariant || customTheme.colors.outline,
        marginHorizontal: 24,
        opacity: 0.6,
    },
    removePhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16, // Aumentado
        marginHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: customTheme.colors.errorContainer,
    },
    removePhotoText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
        color: customTheme.colors.error,
    },
    imageErrorText: {
        fontSize: 10,
        color: customTheme.colors.error,
        textAlign: 'center',
        marginTop: 4,
    },
    detailImageErrorText: {
        fontSize: 16,
        color: customTheme.colors.error,
        textAlign: 'center',
        marginTop: 12,
        fontWeight: '500',
    },
    detailImageErrorSubtext: {
        fontSize: 14,
        color: customTheme.colors.error,
        textAlign: 'center',
        marginTop: 4,
        opacity: 0.8,
    },
    // Modifique o estilo placeholderContainer para melhor suportar mensagens de erro
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        backgroundColor: customTheme.colors.errorContainer ?
            customTheme.colors.errorContainer :
            customTheme.colors.surfaceVariant,
    },
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
    bottomSpacer: {
        height: 32,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        padding: 16,
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
    produtoQuantidadeMinima: {
        fontSize: 12,
        color: customTheme.colors.error,
        fontStyle: 'italic',
    },
});