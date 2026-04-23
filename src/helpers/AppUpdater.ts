import { Alert, Linking, NativeModules, Platform } from 'react-native';
import { useEffect, useState } from 'react';

import { ecoApi } from '../api/ecoApi';
import { version as appVersion } from '../../package.json';
import RNFS from 'react-native-fs';
import semver from 'semver';

export interface VersionInfo {
    versao: string;
    apk_url: string; // URL do Google Drive
    mudancas: string[];
    obrigatoria: boolean;
    data_lancamento: string;
    tamanho_mb: number;
}

interface UpdateState {
    checking: boolean;
    downloading: boolean;
    installInProgress: boolean;
    progress: number;
}

const { AppInstaller } = NativeModules as {
    AppInstaller?: {
        canInstallPackages?: () => Promise<boolean>;
        openInstallSettings?: () => Promise<boolean>;
        installApk?: (filePath: string, mimeType: string) => Promise<boolean>;
    };
};
const APK_MIME_TYPE = 'application/vnd.android.package-archive';

export const useAppUpdater = () => {
    const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
    const [updateState, setUpdateState] = useState<UpdateState>({
        checking: false,
        downloading: false,
        installInProgress: false,
        progress: 0,
    });

    const openInBrowser = async (versionInfo?: VersionInfo): Promise<void> => {
        const versionToOpen = versionInfo ?? updateInfo;

        if (!versionToOpen?.apk_url) return;

        try {
            await Linking.openURL(versionToOpen.apk_url);
        } catch (browserError) {
            console.error('Erro ao abrir link externo da atualização:', browserError);
            Alert.alert(
                'Atualização indisponível',
                'Não foi possível iniciar a atualização automática nem abrir o link externo.'
            );
        }
    };

    const downloadAndInstall = async (versionInfo?: VersionInfo): Promise<void> => {
        const versionToInstall = versionInfo ?? updateInfo;

        if (!versionToInstall || Platform.OS !== 'android') return;

        if (updateState.downloading || updateState.installInProgress) {
            return;
        }

        try {
            const canCheckInstallPermission = typeof AppInstaller?.canInstallPackages === 'function';
            const canOpenInstallSettings = typeof AppInstaller?.openInstallSettings === 'function';
            const canOpenInstaller = typeof AppInstaller?.installApk === 'function';

            if (!canOpenInstaller) {
                Alert.alert(
                    'Atualizador indisponível',
                    'As alterações nativas do atualizador ainda não foram carregadas nesta instalação do app. Reabra/reinstale a build Android para testar esse fluxo.'
                );
                return;
            }

            if (!canCheckInstallPermission || !canOpenInstallSettings) {
                Alert.alert(
                    'Atualizador parcial',
                    'A verificacao de fontes desconhecidas ainda nao foi carregada nesta instalacao do app. Reabra/reinstale a build Android para testar esse fluxo.'
                );
                return;
            }

            const canInstallPackages = await AppInstaller.canInstallPackages();

            if (!canInstallPackages) {
                Alert.alert(
                    'Permissão necessária',
                    'Para instalar a atualização direto pelo app, primeiro autorize a instalação desta fonte.',
                    [
                        {
                            text: 'Cancelar',
                            style: 'cancel',
                        },
                        {
                            text: 'Abrir configurações',
                            onPress: () => {
                                AppInstaller.openInstallSettings?.().catch(settingsError => {
                                    console.error('Erro ao abrir configurações de instalação:', settingsError);
                                });
                            }
                        }
                    ]
                );
                return;
            }

            const targetPath = `${RNFS.CachesDirectoryPath}/controladoria-update-${versionToInstall.versao}.apk`;

            if (await RNFS.exists(targetPath)) {
                await RNFS.unlink(targetPath);
            }

            setUpdateState(prev => ({
                ...prev,
                downloading: true,
                installInProgress: false,
                progress: 0,
            }));

            const result = await RNFS.downloadFile({
                fromUrl: versionToInstall.apk_url,
                toFile: targetPath,
                background: true,
                progressDivider: 5,
                begin: ({ contentLength }) => {
                    if (!contentLength) {
                        setUpdateState(prev => ({ ...prev, progress: 0 }));
                    }
                },
                progress: ({ bytesWritten, contentLength }) => {
                    if (!contentLength) return;

                    const progress = Math.min(
                        100,
                        Math.round((bytesWritten / contentLength) * 100)
                    );

                    setUpdateState(prev => ({ ...prev, progress }));
                },
            }).promise;

            if (result.statusCode !== 200) {
                throw new Error(`Falha no download do APK. Status: ${result.statusCode}`);
            }

            setUpdateState(prev => ({
                ...prev,
                downloading: false,
                installInProgress: true,
                progress: 100,
            }));

            await AppInstaller.installApk(targetPath, APK_MIME_TYPE);

        } catch (error) {
            console.error('Erro ao iniciar download:', error);

            Alert.alert(
                'Atualização externa',
                'Não foi possível concluir a atualização dentro do app. Vamos abrir o link externo como alternativa.'
            );

            await openInBrowser(versionToInstall);
        } finally {
            setUpdateState(prev => ({
                ...prev,
                downloading: false,
                installInProgress: false,
            }));
        }
    };

    const checkForUpdates = async (): Promise<void> => {
        if (Platform.OS !== 'android') return;

        try {
            setUpdateState(prev => ({ ...prev, checking: true }));

            const data = await ecoApi.list('versoes_app_controladoria');

            if (!data || data.length === 0) {
                setUpdateInfo(null);
                return;
            }

            const latestVersion = data.sort((a: VersionInfo, b: VersionInfo) =>
                new Date(b.data_lancamento).getTime() - new Date(a.data_lancamento).getTime()
            )[0] as VersionInfo;

            // Compara versões usando semver
            if (semver.gt(latestVersion.versao, appVersion)) {
                setUpdateInfo(latestVersion);

                // Se for atualização obrigatória, mostra alerta imediatamente
                if (latestVersion.obrigatoria) {
                    Alert.alert(
                        'Atualização Obrigatória',
                        `Uma nova versão (${latestVersion.versao}) está disponível e é necessária para continuar usando o aplicativo.`,
                        [
                            {
                                text: 'Atualizar Agora',
                                onPress: () => downloadAndInstall(latestVersion)
                            }
                        ],
                        { cancelable: false }
                    );
                }
            } else {
                setUpdateInfo(null);
            }
        } catch (error) {
            console.error('Erro ao verificar atualizações:', error);
        } finally {
            setUpdateState(prev => ({ ...prev, checking: false }));
        }
    };

    // Verificar atualizações ao iniciar e periodicamente
    useEffect(() => {
        checkForUpdates();
        const interval = setInterval(checkForUpdates, 60000); // Verifica a cada 1 hora
        return () => clearInterval(interval);
    }, []);

    return {
        updateInfo,
        updateState,
        checkForUpdates,
        downloadAndInstall,
        openInBrowser,
    };
};
