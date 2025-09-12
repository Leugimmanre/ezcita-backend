// src/models/UserModel.js
import mongoose from "mongoose";
import { tokenGenarator } from "../utils/tokenGenarator.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    token: { type: String, default: () => tokenGenarator() },
    verified: { type: Boolean, default: false },
    admin: { type: Boolean, default: false },
    tenantId: { type: String, required: true, select: false, index: true },
  },
  { timestamps: true }
);

// índice compuesto
userSchema.index({ email: 1, tenantId: 1 });

// exportamos el schema para TenantManager
export const userSchemaDefinition = userSchema;

// exportamos el modelo global como fallback
export default mongoose.models?.User || mongoose.model("User", userSchema);
