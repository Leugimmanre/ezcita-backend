// src/models/LegalDocModel.js
import mongoose, { Schema } from "mongoose";

const LegalDocSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true }, // multi-tenant
    type: { type: String, enum: ["terms", "privacy"], required: true },
    content: { type: String, default: "" },
    version: { type: String, default: "1.0" },
    effectiveDate: { type: Date, default: () => new Date() },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Único por tenant + tipo
LegalDocSchema.index({ tenantId: 1, type: 1 }, { unique: true });

LegalDocSchema.methods.toDTO = function () {
  return {
    type: this.type,
    content: this.content,
    version: this.version,
    effectiveDate: this.effectiveDate.toISOString(),
    updatedAt: this.updatedAt?.toISOString(),
    updatedBy: this.updatedBy || null,
  };
};

const LegalDoc =
  mongoose.models.LegalDoc || mongoose.model("LegalDoc", LegalDocSchema);

export default LegalDoc;
