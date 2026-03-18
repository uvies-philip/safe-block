import * as Notifications from 'expo-notifications';

export const notificationService = {
  async sendPushNotification(title: string, body: string) {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  },

  async subscribeToLocationAlerts() {
    const permissions = await Notifications.requestPermissionsAsync();
    return permissions.status;
  },
};
