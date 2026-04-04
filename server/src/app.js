import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRoutes from "./routes/healthRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
import decisionRoutes from "./routes/decisionRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRoutes);
app.use(propertyRoutes);
app.use(authRoutes);
app.use(clientRoutes);
app.use(agentRoutes);
app.use(decisionRoutes);
app.use(adminRoutes);

export async function startServer() {
  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => {
    console.log(`Server running on port ${port} 🔥`);
  });
}
