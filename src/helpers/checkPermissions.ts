import { Platform, Alert } from 'react-native';
import {
    PERMISSIONS,
    RESULTS,
    Permission,
    PermissionStatus,
    check,
    request,
} from 'react-native-permissions';

const logPermissionStatus = (permission: string, status: PermissionStatus) => {
    switch (status) {
        case RESULTS.GRANTED:
            console.log(`Permissão concedida: ${permission}`);
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

const checkPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
        console.log('[LOG] Solicitando permissões...');

        const permissionsToCheck: Permission[] = [PERMISSIONS.ANDROID.CAMERA];

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

        if (allGranted) {
            console.log('[LOG] Todas as permissões foram concedidas.');
        } else {
            console.warn('[LOG] Algumas permissões foram negadas.');
        }

        return allGranted;
    }

    return true;
};


export default checkPermissions;