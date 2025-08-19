import dotenv from "dotenv";

dotenv.config();
export const corsConfig = {
  origin: function (origin, callback) {
    // console.log(process.argv)
    const whitelist = [process.env.FRONTEND_URL];
    if (process.argv) {
      whitelist.push(undefined);
    }
    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Error de CORS"));
    }
  },
};
