import mongoose from "mongoose";

const AppointmentSettingsModel = new mongoose.Schema(
  {
    startHour: { type: Number, required: true },
    endHour: { type: Number, required: true },
    interval: { type: Number, required: true },
    lunchStart: { type: Number, required: true },
    lunchEnd: { type: Number, required: true },
    maxMonthsAhead: { type: Number, required: true },
    workingDays: {
      type: [Number],
      required: true,
      default: [1, 2, 3, 4, 5], // Lunes a Viernes
    },
    staffCount: { type: Number, required: true, default: 1 },
    tenantId: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export default AppointmentSettingsModel;
