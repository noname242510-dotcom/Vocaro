import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const REMINDER_ID_BASE = 1400;
const DAYS_TO_SCHEDULE = 14;

export async function setupDailyReminders(practicedToday: boolean = false) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      const reqStatus = await LocalNotifications.requestPermissions();
      if (reqStatus.display !== 'granted') return;
    }

    // Cancel previously scheduled reminders to start fresh
    const pending = await LocalNotifications.getPending();
    const toCancel = pending.notifications.filter(n => n.id >= REMINDER_ID_BASE && n.id < REMINDER_ID_BASE + DAYS_TO_SCHEDULE);
    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel });
    }

    const notifications = [];
    
    // We schedule 14 individual notifications for the next 14 days at 14:00.
    // This allows us to easily skip "today" if the user already practiced,
    // without affecting the reminders for the upcoming days.
    for (let i = 0; i < DAYS_TO_SCHEDULE; i++) {
      const targetDate = new Date();
      targetDate.setHours(14, 0, 0, 0);
      targetDate.setDate(targetDate.getDate() + i);

      // If the target is in the past, or if we want to skip today and it's today's reminder, skip it
      if (targetDate.getTime() <= Date.now()) continue;
      if (i === 0 && practicedToday) continue;

      notifications.push({
        title: "Zeig was du kannst! 🚀",
        body: "Du hast heute noch nicht geübt. Bleib am Ball und sammle weiter XP!",
        id: REMINDER_ID_BASE + i,
        schedule: { at: targetDate, allowWhileIdle: true },
      });
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch (error) {
    console.error('Failed to setup daily reminders:', error);
  }
}

export async function cancelTodaysReminder() {
  if (!Capacitor.isNativePlatform()) return;
  // This function is called when the user successfully practices.
  // We re-run the setup, passing true to practicedToday so today's 14:00 is skipped.
  await setupDailyReminders(true);
}
