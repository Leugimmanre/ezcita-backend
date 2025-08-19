// src/models/AppointmentModel.js
import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

// Definición del esquema de citas
const appointmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Services",
        required: true,
      },
    ],
    date: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    notes: {
      type: String,
      default: "",
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Plugin de paginación
appointmentSchema.plugin(mongoosePaginate);

// Exportamos el schema para TenantManager
export const appointmentSchemaDefinition = appointmentSchema;

// Exportamos el modelo global (fallback si se usa sin tenant)
export default mongoose.models?.Appointment ||
  mongoose.model("Appointment", appointmentSchema);
