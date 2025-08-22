// src/models/BrandSettingsModel.js
import mongoose from "mongoose";

const logoSchema = new mongoose.Schema(
  {
    url: { type: String, default: null }, // URL pública (/static/...)
    filename: { type: String, default: null }, // logo.png
    mimetype: { type: String, default: null },
    size: { type: Number, default: 0 }, // bytes
  },
  { _id: false }
);

const brandSettingsSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, unique: true, index: true },
    brandName: { type: String, default: "" },
    brandDomain: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    timezone: { type: String, default: "" },
    frontendUrl: { type: String, default: "" },
    logo: { type: logoSchema, default: null },
  },
  { timestamps: true }
);

brandSettingsSchema.index({ tenantId: 1 }, { unique: true });

export default mongoose.models.BrandSettings ||
  mongoose.model("BrandSettings", brandSettingsSchema);
