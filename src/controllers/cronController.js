import { buildEmailUser } from "../emails/emailUser.js";
import { sendAppointmentEmail } from "../emails/email.js";
import { runEmailReminders } from "../emails/emailReminderService.js";

/**
 * Controlador para jobs internos (cron / invocaciones manuales)
 *
 * Requiere:
 *  - Header: X-CRON-TOKEN == process.env.CRON_SECRET
 *  - tenantMiddleware montado (para tener req.tenantId y modelos por tenant)
 *  - X-Tenant-ID en headers o ?tenant= en la URL (lo resuelve el tenantMiddleware)
 *
 * Query params soportados:
 *  - sendNow=true|false
 *  - appointmentId=<id>
 *  - tolerance=<minutos>
 *  - defaultOffsets=1440,60   (coma separada)
 *  - now=2025-01-01T12:00:00Z (opcional, para pruebas)
 */
export class CronController {
  static async emailReminders(req, res) {
    try {
      const token = req.get("x-cron-token") || req.get("X-CRON-TOKEN");
      if (token !== process.env.CRON_SECRET) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const tenantId = req.tenantId; // puesto por tenantMiddleware
      if (!tenantId) {
        return res.status(400).json({ ok: false, error: "tenant required" });
      }

      // Modelos ya inyectados por tenantMiddleware
      const { Appointments, Services, BrandSettings, AppointmentSettings, User } = req;
      if (!Appointments || !Services) {
        return res.status(500).json({ ok: false, error: "models not resolved" });
      }

      // Parseo de query
      const sendNow = String(req.query.sendNow || "false").toLowerCase() === "true";
      const appointmentId = (req.query.appointmentId || "").trim() || null;
      const tolerance = Number(req.query.tolerance || req.query.toleranceMin || 1);
      const nowParam = (req.query.now || "").trim() || null;

      let defaultOffsets = [1440, 60];
      if (req.query.defaultOffsets) {
        defaultOffsets = String(req.query.defaultOffsets)
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n >= 0);
        if (!defaultOffsets.length) defaultOffsets = [1440, 60];
      }

      const options = {
        sendNow,
        appointmentId,
        toleranceMin: Number.isFinite(tolerance) && tolerance > 0 ? tolerance : 1,
        defaultOffsets,
        now: nowParam || null,
      };

      const result = await runEmailReminders({
        Appointments,
        Services,
        BrandSettings,
        AppointmentSettings,
        buildEmailUser,
        sendAppointmentEmail,
        tenantId,
        User,
        options,
      });

      return res.json({ ok: true, ...result });
    } catch (e) {
      console.error("[cron/email-reminders] error:", e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
}

export default CronController;
