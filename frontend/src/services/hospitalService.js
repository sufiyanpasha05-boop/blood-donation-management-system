
import api from "./api";
import { getSession } from "./auth";

function authConfig() {
  const session = getSession();

  if (!session?.token) {
    throw new Error("Please log in as a hospital.");
  }

  return {
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  };
}

// Get all emergency requests for the logged-in hospital
export async function getHospitalRequests() {
  const response = await api.get(
    "/emergency/my-requests",
    authConfig()
  );

  return response.data.requests || [];
}

// Create a new emergency request
export async function createEmergencyRequest(
  bloodGroup,
  urgency,
  description = ""
) {
  const response = await api.post(
    "/emergency/create",
    {
      blood_group: bloodGroup,
      urgency: urgency,
      description: description,
    },
    authConfig()
  );

  return response.data;
}

// Get hospital notifications
export async function getHospitalNotifications() {
  const response = await api.get(
    "/emergency/hospital-notifications",
    authConfig()
  );

  return response.data.notifications || [];
}

// Mark a notification as read
export async function markNotificationRead(notificationId) {
  const response = await api.put(
    `/emergency/hospital-notifications/${notificationId}/read`,
    {},
    authConfig()
  );

  return response.data;
}

// Update emergency request status
export async function updateRequestStatus(requestId, status) {
  const response = await api.put(
    `/emergency/requests/${requestId}/status`,
    {
      request_status: status,
    },
    authConfig()
  );

  return response.data;
}

export async function getRequestDonors(requestId) {
  const response = await api.get(
    `/emergency/requests/${requestId}/donors`,
    authConfig()
  );
  return response.data;
}

export async function updateDonationStatus(matchId, status) {
  const response = await api.put(
    `/emergency/matches/${matchId}/donation`,
    { donation_status: status },
    authConfig()
  );
  return response.data;
}