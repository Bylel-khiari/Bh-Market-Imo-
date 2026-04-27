import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import healthRoutes from "./routes/healthRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import propertyReportRoutes from "./routes/propertyReportRoutes.js";
import creditApplicationRoutes from "./routes/creditApplicationRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { httpError } from "./utils/httpError.js";
import { initializePropertyStore } from "./models/propertyModel.js";
import { initializePropertyReportStore } from "./models/propertyReportModel.js";
import { initializeCreditApplicationStore } from "./models/creditApplicationModel.js";
import { initializeScrapeSiteStore } from "./models/scrapeSiteModel.js";
import { initializeScraperControlStore } from "./models/scraperControlModel.js";
import { initializeScraperAutomation } from "./services/scraperControlService.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

export const app = express();

const isProduction = process.env.NODE_ENV === "production";
const defaultDevPorts = ["3000", "3001", "3002", "3003", "3004", "3005", "5173"];
const defaultDevOrigins = defaultDevPorts.flatMap((port) => [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
]);

const allowedOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const effectiveOrigins = allowedOrigins.length ? allowedOrigins : defaultDevOrigins;

if (isProduction && !allowedOrigins.length) {
  throw new Error("CORS_ORIGINS must be configured in production");
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (effectiveOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(httpError(403, "CORS policy blocked this origin"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
};

const globalRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 250),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const authRateLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts, please try again later." },
});

app.disable("x-powered-by");
app.use(helmet());
app.use(morgan(isProduction ? "combined" : "dev"));
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(globalRateLimiter);
app.use("/api/auth", authRateLimiter);

app.use(healthRoutes);
app.use(propertyRoutes);
app.use(propertyReportRoutes);
app.use(creditApplicationRoutes);
app.use(assistantRoutes);
app.use(authRoutes);
app.use(clientRoutes);
app.use(agentRoutes);
app.use(adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export async function startServer() {
  const port = Number(process.env.PORT || 5000);
  await Promise.all([
    initializePropertyStore(),
    initializePropertyReportStore(),
    initializeCreditApplicationStore(),
    initializeScrapeSiteStore(),
    initializeScraperControlStore(),
  ]);
  await initializeScraperAutomation();
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port} 🔥`);
      resolve(server);
    });

    server.on("error", (error) => {
      reject(error);
    });
  });
}
