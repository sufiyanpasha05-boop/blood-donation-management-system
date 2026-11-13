
import api from "./api";
import { getSession } from "./auth";

function adminHeaders() {
  const session = getSession();

  if (!session?.token) {
    throw new Error("Admin session not found. Please log in.");
  }

  return {
    Authorization: `Bearer ${session.token}`,
  };
}

export async function getPendingRegistrations() {
  const response = await api.get("/admin/pending", {
    headers: adminHeaders(),
  });

  return response.data;
}

export async function verifyOrganization(role, id, decision) {
  const response = await api.put(
    `/admin/verify/${role}/${id}`,
    { decision },
    { headers: adminHeaders() }
  );

  return response.data;
}

export async function getOrganizations() {
  const response = await api.get("/admin/organizations", {
    headers: adminHeaders(),
  });

  return response.data;
}

export async function getAllDonors() {
  const response = await api.get("/admin/donors", {
    headers: adminHeaders(),
  });

  return response.data;
}

export async function getAllEmergencyRequests() {
  const response = await api.get("/admin/emergency-requests", {
    headers: adminHeaders(),
  });

  return response.data;
}
