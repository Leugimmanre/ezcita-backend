// src/utils/datetime.js
// Helpers de zona horaria nativos (sin dependencias externas)
// Obtiene componentes "locales" en un timeZone dado para un Date UTC
export const getZonedComponents = (date, timeZone) => {
  const d = date instanceof Date ? date : new Date(date);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || process.env.DEFAULT_TZ || "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
};

// YYYY-MM-DD local a partir de un Date y una zona horaria
export const getLocalYMD = (date, timeZone) => {
  const { year, month, day } = getZonedComponents(date, timeZone);
  const pad = (n) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
};

// Construye un Date UTC interpretando (YYYY-MM-DD, HH:mm) como hora local en timeZone
export const zonedDateFromYMDHM = (ymd, hhmm, timeZone) => {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const [hh, mm] = String(hhmm).split(":").map(Number);
  // "Adivinamos" y corregimos DST con una segunda pasada
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const z = getZonedComponents(guess, timeZone);
  return new Date(
    Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second)
  );
};

// Formateo humano con zona horaria (para emails, logs, UI del backend)
export const formatDateTime = (date, tz) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: tz || process.env.DEFAULT_TZ || "Europe/Madrid",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

// Formateo YYYYMMDDTHHmmssZ (UTC) para ICS
const toICSDateUTC = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
};

// Saneado de texto ICS (escapes básicos RFC5545)
const icsEscape = (txt = "") =>
  String(txt)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

// Plegado de líneas ICS a 75 octetos (simple, seguro para la mayoría de casos)
const foldICSLines = (lines) => {
  const out = [];
  for (const line of lines) {
    if (line.length <= 75) {
      out.push(line);
      continue;
    }
    let s = line;
    out.push(s.slice(0, 75));
    s = s.slice(75);
    while (s.length > 0) {
      out.push(" " + s.slice(0, 74));
      s = s.slice(74);
    }
  }
  return out;
};

// Construcción de ICS en UTC (máxima compatibilidad entre clientes)
// uid: string único (recomendado appointmentId@domain)
// start/end: Date (o parseable) en UTC
// summary/description/location: strings visibles
// method: "REQUEST" | "CANCEL" (otros métodos posibles: "PUBLISH", etc.)
export function buildICS({
  uid,
  start,
  end,
  summary,
  description = "",
  method = "REQUEST",
  organizerEmail,
  organizerName = "",
  attendeeEmail,
  attendeeName = "Invitado",
  sequence = 0,
  url = "",
  alarmsMinutes = [1440, 60], // p.ej. [60,15,5]
}) {
  const dt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//YourApp//ES",
    "VERSION:2.0",
    `CALSCALE:GREGORIAN`,
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(start)}`,
    `DTEND:${dt(end)}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `SEQUENCE:${sequence}`,
    organizerEmail
      ? `ORGANIZER;CN=${escapeICS(organizerName)}:mailto:${organizerEmail}`
      : "",
    attendeeEmail
      ? `ATTENDEE;CN=${escapeICS(
          attendeeName
        )};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=FALSE:mailto:${attendeeEmail}`
      : "",
    url ? `URL:${url}` : "",
  ].filter(Boolean);

  // VALARM por cada “minutes before” (DISPLAY para máxima compatibilidad)
  for (const m of alarmsMinutes || []) {
    const n = Number(m);
    if (!Number.isFinite(n) || n <= 0) continue;
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeICS("Recordatorio de cita")}`,
      `TRIGGER:-PT${n}M`,
      "END:VALARM"
    );
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}

// Helper (por si no lo tenías ya)
function escapeICS(text = "") {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
