// src/controllers/cronController.js
import { buildEmailUser } from "../emails/emailUser.js";
import { sendAppointmentEmail } from "../emails/email.js";
import { runEmailReminders } from "../emails/emailReminderService.js";

export class CronController {
  /**
   * POST /api/cron/email-reminders
   * Requiere:
   *  - Header: x-cron-token == process.env.CRON_SECRET
   *  - tenantMiddleware montado (para tener req.tenantId y modelos por tenant)
   *  - Query o header de tenant (lo resuelve el tenantMiddleware)
   */
  static async emailReminders(req, res) {
    try {
      const token = req.get("x-cron-token");
      if (token !== process.env.CRON_SECRET) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const tenantId = req.tenantId; // lo pone el tenantMiddleware
      if (!tenantId) {
        return res.status(400).json({ ok: false, error: "tenant required" });
      }

      // Modelos ya inyectados por tenantMiddleware
      const { Appointments, Services, BrandSettings, AppointmentSettings } =
        req;

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
      });

      return res.json({ ok: true, ...result });
    } catch (e) {
      console.error("[cron/email-reminders] error:", e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
}

export default CronController;
