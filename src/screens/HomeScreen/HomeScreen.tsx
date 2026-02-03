import {
    ActivityIndicator,
    Animated,
    BackHandler,
    Dimensions,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Surface,
    Text,
} from 'react-native-paper';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getDownloadURL, getMetadata, list, ref } from 'firebase/storage';

import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationService from '../../service/NotificationService';
import QuickActionsGrid from './components/QuickActionsGrid';
import UpdateNotification from './components/UpdateNotification';
import UserInfoModal from './components/UserInfoModal';
import UserProfileModal from './components/UserInfoModal';
import checkPermissions from '../../helpers/checkPermissions';
import { customTheme } from '../../theme/theme';
import { dbStorage } from '../../../firebase';
import { firebaseApp } from '../../../firebase'; // Ajuste o caminho conforme sua estrutura
import { showGlobalToast } from '../../helpers/GlobalApi';
import { useAppUpdater } from '../../helpers/AppUpdater';
import { useNetwork } from '../../contexts/NetworkContext';
import { useUser } from '../../contexts/userContext';
import { version } from '../../../package.json';

interface CarouselItem {
    id: string;
    imageUrl: string;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32; // Mesma largura útil que o QuickActionsGrid

export default function HomeScreen({ navigation }: { navigation: any }) {
    const { userInfo, isLoading, clearUserInfo, updateUserInfo } = useUser();
    const { isOnline } = useNetwork();

    const [updateModalVisible, setUpdateModalVisible] = useState(false);
    const permissionsChecked = useRef(false);
    const [isUserModalVisible, setIsUserModalVisible] = useState(false);

    const [backPressedOnce, setBackPressedOnce] = useState(false);

    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const [carouselData, setCarouselData] = useState<CarouselItem[]>([]);
    const [carouselLoading, setCarouselLoading] = useState(true);

    const [showAvatarTooltip, setShowAvatarTooltip] = useState(false);
    const tooltipOpacity = useRef(new Animated.Value(0)).current;

    const {
        updateInfo,
        updateState,
        checkForUpdates,
        downloadAndInstall
    } = useAppUpdater();

    useEffect(() => {
        if (!permissionsChecked.current) {
            checkPermissions();
            permissionsChecked.current = true;
        }

        // Verificar atualizações explicitamente ao abrir o app
        checkForUpdates();

        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            // Verifica se é uma ação de reset (logout) ou uma navegação normal
            if (e.data.action.type === 'RESET') {
                // Permite a navegação de reset (logout)
                return;
            }

            // Previne a ação padrão
            e.preventDefault();

            // Se for tentativa de voltar para o login, bloqueia
            if (e.data.action.type === 'GO_BACK' && e.data.target === 'Login') {
                return;
            }

            // Lógica do duplo toque para sair
            if (backPressedOnce) {
                setBackPressedOnce(false)
                BackHandler.exitApp();
                return;
            }

            setBackPressedOnce(true);

            showGlobalToast(
                'info',
                'Sair do aplicativo',
                'Pressione voltar novamente para sair',
                4000,
                'bottom',
                true
            );

            setTimeout(() => {
                setBackPressedOnce(false);
            }, 5000);
        });

        return unsubscribe;
    }, [navigation, backPressedOnce]);

    useEffect(() => {
        return () => {
            NotificationService.cancelAllNotifications();
        };
    }, [isOnline]);

    // Função para esconder o tooltip
    const dismissTooltip = () => {
        Animated.timing(tooltipOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
        }).start(() => {
            setShowAvatarTooltip(false);
        });
    };

    const handleLogout = async () => {
        try {
            await clearUserInfo();
            // Usando reset para navegar para o login
            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            showGlobalToast(
                'error',
                'Erro ao sair',
                'Não foi possível fazer logout',
                4000
            );
        }
    };

    const scrollToNextItem = useCallback(() => {
        if (scrollViewRef.current && carouselData.length > 0) {
            const nextIndex = (currentIndex + 1) % carouselData.length;
            // Usar o width total da tela para calcular a posição exata
            scrollViewRef.current.scrollTo({
                x: nextIndex * width,
                animated: true
            });
            setCurrentIndex(nextIndex);
        }
    }, [currentIndex, carouselData.length, width]);

    // Função para lidar com o fim do scroll manual
    const handleScrollEnd = (event: any) => {
        const contentOffset = event.nativeEvent.contentOffset;
        // Calcular o índice baseado na largura total da tela
        const index = Math.round(contentOffset.x / width);
        setCurrentIndex(index);
    };

    useEffect(() => {
        if (updateInfo && !updateModalVisible) {
            if (updateInfo.obrigatoria) {
                setUpdateModalVisible(true);
            }
        }
    }, [updateInfo]);

    // Configurar o intervalo de scroll automático
    useEffect(() => {
        const interval = setInterval(scrollToNextItem, 5000);

        return () => clearInterval(interval);
    }, [scrollToNextItem]);

    // Atualizar fetchCarouselImages
    const fetchCarouselImages = async () => {
        try {
            // Referência para a pasta no Storage
            const storageRef = ref(dbStorage(), 'carrosel_Mobile');

            // Lista todos os itens na pasta
            const result = await list(storageRef);

            // Obtém as URLs de download para cada imagem
            const imagePromises = result.items.map(async (item) => {
                const url = await getDownloadURL(item);
                const metadata = await getMetadata(item);

                return {
                    id: item.name, // Usa o nome do arquivo como ID
                    imageUrl: url,
                    createdAt: metadata.timeCreated // Para ordenação
                };
            });

            const images = await Promise.all(imagePromises);

            // Ordena as imagens por data de criação (mais recentes primeiro)
            const sortedImages = images.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            setCarouselData(sortedImages);
        } catch (error) {
            console.error('Erro ao carregar imagens do carrossel:', error);
        } finally {
            setCarouselLoading(false);
        }
    };

    //Renders
    const renderCarouselContent = () => {
        if (!isOnline) {
            return (
                <View style={styles.offlinePlaceholder}>
                    <Icon
                        name="cloud-off-outline"
                        size={40}
                        color={customTheme.colors.onSurfaceVariant}
                    />
                    <Text style={styles.offlineText}>
                        Sem conexão com a internet
                    </Text>
                    <Text style={styles.offlineSubtext}>
                        Verifique sua conexão e tente novamente
                    </Text>
                </View>
            );
        }

        if (carouselLoading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator
                        size="large"
                        color={customTheme.colors.primary}
                    />
                </View>
            );
        }

        if (carouselData.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Icon
                        name="image-off"
                        size={40}
                        color={customTheme.colors.onSurfaceVariant}
                    />
                    <Text style={styles.emptyText}>
                        Nenhuma imagem disponível
                    </Text>
                </View>
            );
        }

        return (
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={width}  // Usar a largura total da tela
                snapToAlignment="center"
                pagingEnabled
                onMomentumScrollEnd={handleScrollEnd}
            >
                {carouselData.map((item) => (
                    <View
                        key={item.id}
                        style={[styles.carouselItemWrapper, { width }]}  // Garantir que cada item tenha a largura total da tela
                    >
                        <View style={styles.carouselItem}>
                            <Image
                                source={{ uri: item.imageUrl }}
                                style={styles.carouselImage}
                                resizeMode="cover"
                            />
                        </View>
                    </View>
                ))}
            </ScrollView>
        );
    };

    useEffect(() => {
        fetchCarouselImages();
    }, []);

    return (
        <SafeAreaView style={styles.safeArea}>
            <Surface style={styles.container}>

                {/* Novo Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <View style={styles.avatarWrapper}>
                            <TouchableOpacity
                                style={styles.avatarContainer}
                                onPress={() => {
                                    // Se o tooltip estiver visível, apenas fecha ele
                                    if (showAvatarTooltip) {
                                        dismissTooltip();
                                        return;
                                    }
                                    setIsUserModalVisible(true);
                                }}
                            >
                                {userInfo?.photoURL ? (
                                    <Image
                                        source={{ uri: userInfo.photoURL }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <Icon
                                        name="account"
                                        size={30}
                                        color={customTheme.colors.onPrimary}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>


                        {/* TODO Criar um metodo de pesquisar para mobilidade */}
                        {/* <View style={styles.searchContainer}>
                            <Icon
                                name="magnify"
                                size={24}
                                color={customTheme.colors.onSurfaceVariant}
                            />
                            <TextInput
                                placeholder="Pesquisar recurso..."
                                style={styles.searchInput}
                                placeholderTextColor={customTheme.colors.onSurfaceVariant}
                            />
                        </View> */}

                    </View>
                </View>

                {/* Componente de Notificação de Atualização */}
                {updateInfo && (
                    <UpdateNotification
                        updateInfo={updateInfo}
                        onUpdate={downloadAndInstall}
                        onDismiss={() => setUpdateModalVisible(false)}
                    />
                )}

                <ScrollView style={styles.content}>
                    {renderCarouselContent()}
                    <QuickActionsGrid />
                </ScrollView>

                {userInfo && (
                    <UserProfileModal
                        visible={isUserModalVisible}
                        onClose={() => setIsUserModalVisible(false)}
                        userInfo={userInfo}
                        onLogout={handleLogout}
                        // Adicionar estas duas novas props:
                        updateInfo={updateInfo}
                        onUpdate={() => {
                            setIsUserModalVisible(false);
                            downloadAndInstall();
                        }}
                    />
                )}

                {/* Renderize um overlay escuro quando o tooltip estiver visível */}
                {showAvatarTooltip && (
                    <Animated.View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fundo preto com 50% de opacidade
                            zIndex: 1, // Menor que o tooltip, mas maior que o resto
                            opacity: tooltipOpacity
                        }}
                    />
                )}

                {/* Renderize o tooltip aqui, fora de todos os outros componentes */}
                {showAvatarTooltip && (
                    <Animated.View
                        style={[
                            styles.tooltipContainer,
                            { opacity: tooltipOpacity }
                        ]}
                    >
                        <View style={styles.tooltipArrow} />
                        <View style={styles.tooltipContent}>
                            <Text style={styles.tooltipTitle}><Icon name="arrow-left-thick" size={20} /> Seu perfil</Text>
                            <Text style={styles.tooltipText}>
                                Toque aqui para acessar seu perfil, visualizar seus acessos e gerenciar sua conta
                            </Text>

                            <TouchableOpacity
                                style={styles.tooltipButton}
                                onPress={dismissTooltip}
                            >
                                <Text style={styles.tooltipButtonText}>Entendi</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}

            </Surface >
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    testButtonsContainer: {
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 16,
        padding: 16,
    },
    testButton: {
        backgroundColor: customTheme.colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginVertical: 6,
        alignItems: 'center',
    },
    testButtonText: {
        color: customTheme.colors.onPrimary,
        fontWeight: '500',
    },
    avatarWrapper: {
        position: 'relative',
    },
    carouselItemWrapper: {
        width: '100%',  // Usar 100% ao invés de valor fixo
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,  // Manter o padding horizontal
    },
    carouselItem: {
        width: '100%',  // Garantir que o item ocupe toda a largura disponível
        height: 180,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    // Estilos do tooltip
    tooltipContainer: {
        position: 'absolute',
        left: 60, // Posicionado à direita do avatar
        top: 5,
        width: 230,
        zIndex: 1000,
    },
    tooltipArrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderRightWidth: 8,
        borderTopWidth: 8,
        borderRightColor: 'transparent',
        borderTopColor: customTheme.colors.primary,
        borderLeftWidth: 8,
        borderLeftColor: 'transparent',
        marginLeft: -30,
        transform: [{ rotate: '-90deg' }],
    },
    tooltipContent: {
        backgroundColor: customTheme.colors.primary,
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    tooltipTitle: {
        color: customTheme.colors.onPrimary,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    tooltipText: {
        color: customTheme.colors.onPrimary,
        fontSize: 14,
        lineHeight: 20,
    },
    tooltipButton: {
        alignSelf: 'flex-end',
        marginTop: 12,
        backgroundColor: customTheme.colors.primaryContainer,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    tooltipButtonText: {
        color: customTheme.colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    carouselImage: {
        width: '100%',
        height: '100%',
    },
    loadingContainer: {
        height: 200,
        marginHorizontal: 16,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        height: 200,
        marginHorizontal: 16,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: customTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden', // Importante para garantir que a imagem respeite o borderRadius
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    offlinePlaceholder: {
        height: 200, // Mesma altura do carrossel
        marginHorizontal: 16,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    offlineText: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 8,
    },
    offlineSubtext: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        opacity: 0.8,
    },
    header: {
        backgroundColor: customTheme.colors.surface,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    safeArea: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    content: {
        flex: 1,
        paddingTop: 10,
    },
});