// src/models/AppointmentSettingsModel.js
import mongoose from "mongoose";

// Sub-esquema para un bloque horario (HH:mm → HH:mm) sin legacy
const dayBlockSchema = new mongoose.Schema(
  {
    start: {
      type: String,
      required: true,
      trim: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora de inicio inválida (HH:mm)"],
    },
    end: {
      type: String,
      required: true,
      trim: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora de fin inválida (HH:mm)"],
    },
  },
  { _id: false }
);

// Validación sin solapes y fin > inicio
function validateNoOverlap(blocks) {
  if (!Array.isArray(blocks)) return true;
  const toMin = (t) => {
    const [h, m] = String(t).split(":").map(Number);
    return h * 60 + m;
  };
  const sorted = [...blocks].sort((a, b) => toMin(a.start) - toMin(b.start));
  for (let i = 0; i < sorted.length; i++) {
    const s = toMin(sorted[i].start);
    const e = toMin(sorted[i].end);
    if (e <= s) return false;
    if (i < sorted.length - 1) {
      if (toMin(sorted[i + 1].start) < e) return false;
    }
  }
  return true;
}

// Esquema SOLO modo avanzado
const appointmentSettingsSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true }, // NUEVO

    // Bloques por cada día (obligatorio, sin backfill legacy)
    dayBlocks: {
      type: new mongoose.Schema(
        {
          monday: {
            type: [dayBlockSchema],
            required: true,
            validate: [validateNoOverlap, "Solapes en lunes"],
            default: [],
          },
          tuesday: {
            type: [dayBlockSchema],
            required: true,
            validate: [validateNoOverlap, "Solapes en martes"],
            default: [],
          },
          wednesday: {
            type: [dayBlockSchema],
            required: true,
            validate: [validateNoOverlap, "Solapes en miércoles"],
            default: [],
          },
          thursday: {
            type: [dayBlockSchema],
            required: true,
            validate: [validateNoOverlap, "Solapes en jueves"],
            default: [],
          },
          friday: {
            type: [dayBlockSchema],
            required: true,
            validate: [validateNoOverlap, "Solapes en viernes"],
            default: [],
          },
          saturday: {
            type: [dayBlockSchema],
            required: true,
            validate: [validateNoOverlap, "Solapes en sábado"],
            default: [],
          },
          sunday: {
            type: [dayBlockSchema],
            required: true,
            validate: [validateNoOverlap, "Solapes en domingo"],
            default: [],
          },
        },
        { _id: false }
      ),
      required: true,
    },

    // Resto de parámetros activos
    interval: { type: Number, required: true, min: 5, max: 240 }, // minutos
    maxMonthsAhead: { type: Number, required: true, min: 1, max: 24 },
    staffCount: { type: Number, required: true, min: 1, max: 50 },
    closedDates: { type: [String], default: [] }, // YYYY-MM-DD
    timezone: { type: String, trim: true, default: "Europe/Madrid" },
  },
  { timestamps: true }
);

// Export compatible con TenantManager
export const appointmentSettingsSchemaDefinition = appointmentSettingsSchema;

// Modelo global fallback
export default mongoose.models?.AppointmentSettings ||
  mongoose.model("AppointmentSettings", appointmentSettingsSchema);
