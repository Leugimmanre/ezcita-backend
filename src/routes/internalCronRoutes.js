// src/routes/internalCronRoutes.js
import { Router } from "express";
import { buildEmailUser } from "../emails/emailUser.js";
import sendAppointmentEmail from "../emails/email.js";
import { runEmailReminders } from "../emails/emailReminderService.js";

const router = Router();

// POST /internal/cron/email-reminders?tenant=<id>
router.post("/email-reminders", async (req, res) => {
  try {
    const token = req.headers["x-cron-token"];
    if (token !== process.env.CRON_SECRET) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const tenantId = String(req.query.tenant || req.body.tenant || "").trim();
    if (!tenantId)
      return res.status(400).json({ ok: false, error: "tenant required" });

    // Resuelve modelos del tenant (ajusta según tu tenantManager)
    const Appointments =
      req.Appointments || req.app.get("tenant:Appointments")?.(tenantId);
    const Services = req.Services || req.app.get("tenant:Services")?.(tenantId);
    const BrandSettings =
      req.BrandSettings || req.app.get("tenant:BrandSettings")?.(tenantId);
    const AppointmentSettings =
      req.AppointmentSettings ||
      req.app.get("tenant:AppointmentSettings")?.(tenantId);

    if (!Appointments || !Services) {
      return res.status(500).json({ ok: false, error: "models not resolved" });
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

    res.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/email-reminders] error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
