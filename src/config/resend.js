// src/config/resend.js
import { Resend } from "resend";

const apiKey = (process.env.RESEND_API_KEY || "").trim();
if (!apiKey) {
  throw new Error("RESEND_API_KEY is missing. Set it in .env (re_xxx...)");
}

const resend = new Resend(apiKey);
export default resend;
