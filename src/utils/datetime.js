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

// YYYYMMDDTHHmmssZ (UTC)
const toICSDate = (date) => {
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

export const buildICS = ({
  uid,
  start,
  end,
  summary,
  description,
  location,
  method = "REQUEST", // REQUEST | CANCEL
}) => {
  const dtStart = toICSDate(start);
  const dtEnd = toICSDate(end);
  const dtStamp = toICSDate(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//ezcita//Appointments//ES",
    "VERSION:2.0",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${(description || "").replace(/\n/g, "\\n")}`,
    location ? `LOCATION:${location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
};
