import { useEffect, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Animated,
    Modal,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import { customTheme } from '../../../../theme/theme';
import { UnidadeMedida } from './lavagemTypes';

interface NewProductModalProps {
    visible: boolean;
    onClose: () => void;
    isOnline: boolean;
    showImagePickerOptions: () => void;
    photoUri: string | undefined | null;
    setPhotoUri: (uri: string | undefined | null) => void;
    detailImageError: boolean;
    handleDetailImageError: () => void;
    forceSync: () => Promise<void>;
}

export default function NewProductModal({
    visible,
    onClose,
    isOnline,
    showImagePickerOptions,
    photoUri,
    setPhotoUri,
    detailImageError,
    handleDetailImageError,
    forceSync
}: NewProductModalProps) {
    // Estados para o formulário
    const [nome, setNome] = useState('');
    const [quantidade, setQuantidade] = useState('');
    const [quantidadeMinima, setQuantidadeMinima] = useState('');
    const [unidadeMedida, setUnidadeMedida] = useState<'unidade' | 'kilo' | 'litro'>('unidade');
    const [isSaving, setIsSaving] = useState(false);

    // Referências para animação
    const productSlideAnim = useRef(new Animated.Value(500)).current;
    const unidadeIconAnim = {
        unidade: useRef(new Animated.Value(1)).current,
        kilo: useRef(new Animated.Value(1)).current,
        litro: useRef(new Animated.Value(1)).current
    };

    // Efeito para animar a entrada da modal
    useEffect(() => {
        if (visible) {
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
    }, [visible]);

    // Efeito para inicializar animações de unidade de medida
    useEffect(() => {
        if (visible) {
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
    }, [visible]);

    // Efeito para animar ícone da unidade selecionada
    useEffect(() => {
        // Só executa se a modal estiver visível e se tiver uma unidade selecionada
        if (visible && unidadeMedida) {
            animateIcon(unidadeMedida);
        }
    }, [unidadeMedida]);

    // Função para animar o ícone selecionado
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

    // Função para selecionar unidade de medida
    const handleUnidadeSelect = (type: UnidadeMedida) => {
        setUnidadeMedida(type);
        animateIcon(type);
    };

    // Função para fechar modal com animação
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
            resetForm();
            onClose();
        }, 150);
    };

    // Resetar formulário
    const resetForm = () => {
        setNome('');
        setQuantidade('');
        setQuantidadeMinima('');
        setPhotoUri(null);
        setUnidadeMedida('unidade');
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

            const novoProduto = {
                nome: nome.trim(),
                quantidade: quantidade.trim(),
                quantidadeMinima: quantidadeMinima.trim(),
                unidadeMedida,
                photoUrl,
                createdAt: now,
                updatedAt: now,
            };

            await firestore().collection('produtos').add(novoProduto);
            await forceSync(); // Força sincronização após adicionar

            showGlobalToast('success', 'Produto adicionado com sucesso', '', 4000);

            resetForm();
            closeProductModal();
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            showGlobalToast('error', 'Erro ao salvar produto', 'Tente novamente mais tarde', 4000);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
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
                                onPress={showImagePickerOptions}
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
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        backgroundColor: customTheme.colors.errorContainer ?
            customTheme.colors.errorContainer :
            customTheme.colors.surfaceVariant,
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
    unidadeMedidaButtonText: {
        color: customTheme.colors.onSurface,
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    unidadeMedidaButtonTextActive: {
        color: customTheme.colors.onPrimary,
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
    closeButton: {
        padding: 8,
        marginRight: -8,
    },
});