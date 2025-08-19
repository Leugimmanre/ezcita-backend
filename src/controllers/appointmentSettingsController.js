// controllers/appointmentSettingsController.js
const DEFAULT_SETTINGS = {
  startHour: 9,
  endHour: 18,
  interval: 30,
  lunchStart: 13,
  lunchEnd: 15,
  maxMonthsAhead: 2,
  workingDays: [1, 2, 3, 4, 5], // Lunes a Viernes
};

export const AppointmentSettingsController = {
  // Métodos del controlador
  async getSettings(req, res, next) {
    try {
      const settings = await req.AppointmentSettings.findOne({
        tenantId: req.tenantId,
      });

      if (!settings) {
        return res.json({
          success: true,
          data: { ...DEFAULT_SETTINGS, tenantId: req.tenantId },
        });
      }

      res.json({ success: true, data: settings });
    } catch (err) {
      next(err);
    }
  },

  // Método para guardar o actualizar la configuración
  async saveOrUpdateSettings(req, res, next) {
    try {
      const data = {
        ...req.body,
        tenantId: req.tenantId,
        // Asegurar que workingDays siempre esté presente
        workingDays: req.body.workingDays || DEFAULT_SETTINGS.workingDays,
      };

      const updated = await req.AppointmentSettings.findOneAndUpdate(
        { tenantId: req.tenantId },
        data,
        { upsert: true, new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        data: updated,
        msg: "Configuración guardada",
      });
    } catch (err) {
      next(err);
    }
  },
};
