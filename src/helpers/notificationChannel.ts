import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';

// TODO Tornar generico para funcionar
export const createRepeatingNotification = (interval: number = 5000) => {
    PushNotification.localNotificationSchedule({
        id: 1, // Use a consistent ID
        channelId: Platform.OS === 'android' ? "rdo-scheduled-channel" : undefined,
        title: "Serviço em Execução",
        message: "Toque para abrir o aplicativo",
        date: new Date(Date.now() + interval),
        repeatType: 'time',
        repeatTime: interval,
        allowWhileIdle: true,
        playSound: true,
        soundName: 'default',
        visibility: 'public',
        userInfo: {
            screen: "Home"
        },
    });

    console.log('🔁 Repeating Notification Created');
};

export const removeRepeatingNotification = () => {
    PushNotification.cancelAllLocalNotifications();
    console.log('🧹 Repeating Notification Removed');
};