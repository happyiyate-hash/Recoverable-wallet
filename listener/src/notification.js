const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load service account (mocking if not exists to prevent crash on startup)
const serviceAccountPath = path.resolve(__dirname, "../../firebase-service-account.json");

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.warn("⚠️ Firebase service account not found. Notifications will only be logged locally.");
}

async function sendNotification(token, title, body) {
  if (!token || token === "PASTE_USER_FCM_TOKEN_HERE") {
    console.log(`[SIMULATED NOTIFICATION] Title: ${title} | Body: ${body}`);
    return;
  }

  const message = {
    token,
    notification: {
      title,
      body,
    },
  };

  try {
    if (admin.apps.length > 0) {
      await admin.messaging().send(message);
      console.log("📲 Notification sent to FCM");
    } else {
      console.log(`[SIMULATED NOTIFICATION] To: ${token} | Title: ${title} | Body: ${body}`);
    }
  } catch (error) {
    console.error("❌ Notification error:", error.message);
  }
}

module.exports = { sendNotification };
