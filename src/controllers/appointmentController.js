// src/controllers/appointmentController.js
import { sendAppointmentEmail } from "../emails/email.js";
import { buildEmailUser } from "../emails/emailUser.js";
import { pickDiff } from "../utils/diffChanges.js";
import { logActivity } from "../utils/logActivity.js";

// Utilidades de rol y conversión horaria
function isAdmin(req) {
  return req.user?.role === "admin";
}
const toId = (v) => (v ? String(v) : "");
const toIdArr = (arr) =>
  Array.isArray(arr)
    ? arr.map((x) =>
        typeof x === "object" && x !== null
          ? String(x._id ?? x.id ?? x)
          : String(x)
      )
    : [];
const toMinutes = (d, u) =>
  (String(u || "").toLowerCase() === "horas" ? Number(d) * 60 : Number(d)) || 0;

// Día de la semana -> clave en dayBlocks
const DOW_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

// Helpers de zona horaria (sin dependencias externas)
// Convierte un Date (UTC) a componentes locales en un timeZone dado
function getZonedComponents(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

// Construye un Date UTC a partir de (YYYY-MM-DD, HH:mm) interpretado en timeZone
function zonedDateFromYMDHM(ymd, hhmm, timeZone) {
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  // Usamos la fecha en el tz para obtener el offset real
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const z = getZonedComponents(guess, timeZone);
  // Reconstruimos corrigiendo posible DST
  return new Date(Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, 0));
}

// Obtiene YYYY-MM-DD local para un Date dado y timeZone
function getLocalYMD(date, timeZone) {
  const { year, month, day } = getZonedComponents(date, timeZone);
  const pad = (n) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

// Reglas SOLO con dayBlocks
function getEffectiveDayBlocks(apptSettings, date, timeZone) {
  const { year, month, day, hour, minute } = getZonedComponents(date, timeZone);
  const local = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const key = DOW_KEYS[local.getUTCDay()];
  const blocks = apptSettings?.dayBlocks?.[key] || [];
  return Array.isArray(blocks) ? blocks : [];
}

function fitsInsideAnyBlock(dateStartUTC, durationMin, blocksForDay, timeZone) {
  const ymd = getLocalYMD(dateStartUTC, timeZone);
  const apptStartLocal = getZonedComponents(dateStartUTC, timeZone);
  const pad = (n) => String(n).padStart(2, "0");
  const hhmmStart = `${pad(apptStartLocal.hour)}:${pad(apptStartLocal.minute)}`;

  // Construimos fecha fin local sumando duración, pero la suma se hace en UTC y luego comparamos en local equivalente
  const endUTC = new Date(dateStartUTC);
  endUTC.setMinutes(endUTC.getMinutes() + durationMin);

  return blocksForDay.some(({ start, end }) => {
    const blockStartUTC = zonedDateFromYMDHM(ymd, start, timeZone);
    const blockEndUTC = zonedDateFromYMDHM(ymd, end, timeZone);
    const apptStartUTC = zonedDateFromYMDHM(ymd, hhmmStart, timeZone);
    return apptStartUTC >= blockStartUTC && endUTC <= blockEndUTC;
  });
}

function isAlignedToInterval(dateUTC, interval, timeZone) {
  const { hour, minute } = getZonedComponents(dateUTC, timeZone);
  const minsOfDay = hour * 60 + minute;
  return minsOfDay % interval === 0;
}

function isClosedDate(apptSettings, dateUTC) {
  const ymd = getLocalYMD(dateUTC, apptSettings.timezone || "Europe/Madrid");
  return (apptSettings?.closedDates || []).includes(ymd);
}

function withinMaxMonthsAhead(apptSettings, dateUTC) {
  const max = Number(apptSettings?.maxMonthsAhead ?? 0);
  if (!max || max <= 0) return true;
  const now = new Date();
  const months =
    (dateUTC.getUTCFullYear() - now.getUTCFullYear()) * 12 +
    (dateUTC.getUTCMonth() - now.getUTCMonth());
  if (months > max) return false;
  if (months < max) return true;
  return dateUTC.getUTCDate() >= now.getUTCDate();
}

// Validación central
async function assertScheduleAllows(
  req,
  { dateStart, durationMin, forAppointmentId = null }
) {
  const apptSettings = await req.AppointmentSettings.findOne({
    tenantId: req.tenantId,
  });
  if (!apptSettings) {
    const e = new Error("Configuración no encontrada");
    e.status = 400;
    throw e;
  }
  const tz = apptSettings.timezone || "Europe/Madrid";
  const interval = Number(apptSettings.interval || 30);

  if (!withinMaxMonthsAhead(apptSettings, dateStart)) {
    const e = new Error("La fecha excede el límite de meses permitidos");
    e.status = 400;
    throw e;
  }

  if (isClosedDate(apptSettings, dateStart)) {
    const e = new Error("La fecha está marcada como cerrada");
    e.status = 400;
    throw e;
  }

  if (!isAlignedToInterval(dateStart, interval, tz)) {
    const e = new Error(
      `La hora no está alineada al intervalo de ${interval} minutos`
    );
    e.status = 400;
    throw e;
  }

  const blocks = getEffectiveDayBlocks(apptSettings, dateStart, tz);
  if (!blocks.length) {
    const e = new Error("Este día no tiene horario disponible");
    e.status = 400;
    throw e;
  }
  if (!fitsInsideAnyBlock(dateStart, durationMin, blocks, tz)) {
    const e = new Error(
      "La duración de la cita no encaja en los bloques del día"
    );
    e.status = 400;
    throw e;
  }

  // Capacidad por solapes (staffCount)
  const end = new Date(dateStart);
  end.setMinutes(end.getMinutes() + durationMin);

  const filter = {
    tenantId: req.tenantId,
    status: { $in: ["pending", "confirmed"] },
    date: { $lt: end },
  };
  if (forAppointmentId) filter._id = { $ne: forAppointmentId };

  const overlapping = await req.Appointments.find(filter).then((appts) =>
    appts.filter((a) => {
      const aEnd = new Date(a.date);
      aEnd.setMinutes(aEnd.getMinutes() + a.duration);
      return aEnd > dateStart;
    })
  );

  if (overlapping.length >= Number(apptSettings.staffCount || 1)) {
    const e = new Error("No hay personal disponible para esta franja horaria");
    e.status = 400;
    throw e;
  }

  return { apptSettings, interval };
}

// ===================== CONTROLADOR =====================
export class AppointmentController {
  // Crear nueva cita (usuario)
  static async createAppointment(req, res) {
    try {
      const { services, date, notes } = req.body;
      const userId = req.user.id;

      const appointmentStart = new Date(date);
      if (Number.isNaN(appointmentStart.getTime())) {
        return res.status(400).json({ error: "Fecha inválida" });
      }

      // Totales por servicios
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
      const servicesForEmail = servicesData.map((s) => ({
        name: s.name,
        price: s.price,
        duration: s.duration,
      }));

      // Validación de agenda avanzada
      await assertScheduleAllows(req, {
        dateStart: appointmentStart,
        durationMin: totalDuration,
      });

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
        }).catch((e) => console.error("Email error (created):", e));
      }

      res
        .status(201)
        .json({ message: "Cita creada exitosamente", appointment });
    } catch (error) {
      console.error("Error en createAppointment:", error);
      res.status(error.status || 500).json({ error: error.message });
    }
  }

  // Crear cita (admin)
  static async createAppointmentByAdmin(req, res) {
    try {
      if (!isAdmin(req))
        return res.status(403).json({ error: "No autorizado" });

      const {
        userId,
        services,
        date,
        notes = "",
        status = "confirmed",
      } = req.body;

      const appointmentStart = new Date(date);
      if (Number.isNaN(appointmentStart.getTime())) {
        return res.status(400).json({ error: "Fecha inválida" });
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
      const servicesForEmail = servicesData.map((s) => ({
        name: s.name,
        price: s.price,
        duration: s.duration,
      }));

      await assertScheduleAllows(req, {
        dateStart: appointmentStart,
        durationMin: totalDuration,
      });

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
      res.status(error.status || 500).json({ error: error.message });
    }
  }

  // Listado con filtros
  static async getAppointments(req, res) {
    try {
      const { startDate, endDate, status, page = 1, limit = 10 } = req.query;
      const userId = req.user.id;
      const isAdminUser = req.user.role === "admin";

      const filter = isAdminUser
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
      const isAdminUser = req.user.role === "admin";

      const appointment = await req.Appointments.findById(id)
        .populate("user", "name email lastname")
        .populate("services", "name price duration durationUnit");

      if (!appointment)
        return res.status(404).json({ error: "Cita no encontrada" });

      if (!isAdminUser && appointment.user._id.toString() !== userId) {
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
      const isAdminUser = req.user.role === "admin";

      const appointment = await req.Appointments.findById(id);
      if (!appointment)
        return res.status(404).json({ error: "Cita no encontrada" });
      if (!isAdminUser && appointment.user.toString() !== userId)
        return res.status(403).json({ error: "No autorizado" });

      const prevSnap = {
        date: appointment.date,
        status: appointment.status,
        notes: appointment.notes,
        duration: appointment.duration,
        totalPrice: appointment.totalPrice,
        services: toIdArr(appointment.services),
        userId: String(appointment.user),
      };

      // Recalcular/validar si cambian servicios o fecha
      if (updateData.services || updateData.date) {
        const servicesIds = updateData.services || appointment.services;
        const servicesData = await req.Services.find({
          _id: { $in: servicesIds },
        });
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

        const newStart = new Date(updateData.date || appointment.date);
        if (Number.isNaN(newStart.getTime())) {
          return res.status(400).json({ error: "Fecha inválida" });
        }

        await assertScheduleAllows(req, {
          dateStart: newStart,
          durationMin: totalDuration,
          forAppointmentId: id,
        });

        updateData.duration = totalDuration;
        updateData.totalPrice = totalPrice;
      }

      const updatedAppointment = await req.Appointments.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      )
        .populate("services", "name price duration durationUnit")
        .populate("user", "name email lastname");

      const servicesForEmail =
        updatedAppointment.services?.map((s) => ({
          name: s.name,
          price: s.price,
          duration: s.duration,
        })) || [];

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

      const baseDiff = pickDiff(prevSnap, afterSnap, [
        "date",
        "status",
        "notes",
        "duration",
        "totalPrice",
        "userId",
      ]);

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
      res.status(error.status || 500).json({ error: error.message });
    }
  }

  // Cancelar
  static async cancelAppointment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdminUser = req.user.role === "admin";

      const appointment = await req.Appointments.findById(id)
        .populate("services", "name price duration durationUnit")
        .populate("user", "name email lastname");

      if (!appointment)
        return res.status(404).json({ error: "Cita no encontrada" });
      if (!isAdminUser && appointment.user._id.toString() !== userId)
        return res.status(403).json({ error: "No autorizado" });
      if (!["pending", "confirmed"].includes(appointment.status)) {
        return res
          .status(400)
          .json({
            error: "Solo se pueden cancelar citas pendientes o confirmadas",
          });
      }

      appointment.status = "cancelled";
      await appointment.save();

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

  // Reactivar
  static async reactivateAppointment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdminUser = req.user.role === "admin";

      const appointment = await req.Appointments.findById(id).populate(
        "user",
        "name email lastname"
      );
      if (!appointment)
        return res.status(404).json({ error: "Cita no encontrada" });
      if (!isAdminUser && appointment.user._id.toString() !== userId)
        return res.status(403).json({ error: "No autorizado" });
      if (appointment.status !== "cancelled") {
        return res
          .status(400)
          .json({ error: "Solo se pueden reactivar citas canceladas" });
      }

      appointment.status = "pending";
      await appointment.save();

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

  // Completar (admin)
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

  // Disponibilidad (YYYY-MM-DD), devuelve citas ocupadas mínimas
  static async availability(req, res) {
    try {
      const { date, excludeId } = req.query;
      if (!date)
        return res
          .status(400)
          .json({ error: "date es obligatorio (YYYY-MM-DD)" });

      const apptSettings = await req.AppointmentSettings.findOne({
        tenantId: req.tenantId,
      });
      const tz = apptSettings?.timezone || "Europe/Madrid";

      // Construimos inicio y fin del día en tz, luego convertimos a UTC
      const dayStartUTC = zonedDateFromYMDHM(date, "00:00", tz);
      const dayEndUTC = zonedDateFromYMDHM(date, "23:59", tz);

      const filter = {
        tenantId: req.tenantId,
        status: { $in: ["pending", "confirmed"] },
        date: { $gte: dayStartUTC, $lte: dayEndUTC },
      };
      if (excludeId) filter._id = { $ne: excludeId };

      const appts = await req.Appointments.find(filter).select("date duration");

      const busy = appts.map((a) => ({
        start: a.date,
        duration: a.duration,
      }));

      res.json({ busy });
    } catch (e) {
      console.error("availability error:", e);
      res.status(500).json({ error: "Error calculando disponibilidad" });
    }
  }
}
