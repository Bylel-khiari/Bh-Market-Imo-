import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loginUser: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetUserPassword: vi.fn(),
  recordClientActivityLog: vi.fn(),
  renderAuthenticatedUser: vi.fn((res, payload) => res.json(payload)),
}));

vi.mock("../src/models/authModel.js", () => ({
  changeUserPassword: vi.fn(),
  getUserById: vi.fn(),
  loginUser: mocks.loginUser,
  requestPasswordReset: mocks.requestPasswordReset,
  resetUserPassword: mocks.resetUserPassword,
}));

vi.mock("../src/models/clientActivityLogModel.js", () => ({
  CLIENT_ACTIVITY_EVENT_TYPES: {
    CLIENT_LOGIN_SUCCESS: "client_login_success",
  },
  recordClientActivityLog: mocks.recordClientActivityLog,
}));

vi.mock("../src/views/authView.js", () => ({
  renderAuthenticatedUser: mocks.renderAuthenticatedUser,
  renderCurrentUser: vi.fn(),
}));

import { forgotPassword, login, resetPassword } from "../src/controllers/authController.js";

function createResponse() {
  return {
    cookie: vi.fn(),
    status: vi.fn(function status() {
      return this;
    }),
    json: vi.fn(),
  };
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockClear());
});

describe("authController login activity logging", () => {
  it("allows non-client users to login without creating a client activity log", async () => {
    const req = { body: { email: "agent@test.tn" }, headers: {} };
    const res = createResponse();
    const user = { id: 7, email: "agent@test.tn", role: "agent_bancaire" };
    mocks.loginUser.mockResolvedValueOnce({ token: "agent-token", user });

    await login(req, res);

    expect(mocks.recordClientActivityLog).not.toHaveBeenCalled();
    expect(mocks.renderAuthenticatedUser).toHaveBeenCalledWith(res, { token: "agent-token", user });
  });

  it("creates a client activity log only when the logged-in user is a client", async () => {
    const req = { body: { email: "client@test.tn" }, headers: {} };
    const res = createResponse();
    const user = { id: 11, email: "client@test.tn", role: "client" };
    mocks.loginUser.mockResolvedValueOnce({ token: "client-token", user });

    await login(req, res);

    expect(mocks.recordClientActivityLog).toHaveBeenCalledWith(req, {
      clientUserId: 11,
      eventType: "client_login_success",
      page: "/login",
      targetType: "user",
      targetId: 11,
      metadata: { email: "client@test.tn" },
    });
    expect(mocks.renderAuthenticatedUser).toHaveBeenCalledWith(res, { token: "client-token", user });
  });
});

describe("authController password reset", () => {
  it("starts a password reset request with the request origin", async () => {
    const req = {
      body: { email: "client@test.tn" },
      get: vi.fn((header) => (header === "origin" ? "http://localhost:3000" : undefined)),
    };
    const res = createResponse();
    mocks.requestPasswordReset.mockResolvedValueOnce({ message: "Mail sent" });

    await forgotPassword(req, res);

    expect(mocks.requestPasswordReset).toHaveBeenCalledWith(
      { email: "client@test.tn" },
      { origin: "http://localhost:3000" }
    );
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ message: "Mail sent" });
  });

  it("resets the password with a reset token", async () => {
    const req = {
      body: {
        token: "a".repeat(64),
        new_password: "new-password",
        confirm_password: "new-password",
      },
    };
    const res = createResponse();
    const user = { id: 11, email: "client@test.tn", role: "client" };
    mocks.resetUserPassword.mockResolvedValueOnce(user);

    await resetPassword(req, res);

    expect(mocks.resetUserPassword).toHaveBeenCalledWith(req.body);
    expect(res.json).toHaveBeenCalledWith({
      message: "Mot de passe reinitialise avec succes. Vous pouvez vous connecter.",
      user,
    });
  });
});
