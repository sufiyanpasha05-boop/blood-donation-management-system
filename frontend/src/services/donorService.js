
import api from "./api";
import { getSession } from "./auth";

function authConfig() {
  const session = getSession();

  if (!session?.token) {
    throw new Error("Please log in first.");
  }

  return {
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  };
}

// Register donor through hospital or blood bank
export async function registerOrganizationDonor(donorData) {
  const response = await api.post(
    "/donors/register-organization",
    donorData,
    authConfig()
  );

  return response.data;
}

// Get all donors awaiting verification
export async function getPendingDonors() {
  const response = await api.get(
    "/donors/pending",
    authConfig()
  );

  return response.data.donors || [];
}

// Verify or reject a pending donor
export async function verifyDonor(donorId, decision) {
  const response = await api.put(
    `/donors/verify/${donorId}`,
    { decision },
    authConfig()
  );

  return response.data;
}
