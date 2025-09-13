// src/controllers/appointmentController.js
import { sendAppointmentEmail } from "../emails/email.js";
import { buildEmailUser } from "../emails/emailUser.js";
import { pickDiff } from "../utils/diffChanges.js";
import { logActivity } from "../utils/logActivity.js";

function isAdmin(req) {
  return req.user?.role === "admin";
}

// Convierte duración a minutos
const toMinutes = (d, u) =>
  (String(u || "").toLowerCase() === "horas" ? Number(d) * 60 : Number(d)) || 0;

export class AppointmentController {
  // Crear nueva cita (flujo de usuario autenticado)
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
        (sum, s) => sum + toMinutes(s.duration, s.durationUnit),
        0
      );
      const totalPrice = servicesData.reduce((sum, s) => sum + s.price, 0);

      const appointmentStart = new Date(date);
      if (Number.isNaN(appointmentStart.getTime())) {
        return res.status(400).json({ error: "Fecha inválida" });
      }
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

      // Log actividad
      await logActivity(req, {
        tenantId: req.tenantId,
        category: "Citas",
        action: "Creó cita",
        entityId: String(appointment._id),
        metadata: {
          date: appointment.date,
          status: appointment.status,
          userId: String(appointment.user),
          services: toIdArr(appointment.services),
          totalPrice: appointment.totalPrice,
          duration: appointment.duration,
        },
      });

      const populatedServices = servicesData.map((s) => ({
        name: s.name,
        price: s.price,
        duration: s.duration,
      }));

      const user = await buildEmailUser(req, { user: userId }, userId);

      if (user?.email) {
        sendAppointmentEmail({
          type: "created",
          to: user.email,
          user,
          appointment,
          services: populatedServices,
          BrandSettingsModel: req.BrandSettings,
          tenantId: req.tenantId,
        }).catch((e) => console.error("Email error (created):", e));
      }

      res
        .status(201)
        .json({ message: "Cita creada exitosamente", appointment });
    } catch (error) {
      console.error("Error en createAppointment:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // NUEVO: crear cita como ADMIN para cualquier usuario
  static async createAppointmentByAdmin(req, res) {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({ error: "No autorizado" });
      }

      const {
        userId,
        services,
        date,
        notes = "",
        status = "confirmed",
      } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId es obligatorio" });
      }

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
        (sum, s) => sum + toMinutes(s.duration, s.durationUnit),
        0
      );
      const totalPrice = servicesData.reduce((sum, s) => sum + s.price, 0);

      const appointmentStart = new Date(date);
      if (Number.isNaN(appointmentStart.getTime())) {
        return res.status(400).json({ error: "Fecha inválida" });
      }
      const appointmentEnd = new Date(appointmentStart);
      appointmentEnd.setMinutes(appointmentEnd.getMinutes() + totalDuration);

      // Misma lógica de solapes por capacidad (staffCount)
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
        status: ["pending", "confirmed", "completed", "cancelled"].includes(
          String(status)
        )
          ? status
          : "confirmed",
        tenantId: req.tenantId,
      });

      await appointment.save();

      // Log actividad
      await logActivity(req, {
        tenantId: req.tenantId,
        category: "Citas",
        action: "Creó cita (admin)",
        entityId: String(appointment._id),
        metadata: {
          date: appointment.date,
          status: appointment.status,
          userId: String(appointment.user),
          services: toIdArr(appointment.services),
          totalPrice: appointment.totalPrice,
          duration: appointment.duration,
        },
      });

      const servicesForEmail = servicesData.map((s) => ({
        name: s.name,
        price: s.price,
        duration: s.duration,
      }));

      const user = await buildEmailUser(req, { user: userId }, userId);

      if (user?.email) {
        sendAppointmentEmail({
          type: "created",
          to: user.email,
          user,
          appointment,
          services: servicesForEmail,
          BrandSettingsModel: req.BrandSettings,
          tenantId: req.tenantId,
        }).catch((e) => console.error("Email error (created/admin):", e));
      }

      res.status(201).json({ message: "Cita creada por admin", appointment });
    } catch (error) {
      console.error("Error en createAppointmentByAdmin:", error);
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
        filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }
      if (status) filter.status = status;

      const appointments = await req.Appointments.find(filter)
        .populate({
          path: "services",
          select: "name price duration durationUnit",
        })
        .populate("user", "name lastname phone email")
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
        .populate("user", "name email lastname")
        .populate("services", "name price duration durationUnit");

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

  // Actualizar cita (admin o dueño)
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

      // Guarda el snapshot previo para comparar luego
      const prevSnap = {
        date: appointment.date,
        status: appointment.status,
        notes: appointment.notes,
        duration: appointment.duration,
        totalPrice: appointment.totalPrice,
        services: toIdArr(appointment.services),
        userId: String(appointment.user),
      };
      let servicesData;
      if (updateData.services || updateData.date) {
        const apptSettings = await req.AppointmentSettings.findOne({
          tenantId: req.tenantId,
        });

        servicesData = await req.Services.find({
          _id: { $in: updateData.services || appointment.services },
        });

        const totalDuration = servicesData.reduce(
          (sum, s) => sum + toMinutes(s.duration, s.durationUnit),
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
      )
        .populate("services", "name price duration durationUnit")
        .populate("user", "name email lastname");

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

      const user = await buildEmailUser(
        req,
        updatedAppointment,
        updatedAppointment.user
      );

      if (user?.email) {
        sendAppointmentEmail({
          type: "updated",
          to: user.email,
          user,
          appointment: updatedAppointment,
          services: servicesForEmail,
          BrandSettingsModel: req.BrandSettings,
          tenantId: req.tenantId,
        }).catch((e) => console.error("Email error (updated):", e));
      }

      const afterSnap = {
        date: updatedAppointment.date,
        status: updatedAppointment.status,
        notes: updatedAppointment.notes,
        duration: updatedAppointment.duration,
        totalPrice: updatedAppointment.totalPrice,
        services: toIdArr(updatedAppointment.services),
        userId: String(updatedAppointment.user?._id || updatedAppointment.user),
      };

      // diff “humano” (campos simples)
      const baseDiff = pickDiff(prevSnap, afterSnap, [
        "date",
        "status",
        "notes",
        "duration",
        "totalPrice",
        "userId",
      ]);

      // diff de servicios (array)
      if (
        JSON.stringify([...prevSnap.services].sort()) !==
        JSON.stringify([...afterSnap.services].sort())
      ) {
        baseDiff.services = { from: prevSnap.services, to: afterSnap.services };
      }

      await logActivity(req, {
        tenantId: req.tenantId,
        category: "Citas",
        action: "Actualizó cita",
        entityId: String(id),
        metadata: Object.keys(baseDiff).length ? baseDiff : undefined,
      });

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
        .populate("services", "name price duration durationUnit")
        .populate("user", "name email lastname");

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

      // Log actividad
      await logActivity(req, {
        tenantId: req.tenantId,
        category: "Citas",
        action: "Canceló cita",
        entityId: String(appointment._id),
        metadata: { date: appointment.date },
      });

      const user = await buildEmailUser(req, appointment, appointment.user);
      const servicesForEmail =
        appointment.services?.map((s) => ({
          name: s.name,
          price: s.price,
          duration: s.duration,
        })) || [];

      if (user?.email) {
        sendAppointmentEmail({
          type: "cancelled",
          to: user.email,
          user,
          appointment,
          services: servicesForEmail,
          BrandSettingsModel: req.BrandSettings,
          tenantId: req.tenantId,
        }).catch((e) => console.error("Email error (cancelled):", e));
      }

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
        "name email lastname"
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

      // Log actividad
      await logActivity(req, {
        tenantId: req.tenantId,
        category: "Citas",
        action: "Reactivó cita",
        entityId: String(appointment._id),
        metadata: { status: appointment.status },
      });

      const user = await buildEmailUser(req, appointment, appointment.user);

      if (user?.email) {
        sendAppointmentEmail({
          type: "reactivated",
          to: user.email,
          user,
          appointment,
          services: [],
          BrandSettingsModel: req.BrandSettings,
          tenantId: req.tenantId,
        }).catch((e) => console.error("Email error (reactivated):", e));
      }

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
        "name email lastname"
      );
      if (!appointment)
        return res.status(404).json({ error: "Cita no encontrada" });
      if (appointment.status === "completed")
        return res.status(400).json({ error: "La cita ya está completada" });

      appointment.status = "completed";
      await appointment.save();

      // Log actividad
      await logActivity(req, {
        tenantId: req.tenantId,
        category: "Citas",
        action: "Completó cita",
        entityId: String(appointment._id),
        metadata: { date: appointment.date },
      });

      const user = await buildEmailUser(req, appointment, appointment.user);

      if (user?.email) {
        sendAppointmentEmail({
          type: "completed",
          to: user.email,
          user,
          appointment,
          services: [],
          BrandSettingsModel: req.BrandSettings,
          tenantId: req.tenantId,
        }).catch((e) => console.error("Email error (completed):", e));
      }

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
        "name email lastname"
      );
      if (!appointment)
        return res.status(404).json({ error: "Cita no encontrada" });

      await req.Appointments.findByIdAndDelete(id);

      const user = await buildEmailUser(req, appointment, appointment.user);

      if (user?.email) {
        sendAppointmentEmail({
          type: "deleted",
          to: user.email,
          user,
          appointment,
          services: [],
          BrandSettingsModel: req.BrandSettings,
          tenantId: req.tenantId,
        }).catch((e) => console.error("Email error (deleted):", e));
      }

      // Log actividad
      await logActivity(req, {
        tenantId: req.tenantId,
        category: "Citas",
        action: "Eliminó cita",
        entityId: String(id),
        metadata: { date: appointment.date, status: appointment.status },
      });

      res.json({ message: "Cita eliminada permanentemente", appointment });
    } catch (error) {
      console.error("Error en deleteAppointment:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Comprobar disponibilidad para una fecha dada
  static async availability(req, res) {
    try {
      const { date } = req.query;
      if (!date)
        return res
          .status(400)
          .json({ error: "date es obligatorio (YYYY-MM-DD)" });

      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(`${date}T23:59:59.999Z`);

      const appts = await req.Appointments.find({
        tenantId: req.tenantId,
        status: { $in: ["pending", "confirmed"] },
        date: { $gte: dayStart, $lte: dayEnd },
      }).select("date duration"); // sin PII

      // Devuelve solo lo mínimo
      const busy = appts.map((a) => ({
        start: a.date, // ISO
        duration: a.duration, // minutos
      }));

      res.json({ busy });
    } catch (e) {
      console.error("availability error:", e);
      res.status(500).json({ error: "Error calculando disponibilidad" });
    }
  }
}
