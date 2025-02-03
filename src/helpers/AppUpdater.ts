import { useState, useEffect } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import semver from 'semver';
import { version as appVersion } from '../../package.json';
import { Compostagem } from './Types';

interface VersionInfo {
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

interface PendingData extends Compostagem {
    timestamp: string;
    attempts: number;
    syncId?: string; // Identificador único para rastrear tentativas de sync
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
            
            Alert.alert(
                'Download Iniciado',
                'O download começará automaticamente. Após concluir, toque no arquivo APK para instalar.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Erro ao iniciar download:', error);
            Alert.alert(
                'Erro na Atualização',
                'Não foi possível iniciar o download. Por favor, tente novamente mais tarde.'
            );
        }
    };

    const checkForUpdates = async (): Promise<void> => {
        if (Platform.OS !== 'android') return;

        try {
            setUpdateState({ checking: true });

            const versionsRef = firestore()
                .collection('versoes_app_controladoria')
                .orderBy('data_lancamento', 'desc')
                .limit(1);

            const snapshot = await versionsRef.get();

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