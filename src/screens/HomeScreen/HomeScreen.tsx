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
import Icon from 'react-native-vector-icons/MaterialIcons';
import FeedbackFloatingButton from '../../assets/components/FeedbackFloatingButton';
import { useNetwork } from '../../contexts/NetworkContext';
import QuickActionsGrid from '../Formularios/Lavagem/Components/QuickActionsGrid';

interface CarouselItem {
    id: string;
    imageUrl: string;
}

export default function HomeScreen({ navigation }: { navigation: any }) {
    const { userInfo, isLoading, clearUserInfo } = useUser();
    const { isOnline } = useNetwork();

    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    const [updateModalVisible, setUpdateModalVisible] = useState(false);
    const permissionsChecked = useRef(false);

    const [backPressedOnce, setBackPressedOnce] = useState(false);

    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const [carouselData, setCarouselData] = useState<CarouselItem[]>([
        {
            id: '1',
            imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2XpyBvqRYDHa_95P5myrUcYHnMKeKk4T0TKs9tRy3e7FSs0Z7EN2hRh8QUsAMQ9mhtqA&usqp=CAU'
        },
        {
            id: '2',
            imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSI6ycAmETA2kerr7WxrBH4zFWTAZAY-78xmw&s'
        },
        // ... mais itens
    ]);

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

        return (
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={width - 32}
                snapToAlignment="center"
                contentContainerStyle={styles.carouselContainer}
                onMomentumScrollEnd={handleScrollEnd}
                pagingEnabled
            >
                {carouselData.map((item) => (
                    <View key={item.id} style={styles.carouselItem}>
                        <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.carouselImage}
                            resizeMode="cover"
                        />
                    </View>
                ))}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <Surface style={styles.container}>

                {/* Novo Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <View style={styles.searchContainer}>
                            <Icon name="search" size={24} color={customTheme.colors.onSurfaceVariant} />
                            <TextInput
                                placeholder="Pesquisar recurso..."
                                style={styles.searchInput}
                                placeholderTextColor={customTheme.colors.onSurfaceVariant}
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.contactButton}
                            onPress={() => {/* Função para contato */ }}
                        >
                            <Icon
                                name="chat-bubble-outline"
                                size={24}
                                color={customTheme.colors.primary}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView style={styles.content}>
                    {renderCarouselContent()}
                    {QuickActionsGrid()}
                    {/* Resto do conteúdo ... */}
                </ScrollView>

            </Surface>
        </SafeAreaView>
    );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
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
    carouselContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    carouselItem: {
        width: width * 0.8, // 80% da largura da tela
        height: 180,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: customTheme.colors.surfaceVariant,
    },
    carouselImage: {
        width: '100%',
        height: '100%',
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
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: customTheme.colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
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