package com.brr.medi_pcr.Service;

import com.brr.medi_pcr.Entity.Medicine;
import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.AndroidNotification;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.google.firebase.messaging.WebpushConfig;
import com.google.firebase.messaging.WebpushNotification;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FCMNotificationService {

    // 1. Method to group medicines and trigger the push notification
    public List<String> sendGroupedReminders(List<Medicine> medicines, String fcmToken) {
        return sendGroupedReminders(medicines, fcmToken, null);
    }

    public List<String> sendGroupedReminders(List<Medicine> medicines, String fcmToken,
            java.time.LocalTime currentTime) {
        List<String> results = new ArrayList<>();
        if (medicines == null || medicines.isEmpty() || fcmToken == null || fcmToken.isBlank()) {
            results.add("SKIPPED: medicines or fcmToken was null/empty");
            return results;
        }

        int count = medicines.size();
        String title = count > 1
                ? "💊 Medicine Reminder (" + count + " medicines)"
                : "💊 Medicine Reminder: " + medicines.get(0).getMedicineName();

        // Build bulleted, listwise body text for all medicines
        StringBuilder bodyText = new StringBuilder();
        for (Medicine med : medicines) {
            String inst = formatFoodInstruction(med.getFoodInstruction());
            bodyText.append("• ").append(med.getMedicineName()).append(" (").append(inst).append(")\n");
        }

        // Collect comma-separated medicine IDs and names
        String medicineIds = medicines.stream()
                .map(m -> String.valueOf(m.getId()))
                .collect(Collectors.joining(","));
        String medicineNames = medicines.stream()
                .map(Medicine::getMedicineName)
                .collect(Collectors.joining(", "));

        // Collect matching reminder IDs for the current time slot if present
        List<Long> reminderIdList = new ArrayList<>();
        for (Medicine med : medicines) {
            if (med.getReminders() != null && !med.getReminders().isEmpty()) {
                com.brr.medi_pcr.Entity.Reminder matched = med.getReminders().stream()
                        .filter(r -> r.getReminderTime() != null && currentTime != null
                                && r.getReminderTime().getHour() == currentTime.getHour()
                                && r.getReminderTime().getMinute() == currentTime.getMinute())
                        .findFirst()
                        .orElse(med.getReminders().get(0));
                reminderIdList.add(matched.getId());
            }
        }
        String reminderIds = reminderIdList.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(","));

        Map<String, String> data = new HashMap<>();
        data.put("type", "MEDICINE_REMINDER");
        data.put("title", title);
        data.put("body", bodyText.toString().trim());
        data.put("count", String.valueOf(count));
        data.put("medicineIds", medicineIds);
        data.put("medicineNames", medicineNames);
        if (!reminderIds.isEmpty()) {
            data.put("reminderIds", reminderIds);
            data.put("reminderId", String.valueOf(reminderIdList.get(0)));
        }
        if (!medicines.isEmpty()) {
            data.put("medicineId", String.valueOf(medicines.get(0).getId()));
            Medicine firstMed = medicines.get(0);
            if (firstMed.getPrescription() != null && firstMed.getPrescription().getUser() != null) {
                com.brr.medi_pcr.Entity.User patientUser = firstMed.getPrescription().getUser();
                data.put("userId", String.valueOf(patientUser.getId()));
                data.put("userEmail", patientUser.getEmail());
            }
        }
        if (currentTime != null) {
            data.put("scheduledTime", currentTime.toString());
        }

        // Send exactly ONE consolidated push message containing full reminder & action
        // payload
        String sendRes = sendPushNotification(fcmToken, title, bodyText.toString().trim(), data);
        results.add(sendRes);
        return results;
    }

    private String formatFoodInstruction(String raw) {
        if (raw == null || raw.isBlank())
            return "General";
        String cleaned = raw.trim().replace("_", " ").toLowerCase();
        String[] parts = cleaned.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (!p.isEmpty()) {
                sb.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1)).append(" ");
            }
        }
        return sb.toString().trim();
    }

    // 1. Medicine Details Push Notification (Informational message on user device)
    public String sendMedicineDetailsNotification(String fcmToken, String title, String body, Map<String, String> data,
            String tag) {
        try {
            Message.Builder builder = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .putData("type", "MEDICINE_DETAILS")
                    .putData("title", title)
                    .putData("body", body);

            if (data != null) {
                for (Map.Entry<String, String> entry : data.entrySet()) {
                    if (entry.getKey() != null && entry.getValue() != null) {
                        builder.putData(entry.getKey(), entry.getValue());
                    }
                }
            }

            WebpushConfig webpushConfig = WebpushConfig.builder()
                    .putHeader("Urgency", "high")
                    .putHeader("TTL", "86400")
                    .setNotification(WebpushNotification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .setTag(tag)
                            .build())
                    .build();
            builder.setWebpushConfig(webpushConfig);

            AndroidConfig androidConfig = AndroidConfig.builder()
                    .setPriority(AndroidConfig.Priority.HIGH)
                    .setTtl(86400L * 1000L)
                    .setNotification(AndroidNotification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .setTag(tag)
                            .setIcon("ic_launcher")
                            .setSound("default")
                            .setChannelId("medicine-reminder-alarm")
                            .setDefaultSound(true)
                            .setDefaultVibrateTimings(true)
                            .build())
                    .build();
            builder.setAndroidConfig(androidConfig);

            Message message = builder.build();
            String response = FirebaseMessaging.getInstance().send(message);
            System.out.println("Medicine Details push sent successfully: " + response);
            return "SUCCESS: " + response;
        } catch (Exception e) {
            System.err.println("Failed to send Medicine Details notification: " + e.getMessage());
            return "ERROR: " + e.getMessage();
        }
    }

    // 2. Update MediStatus Push Notification (Interactive action buttons on user
    // device)
    public String sendMediStatusActionsNotification(String fcmToken, String title, String body,
            Map<String, String> data, String tag) {
        try {
            Message.Builder builder = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .putData("type", "MEDISTATUS_ACTION")
                    .putData("title", title)
                    .putData("body", body);

            if (data != null) {
                for (Map.Entry<String, String> entry : data.entrySet()) {
                    if (entry.getKey() != null && entry.getValue() != null) {
                        builder.putData(entry.getKey(), entry.getValue());
                    }
                }
            }

            WebpushConfig webpushConfig = WebpushConfig.builder()
                    .putHeader("Urgency", "high")
                    .putHeader("TTL", "86400")
                    .setNotification(WebpushNotification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .setTag(tag)
                            .addAction(new WebpushNotification.Action("taken", "✓ Taken"))
                            .addAction(new WebpushNotification.Action("snooze", "⏰ Snooze (5m)"))
                            .addAction(new WebpushNotification.Action("postpone", "⏳ Postpone"))
                            .addAction(new WebpushNotification.Action("dismiss", "✕ Missed"))
                            .build())
                    .build();
            builder.setWebpushConfig(webpushConfig);

            AndroidConfig androidConfig = AndroidConfig.builder()
                    .setPriority(AndroidConfig.Priority.HIGH)
                    .setTtl(86400L * 1000L)
                    .setNotification(AndroidNotification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .setTag(tag)
                            .setIcon("ic_launcher")
                            .setSound("default")
                            .setChannelId("medicine-reminder-alarm")
                            .setDefaultSound(true)
                            .setDefaultVibrateTimings(true)
                            .build())
                    .build();
            builder.setAndroidConfig(androidConfig);

            Message message = builder.build();
            String response = FirebaseMessaging.getInstance().send(message);
            System.out.println("MediStatus Actions push sent successfully: " + response);
            return "SUCCESS: " + response;
        } catch (Exception e) {
            System.err.println("Failed to send MediStatus Actions notification: " + e.getMessage());
            return "ERROR: " + e.getMessage();
        }
    }

    // 3. Fallback direct send
    public String sendPushNotification(String fcmToken, String title, String body) {
        return sendPushNotification(fcmToken, title, body, null);
    }

    public String sendPushNotification(String fcmToken, String title, String body, Map<String, String> data) {
        return sendMediStatusActionsNotification(fcmToken, title, body, data, "medi-pcr-push");
    }
}
