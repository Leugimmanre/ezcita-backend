// src/config/cors.js
import dotenv from "dotenv";
dotenv.config();

const staticWhitelist = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "https://ezcita-salon.netlify.app",
  "https://kwalphysio.netlify.app",
  "https://blinblinstyle.netlify.app",
  "https://petshappy.netlify.app",
].filter(Boolean);

const allowPattern = [
  /^https?:\/\/([a-z0-9-]+\.)*netlify\.app$/,
  /^https?:\/\/([a-z0-9-]+\.)*vercel\.app$/,
];

export const corsConfig = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (staticWhitelist.includes(origin)) return cb(null, true);
    if (allowPattern.some((re) => re.test(origin))) return cb(null, true);
    console.error(`CORS bloqueado: ${origin}`);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};
