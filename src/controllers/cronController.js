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
  static async emailReminders(req, res) {
    try {
      const token = req.get("x-cron-token");
      if (token !== process.env.CRON_SECRET) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const tenantId = req.tenantId;
      if (!tenantId)
        return res.status(400).json({ ok: false, error: "tenant required" });

      const {
        Appointments,
        Services,
        BrandSettings,
        AppointmentSettings,
        User,
      } = req;

      // Envoltorio que inyecta el modelo User correcto
      const buildEmailUserCron = (_ignored, appointment, fallbackUserId) =>
        buildEmailUser(
          { User: req.User, tenantId: req.tenantId }, // <-- aquí sí hay User
          appointment,
          fallbackUserId
        );

      const options = {
        // parámetros opcionales por query para pruebas/manual trigger
        forceNow: asBool(req.query.sendNow),
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
        buildEmailUser: buildEmailUserCron,
        sendAppointmentEmail,
        tenantId,
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
