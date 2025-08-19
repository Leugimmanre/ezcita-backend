import mongoose from "mongoose";

/**
 * Middleware para validar ObjectIds de MongoDB
 * @param {string} paramName - Nombre del parámetro a validar (default: 'id')
 * @returns {Function} Middleware de Express
 */
export const validateObjectId = (paramName = "id") => {
  return (req, res, next) => {
    const paramValue = req.params[paramName];

    if (!mongoose.Types.ObjectId.isValid(paramValue)) {
      return res.status(400).json({
        success: false,
        error: "Parámetro inválido",
        message: `El formato del ${paramName} proporcionado no es válido`,
        details: {
          parameter: paramName,
          value: paramValue,
          expectedFormat: "ObjectId de MongoDB",
        },
      });
    }

    next();
  };
};
