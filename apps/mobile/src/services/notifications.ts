import * as Notifications from 'expo-notifications';
import * as Device from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { api } from './api';

/**
 * Push notification setup and handling.
 *
 * Registers the device token with the backend and handles
 * incoming notifications (foreground display + deep linking on tap).
 */

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const categoryId = notification.request.content.categoryIdentifier;

    // Always show message notifications even in foreground
    // (unless the user is already in that chat thread)
    return {
      shouldShowAlert: true,
      shouldPlaySound: categoryId === 'new_message' || categoryId === 'safety_alert',
      shouldSetBadge: true,
    };
  },
});

/**
 * Register for push notifications and send the token to the API.
 * Should be called after the user logs in.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.default.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Get the Expo push token (works with both FCM and APNs)
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Device.default.expoConfig?.extra?.eas?.projectId,
  });

  const pushToken = tokenData.data;

  // Register token with our API
  try {
    await api.notifications.registerToken({
      token: pushToken,
      platform: Platform.OS as 'ios' | 'android',
    });
  } catch (error) {
    console.error('Failed to register push token with API:', error);
  }

  // Android notification channel setup
  if (Platform.OS === 'android') {
    await setupAndroidChannels();
  }

  return pushToken;
}

/**
 * Android requires explicit notification channels (Android 8+).
 * Each channel can have independent sound, vibration, and priority settings.
 */
async function setupAndroidChannels(): Promise<void> {
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4A90D9',
    sound: 'notification.wav',
  });

  await Notifications.setNotificationChannelAsync('listing-updates', {
    name: 'Listing Updates',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#4A90D9',
  });

  await Notifications.setNotificationChannelAsync('promotions', {
    name: 'Promotions',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#F59E0B',
  });

  await Notifications.setNotificationChannelAsync('search-alerts', {
    name: 'Search Alerts',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#10B981',
  });

  await Notifications.setNotificationChannelAsync('safety', {
    name: 'Safety Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#EF4444',
    sound: 'notification.wav',
  });
}

/**
 * Handle deep linking when a notification is tapped.
 * Should be called once in the root layout component.
 */
export function setupNotificationResponseHandler(): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;

    if (!data?.deepLink || typeof data.deepLink !== 'string') return;

    // Navigate to the deep link target
    // The deep link format matches our Expo Router paths
    try {
      router.push(data.deepLink as any);
    } catch (error) {
      console.error('Failed to navigate from notification:', error);
    }
  });
}

/**
 * Get the current badge count.
 */
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Clear the badge count (e.g., when opening the messages tab).
 */
export async function clearBadgeCount(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
