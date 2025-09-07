// src/config/cors.js
import dotenv from "dotenv";
dotenv.config();

/**
 * 1) Lee allow-list desde ENV (múltiples orígenes separados por coma)
 * Permite sintaxis:
 *  - exactos: https://ezcita.netlify.app
 *  - wildcard por subdominio: *.devexplora.com
 *  - regex explícita: re:^https://deploy-preview-\\d+--ezcita\\.netlify\\.app$
 */
const envOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Orígenes fijos adicionales (dev + tus sitios conocidos) */
const staticWhitelist = [
  "http://localhost:5173",
  "https://ezcita.netlify.app",
  "https://kwalphysio.netlify.app",
  "https://blinblinstyle.netlify.app",
  "https://petshappy.netlify.app",
  // si usas dominios propios, añádelos aquí o en CORS_ORIGINS
];

/**
 * 2) Patrones limitados (evita abrir TODO netlify/vercel).
 * Mejor solo tus previews de Netlify, por ejemplo:
 */
const allowPattern = [
  // Deploy previews de Netlify para tus sites (ajusta nombres)
  /^https:\/\/deploy-preview-\d+--ezcita\.netlify\.app$/,
  /^https:\/\/deploy-preview-\d+--kwalphysio\.netlify\.app$/,
  /^https:\/\/deploy-preview-\d+--blinblinstyle\.netlify\.app$/,
  /^https:\/\/deploy-preview-\d+--petshappy\.netlify\.app$/,
  // Si necesitas permitir subdominios propios:
  // /^https?:\/\/([a-z0-9-]+\.)*devexplora\.com$/,
];

/** Convierte entradas tipo "*.dominio.com" o "re:..." a regex o exacto */
function toRule(entry) {
  if (!entry) return null;
  const e = entry.trim();
  if (!e) return null;

  // Regex explícita
  if (e.startsWith("re:")) {
    const pattern = e.slice(3);
    return { type: "regex", value: new RegExp(pattern) };
  }

  // Wildcard de subdominio
  if (e.includes("*")) {
    const esc = e.replace(/\./g, "\\.").replace(/\*/g, ".*");
    return { type: "regex", value: new RegExp("^https?://" + esc + "$") };
  }

  // Exacto
  return { type: "exact", value: e };
}

const rules = [
  ...envOrigins.map(toRule).filter(Boolean),
  ...staticWhitelist.map(toRule).filter(Boolean),
  ...allowPattern.map((rx) => ({ type: "regex", value: rx })),
];

/** Comprueba si el origin está permitido */
function isAllowed(origin) {
  if (!origin) return true; // curl/Postman/health checks (sin Origin)
  return rules.some((r) =>
    r.type === "exact" ? r.value === origin : r.value.test(origin)
  );
}

export const corsConfig = {
  origin(origin, cb) {
    if (isAllowed(origin)) return cb(null, true);
    console.error(`CORS blocked: ${origin}`);
    return cb(new Error("Not allowed by CORS"));
  },
  /**
   * 3) Si NO usas cookies/sesiones, deja credentials:false.
   * Con JWT en Authorization header no necesitas credenciales de navegador.
   * Si algún día usas cookies sameSite/secure => cambia a true.
   */
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  // Asegúrate de incluir TODO lo que el cliente envía en preflight
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "x-tenant-id",
    "X-Requested-With",
  ],
  exposedHeaders: [], // p.ej., ["Authorization"] solo si lees ese header de la respuesta
  maxAge: 86400, // cachea el preflight 24h
};
