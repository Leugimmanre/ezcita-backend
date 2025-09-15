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
    tenantId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

appointmentSchema.plugin(mongoosePaginate);

export const appointmentSchemaDefinition = appointmentSchema;

export default mongoose.models?.Appointment ||
  mongoose.model("Appointment", appointmentSchema);
