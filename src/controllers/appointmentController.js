// src/controllers/appointmentController.js
import { sendAppointmentEmail } from "../emails/email.js";
import { buildEmailUser } from "../emails/emailUser.js";

export class AppointmentController {
  // Crear nueva cita
  static async createAppointment(req, res) {
    try {
      const { services, date, notes } = req.body;
      const userId = req.user.id;

      const apptSettings = await req.AppointmentSettings.findOne({
        tenantId: req.tenantId,
      });
      if (!apptSettings) {
        return res.status(400).json({ error: "Configuración no encontrada" });
      }

      const servicesData = await req.Services.find({ _id: { $in: services } });
      if (!servicesData.length) {
        return res
          .status(400)
          .json({ error: "Servicios no válidos o no encontrados" });
      }

      const totalDuration = servicesData.reduce(
        (sum, s) => sum + s.duration,
        0
      );
      const totalPrice = servicesData.reduce((sum, s) => sum + s.price, 0);

      const appointmentStart = new Date(date);
      const appointmentEnd = new Date(appointmentStart);
      appointmentEnd.setMinutes(appointmentEnd.getMinutes() + totalDuration);

      const overlappingAppointments = await req.Appointments.find({
        tenantId: req.tenantId,
        status: { $in: ["pending", "confirmed"] },
        date: { $lt: appointmentEnd },
      }).then((appts) =>
        appts.filter((a) => {
          const aEnd = new Date(a.date);
          aEnd.setMinutes(aEnd.getMinutes() + a.duration);
          return aEnd > appointmentStart;
        })
      );

      if (overlappingAppointments.length >= apptSettings.staffCount) {
        return res.status(400).json({
          error: "No hay personal disponible para esta franja horaria",
        });
      }

      const appointment = new req.Appointments({
        user: userId,
        services,
        date: appointmentStart,
        duration: totalDuration,
        totalPrice,
        notes,
        status: "pending",
        tenantId: req.tenantId,
      });

      await appointment.save();

      // Enviar correo (no bloquear respuesta)
      const populatedServices = servicesData.map((s) => ({
        name: s.name,
        price: s.price,
        duration: s.duration,
      }));

      // Nombre/email siempre desde BD del usuario de la cita
      const user = await buildEmailUser(req, { user: userId }, userId);

      sendAppointmentEmail({
        type: "created",
        to: user.email,
        user,
        appointment,
        services: populatedServices,
        BrandSettingsModel: req.BrandSettings,
        tenantId: req.tenantId,
      }).catch((e) => console.error("Email error (created):", e));

      res
        .status(201)
        .json({ message: "Cita creada exitosamente", appointment });
    } catch (error) {
      console.error("Error en createAppointment:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Obtener citas con paginación y filtros
  static async getAppointments(req, res) {
    try {
      const { startDate, endDate, status, page = 1, limit = 10 } = req.query;
      const userId = req.user.id;
      const isAdmin = req.user.role === "admin";

      const filter = isAdmin
        ? { tenantId: req.tenantId }
        : { user: userId, tenantId: req.tenantId };

      if (startDate && endDate) {
        filter.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      if (status) {
        filter.status = status;
      }

      const appointments = await req.Appointments.find(filter)
        .populate({ path: "services", select: "name price duration" })
        .populate("user", "name lastname email")
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      res.json({
        total: await req.Appointments.countDocuments(filter),
        page: parseInt(page),
        limit: parseInt(limit),
        appointments,
      });
    } catch (error) {
      console.error("Error en getAppointments:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Obtener cita por ID
  static async getAppointmentById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === "admin";

      const appointment = await req.Appointments.findById(id)
        .populate("user", "name email")
        .populate("services", "name price duration");

      if (!appointment) {
        return res.status(404).json({ error: "Cita no encontrada" });
      }

      if (!isAdmin && appointment.user._id.toString() !== userId) {
        return res.status(403).json({ error: "No autorizado" });
      }

      res.json(appointment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Actualizar cita
  static async updateAppointment(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.id;
      const isAdmin = req.user.role === "admin";

      const appointment = await req.Appointments.findById(id);
      if (!appointment)
        return res.status(404).json({ error: "Cita no encontrada" });
      if (!isAdmin && appointment.user.toString() !== userId)
        return res.status(403).json({ error: "No autorizado" });

      let servicesData;
      if (updateData.services || updateData.date) {
        const apptSettings = await req.AppointmentSettings.findOne({
          tenantId: req.tenantId,
        });

        servicesData = await req.Services.find({
          _id: { $in: updateData.services || appointment.services },
        });

        const totalDuration = servicesData.reduce(
          (sum, s) => sum + s.duration,
          0
        );
        const totalPrice = servicesData.reduce((sum, s) => sum + s.price, 0);

        const appointmentStart = new Date(updateData.date || appointment.date);
        const appointmentEnd = new Date(appointmentStart);
        appointmentEnd.setMinutes(appointmentEnd.getMinutes() + totalDuration);

        const overlappingAppointments = await req.Appointments.find({
          tenantId: req.tenantId,
          status: { $in: ["pending", "confirmed"] },
          _id: { $ne: id },
          date: { $lt: appointmentEnd },
        }).then((appts) =>
          appts.filter((a) => {
            const aEnd = new Date(a.date);
            aEnd.setMinutes(aEnd.getMinutes() + a.duration);
            return aEnd > appointmentStart;
          })
        );

        if (overlappingAppointments.length >= apptSettings.staffCount) {
          return res.status(400).json({
            error: "No hay personal disponible para esta franja horaria",
          });
        }

        updateData.duration = totalDuration;
        updateData.totalPrice = totalPrice;
      }

      const updatedAppointment = await req.Appointments.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate("services", "name price duration");

      // Email
      const servicesForEmail =
        servicesData?.map((s) => ({
          name: s.name,
          price: s.price,
          duration: s.duration,
        })) ||
        updatedAppointment.services?.map((s) => ({
          name: s.name,
          price: s.price,
          duration: s.duration,
        })) ||
        [];

      // Nombre/email del dueño real de la cita
      const user = await buildEmailUser(
        req,
        updatedAppointment,
        updatedAppointment.user
      );

      sendAppointmentEmail({
        type: "updated",
        to: user.email,
        user,
        appointment: updatedAppointment,
        services: servicesForEmail,
        BrandSettingsModel: req.BrandSettings,
        tenantId: req.tenantId,
      }).catch((e) => console.error("Email error (updated):", e));

      res.json({
        message: "Cita actualizada exitosamente",
        appointment: updatedAppointment,
      });
    } catch (error) {
      console.error("Error en updateAppointment:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Cancelar cita
  static async cancelAppointment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === "admin";

      const appointment = await req.Appointments.findById(id)
        .populate("services", "name price duration")
        .populate("user", "name email");

      if (!appointment)
        return res.status(404).json({ error: "Cita no encontrada" });
      if (!isAdmin && appointment.user._id.toString() !== userId)
        return res.status(403).json({ error: "No autorizado" });
      if (!["pending", "confirmed"].includes(appointment.status)) {
        return res.status(400).json({
          error: "Solo se pueden cancelar citas pendientes o confirmadas",
        });
      }

      appointment.status = "cancelled";
      await appointment.save();

      // Email
      const user = await buildEmailUser(req, appointment, appointment.user);
      const servicesForEmail =
        appointment.services?.map((s) => ({
          name: s.name,
          price: s.price,
          duration: s.duration,
        })) || [];

      sendAppointmentEmail({
        type: "cancelled",
        to: user.email,
        user,
        appointment,
        services: servicesForEmail,
        BrandSettingsModel: req.BrandSettings,
        tenantId: req.tenantId,
      }).catch((e) => console.error("Email error (cancelled):", e));

      res.json({ message: "Cita cancelada exitosamente", appointment });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Reactivar cita cancelada
  static async reactivateAppointment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === "admin";

      const appointment = await req.Appointments.findById(id).populate(
        "user",
        "name email"
      );
      if (!appointment)
        return res.status(404).json({ error: "Cita no encontrada" });
      if (!isAdmin && appointment.user._id.toString() !== userId)
        return res.status(403).json({ error: "No autorizado" });
      if (appointment.status !== "cancelled") {
        return res
          .status(400)
          .json({ error: "Solo se pueden reactivar citas canceladas" });
      }

      appointment.status = "pending";
      await appointment.save();

      // Email
      const user = await buildEmailUser(req, appointment, appointment.user);

      sendAppointmentEmail({
        type: "reactivated",
        to: user.email,
        user,
        appointment,
        services: [],
        BrandSettingsModel: req.BrandSettings,
        tenantId: req.tenantId,
      }).catch((e) => console.error("Email error (reactivated):", e));

      res.json({ message: "Cita reactivada exitosamente", appointment });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Marcar cita como completada
  static async completeAppointment(req, res) {
    try {
      const { id } = req.params;
      if (req.user.role !== "admin")
        return res.status(403).json({ error: "No autorizado" });

      const appointment = await req.Appointments.findById(id).populate(
        "user",
        "name email"
      );
      if (!appointment)
        return res.status(404).json({ error: "Cita no encontrada" });
      if (appointment.status === "completed")
        return res.status(400).json({ error: "La cita ya está completada" });

      appointment.status = "completed";
      await appointment.save();

      // Email
      const user = await buildEmailUser(req, appointment, appointment.user);

      sendAppointmentEmail({
        type: "completed",
        to: user.email,
        user,
        appointment,
        services: [],
        BrandSettingsModel: req.BrandSettings,
        tenantId: req.tenantId,
      }).catch((e) => console.error("Email error (completed):", e));

      res.json({ message: "Cita marcada como completada", appointment });
    } catch (error) {
      console.error("Error en completeAppointment:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Eliminar cita (solo admin)
  static async deleteAppointment(req, res) {
    try {
      const { id } = req.params;
      if (req.user.role !== "admin")
        return res.status(403).json({ error: "No autorizado" });

      const appointment = await req.Appointments.findById(id).populate(
        "user",
        "name email"
      );
      if (!appointment)
        return res.status(404).json({ error: "Cita no encontrada" });

      await req.Appointments.findByIdAndDelete(id);

      // Email (informativo / CANCEL)
      const user = await buildEmailUser(req, appointment, appointment.user);

      sendAppointmentEmail({
        type: "deleted",
        to: user.email,
        user,
        appointment,
        services: [],
        BrandSettingsModel: req.BrandSettings,
        tenantId: req.tenantId,
      }).catch((e) => console.error("Email error (deleted):", e));

      res.json({ message: "Cita eliminada permanentemente", appointment });
    } catch (error) {
      console.error("Error en deleteAppointment:", error);
      res.status(500).json({ error: error.message });
    }
  }
}
