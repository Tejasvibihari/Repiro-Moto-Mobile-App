import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setExpoPushToken, addNotification } from '../store/slices/notificationSlice';
import { notificationService } from '../services/notificationService';

// How notifications appear when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export function usePushNotifications(navigation) {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector((state) => state.auth.isLoggedIn);
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        if (!isAuthenticated) return;
        registerForPushNotifications();

        // Foreground: notification received while app is open
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            const { title, body, data } = notification.request.content;
            dispatch(addNotification({
                id: data?.notificationId || notification.request.identifier,
                title,
                body,
                type: data?.type || 'general',
                orderId: data?.orderId || null,
                data: data,
                isRead: false,
                createdAt: new Date().toISOString(),
            }));
        });

        // User taps a notification → open that order. Retries briefly because on a
        // cold start the navigator may not be mounted yet.
        const openFromResponse = async (response) => {
            const data = response?.notification?.request?.content?.data;
            if (!navigation) return;
            // service_reminder carries the *previous* order id, but the useful action is a new booking.
            let target = null;
            if (data?.type === 'service_reminder') target = ['NewOrder', { serviceType: 'Schedule Repair' }];
            else if (data?.type === 'promotion') target = ['Notifications'];
            // Support replied → open that order's chat (not the order detail)
            else if (data?.type === 'chat' && data?.orderId) {
                target = ['ChatSupport', { order: { _id: data.orderId, orderId: data.screenOrderId } }];
            }
            else if (data?.orderId) target = ['OrderDetail', { orderId: data.orderId }];
            if (!target) return;
            for (let i = 0; i < 20; i++) {
                if (navigation.isReady?.()) {
                    navigation.navigate(...target);
                    return;
                }
                await new Promise(r => setTimeout(r, 250));
            }
        };

        responseListener.current = Notifications.addNotificationResponseReceivedListener(openFromResponse);

        // App was killed and opened by tapping a notification
        Notifications.getLastNotificationResponseAsync().then(r => { if (r) openFromResponse(r); });

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [isAuthenticated]);

    async function registerForPushNotifications() {
        if (!Device.isDevice) {
            console.warn('Push notifications require a physical device');
            return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('Push notification permission denied');
            return;
        }

        if (Platform.OS === 'android') {
            // Server pushes use channelId 'orders' — the channel must exist or Android
            // falls back to a silent/low-priority default.
            await Notifications.setNotificationChannelAsync('orders', {
                name: 'Order Updates',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#e2a731',
                sound: 'default',
            });
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#e2a731',
            });
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId
            ?? Constants.easConfig?.projectId
            ?? 'b7b6901c-38f8-4d45-9a33-3411236461ec';

        try {
            const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            console.log('[push] Expo token:', token);

            dispatch(setExpoPushToken(token));

            // Send token to your backend so it can push to this device
            await notificationService.registerToken(token);
            console.log('[push] token registered with backend');
        } catch (e) {
            console.error('[push] token registration failed:', e?.message || e);
        }
    }
}
