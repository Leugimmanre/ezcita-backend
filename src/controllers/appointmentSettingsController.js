// src/controllers/appointmentSettingsController.js
const DEFAULT_SETTINGS = {
  startHour: 9, // 9:00
  endHour: 18, // 18:00
  interval: 30, // minutos, múltiplo de 5
  lunchStart: 13, // 13:00
  lunchEnd: 15, // 15:00
  maxMonthsAhead: 2, // meses máximo para reservar
  workingDays: [1, 2, 3, 4, 5], // 0=Dom ... 6=Sáb -> L-V
  staffCount: 1, // capacidad simultánea por franja
};

// ─────────────────────────────────────────────────────────────
// Helpers de validación / normalización
// ─────────────────────────────────────────────────────────────

// fuerza número; si NaN usa fallback
function num(x, fallback) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

// redondea a saltos de 0.5 (ej. 9.25 -> 9.5 ; 9.74 -> 9.5 ; 9.76 -> 10.0)
function toHalfStep(x) {
  return Math.round(x * 2) / 2;
}

// limita a rango [min, max]
function clamp(x, min, max) {
  return Math.min(max, Math.max(min, x));
}

// intervalo: entero, múltiplo de 5, mínimo 5, máximo 240
function normalizeInterval(x) {
  let n = Math.round(num(x, DEFAULT_SETTINGS.interval));
  if (n < 5) n = 5;
  if (n > 240) n = 240;
  if (n % 5 !== 0) {
    // fuerza múltiplo de 5 más cercano
    n = Math.round(n / 5) * 5;
  }
  return n;
}

// workingDays: array único de enteros 0..6 ordenados
function normalizeWorkingDays(arr) {
  if (!Array.isArray(arr)) return DEFAULT_SETTINGS.workingDays;
  const set = new Set(
    arr
      .map((d) => Number(d))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  );
  if (set.size === 0) return DEFAULT_SETTINGS.workingDays;
  return Array.from(set).sort((a, b) => a - b);
}

// valida consistencia básica de horas y comida
function validateHours({ startHour, endHour, lunchStart, lunchEnd }) {
  const sh = startHour;
  const eh = endHour;
  const ls = lunchStart;
  const le = lunchEnd;

  if (eh <= sh) {
    return "La hora de fin debe ser mayor que la hora de inicio.";
  }
  if (le <= ls) {
    return "La hora fin de comida debe ser mayor que la de inicio de comida.";
  }
  if (ls < sh || le > eh) {
    return "La franja de comida debe estar completamente dentro del horario laboral.";
  }
  return null;
}

// ─────────────────────────────────────────────────────────────

export const AppointmentSettingsController = {
  // GET settings del tenant (con defaults si no existen)
  async getSettings(req, res, next) {
    try {
      const settings = await req.AppointmentSettings.findOne({
        tenantId: req.tenantId,
      });

      if (!settings) {
        return res.json({
          success: true,
          data: { ...DEFAULT_SETTINGS, tenantId: req.tenantId },
        });
      }

      // Garantiza staffCount en respuestas antiguas
      const data = settings.toObject();
      if (typeof data.staffCount !== "number") {
        data.staffCount = DEFAULT_SETTINGS.staffCount;
      }

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // POST/PUT: guardar o actualizar configuración
  async saveOrUpdateSettings(req, res, next) {
    try {
      // Normalización de entrada
      const startHour = toHalfStep(
        clamp(num(req.body.startHour, DEFAULT_SETTINGS.startHour), 0, 23.5)
      );
      const endHour = toHalfStep(
        clamp(num(req.body.endHour, DEFAULT_SETTINGS.endHour), 0.5, 23.5)
      );
      const lunchStart = toHalfStep(
        clamp(num(req.body.lunchStart, DEFAULT_SETTINGS.lunchStart), 0, 23.5)
      );
      const lunchEnd = toHalfStep(
        clamp(num(req.body.lunchEnd, DEFAULT_SETTINGS.lunchEnd), 0.5, 23.5)
      );
      const interval = normalizeInterval(req.body.interval);
      const maxMonthsAhead = clamp(
        Math.round(
          num(req.body.maxMonthsAhead, DEFAULT_SETTINGS.maxMonthsAhead)
        ),
        0,
        24
      );
      const workingDays = normalizeWorkingDays(req.body.workingDays);
      const staffCount = clamp(
        Math.round(num(req.body.staffCount, DEFAULT_SETTINGS.staffCount)),
        1,
        50
      );

      // Validaciones de coherencia
      const hoursError = validateHours({
        startHour,
        endHour,
        lunchStart,
        lunchEnd,
      });
      if (hoursError) {
        return res.status(400).json({ success: false, error: hoursError });
      }

      // Construimos payload final
      const data = {
        tenantId: req.tenantId,
        startHour,
        endHour,
        interval,
        lunchStart,
        lunchEnd,
        maxMonthsAhead,
        workingDays,
        staffCount,
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

      res.status(200).json({
        success: true,
        data: updated,
        msg: "Configuración guardada",
      });
    } catch (err) {
      next(err);
    }
  },
};
