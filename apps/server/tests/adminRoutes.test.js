import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const handlers = {
  listUsers: vi.fn((req, res) => res.json({ users: [] })),
  createUser: vi.fn((req, res) => res.status(201).json({ user: {} })),
  updateUser: vi.fn((req, res) => res.json({ user: {} })),
  deleteUser: vi.fn((req, res) => res.status(204).send()),
  listPropertiesByAdmin: vi.fn((req, res) => res.json({ properties: [], pagination: {} })),
  createProperty: vi.fn((req, res) => res.status(201).json({ property: {} })),
  updateProperty: vi.fn((req, res) => res.json({ property: {} })),
  deleteProperty: vi.fn((req, res) => res.status(204).send()),
  getScraperControlByAdmin: vi.fn((req, res) => res.json({ control: {} })),
  updateScraperControlByAdmin: vi.fn((req, res) => res.json({ control: {} })),
  startScraperByAdmin: vi.fn((req, res) => res.json({ control: {} })),
  startListingCleanerByAdmin: vi.fn((req, res) => res.json({ control: {} })),
  stopScraperByAdmin: vi.fn((req, res) => res.json({ control: {} })),
  listScrapeSiteSuggestionsByAdmin: vi.fn((req, res) => res.json({ suggestions: [] })),
  startScrapeSiteDiscoveryByAdmin: vi.fn((req, res) => res.json({ status: "completed" })),
  updateScrapeSiteSuggestionByAdmin: vi.fn((req, res) => res.json({ suggestion: {} })),
  acceptScrapeSiteSuggestionByAdmin: vi.fn((req, res) => res.status(201).json({ suggestion: {}, site: {} })),
  listScrapeSites: vi.fn((req, res) => res.json({ sites: [] })),
  createScrapeSiteByAdmin: vi.fn((req, res) => res.status(201).json({ site: {} })),
  updateScrapeSiteByAdmin: vi.fn((req, res) => res.json({ site: {} })),
  deleteScrapeSiteByAdmin: vi.fn((req, res) => res.status(204).send()),
};

vi.mock("../src/controllers/adminController.js", () => handlers);

vi.mock("../src/middleware/authMiddleware.js", () => ({
  requireAuth: (req, res, next) => {
    req.user = { sub: 1, role: req.header("x-test-role") || "admin" };
    next();
  },
  requireRoles: (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    return next();
  },
}));

async function buildApp() {
  const { default: adminRoutes } = await import("../src/routes/adminRoutes.js");
  const app = express();
  app.use(express.json());
  app.use(adminRoutes);
  app.use((error, req, res, next) => {
    res.status(error.status || 500).json({ message: error.message, details: error.details });
  });
  return app;
}

beforeEach(() => {
  Object.values(handlers).forEach((handler) => handler.mockClear());
});

describe("adminRoutes", () => {
  it("enforces admin role on scraper site routes", async () => {
    const app = await buildApp();

    const response = await request(app)
      .get("/api/admin/scrape-sites")
      .set("x-test-role", "client");

    expect(response.status).toBe(403);
    expect(handlers.listScrapeSites).not.toHaveBeenCalled();
  });

  it("validates scrape-site payloads before controller execution", async () => {
    const app = await buildApp();

    const response = await request(app)
      .post("/api/admin/scrape-sites")
      .send({
        name: "New Site",
        spider_name: "bad spider name",
        is_active: false,
      });

    expect(response.status).toBe(400);
    expect(handlers.createScrapeSiteByAdmin).not.toHaveBeenCalled();
  });

  it("routes scrape-site discovery start to the admin controller", async () => {
    const app = await buildApp();

    const response = await request(app)
      .post("/api/admin/scrape-site-discovery/start")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "completed" });
    expect(handlers.startScrapeSiteDiscoveryByAdmin).toHaveBeenCalledTimes(1);
  });
});
