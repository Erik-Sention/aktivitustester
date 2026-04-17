"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupPendingConsent = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
/**
 * Runs daily and deletes athlete profiles with status 'Pending_Consent'
 * that were created more than 7 days ago (GDPR data minimisation).
 */
exports.cleanupPendingConsent = (0, scheduler_1.onSchedule)("every 24 hours", async () => {
    const db = (0, firestore_1.getFirestore)();
    const sevenDaysAgo = firestore_1.Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const snapshot = await db
        .collection("athletes")
        .where("status", "==", "Pending_Consent")
        .where("createdAt", "<", sevenDaysAgo)
        .get();
    if (snapshot.empty) {
        console.log("No stale Pending_Consent athletes to delete.");
        return;
    }
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`Deleted ${snapshot.size} stale Pending_Consent athlete(s).`);
});
//# sourceMappingURL=index.js.map