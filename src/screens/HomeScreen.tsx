import React, { useEffect, useRef, useState } from 'react';
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
    BackHandler
} from 'react-native';
import {
    Surface,
    Text,
    Card,
    Button,
    ProgressBar,
} from 'react-native-paper';

import { version } from '../../package.json';
import checkPermissions from '../helpers/checkPermissions';
import { customTheme } from '../theme/theme';
import { useUser } from '../contexts/userContext';
import { showGlobalToast } from '../helpers/GlobalApi';
import { useAppUpdater } from '../helpers/AppUpdater';
import { generateWordDocument } from '../helpers/generateApi';
import { RelatorioData } from '../helpers/Types';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function HomeScreen({ navigation }: { navigation: any }) {
    const { userInfo, isLoading, clearUserInfo } = useUser();
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    const [updateModalVisible, setUpdateModalVisible] = useState(false);
    const permissionsChecked = useRef(false);

    const [backPressedOnce, setBackPressedOnce] = useState(false);

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

    useEffect(() => {
        if (updateInfo && !updateModalVisible) {
            if (updateInfo.obrigatoria) {
                setUpdateModalVisible(true);
            }
        }
    }, [updateInfo]);

    const testGenerateDocument = async () => {
        try {
            // Toast inicial
            showGlobalToast(
                'info',
                'Teste',
                'Iniciando geração de documento de teste...',
                2000
            );

            const testData: RelatorioData = {
                class: "Teste",
                num: "123",
                cliente: "Cliente Teste",
                ocoOsDia: "OS Teste 123 - 29/01/2024",
                resp: "Usuário Teste",
                dataOm: "29/01/2024",
                obs: "Observação de teste para geração de documento",
                images: [
                    {
                        image: "https://picsum.photos/200/300", // URL de teste
                        name: "teste1.jpg"
                    }
                ]
            };

            const documentPath = await generateWordDocument(testData);

            showGlobalToast(
                'success',
                'Sucesso',
                `Documento gerado em: ${documentPath}`,
                4000
            );

        } catch (error) {
            console.error('Erro no teste:', error);
            showGlobalToast(
                'error',
                'Erro',
                'Falha ao gerar documento de teste',
                4000
            );
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <Surface style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => setLogoutModalVisible(true)}>
                            <View style={styles.userInfo}>
                                <View style={styles.avatarContainer}>
                                    <Icon name="logout" size={32} color={customTheme.colors.primary} />
                                </View>
                                <View style={styles.userTextContainer}>
                                    <Text variant="bodyMedium" style={styles.welcomeText}>Bem-vindo,</Text>
                                    <Text variant="titleMedium" style={styles.userName}>{userInfo?.user || "Convidado"}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.headerRightContainer}>
                            <Image
                                source={require("../assets/image/logoE.png")}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                    </View>
                </View>

                {/* Conteúdo Principal */}
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Título da Seção */}
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        Ações Disponíveis
                    </Text>

                    {/* Grade de Ações */}
                    <View style={styles.actionsGrid}>
                        {/* Nova ocorrencia */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate("NewP")}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: customTheme.colors.primaryContainer }]}>
                                <Icon name="add-circle" size={32} color={customTheme.colors.primary} />
                            </View>
                            <Text variant="bodyMedium" style={styles.actionText}>Relatório de Ocorrência</Text>
                        </TouchableOpacity>

                        {/* Historico de Ocorrencias */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate("List")}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: customTheme.colors.secondaryContainer }]}>
                                <Icon name="format-list-bulleted" size={32} color={customTheme.colors.secondary} />
                            </View>
                            <Text variant="bodyMedium" style={styles.actionText}>Histórico de Ocorrências</Text>
                        </TouchableOpacity>

                        {/* Tetar geração de documento */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={testGenerateDocument}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: customTheme.colors.secondaryContainer }]}>
                                <Icon name="description" size={32} color={customTheme.colors.primary} />

                            </View>
                            <Text variant="bodyMedium" style={styles.actionText}>Gerar Doc</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Alerta de nova atualização */}
                    {updateInfo && (
                        <Card style={styles.alertCard}>
                            <Card.Content>
                                <View style={styles.alertHeader}>
                                    <Icon name="system-update" size={24} color={customTheme.colors.primary} />
                                    <Text style={[styles.alertTitle, { color: customTheme.colors.primary }]}>
                                        Nova Atualização Disponível!
                                    </Text>
                                </View>
                                <Text style={[styles.alertText, { color: customTheme.colors.onSurface }]}>
                                    A versão {updateInfo.versao} está disponível para download!
                                </Text>
                                <Button
                                    mode="contained"
                                    onPress={() => setUpdateModalVisible(true)}
                                    style={styles.alertButton}
                                    buttonColor={customTheme.colors.primary}
                                >
                                    <Text style={{ fontWeight: "bold", color: customTheme.colors.onPrimary }}>
                                        Ver Detalhes
                                    </Text>
                                </Button>
                            </Card.Content>
                        </Card>
                    )}

                    {updateState.checking && (
                        <View style={styles.checkingContainer}>
                            <ActivityIndicator color={customTheme.colors.primary} />
                            <Text style={styles.checkingText}>Verificando atualizações...</Text>
                        </View>
                    )}

                    {/* Espaço para o footer */}
                    <View style={styles.footerSpace} />
                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    <Icon name="info" size={20} color={customTheme.colors.onSurfaceVariant} />
                    <Text variant="bodySmall" style={styles.versionText}>
                        Compostagem Eco v{version}
                    </Text>
                </View>
            </Surface>

            {/* Modal de logoff */}
            <Modal
                visible={logoutModalVisible}
                transparent={true}
                onRequestClose={() => setLogoutModalVisible(false)}
            >
                <View style={styles.modalBackground}>
                    <Surface style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Icon name="logout" size={32} color={customTheme.colors.primary} />
                            <Text style={styles.modalTitle}>Confirmar Saída</Text>
                        </View>

                        <Text style={styles.modalText}>
                            Deseja sair da sua conta no aplicativo?
                        </Text>

                        <View style={styles.modalButtons}>
                            <Button
                                mode="outlined"
                                onPress={() => setLogoutModalVisible(false)}
                                style={[styles.modalButton, { borderColor: customTheme.colors.error }]}
                            >
                                <Text style={{ color: customTheme.colors.error }}>
                                    Cancelar
                                </Text>
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleLogout}
                                style={[styles.modalButton, { backgroundColor: customTheme.colors.primary }]}
                            >
                                <Text style={{ color: customTheme.colors.onPrimary }}>
                                    Sair
                                </Text>
                            </Button>
                        </View>
                    </Surface>
                </View>
            </Modal>

            {/* Modal de Atualização */}
            <Modal
                visible={updateModalVisible}
                onDismiss={() => !updateInfo?.obrigatoria && setUpdateModalVisible(false)}
                style={styles.modalContainer}
            >
                <View style={styles.modalBackground}>
                    <Surface style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconContainer}>
                                <Icon name="check-circle" size={20} color={customTheme.colors.primary} />
                            </View>
                            <View style={styles.modalTitleContainer}>
                                <Text style={styles.modalTitle}>Nova Versão Disponível</Text>
                                <Text style={styles.versionInfo}>
                                    Versão {updateInfo?.versao} ({updateInfo?.tamanho_mb}MB)
                                </Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <ScrollView style={styles.modalScrollContent}>
                            <Text style={styles.sectionTitle}>O que há de novo:</Text>
                            {updateInfo?.mudancas.map((mudanca, index) => (
                                <View key={index} style={styles.changelogItem}>
                                    <Icon name="error" size={20} color={customTheme.colors.primary} />
                                    <Text style={styles.changelogText}>{mudanca}</Text>
                                </View>
                            ))}

                            {updateInfo?.obrigatoria && (
                                <View style={styles.warningContainer}>
                                    <Icon name="download" size={20} color={customTheme.colors.onPrimary} />
                                    <Text style={styles.warningText}>
                                        Esta é uma atualização obrigatória para continuar usando o aplicativo.
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.downloadSection}>
                            <View style={styles.modalButtons}>
                                {!updateInfo?.obrigatoria && (
                                    <Button
                                        mode="outlined"
                                        onPress={() => setUpdateModalVisible(false)}
                                        style={[styles.modalButton, styles.cancelButton]}
                                        icon={({ size }) => (
                                            <Icon name='history' size={20} color={customTheme.colors.warning} />
                                        )}
                                    >
                                        <Text style={{ fontWeight: "bold", color: customTheme.colors.warning }}>
                                            Depois
                                        </Text>
                                    </Button>
                                )}
                                <Button
                                    mode="contained"
                                    onPress={downloadAndInstall}
                                    style={[styles.modalButton, styles.updateButton]}
                                    icon={({ size }) => (
                                        <Icon name="download" size={20} color={customTheme.colors.onPrimary} />
                                    )}

                                >
                                    <Text style={{ fontWeight: "bold", color: customTheme.colors.onPrimary }}>
                                        Baixar Atualização
                                    </Text>
                                </Button>
                            </View>
                        </View>
                    </Surface>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
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
    header: {
        backgroundColor: customTheme.colors.surface,
        paddingTop: 16,
        paddingBottom: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 4,
    },
    headerContent: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        padding: 16,
    },
    sectionTitle: {
        color: customTheme.colors.onSurface,
        marginBottom: 16,
        fontWeight: '600',
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