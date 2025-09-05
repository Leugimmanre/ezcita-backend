import mongoose from "mongoose";
// import validator from "validator";
const serviceImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now },
    alt: { type: String, trim: true },
  },
  { _id: false }
);

const servicesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      maxlength: [100, "El nombre no puede exceder los 100 caracteres"],
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
    },
    price: {
      type: Number,
      required: [true, "El precio es obligatorio"],
      min: [0, "El precio no puede ser negativo"],
      max: [10000, "El precio no puede exceder 10,000"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "La descripción no puede exceder los 500 caracteres"],
    },
    duration: {
      type: Number,
      min: [1, "La duración debe ser al menos 1"],
      max: [480, "La duración no puede exceder 480 minutos (8 horas)"],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, "La categoría no puede exceder 50 caracteres"],
    },
    images: {
      type: [serviceImageSchema],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
    durationUnit: {
      type: String,
      enum: ["min.", "horas"],
      default: "min.",
    },
    tenantId: {
      type: String,
      select: false, // Ocultar este campo en las consultas
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices para mejorar el rendimiento
servicesSchema.index({ name: 1, tenantId: 1 });
servicesSchema.index({ category: 1, tenantId: 1 });
servicesSchema.index({ active: 1, tenantId: 1 });

export default servicesSchema;
