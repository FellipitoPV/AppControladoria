import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { PaperProvider } from 'react-native-paper';
import { customTheme } from './src/theme/theme';
import PushNotification from 'react-native-push-notification';

// Configure push notifications
PushNotification.configure({
    // (optional) Called when Token is generated
    onRegister: function (token) {
        console.log("TOKEN:", token);
    },

    // (required) Called when a remote or local notification is received or opened
    onNotification: function (notification) {
        console.log("NOTIFICATION:", notification);

        // process the notification
        // Necessary for iOS
        notification.finish(PushNotificationIOS.FetchResult.NoData);
    },

    // (optional) Called when Registered Action is pressed
    onAction: function (notification) {
        console.log("ACTION:", notification.action);
        console.log("NOTIFICATION:", notification);
    },

    // (optional) Called when the user fails to register for remote notifications
    onRegistrationError: function (err) {
        console.error(err.message, err);
    },

    // ANDROID ONLY: GCM or FCM Sender ID
    applicationIconBadgeNumber: 0,

    // IOS ONLY (optional): default: all
    permissions: {
        alert: true,
        badge: true,
        sound: true,
    },

    // Should the initial notification be popped automatically
    popInitialNotification: true,

    /**
     * (optional) default: true
     * - Specified if permissions will be requested or not,
     * - if not, you must call PushNotificationsHandler.requestPermissions() later
     */
    requestPermissions: true,
});

// Create a channel (required for Android)
PushNotification.createChannel(
    {
        channelId: "default-channel-id", // (required)
        channelName: "Default channel", // (required)
        channelDescription: "A default channel for notifications", // (optional) default undefined.
        playSound: true, // (optional) default true
        soundName: "default", // (optional) See `soundName` parameter of `localNotification` function
        importance: PushNotification.Importance.HIGH, // (optional) default Importance.HIGH
        vibrate: true, // (optional) default true
    },
    (created) => console.log(`CreateChannel returned '${created}`) // (optional) callback returns whether the channel was created, false means it already existed.
);

export default function Main() {
    return (
        <PaperProvider
            theme={customTheme}
            settings={{
                detectedTheme: false
            }}
        >
            <App />
        </PaperProvider>
    );
}

AppRegistry.registerComponent(appName, () => Main);