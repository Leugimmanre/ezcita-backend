// src/cron/index.multitenant.js
import cron from "node-cron";
import { purgeOldAppointments } from "../jobs/purgeOldAppointments.js";
import tenantManager from "../middlewares/multi-tenancy/tenantManager.js";

// 🔽 NUEVO
import runEmailReminders from "../emails/emailReminderService.js";
import { buildEmailUser } from "../emails/emailUser.js";
import { sendAppointmentEmail } from "../emails/email.js";

export function startCron() {
  const tz = process.env.TZ || "Europe/Madrid";

  // 🧹 cada 5: purga multi-tenant (ya lo tienes)
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

  // ✉️ NUEVO: recordatorios cada minuto por tenant
  cron.schedule(
    "* * * * *",
    async () => {
      try {
        const conns = tenantManager.listConnections();

        for (const conn of conns) {
          if (conn.readyState !== 1) continue;

          // ⚠️ Obtén tenantId desde el nombre de la DB (ajusta si tu naming es distinto)
          // ej: "ezcita_barbershop" -> "barbershop"
          const dbName = conn?.name || "";
          const tenantId = dbName.replace(/^ezcita_/, "") || "default";

          // Modelos registrados en esa conexión
          const Appointments = conn.model("Appointment");
          const Services = conn.model("Services");
          const BrandSettings = conn.model("BrandSettings");
          const AppointmentSettings = conn.model("AppointmentSettings");
          const User = conn.model("User");

          const res = await runEmailReminders({
            Appointments,
            Services,
            BrandSettings,
            AppointmentSettings,
            buildEmailUser,
            sendAppointmentEmail,
            tenantId,
            User,
            options: {
              toleranceMin: Number(process.env.REMINDER_TOLERANCE || 5),
              defaultOffsets: (process.env.REMINDER_OFFSETS || "25,20,10,5,2")
                .split(",")
                .map((x) => Number(x.trim()))
                .filter((n) => Number.isFinite(n) && n > 0),
            },
          });

          if (res?.sent > 0) {
            console.log(
              `[cron][${tenantId}] reminders: sent=${res.sent} checked=${res.checked}`
            );
          }
        }
      } catch (err) {
        console.error("[cron] error reminders multi-tenant:", err.message);
      }
    },
    { timezone: tz }
  );

  console.log(`[cron] iniciado (multi-tenant, timezone: ${tz})`);
}
