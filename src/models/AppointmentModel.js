// src/models/AppointmentModel.js
import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const appointmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    services: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Services", required: true },
    ],
    date: { type: Date, required: true },
    duration: { type: Number, required: true }, // minutos
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    notes: { type: String, default: "" },
    // Recordatorios por email: offsets en minutos (p.ej. 1440 = 24h, 60 = 1h antes)
    reminders: {
      emailOffsets: { type: [Number], default: [25, 20] },
      sentEmailOffsets: { type: [Number], default: [] },
    },
    // Secuencia de invitación ICS para que Calendar haga update/cancel
    inviteSeq: { type: Number, default: 0 },

    tenantId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

appointmentSchema.plugin(mongoosePaginate);

export const appointmentSchemaDefinition = appointmentSchema;

export default mongoose.models?.Appointment ||
  mongoose.model("Appointment", appointmentSchema);
