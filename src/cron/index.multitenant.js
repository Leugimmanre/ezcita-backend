// src/cron/index.multitenant.js
import cron from "node-cron";
import { purgeOldAppointments } from "../jobs/purgeOldAppointments.js";
import tenantManager from "../middlewares/multi-tenancy/tenantManager.js";

export function startCron() {
  const tz = process.env.TZ || "Europe/Madrid";

  cron.schedule(
    "*/5 * * * *",
    async () => {
      try {
        const conns = tenantManager.listConnections();
        let total = 0;
        for (const conn of conns) {
          if (conn.readyState === 1) {
            const { deletedCount } = await purgeOldAppointments({
              ageMinutes: 30,
              conn,
            });
            total += deletedCount;
          }
        }
        console.log(`[cron] multi-tenant: ${total} documentos borrados`);
      } catch (err) {
        console.error("[cron] error multi-tenant:", err.message);
      }
    },
    { timezone: tz }
  );

  console.log(`[cron] iniciado (multi-tenant, timezone: ${tz})`);
}
