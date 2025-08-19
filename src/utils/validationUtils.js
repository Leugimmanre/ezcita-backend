// src/utils/validationUtils.js
import mongoose from "mongoose";

export const validateMongoId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id); // Validación más estricta
};

export const isValidTenantId = (tenantId) => {
  return /^[a-z0-9_-]{3,20}$/.test(tenantId); // Solo minúsculas, números, _ y -
};

export const handleInvalidIdResponse = (res) => {
  return res.status(400).json({
    success: false,
    error: "ID inválido",
    message: "El formato del ID proporcionado no es válido",
  });
};
