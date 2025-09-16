// src/models/TokenModel.js
import mongoose, { Schema, Types } from "mongoose";

/**
 * type: "verify" | "password_reset"
 * expires: usamos TTL a 10m por defecto para ambos; puedes duplicar el modelo o variar por type si quieres.
 */
const tokenSchema = new Schema({
  token: { type: String, required: true, index: true, unique: true },
  user: { type: Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["verify", "password_reset"], required: true },
  createdAt: { type: Date, default: Date.now, expires: "600" }, // TTL 10 minutos
});

const Token = mongoose.models.Token || mongoose.model("Token", tokenSchema);
export default Token;
