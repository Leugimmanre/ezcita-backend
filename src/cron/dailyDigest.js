// src/cron/dailyDigest.js
import cron from "node-cron";

export function startDailyDigest({
  runDigestOnce, // función que construye y envía el resumen
  tz = process.env.TZ || "Europe/Madrid",
}) {
  // 08:00 todos los días
  cron.schedule(
    "0 8 * * *",
    async () => {
      try {
        await runDigestOnce();
        console.log("[digest] sent");
      } catch (e) {
        console.error("[digest] error:", e.message);
      }
    },
    { timezone: tz }
  );
}
