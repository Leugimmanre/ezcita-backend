// src/models/AppointmentSettingsModel.js
import mongoose from "mongoose";

// Definición del esquema de configuración de citas
const appointmentSettingsSchema = new mongoose.Schema(
  {
    startHour: { type: Number, required: true },
    endHour: { type: Number, required: true },
    interval: { type: Number, required: true },
    lunchStart: { type: Number, required: true },
    lunchEnd: { type: Number, required: true },
    maxMonthsAhead: { type: Number, required: true },
    workingDays: { type: [Number], required: true, default: [1, 2, 3, 4, 5] },
    staffCount: { type: Number, required: true, default: 1 },
    tenantId: { type: String, required: true },
  },
  { timestamps: true }
);

// Exportamos el schema para TenantManager (igual que appointmentSchemaDefinition)
export const appointmentSettingsSchemaDefinition = appointmentSettingsSchema;

// Exportamos el modelo global (fallback si se usa sin tenant)
export default mongoose.models?.AppointmentSettings ||
  mongoose.model("AppointmentSettings", appointmentSettingsSchema);
