// Firebase Service Worker for Background Messaging and Alarm Trigger
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker with user configuration
firebase.initializeApp({
  apiKey: "AIzaSyDYQhFuvRJvf-BROa-kHJ60T-wuzu55rso",
  authDomain: "my-medi-pcr.firebaseapp.com",
  projectId: "my-medi-pcr",
  storageBucket: "my-medi-pcr.firebasestorage.app",
  messagingSenderId: "349132181939",
  appId: "1:349132181939:web:f46f0ea0600949990dbbc6",
  measurementId: "G-Q9RKBEZGSW"
});

const messaging = firebase.messaging();

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

let lastHandledKey = '';
let lastHandledTime = 0;

// Instant broadcast via both BroadcastChannel and clients.matchAll
function broadcastToClients(message) {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('medi_pcr_alarm_channel');
      bc.postMessage(message);
      bc.close();
    }
  } catch (e) {
    console.warn('BroadcastChannel error:', e);
  }

  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
    clients.forEach(function (client) {
      client.postMessage(message);
    });
  });
}

function processPushPayload(payload, eventWaitUntil) {
  console.log('[firebase-messaging-sw.js] Processing push payload:', payload);

  const rawData = payload.data || payload;
  const type = rawData.type || '';
  const reminderId = rawData.reminderId || rawData.id;
  const reminderIds = rawData.reminderIds || '';
  const medicineIds = rawData.medicineIds || '';
  const medicineNames = rawData.medicineNames || '';
  const foodInstruction = rawData.foodInstruction || '';
  const count = parseInt(rawData.count || '1', 10);
  const scheduledTime = rawData.scheduledTime || '';
  const userId = rawData.userId ? Number(rawData.userId) : null;
  const userEmail = rawData.userEmail || '';
  const title = payload.notification?.title || rawData.title || (count > 1 ? `💊 Medicine Reminder (${count} medicines)` : '💊 Medicine Reminder');
  let body = payload.notification?.body || rawData.body;

  // Deduplication key: ignore duplicate push payloads within 2 seconds (e.g. if dual listeners fire)
  const msgId = payload.fcmMessageId || payload.messageId || (payload.data && (payload.data.fcmMessageId || payload.data.messageId)) || '';
  const dedupKey = `${msgId}_${title}_${type}_${scheduledTime}_${reminderIds || reminderId || medicineIds}`;
  const now = Date.now();
  if (dedupKey === lastHandledKey && now - lastHandledTime < 2000) {
    console.log('[firebase-messaging-sw.js] Duplicate push ignored within 2s:', dedupKey);
    return Promise.resolve();
  }
  lastHandledKey = dedupKey;
  lastHandledTime = now;

  const mNamesArray = medicineNames ? medicineNames.split(', ') : [];

  if (!body || body === 'Time to take your scheduled medicine.') {
    if (mNamesArray.length > 0) {
      body = 'Instruction: ' + (foodInstruction || 'General') + '\n' + mNamesArray.map(function (n) { return '• ' + n; }).join('\n');
    } else {
      body = 'Time to take your scheduled medicine.';
    }
  }

  const origin = (self.location && self.location.origin) ? self.location.origin : '';
  const iconUrl = origin ? (origin + '/firebase-logo.png') : '/firebase-logo.png';

  const commonData = {
    userId: userId,
    userEmail: userEmail,
    reminderId: reminderId,
    reminderIds: reminderIds,
    medicineIds: medicineIds,
    medicineNames: medicineNames,
    foodInstruction: foodInstruction,
    count: count,
    scheduledTime: scheduledTime,
    dateOfArrival: Date.now()
  };

  // 1. CRITICAL: Start the audio ringtone as soon as the first message is received!
  broadcastToClients({
    type: 'START_ALARM',
    reminderId: reminderId,
    reminderIds: reminderIds ? (typeof reminderIds === 'string' ? reminderIds.split(',') : reminderIds) : [],
    medicineIds: medicineIds ? (typeof medicineIds === 'string' ? medicineIds.split(',') : medicineIds) : [],
    medicineNames: mNamesArray,
    foodInstruction: foodInstruction,
    count: count,
    scheduledTime: scheduledTime,
    title: title,
    body: body
  });

  const promises = [];

  if (type === 'MEDICINE_DETAILS') {
    // Single Notification 1: Medicine Reminder message
    const detailsOptions = {
      body: body,
      icon: iconUrl,
      badge: iconUrl,
      tag: 'medi-pcr-details',
      renotify: true,
      requireInteraction: false,
      vibrate: [300, 100, 300],
      data: Object.assign({}, commonData, { notifType: 'DETAILS' })
    };
    promises.push(self.registration.showNotification(title, detailsOptions));
  } else if (type === 'MEDISTATUS_ACTION') {
    // Single Notification 2: Update MediStatus with buttons
    const actionsOptions = {
      body: body,
      icon: iconUrl,
      badge: iconUrl,
      tag: 'medi-pcr-actions',
      renotify: true,
      requireInteraction: true,
      vibrate: [500, 250, 500],
      data: Object.assign({}, commonData, { notifType: 'ACTIONS' }),
      actions: [
        { action: 'taken', title: count > 1 ? `✓ Taken (${count})` : '✓ Taken' },
        { action: 'snooze', title: '⏰ Snooze (5m)' },
        { action: 'postpone', title: '⏳ Postpone' },
        { action: 'dismiss', title: '✕ Missed' }
      ]
    };
    promises.push(self.registration.showNotification(title, actionsOptions));
  } else {
    // 2-Notification Pattern (Same as Direct Test with all 4 Action Buttons & Audio)
    const mainTitle = title || '💊 Medicine Reminder';
    const mainBody = (body && body !== 'Time to take your scheduled medicine.')
      ? body
      : (medicineNames ? ('Instruction: ' + (foodInstruction || 'General') + '\n• ' + medicineNames) : 'Time to take your scheduled medicine.');

    // Notification 1: Medicine Details & Instructions (Postpone & Missed)
    const detailsOptions = {
      body: mainBody,
      icon: iconUrl,
      badge: iconUrl,
      tag: 'medi-pcr-details-' + Date.now(),
      renotify: true,
      requireInteraction: false,
      vibrate: [300, 100, 300],
      data: Object.assign({}, commonData, { notifType: 'DETAILS' }),
      actions: [
        { action: 'postpone', title: '⏳ Postpone' },
        { action: 'dismiss', title: '✕ Missed' }
      ]
    };
    promises.push(self.registration.showNotification(mainTitle, detailsOptions));

    // Notification 2: MediStatus 1-Click Action Buttons (Taken & Snooze)
    const actionsOptions = {
      body: 'Tap a button below to update status directly:',
      icon: iconUrl,
      badge: iconUrl,
      tag: 'medi-pcr-actions-' + Date.now(),
      renotify: true,
      requireInteraction: true,
      vibrate: [500, 250, 500],
      data: Object.assign({}, commonData, { notifType: 'ACTIONS' }),
      actions: [
        { action: 'taken', title: count > 1 ? `✓ Taken (${count})` : '✓ Taken' },
        { action: 'snooze', title: '⏰ Snooze (5m)' }
      ]
    };
    promises.push(self.registration.showNotification('📋 Update MediStatus: Did you take your medicine?', actionsOptions));
  }

  const combinedPromise = Promise.all(promises);
  if (eventWaitUntil) {
    eventWaitUntil(combinedPromise);
  }
  return combinedPromise;
}

// Native W3C Web Push event listener
self.addEventListener('push', function (event) {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      try {
        payload = { data: { body: event.data.text() } };
      } catch (err) {}
    }
  }
  processPushPayload(payload, function (p) { event.waitUntil(p); });
});

// Firebase compat fallback
messaging.onBackgroundMessage(function (payload) {
  return processPushPayload(payload);
});

/**
 * Helper to dismiss both reminder notifications from device tray
 */
function dismissAllReminderNotifications() {
  if (self.registration && self.registration.getNotifications) {
    self.registration.getNotifications().then(function (notifications) {
      notifications.forEach(function (n) {
        if (n.tag === 'medi-pcr-details' || n.tag === 'medi-pcr-actions') {
          n.close();
        }
      });
    }).catch(function () {});
  }
}

/**
 * Handle Notification Close (swiped away or dismissed by user)
 * Stops alarm audio immediately!
 */
self.addEventListener('notificationclose', function (event) {
  console.log('[firebase-messaging-sw.js] Notification closed/swiped away -> Stopping audio');
  broadcastToClients({ type: 'STOP_ALARM', action: 'close' });
  dismissAllReminderNotifications();
});

/**
 * Handle Notification Clicks (When user clicks Taken, Snooze, Postpone, Missed, or card body)
 */
self.addEventListener('notificationclick', function (event) {
  const action = (event.action || 'click').toLowerCase();
  console.log('[firebase-messaging-sw.js] Notification clicked with action:', action);

  // Close the clicked notification immediately
  event.notification.close();
  // Close any remaining companion notification
  dismissAllReminderNotifications();

  // 1. CRITICAL: Stop audio INSTANTLY as soon as 2nd message (or 1st) is clicked!
  broadcastToClients({ type: 'STOP_ALARM', action: action });

  // 2. Extract notification payload data safely
  const notifData = (event.notification && event.notification.data) || {};
  const reminderIds = notifData.reminderIds;
  const reminderId = notifData.reminderId;
  const medicineIds = notifData.medicineIds;
  const userId = notifData.userId;
  const userEmail = notifData.userEmail;
  const count = notifData.count || 1;

  // If user clicked the notification card body itself: focus or open app and start audio alarm!
  if (action === 'click' || action === 'others') {
    const medicineNames = notifData.medicineNames || '';
    const foodInstruction = notifData.foodInstruction || '';
    const scheduledTime = notifData.scheduledTime || '';
    const title = (event.notification && event.notification.title) || '💊 Medicine Reminder';
    const body = (event.notification && event.notification.body) || 'Time to take your scheduled medication.';
    const mNamesArray = medicineNames ? medicineNames.split(', ') : [];

    const alarmMsg = {
      type: 'START_ALARM',
      reminderId: reminderId,
      reminderIds: reminderIds ? (typeof reminderIds === 'string' ? reminderIds.split(',') : reminderIds) : [],
      medicineIds: medicineIds ? (typeof medicineIds === 'string' ? medicineIds.split(',') : medicineIds) : [],
      medicineNames: mNamesArray,
      foodInstruction: foodInstruction,
      count: count,
      scheduledTime: scheduledTime,
      title: title,
      body: body
    };

    const alarmUrl = '/?alarm=1' +
      '&reminderId=' + encodeURIComponent(reminderId || '') +
      '&reminderIds=' + encodeURIComponent(typeof reminderIds === 'string' ? reminderIds : (reminderIds || []).join(',')) +
      '&medicineIds=' + encodeURIComponent(typeof medicineIds === 'string' ? medicineIds : (medicineIds || []).join(',')) +
      '&medicineNames=' + encodeURIComponent(medicineNames) +
      '&foodInstruction=' + encodeURIComponent(foodInstruction) +
      '&scheduledTime=' + encodeURIComponent(scheduledTime) +
      '&title=' + encodeURIComponent(title) +
      '&body=' + encodeURIComponent(body);

    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
        for (let i = 0; i < clients.length; i++) {
          const client = clients[i];
          if ('focus' in client) {
            client.postMessage(alarmMsg);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(alarmUrl);
        }
      })
    );
    return;
  }

  // 3. For the 4 actions: 'taken', 'snooze', 'postpone', 'dismiss':
  let endpoint = action;
  if (action === 'taken') {
    endpoint = 'complete';
  }

  const isLocal = !self.location || self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
  const apiBase = isLocal ? 'http://localhost:8080/api/v1.1' : 'https://medi-pcr-repo.onrender.com/api/v1.1';

  const rIdArray = reminderIds
    ? (typeof reminderIds === 'string' ? reminderIds.split(',').filter(Boolean).map(s => Number(s.trim())) : reminderIds)
    : (reminderId ? [Number(reminderId)] : []);
  const mIdArray = medicineIds
    ? (typeof medicineIds === 'string' ? medicineIds.split(',').filter(Boolean).map(s => Number(s.trim())) : medicineIds)
    : [];

  const reqBody = {
    userId: userId,
    userEmail: userEmail,
    reminderIds: rIdArray,
    medicineIds: mIdArray,
    status: action.toUpperCase(),
    notes: 'Marked as ' + action + ' for ' + (mIdArray.length || rIdArray.length || count) + ' medicine(s) via notification click (1-click)'
  };

  event.waitUntil(
    fetch(apiBase + '/reminders/batch/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    }).catch(function (err) {
      console.warn('Batch endpoint failed, falling back to single:', err);
      if (reminderId) {
        return fetch(apiBase + '/reminders/' + reminderId + '/' + endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody)
        });
      }
    }).then(function () {
      const statusLabels = {
        taken: '✓ MediStatus: Marked as Taken',
        snooze: '⏰ MediStatus: Snoozed for 5 minutes',
        postpone: '⏳ MediStatus: Postponed for today',
        dismiss: '✕ MediStatus: Marked as Missed'
      };
      const confirmTitle = statusLabels[action] || ('✓ MediStatus updated: ' + action);
      self.registration.showNotification(confirmTitle, {
        body: 'Status recorded successfully.',
        icon: (self.location && self.location.origin ? self.location.origin : '') + '/firebase-logo.png',
        tag: 'medi-pcr-confirmation',
        renotify: true
      });

      // Broadcast database update event and ensure alarm is completely stopped in all tabs
      return broadcastToClients({
        type: 'STOP_ALARM',
        action: action
      }).then(function () {
        return broadcastToClients({
          type: 'MEDISTATUS_UPDATED',
          action: action
        });
      });
    })
  );
});
