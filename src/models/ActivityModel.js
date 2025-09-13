import mongoose from "mongoose";

// 🇪🇸 Registro de actividad simple por tenant
const activitySchema = new mongoose.Schema(
  {
    tenantId: { type: String, index: true, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, trim: true },
    category: { type: String, required: true, trim: true }, // p.ej. "Horarios", "Servicios", "Marca"
    action: { type: String, required: true, trim: true }, // p.ej. "Actualizó ajustes", "Creó servicio"
    entityId: { type: String, trim: true }, // opcional (documento afectado)
    metadata: { type: Object }, // opcional (diffs, valores)
  },
  { timestamps: true }
);

activitySchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model("Activity", activitySchema);
