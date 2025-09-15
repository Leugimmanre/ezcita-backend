// src/jobs/purgeOldAppointments.js
import mongoose from "mongoose";

/**
 * Borra citas con estado cancelado/completado más antiguas que "ageMinutes".
 * Si pasas una conexión (conn) la usa; si no, usa la global.
 */
export async function purgeOldAppointments({ ageMinutes = 30, conn } = {}) {
  const connection = conn || mongoose;
  const Appointment =
    connection.models.Appointment || connection.model("Appointment");

  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - Math.abs(Number(ageMinutes) || 30));

  return Appointment.deleteMany({
    status: { $in: ["cancelled"] },
    updatedAt: { $lt: cutoff },
  });
}
