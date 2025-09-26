// src/cron/index.multitenant.js
import cron from "node-cron";
import { purgeOldAppointments } from "../jobs/purgeOldAppointments.js";
import tenantManager from "../middlewares/multi-tenancy/tenantManager.js";

import runEmailReminders from "../emails/emailReminderService.js";
import { buildEmailUser } from "../emails/emailUser.js";
import { sendAppointmentEmail } from "../emails/email.js";

export function startCron() {
  const tz = process.env.TZ || "Europe/Madrid";

  // Cada 5: purga multi-tenant (ya lo tienes)
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

  // Recordatorios cada minuto por tenant
  cron.schedule(
    "* * * * *",
    async () => {
      try {
        const res = await runEmailReminders({
          Appointments,
          Services,
          BrandSettings,
          AppointmentSettings,
          buildEmailUser,
          sendAppointmentEmail,
          tenantId: process.env.TENANT_ID || "default",
          User,
          options: {
            toleranceMin: Number(process.env.REMINDER_TOLERANCE || 3),
            defaultOffsets: (process.env.REMINDER_OFFSETS || "5,2")
              .split(",")
              .map((x) => Number(x.trim()))
              .filter((n) => Number.isFinite(n) && n > 0),
          },
        });
        if (res?.checked) {
          console.log(`[cron] reminders: sent=${res.sent} checked=${res.checked}`);
        }
      } catch (err) {
        console.error("[cron] reminders error:", err.message);
      }
    },
    { timezone: tz }
  );

  console.log(`[cron] iniciado (multi-tenant, timezone: ${tz})`);
}
