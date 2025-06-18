import { Platform, Alert } from 'react-native';
import {
    PERMISSIONS,
    RESULTS,
    Permission,
    PermissionStatus,
    check,
    request,
    checkNotifications,
} from 'react-native-permissions';

const logPermissionStatus = (permission: string, status: PermissionStatus) => {
    switch (status) {
        case RESULTS.GRANTED:
            // console.log(`Permissão concedida: ${permission}`);
            break;
        case RESULTS.DENIED:
            console.log(`Permissão negada: ${permission}`);
            break;
        case RESULTS.BLOCKED:
            console.log(`Permissão bloqueada (negada permanentemente): ${permission}`);
            break;
        default:
            console.log(`Permissão com status desconhecido: ${permission}`);
    }
};

const checkAndRequestPermission = async (permission: Permission): Promise<PermissionStatus> => {
    try {
        const result: PermissionStatus = await check(permission);
        if (result === RESULTS.DENIED || result === RESULTS.BLOCKED) {
            const requestResult: PermissionStatus = await request(permission);
            logPermissionStatus(permission, requestResult);
            return requestResult;
        } else {
            logPermissionStatus(permission, result);
            return result;
        }
    } catch (error) {
        console.error(`Erro ao verificar permissão ${permission}:`, error);
        return RESULTS.DENIED;
    }
};

// Modificação para checkPermissions.ts
const checkPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
        // console.log('[LOG] Solicitando permissões...');

        const permissionsToCheck: Permission[] = [
            PERMISSIONS.ANDROID.CAMERA,
            // Add notification permission for Android 13+
            ...(Platform.Version >= 33 ? [PERMISSIONS.ANDROID.POST_NOTIFICATIONS] : [])
        ];

        // Adicionar permissão de armazenamento somente para versões do Android abaixo de 10 (API 29)
        if (Platform.Version < 29) {
            permissionsToCheck.push(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
            permissionsToCheck.push(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
        }

        let allGranted = true;

        for (const permission of permissionsToCheck) {
            const result = await checkAndRequestPermission(permission);
            if (result !== RESULTS.GRANTED) {
                allGranted = false;
            }
        }

        // Check notification permissions separately for more detailed handling
        if (Platform.Version >= 33) {
            const { status: notificationStatus } = await checkNotifications();
            if (notificationStatus !== RESULTS.GRANTED) {
                Alert.alert(
                    "Permissão de Notificação",
                    "É necessário permitir notificações para usar todas as funcionalidades do app"
                );
                allGranted = false;
            }
        }

        if (allGranted) {
            // console.log('[LOG] Todas as permissões foram concedidas.');

            // IMPORTANTE: Remova a configuração do PushNotification.configure daqui
            // para evitar sobrescrever a configuração do index.js
        } else {
            console.warn('[LOG] Algumas permissões foram negadas.');
        }

        const hasExactAlarmPermission = await checkScheduleExactAlarmPermission();

        return allGranted && hasExactAlarmPermission;
    }

    return true;
};

const checkScheduleExactAlarmPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
        try {
            // Check if the app has SCHEDULE_EXACT_ALARM permission
            const result = await check('android.permission.SCHEDULE_EXACT_ALARM' as Permission);

            if (result !== RESULTS.GRANTED) {
                // Request permission
                const requestResult = await request('android.permission.SCHEDULE_EXACT_ALARM' as Permission);

                if (requestResult !== RESULTS.GRANTED) {
                    return false;
                }
            }
            return true;
        } catch (error) {
            console.error('Erro ao verificar permissão de SCHEDULE_EXACT_ALARM:', error);
            return false;
        }
    }
    return true;
};


export default checkPermissions;