import request from "supertest";
import { app } from "../src/app.js";

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

  test("returns 404 for unknown route", async () => {
    const response = await request(app).get("/api/unknown-route");

    expect(response.status).toBe(404);
    expect(response.body.message).toContain("Route not found");
  });
});
