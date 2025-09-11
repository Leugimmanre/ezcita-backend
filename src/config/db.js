// src/config/db.js
import mongoose from "mongoose";
import colors from "colors";
import { exit } from "node:process";

export const connectDB = async () => {
  try {
    // Conexión a la instancia principal de MongoDB
    const { connection } = await mongoose.connect(process.env.MONGO_URI,);
    const url = `${connection.host}: ${connection.port}`;
    console.log(colors.cyan.bold(`MongoDB connected on: ${url}`));
  } catch (error) {
    // console.log(error.message);
    // console.log(colors.red.bold("Error connecting to MongoDB"));
    console.log(colors.red.bold(error.message));
    exit(1);
  }
};
