// src/controllers/cronController.js
import { buildEmailUser } from "../emails/emailUser.js";
import { sendAppointmentEmail } from "../emails/email.js";
import { runEmailReminders } from "../emails/emailReminderService.js";

const parseBool = (v) =>
  ["true", "1", "yes", "y", true].includes(
    String(v === undefined ? "" : v).toLowerCase()
  );

export class CronController {
  /**
   * POST /api/cron/email-reminders
   * Headers:
   *  - X-CRON-TOKEN: <CRON_SECRET>
   *  - X-Tenant-ID: <tenantId>
   * Query/body opcional:
   *  - sendNow=true            => ignora la ventana y manda YA (si no enviados)
   *  - appointmentId=<id>      => limita a una cita concreta
   *  - tolerance=<min>         => tolerancia en minutos (default 2)
   *  - now=<ISO|epoch>         => “ahora” simulado para pruebas
   *  - windowHours=<h>         => ventana hacia delante (default 26h)
   */
  static async emailReminders(req, res) {
    try {
      const token = req.get("x-cron-token");
      if (token !== process.env.CRON_SECRET) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const tenantId = req.tenantId; // lo pone tenantMiddleware
      if (!tenantId) {
        return res.status(400).json({ ok: false, error: "tenant required" });
      }

      // ---- parámetros de prueba/forzado ----
      const q = { ...req.query, ...req.body };
      const sendNow = parseBool(q.sendNow);
      const appointmentId = q.appointmentId ? String(q.appointmentId) : null;
      const toleranceMin =
        Number.isFinite(Number(q.tolerance)) ? Number(q.tolerance) : 2;
      const windowHours =
        Number.isFinite(Number(q.windowHours)) ? Number(q.windowHours) : 26;

      let nowOverride = undefined;
      if (q.now) {
        const n = new Date(q.now);
        if (!isNaN(n.getTime())) nowOverride = n;
      }

      // Modelos ya inyectados por tenantMiddleware
      const { Appointments, Services, BrandSettings, AppointmentSettings } = req;
      if (!Appointments || !Services) {
        return res
          .status(500)
          .json({ ok: false, error: "models not resolved" });
      }

      const result = await runEmailReminders({
        Appointments,
        Services,
        BrandSettings,
        AppointmentSettings,
        buildEmailUser,
        sendAppointmentEmail,
        tenantId,

        // opciones nuevas:
        sendNow,
        appointmentId,
        toleranceMin,
        windowHours,
        now: nowOverride,
      });

      return res.json({ ok: true, ...result });
    } catch (e) {
      console.error("[cron/email-reminders] error:", e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
}

export default CronController;
