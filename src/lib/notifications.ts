import { LocalNotifications } from '@capacitor/local-notifications';

export async function setupDailyReminders() {
  try {
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      const request = await LocalNotifications.requestPermissions();
      if (request.display !== 'granted') {
        console.log('User denied notification permissions');
        return;
      }
    }

    // Cancel existing notifications to avoid duplicates
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

    // Schedule a daily notification at 2 PM (14:00)
    await LocalNotifications.schedule({
      notifications: [
        {
          title: "Zeit zum Lernen! 📚",
          body: "Nur 5 Minuten am Tag helfen dir, deine Vokabeln langfristig zu behalten.",
          id: 1,
          schedule: {
            on: {
              hour: 14,
              minute: 0
            },
            repeats: true,
            allowWhileIdle: true
          },
          sound: 'default'
        }
      ]
    });
    console.log('Daily reminder scheduled for 14:00');
  } catch (error) {
    console.error('Error setting up daily reminders:', error);
  }
}
