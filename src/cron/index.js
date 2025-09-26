// src/cron/index.js
import cron from "node-cron";
import { purgeOldAppointments } from "../jobs/purgeOldAppointments.js";

// 🔽 NUEVO: importa el servicio y los helpers que ya usas en el resto del sistema
import runEmailReminders from "../emails/emailReminderService.js";
import { buildEmailUser } from "../emails/emailUser.js";
import { sendAppointmentEmail } from "../emails/email.js";

// 🔽 NUEVO: importa los modelos “globales” (ajusta rutas si difieren)
import Appointments from "../models/AppointmentModel.js";
import Services from "../models/ServicesModel.js";
import BrandSettings from "../models/BrandSettingsModel.js";
import AppointmentSettings from "../models/AppointmentSettingsModel.js";
import User from "../models/UserModel.js";

export function startCron() {
  const tz = process.env.TZ || "Europe/Madrid";

  // 🧹 cada 5 minutos: purga
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

  // ✉️ NUEVO: recordatorios cada minuto
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
          tenantId: process.env.TENANT_ID || "default", // usa tu tenant actual si aplica
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
            `[cron] reminders: sent=${res.sent} checked=${res.checked}`
          );
        }
      } catch (err) {
        console.error("[cron] error reminders:", err.message);
      }
    },
    { timezone: tz }
  );

  console.log(`[cron] iniciado (timezone: ${tz})`);
}
