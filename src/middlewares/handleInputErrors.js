// middlewares/handleInputErrors.js
import { validationResult } from "express-validator";

export const handleInputErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Error de validación",
      message: "Parámetros inválidos",
      errors: errors.array().map((err) => ({
        param: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }

  next();
};
