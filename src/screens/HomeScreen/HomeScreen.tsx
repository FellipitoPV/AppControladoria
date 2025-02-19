import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    Modal,
    ActivityIndicator,
    Alert,
    Linking,
    BackHandler,
    TextInput
} from 'react-native';
import {
    Surface,
    Text,
    Card,
    Button,
    ProgressBar,
} from 'react-native-paper';

import { version } from '../../../package.json';
import checkPermissions from '../../helpers/checkPermissions';
import { customTheme } from '../../theme/theme';
import { useUser } from '../../contexts/userContext';
import { showGlobalToast } from '../../helpers/GlobalApi';
import { useAppUpdater } from '../../helpers/AppUpdater';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FeedbackFloatingButton from '../../assets/components/FeedbackFloatingButton';
import { useNetwork } from '../../contexts/NetworkContext';
import QuickActionsGrid from './components/QuickActionsGrid';
import UserInfoModal from './components/UserInfoModal';
import storage from '@react-native-firebase/storage';

interface CarouselItem {
    id: string;
    imageUrl: string;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32; // Mesma largura útil que o QuickActionsGrid

export default function HomeScreen({ navigation }: { navigation: any }) {
    const { userInfo, isLoading, clearUserInfo } = useUser();
    const { isOnline } = useNetwork();

    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    const [updateModalVisible, setUpdateModalVisible] = useState(false);
    const permissionsChecked = useRef(false);
    const [isUserModalVisible, setIsUserModalVisible] = useState(false);

    const [backPressedOnce, setBackPressedOnce] = useState(false);

    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const [carouselData, setCarouselData] = useState<CarouselItem[]>([]);
    const [carouselLoading, setCarouselLoading] = useState(true);

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

        console.log(userInfo?.acesso)
        console.log(userInfo?.cargo)

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

    const handleLogout = async () => {
        setLogoutModalVisible(false);
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
        if (scrollViewRef.current) {
            const nextIndex = (currentIndex + 1) % carouselData.length;
            scrollViewRef.current.scrollTo({
                x: nextIndex * (width - 32),
                animated: true
            });
            setCurrentIndex(nextIndex);
        }
    }, [currentIndex, carouselData.length]);

    // Função para lidar com o fim do scroll manual
    const handleScrollEnd = (event: any) => {
        const contentOffset = event.nativeEvent.contentOffset;
        const index = Math.round(contentOffset.x / (width - 32));
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

    const fetchCarouselImages = async () => {
        try {
            // Referência para a pasta no Storage
            const storageRef = storage().ref('carrosel_Mobile');

            // Lista todos os itens na pasta
            const result = await storageRef.list();

            // Obtém as URLs de download para cada imagem
            const imagePromises = result.items.map(async (item) => {
                const url = await item.getDownloadURL();
                const metadata = await item.getMetadata();

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
                        name="cloud-off"
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
                snapToInterval={width}
                snapToAlignment="center"
                pagingEnabled
                onMomentumScrollEnd={handleScrollEnd}
            >
                {carouselData.map((item) => (
                    <View
                        key={item.id}
                        style={[styles.carouselItemWrapper, { width }]}
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


    const DevelopmentAlert = () => (
        <Card style={styles.developmentCard}>
            <View style={styles.developmentContent}>
                <View style={styles.iconContainer}>
                    <Icon
                        name="tools"
                        size={32}
                        color={customTheme.colors.onPrimary}
                    />
                </View>

                <Text style={styles.developmentTitle}>
                    Em Desenvolvimento
                </Text>

                <Text style={styles.developmentText}>
                    Novas funcionalidades serão adicionadas em breve!
                </Text>

                <View style={styles.buildingContainer}>
                    <Icon
                        name="clock-outline"
                        size={16}
                        color={customTheme.colors.onPrimary}
                    />
                    <Text style={styles.buildingText}>
                        Recursos em construção
                    </Text>
                </View>
            </View>
        </Card>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <Surface style={styles.container}>

                {/* Novo Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            style={styles.avatarContainer}
                            onPress={() => setIsUserModalVisible(true)}
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
                                    color={customTheme.colors.primary}
                                />
                            )}
                        </TouchableOpacity>

                        <View style={styles.searchContainer}>
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
                        </View>

                    </View>
                </View>

                <ScrollView style={styles.content}>
                    {renderCarouselContent()}
                    <QuickActionsGrid />
                    <DevelopmentAlert />
                    {/* Resto do conteúdo ... */}
                </ScrollView>

                {userInfo && (
                    <UserInfoModal
                        visible={isUserModalVisible}
                        onLogout={() => handleLogout()}
                        onClose={() => setIsUserModalVisible(false)}
                        userInfo={userInfo}
                    />
                )}

            </Surface>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    carouselItemWrapper: {
        paddingHorizontal: 16, // Mesmo padding do QuickActionsGrid
        justifyContent: 'center',
        alignItems: 'center',
    },
    carouselItem: {
        width: '100%',
        height: 180,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    carouselImage: {
        width: '100%',
        height: '100%',
    },

    carousel: {
        flexGrow: 0,
        height: 200, // Ajuste conforme necessário
    },
    carouselItemContainer: {
        width: width,
        justifyContent: 'center',
        alignItems: 'center',
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
    developmentCard: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 24,
        borderRadius: 16,
        backgroundColor: customTheme.colors.surfaceVariant,
        overflow: 'hidden',
    },
    developmentContent: {
        padding: 20,
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: customTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    developmentTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginBottom: 8,
    },
    developmentText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    buildingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    buildingText: {
        fontSize: 12,
        color: customTheme.colors.onPrimary,
        fontWeight: '500',
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: customTheme.colors.primaryContainer,
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
    carouselTextContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    carouselTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    carouselSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginHorizontal: 16,
        marginVertical: 12,
        color: customTheme.colors.onBackground,
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
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: customTheme.colors.onSurface,
        padding: 0, // Remove padding padrão no Android
    },
    contactButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: customTheme.colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        margin: 0,
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 16,
        backgroundColor: customTheme.colors.surface,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    modalIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: customTheme.colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    modalTitleContainer: {
        flex: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: customTheme.colors.primary,
        marginBottom: 4,
    },
    versionInfo: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    divider: {
        height: 1,
        backgroundColor: customTheme.colors.outline,
        opacity: 0.2,
    },
    modalScrollContent: {
        padding: 20,
        maxHeight: 300,
    },
    changelogItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    changelogIcon: {
        marginRight: 12,
    },
    changelogText: {
        marginLeft: 3,
        flex: 1,
        fontSize: 14,
        color: customTheme.colors.onSurface,
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.errorContainer,
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    warningIcon: {
        marginRight: 8,
    },
    warningText: {
        flex: 1,
        fontSize: 14,
        color: customTheme.colors.error,
    },
    downloadSection: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outline,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButton: {
        minWidth: 100,
        margin: 10,
    },
    cancelButton: {
        borderColor: customTheme.colors.primary,
    },
    updateButton: {
        backgroundColor: customTheme.colors.primary,
    },
    modalText: {
        fontSize: 16,
        color: customTheme.colors.onSurface,
        marginBottom: 24,
        textAlign: 'center',
    },
    safeArea: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    userTextContainer: {
        marginLeft: 12,
    },
    welcomeText: {
        color: customTheme.colors.onSurfaceVariant,
    },
    userName: {
        color: customTheme.colors.onSurface,
        fontWeight: '600',
    },
    headerRightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        width: 100,
        height: 40,
        tintColor: customTheme.colors.primary,
    },
    content: {
        flex: 1,
        paddingTop: 10,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
    },
    actionCard: {
        width: (width - 48) / 2,
        padding: 16,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 16,
        elevation: 2,
        alignItems: 'center',
        gap: 12,
    },
    actionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        color: customTheme.colors.onSurface,
        fontWeight: '500',
        textAlign: 'center',
    },
    infoCard: {
        marginBottom: 24,
        borderRadius: 16,
        backgroundColor: customTheme.colors.surface,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    infoTitle: {
        color: customTheme.colors.primary,
        fontWeight: '600',
    },
    infoText: {
        color: customTheme.colors.onSurface,
        lineHeight: 20,
    },
    alertCard: {
        marginBottom: 24,
        borderRadius: 16,
        backgroundColor: customTheme.colors.surface,
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    alertTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    alertText: {
        marginBottom: 16,
    },
    alertButton: {
        borderRadius: 8,
    },
    checkingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 8,
        marginBottom: 8,
    },
    checkingText: {
        marginLeft: 8,
        color: customTheme.colors.onSurface,
    },
    footerSpace: {
        height: 60,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        backgroundColor: customTheme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.outline,
    },
    versionText: {
        marginLeft: 8,
        color: customTheme.colors.onSurfaceVariant,
    },
    progressContainer: {
        marginVertical: 8,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
    },
    progressText: {
        textAlign: 'center',
        marginTop: 8,
        color: customTheme.colors.primary,
        fontSize: 14,
    },
});