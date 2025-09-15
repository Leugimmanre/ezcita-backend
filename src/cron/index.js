// src/cron/index.js
import cron from "node-cron";
import { purgeOldAppointments } from "../jobs/purgeOldAppointments.js";

export function startCron() {
  const tz = process.env.TZ || "Europe/Madrid";

  // cada 5 minutos
  cron.schedule(
    "*/5 * * * *",
    async () => {
      try {
        const { deletedCount } = await purgeOldAppointments({ ageMinutes: 30 });
        console.log(
          `[cron] purgeOldAppointments: ${deletedCount} documentos borrados`
        );
      } catch (err) {
        console.error("[cron] error purgeOldAppointments:", err.message);
      }
    },
    { timezone: tz }
  );

  console.log(`[cron] iniciado (timezone: ${tz})`);
}
