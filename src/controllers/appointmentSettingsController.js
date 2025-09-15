// src/controllers/appointmentSettingsController.js
import { logActivity } from "../utils/logActivity.js";
import { pickDiff } from "../utils/diffChanges.js";

// Defaults SOLO modo avanzado
const DEFAULT_ADVANCED = {
  // Ejemplo útil por defecto: L-V 09:00-13:00 y 15:00-18:00
  dayBlocks: {
    monday: [
      { start: "09:00", end: "13:00" },
      { start: "15:00", end: "18:00" },
    ],
    tuesday: [
      { start: "09:00", end: "13:00" },
      { start: "15:00", end: "18:00" },
    ],
    wednesday: [
      { start: "09:00", end: "13:00" },
      { start: "15:00", end: "18:00" },
    ],
    thursday: [
      { start: "09:00", end: "13:00" },
      { start: "15:00", end: "18:00" },
    ],
    friday: [
      { start: "09:00", end: "13:00" },
      { start: "15:00", end: "18:00" },
    ],
    saturday: [],
    sunday: [],
  },
  interval: 30,
  maxMonthsAhead: 2,
  staffCount: 1,
  closedDates: [],
  timezone: "Europe/Madrid",
};

// Sanitizador estricto de dayBlocks avanzado
function sanitizeDayBlocks(db) {
  const keys = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const out = {};
  for (const k of keys) {
    const arr = Array.isArray(db?.[k]) ? db[k] : [];
    out[k] = arr
      .filter((b) => b && typeof b === "object")
      .map((b) => ({
        start: String(b.start || "").slice(0, 5),
        end: String(b.end || "").slice(0, 5),
      }));
  }
  return out;
}

export const AppointmentSettingsController = {
  // GET settings del tenant (sin legacy, con defaults avanzados)
  async getSettings(req, res, next) {
    try {
      const settings = await req.AppointmentSettings.findOne({
        tenantId: req.tenantId,
      });

      if (!settings) {
        return res.json({
          success: true,
          data: { ...DEFAULT_ADVANCED, tenantId: req.tenantId },
        });
      }

      const data = settings.toObject();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // POST/PUT solo modo avanzado
  async saveOrUpdateSettings(req, res, next) {
    try {
      const prevDoc = await req.AppointmentSettings.findOne({
        tenantId: req.tenantId,
      }).lean();

      const dayBlocks = sanitizeDayBlocks(req.body.dayBlocks);
      const interval = Math.max(
        5,
        Math.min(
          240,
          parseInt(req.body.interval, 10) || DEFAULT_ADVANCED.interval
        )
      );
      const maxMonthsAhead = Math.max(
        1,
        Math.min(
          24,
          parseInt(req.body.maxMonthsAhead, 10) ||
            DEFAULT_ADVANCED.maxMonthsAhead
        )
      );
      const staffCount = Math.max(
        1,
        Math.min(
          50,
          parseInt(req.body.staffCount, 10) || DEFAULT_ADVANCED.staffCount
        )
      );
      const timezone =
        typeof req.body.timezone === "string"
          ? req.body.timezone
          : DEFAULT_ADVANCED.timezone;
      const closedDates = Array.isArray(req.body.closedDates)
        ? req.body.closedDates
        : [];

      const data = {
        tenantId: req.tenantId,
        dayBlocks,
        interval,
        maxMonthsAhead,
        staffCount,
        timezone,
        closedDates,
      };

      const updated = await req.AppointmentSettings.findOneAndUpdate(
        { tenantId: req.tenantId },
        { $set: data },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      // Log actividad
      try {
        const diff = pickDiff(prevDoc || {}, data, [
          "dayBlocks",
          "interval",
          "maxMonthsAhead",
          "staffCount",
          "timezone",
          "closedDates",
        ]);

        await logActivity(req, {
          tenantId: req.tenantId,
          category: "Horarios",
          action: prevDoc
            ? "Actualizó ajustes de agenda"
            : "Creó ajustes de agenda",
          metadata: Object.keys(diff).length ? diff : undefined,
        });
      } catch (logErr) {
        console.error(
          "[appointmentSettings save] activity log failed:",
          logErr?.message
        );
      }

      return res
        .status(200)
        .json({ success: true, data: updated, msg: "Configuración guardada" });
    } catch (err) {
      next(err);
    }
  },
};
