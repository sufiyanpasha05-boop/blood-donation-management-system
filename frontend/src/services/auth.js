
import api from "./api";

const SESSION_KEY = "raktasahay_session";

export async function loginUser(login, password) {
  const response = await api.post("/auth/login", {
    login: login.trim(),
    password,
  });

  const data = response.data;
  const token = data.token || data.access_token;
  const role = data.role || data.user?.role;

  if (!token || !role) {
    throw new Error("Login response is missing token or role.");
  }

  const session = {
    token,
    role,
    user: data.user || null,
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return session;
}

export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function logoutUser() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getDashboardPath(role) {
  const paths = {
    admin: "/admin/dashboard",
    hospital: "/hospital/dashboard",
    blood_bank: "/blood-bank/dashboard",
  };

  return paths[role] || "/login";
}
