import { Alert, Linking, Platform } from 'react-native';
import { collection, getDocs, getFirestore, limit, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { version as appVersion } from '../../package.json';
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
}

export const useAppUpdater = () => {
    const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
    const [updateState, setUpdateState] = useState<UpdateState>({
        checking: false
    });

    const downloadAndInstall = async (): Promise<void> => {
        if (!updateInfo) return;

        try {
            // Abre o link do Google Drive diretamente
            await Linking.openURL(updateInfo.apk_url);

        } catch (error) {
            console.error('Erro ao iniciar download:', error);
        }
    };

    const checkForUpdates = async (): Promise<void> => {
        if (Platform.OS !== 'android') return;

        try {
            setUpdateState({ checking: true });

            const db = getFirestore();
            const versionsRef = query(
                collection(db, 'versoes_app_controladoria'),
                orderBy('data_lancamento', 'desc'),
                limit(1)
            );

            const snapshot = await getDocs(versionsRef);

            if (snapshot.empty) {
                setUpdateInfo(null);
                return;
            }

            const latestVersion = snapshot.docs[0].data() as VersionInfo;

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
                                onPress: downloadAndInstall
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
            setUpdateState({ checking: false });
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
        downloadAndInstall
    };
};