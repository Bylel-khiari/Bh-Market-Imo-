import request from "supertest";
import { app } from "../src/app.js";
import { signAccessToken } from "../src/utils/jwt.js";

describe("API security and validation", () => {
  test("GET / returns health message", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("API is running");
  });

  test("blocks disallowed CORS origin", async () => {
    const response = await request(app)
      .get("/")
      .set("Origin", "https://evil.example.com");

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("CORS policy blocked this origin");
  });

  test("returns 400 on invalid auth payload", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "not-an-email",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Request validation failed");
    expect(Array.isArray(response.body.details)).toBe(true);
  });

  test("returns 401 on missing bearer token", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Missing or invalid authorization header");
  });

  test("returns 400 for invalid property query limit", async () => {
    const response = await request(app).get("/api/properties?limit=invalid");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Request validation failed");
  });

  test("returns 401 on favorites endpoint without bearer token", async () => {
    const response = await request(app).get("/api/favorites");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Missing or invalid authorization header");
  });

  test("returns 403 on favorites endpoint for non-client accounts", async () => {
    const token = signAccessToken({
      sub: 7,
      email: "agent@example.com",
      role: "agent_bancaire",
    });

    const response = await request(app)
      .get("/api/favorites")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden: insufficient permissions");
  });

  test("returns 400 for invalid favorite property id", async () => {
    const token = signAccessToken({
      sub: 11,
      email: "client@example.com",
      role: "client",
    });

    const response = await request(app)
      .post("/api/properties/not-a-number/favorite")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Request validation failed");
  });

  test("returns 401 on scrape sites endpoint without bearer token", async () => {
    const response = await request(app).get("/api/admin/scrape-sites");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Missing or invalid authorization header");
  });

  test("returns 403 on scrape sites endpoint for non-admin accounts", async () => {
    const token = signAccessToken({
      sub: 21,
      email: "decision@example.com",
      role: "responsable_decisionnel",
    });

    const response = await request(app)
      .get("/api/admin/scrape-sites")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden: insufficient permissions");
  });

  test("returns 400 for invalid scrape site payload", async () => {
    const token = signAccessToken({
      sub: 31,
      email: "admin@example.com",
      role: "admin",
    });

    const response = await request(app)
      .post("/api/admin/scrape-sites")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "A",
        spider_name: "bad identifier",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Request validation failed");
  });

  test("returns 404 for unknown route", async () => {
    const response = await request(app).get("/api/unknown-route");

    expect(response.status).toBe(404);
    expect(response.body.message).toContain("Route not found");
  });
});
