import { buildEmailUser } from "../emails/emailUser.js";
import { sendAppointmentEmail } from "../emails/email.js";
import { runEmailReminders } from "../emails/emailReminderService.js";

const asBool = (v) => v === true || v === "true" || v === "1";
const asNum = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const parseOffsets = (s) =>
  String(s || "")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isFinite(x) && x >= 0);

export class CronController {
  /**
   * POST /api/cron/email-reminders
   * Headers:
   *   - X-CRON-TOKEN: <CRON_SECRET>
   *   - X-Tenant-ID: <tenantId>
   * Query opcional para pruebas:
   *   - sendNow=true
   *   - appointmentId=<id>
   *   - tolerance=5        (minutos)
   *   - defaultOffsets=25,20
   *   - now=2025-09-25T20:10:00Z (para simular "ahora")
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

      // Modelos ya inyectados por tenantMiddleware
      const {
        Appointments,
        Services,
        BrandSettings,
        AppointmentSettings,
        User,
      } = req;

      // Wrapper para que buildEmailUser tenga req.User (el fallo original)
      const buildEmailUserCron = (_ignored, appointment, fallbackUserId) =>
        buildEmailUser(
          { User: req.User, tenantId: req.tenantId },
          appointment,
          fallbackUserId
        );

      const options = {
        sendNow: asBool(req.query.sendNow),
        appointmentId: req.query.appointmentId || req.query.id || null,
        toleranceMin: asNum(req.query.tolerance, 1),
        now: req.query.now || null,
        defaultOffsets: req.query.defaultOffsets
          ? parseOffsets(req.query.defaultOffsets)
          : undefined,
      };

      const result = await runEmailReminders({
        Appointments,
        Services,
        BrandSettings,
        AppointmentSettings,
        buildEmailUser: buildEmailUserCron, // <— usamos el wrapper
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
