
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getHospitalRequests,
  createEmergencyRequest,
  getHospitalNotifications,
  markNotificationRead,
  updateRequestStatus,
  getRequestDonors,
  updateDonationStatus,
} from "../services/hospitalService";
import { getSession } from "../services/auth";
import DonorManagement from "../components/DonorManagement";

const bloodGroups = [
  "O+", "O-", "A+", "A-",
  "B+", "B-", "AB+", "AB-"
];

const urgencyLevels = ["Normal", "Urgent", "Critical"];

export default function HospitalDashboard() {
  const navigate = useNavigate();

  const [activePage, setActivePage] = useState("overview");
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [bloodGroup, setBloodGroup] = useState("");
  const [urgency, setUrgency] = useState("Normal");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [matchedDonors, setMatchedDonors] = useState([]);
  const [loadingDonors, setLoadingDonors] = useState(false);
  const [updatingMatchId, setUpdatingMatchId] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError("");

      const [requestData, notificationData] = await Promise.all([
        getHospitalRequests(),
        getHospitalNotifications(),
      ]);

      setRequests(requestData);
      setNotifications(notificationData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to load hospital dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totalRequests = requests.length;

  const activeRequests = requests.filter(
    (item) => item.request_status === "Open"
  ).length;

  const fulfilledRequests = requests.filter(
    (item) => item.request_status === "Fulfilled"
  ).length;

  const totalMatchedDonors = requests.reduce(
    (total, item) => total + Number(item.total_matches || 0),
    0
  );

  const unreadNotifications = notifications.filter(
    (item) => !item.is_read
  ).length;


    const handleCreateRequest = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!bloodGroup) {
        setError("Please select a blood group.");
        return;
    }

    setSubmitting(true);

    try {
        const result = await createEmergencyRequest(
        bloodGroup,
        urgency,
        description
        );

        // Request has successfully been created
        setSuccess(
        `Emergency request #${result.request_id} created successfully. ` +
        `${result.matched_donors} donor(s) matched.`
        );

        setBloodGroup("");
        setUrgency("Normal");
        setDescription("");
        setActivePage("requests");

        // Refresh dashboard separately
        try {
        await loadDashboard();
        } catch (refreshError) {
        console.error("Dashboard refresh error:", refreshError);
        }

    } catch (err) {
        console.error("Create request error:", err);

        setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to create emergency request."
        );
    } finally {
        setSubmitting(false);
    }
    };


  const handleStatusUpdate = async (requestId, status) => {
    if (
      !window.confirm(
        `Are you sure you want to mark request #${requestId} as ${status}?`
      )
    ) {
      return;
    }

    setBusyId(requestId);
    setError("");
    setSuccess("");

    try {
      await updateRequestStatus(requestId, status);

      setSuccess(
        `Request #${requestId} updated to ${status}.`
      );

      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Failed to update request status."
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleNotificationRead = async (notificationId) => {
    setError("");

    try {
      await markNotificationRead(notificationId);
      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to update notification."
      );
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      Open: "bg-primary",
      Fulfilled: "bg-success",
      Cancelled: "bg-secondary",
    };

    return (
      <span className={`badge ${colors[status] || "bg-secondary"}`}>
        {status}
      </span>
    );
  };

  const getUrgencyBadge = (level) => {
    const colors = {
      Normal: "bg-success",
      Urgent: "bg-warning text-dark",
      Critical: "bg-danger",
    };

    return (
      <span className={`badge ${colors[level] || "bg-secondary"}`}>
        {level}
      </span>
    );
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString();
  };

const handleViewDonors = async (request) => {
  const requestId = request.request_id;

  setSelectedRequest(request);
  setMatchedDonors([]);
  setLoadingDonors(true);
  setError("");

  try {
    const result = await getRequestDonors(requestId);
    setMatchedDonors(result.donors || []);
  } catch (err) {
    console.error("VIEW DONORS ERROR:", err);

    setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to load matched donors."
    );
  } finally {
    setLoadingDonors(false);
  }
};

    const handleConfirmDonation = async (matchId) => {
    const confirmed = window.confirm(
        "Confirm that this donor has completed the blood donation at the hospital?"
    );

    if (!confirmed) return;

    setUpdatingMatchId(matchId);
    setError("");
    setSuccess("");

    try {
        await updateDonationStatus(matchId, "Donated");

        setSuccess("Donation recorded successfully.");

        const result = await getRequestDonors(
        selectedRequest.request_id
        );

        setMatchedDonors(result.donors || []);

        await loadDashboard();
    } catch (err) {
        setError(
        err.response?.data?.message ||
        "Failed to confirm donation."
        );
    } finally {
        setUpdatingMatchId(null);
    }
    };

    const renderRequestTable = (data, showDonorButton = true) => (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>Request ID</th>
            <th>Blood Group</th>
            <th>Urgency</th>
            <th>Matches</th>
            <th>Accepted</th>
            <th>Status</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center py-4 text-secondary">
                No emergency requests found.
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={item.request_id}>
                <td>#{item.request_id}</td>

                <td>
                  <strong>{item.blood_group}</strong>
                </td>

                <td>{getUrgencyBadge(item.urgency)}</td>

                <td>{item.total_matches}</td>
                <td>{item.accepted}</td>

                <td>{getStatusBadge(item.request_status)}</td>

                <td className="small">
                  {formatDate(item.created_at)}
                </td>

                <td>
                  {item.request_status === "Open" ? (
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-success"
                        disabled={busyId === item.request_id}
                        onClick={() =>
                          handleStatusUpdate(
                            item.request_id,
                            "Fulfilled"
                          )
                        }
                      >
                        Fulfill
                      </button>

                      <button
                        className="btn btn-sm btn-outline-danger"
                        disabled={busyId === item.request_id}
                        onClick={() =>
                          handleStatusUpdate(
                            item.request_id,
                            "Cancelled"
                          )
                        }
                      >
                        Cancel
                      </button>
                      {showDonorButton && (
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => handleViewDonors(item)}
                        >
                            View Donors
                        </button>
                        )}
                    </div>
                  ) : (
                    <span className="text-secondary">Closed</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const stats = [
    {
      title: "Total Requests",
      value: totalRequests,
      icon: "bi-clipboard2-pulse",
      color: "#c8102e",
    },
    {
      title: "Active Requests",
      value: activeRequests,
      icon: "bi-activity",
      color: "#008f8b",
    },
    {
      title: "Matched Donors",
      value: totalMatchedDonors,
      icon: "bi-people",
      color: "#2563eb",
    },
    {
      title: "Fulfilled Requests",
      value: fulfilledRequests,
      icon: "bi-check-circle",
      color: "#16a34a",
    },
  ];

  const menu = [
    { id: "overview", label: "Overview", icon: "bi-grid" },
    { id: "create", label: "Create Request", icon: "bi-plus-circle" },
    { id: "requests", label: "Emergency Requests", icon: "bi-heart-pulse" },
    { id: "donors", label: "Donor Management", icon: "bi-people" },
    { id: "notifications", label: "Notifications", icon: "bi-bell" },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem("raktasahay_session");
    navigate("/login", { replace: true });
  };

  const session = getSession();

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <nav className="navbar bg-white border-bottom shadow-sm px-3 px-md-4">
        <div className="d-flex align-items-center gap-2">
          <img
            src="/raktasahay-logo.png"
            alt="RaktaSahay"
            width="42"
          />

          <div>
            <h5
              className="fw-bold mb-0"
              style={{ color: "#c8102e" }}
            >
              RaktaSahay
            </h5>

            <small className="text-secondary">
              Hospital Dashboard
            </small>
          </div>
        </div>

        <button
          className="btn btn-outline-danger btn-sm"
          onClick={handleLogout}
        >
          <i className="bi bi-box-arrow-right me-2"></i>
          Logout
        </button>
      </nav>

      <div className="container-fluid">
        <div className="row">
          {/* Sidebar */}
          <aside className="col-lg-2 bg-white border-end p-3">
            <div className="mb-4">
              <small className="text-secondary">
                Hospital Portal
              </small>
              <div className="fw-semibold mt-1">
                {session?.full_name ||
                  session?.name ||
                  "Hospital"}
              </div>
            </div>

            <div className="nav flex-column gap-2">
              {menu.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActivePage(item.id);
                    setError("");
                    setSuccess("");
                  }}
                  className={`btn text-start ${
                    activePage === item.id
                      ? "text-white"
                      : "btn-light"
                  }`}
                  style={
                    activePage === item.id
                      ? { backgroundColor: "#c8102e" }
                      : {}
                  }
                >
                  <i className={`bi ${item.icon} me-2`}></i>
                  {item.label}

                  {item.id === "notifications" &&
                    unreadNotifications > 0 && (
                      <span className="badge bg-danger ms-2">
                        {unreadNotifications}
                      </span>
                    )}
                </button>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <main className="col-lg-10 p-3 p-md-4">
            {error && (
              <div className="alert alert-danger">
                {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                {success}
              </div>
            )}

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-danger"></div>
                <p className="mt-3">Loading dashboard...</p>
              </div>
            ) : (
              <>
                {/* Overview */}
                {activePage === "overview" && (
                  <>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div>
                        <h3 className="fw-bold">
                          Hospital Overview
                        </h3>
                        <p className="text-secondary mb-0">
                          Monitor emergency blood requests and donor responses.
                        </p>
                      </div>

                      <button
                        className="btn text-white"
                        style={{ backgroundColor: "#c8102e" }}
                        onClick={() => setActivePage("create")}
                      >
                        <i className="bi bi-plus-lg me-2"></i>
                        New Request
                      </button>
                    </div>

                    <div className="row g-3 mb-4">
                      {stats.map((stat) => (
                        <div
                          className="col-md-6 col-xl-3"
                          key={stat.title}
                        >
                          <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                              <i
                                className={`bi ${stat.icon} fs-3`}
                                style={{ color: stat.color }}
                              ></i>

                              <p className="text-secondary mt-3 mb-1">
                                {stat.title}
                              </p>

                              <h2 className="fw-bold mb-0">
                                {stat.value}
                              </h2>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="card border-0 shadow-sm">
                      <div className="card-header bg-white py-3">
                        <h5 className="mb-0 fw-semibold">
                          Recent Emergency Requests
                        </h5>
                      </div>

                      <div className="card-body p-0">
                        {renderRequestTable(requests.slice(0, 5), false)}
                      </div>
                    </div>
                  </>
                )}

                {/* Create emergency request */}
                {activePage === "create" && (
                  <>
                    <h3 className="fw-bold mb-2">
                      Create Emergency Request
                    </h3>

                    <p className="text-secondary mb-4">
                      Find eligible blood donors near your registered hospital.
                    </p>

                    <div
                      className="card border-0 shadow-sm"
                      style={{ maxWidth: "650px" }}
                    >
                      <div className="card-body p-4">
                        <form onSubmit={handleCreateRequest}>
                          <div className="mb-3">
                            <label className="form-label fw-semibold">
                              Required Blood Group
                            </label>

                            <select
                              className="form-select"
                              value={bloodGroup}
                              onChange={(e) =>
                                setBloodGroup(e.target.value)
                              }
                              required
                            >
                              <option value="">
                                Select blood group
                              </option>

                              {bloodGroups.map((group) => (
                                <option key={group} value={group}>
                                  {group}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="mb-3">
                            <label className="form-label fw-semibold">
                              Urgency Level
                            </label>

                            <select
                              className="form-select"
                              value={urgency}
                              onChange={(e) =>
                                setUrgency(e.target.value)
                              }
                            >
                              {urgencyLevels.map((level) => (
                                <option key={level} value={level}>
                                  {level}
                                </option>
                              ))}
                            </select>
                          </div>

                        <div className="mb-3">
                        <label className="form-label fw-semibold">
                            Emergency Description (Optional)
                        </label>

                        <textarea
                            className="form-control"
                            rows={4}
                            maxLength={500}
                            placeholder="Briefly describe the emergency blood requirement..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />

                        <div className="d-flex justify-content-between mt-1">
                            <small className="text-secondary">
                            Avoid patient names and sensitive medical information.
                            </small>
                            <small className="text-secondary">
                            {description.length}/500
                            </small>
                        </div>
                        </div>

                          <div className="alert alert-info">
                            <i className="bi bi-info-circle me-2"></i>
                            Hospital location is taken automatically
                            from your registered profile. Eligible
                            donors within 5 km will be matched.
                          </div>

                          <button
                            type="submit"
                            className="btn text-white w-100 py-2"
                            style={{ backgroundColor: "#c8102e" }}
                            disabled={submitting}
                          >
                            {submitting
                              ? "Creating Request..."
                              : "Create Emergency Request"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </>
                )}

                {/* Emergency request history */}
                {activePage === "requests" && (
                  <>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h3 className="fw-bold mb-0">
                        Emergency Requests
                      </h3>

                      <button
                        className="btn btn-outline-primary"
                        onClick={loadDashboard}
                      >
                        <i className="bi bi-arrow-clockwise me-2"></i>
                        Refresh
                      </button>
                    </div>

                    <div className="card border-0 shadow-sm">
                      <div className="card-body p-0">
                        {renderRequestTable(requests)}
                      </div>
                    </div>

                    {selectedRequest && (
                    <div className="card shadow-sm mt-4">
                        <div className="card-header bg-white d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">
                            Matched Donors — Request #{selectedRequest.request_id}
                        </h5>

                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => {
                            setSelectedRequest(null);
                            setMatchedDonors([]);
                            }}
                        >
                            Close
                        </button>
                        </div>

                        <div className="card-body">
                        {loadingDonors ? (
                            <p>Loading matched donors...</p>
                        ) : matchedDonors.length === 0 ? (
                            <div className="alert alert-info mb-0">
                            No matched donors found for this request.
                            </div>
                        ) : (
                            <div className="table-responsive">
                            <table className="table table-bordered align-middle">
                                <thead className="table-light">
                                <tr>
                                    <th>Donor</th>
                                    <th>Blood Group</th>
                                    <th>Distance</th>
                                    <th>Response</th>
                                    <th>Phone</th>
                                    <th>Donation</th>
                                    <th>Action</th>
                                </tr>
                                </thead>

                                <tbody>
                                {matchedDonors.map((donor) => (
                                    <tr key={donor.match_id}>
                                    <td>
                                        {donor.donor_response === "Accepted"
                                        ? donor.donor_name
                                        : `Donor #${donor.donor_id}`}
                                    </td>

                                    <td>{donor.blood_group}</td>
                                    <td>{donor.distance_km} km</td>

                                    <td>
                                        <span className={`badge ${
                                        donor.donor_response === "Accepted"
                                            ? "bg-success"
                                            : donor.donor_response === "Rejected"
                                            ? "bg-danger"
                                            : "bg-warning text-dark"
                                        }`}>
                                        {donor.donor_response}
                                        </span>
                                    </td>

                                    <td>
                                        {donor.donor_response === "Accepted"
                                        ? donor.donor_phone
                                        : "Hidden"}
                                    </td>

                                    <td>{donor.donation_status}</td>

                                    <td>
                                        {donor.donor_response === "Accepted" &&
                                        donor.donation_status === "Pending" &&
                                        selectedRequest.request_status === "Open" ? (
                                        <button
                                            className="btn btn-success btn-sm"
                                            disabled={updatingMatchId !== null}
                                            onClick={() =>
                                            handleConfirmDonation(donor.match_id)
                                            }
                                        >
                                            {updatingMatchId === donor.match_id
                                            ? "Updating..."
                                            : "Confirm Donation"}
                                        </button>
                                        ) : donor.donation_status === "Donated" ? (
                                        <span className="text-success fw-bold">
                                            Donation Completed
                                        </span>
                                        ) : (
                                        <span className="text-muted">
                                            Not available
                                        </span>
                                        )}
                                    </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                            </div>
                        )}
                        </div>
                    </div>
                    )}

                    </>
                )}

                {/* Donor Management */}
                {activePage === "donors" && (
                <DonorManagement />
                )}

                {/* Hospital notifications */}
                {activePage === "notifications" && (
                  <>
                    <h3 className="fw-bold mb-4">
                      Hospital Notifications
                    </h3>

                    <div className="card border-0 shadow-sm">
                      <div className="card-body">
                        {notifications.length === 0 ? (
                          <p className="text-secondary mb-0">
                            No notifications available.
                          </p>
                        ) : (
                          notifications.map((item) => (
                            <div
                              key={item.notification_id}
                              className="border-bottom py-3"
                            >
                              <div className="d-flex justify-content-between gap-3">
                                <div>
                                  <strong>
                                    {item.notification_type}
                                  </strong>

                                  <p className="mb-1">
                                    {item.message}
                                  </p>

                                  <small className="text-secondary">
                                    {formatDate(item.created_at)}
                                  </small>
                                </div>

                                {!item.is_read && (
                                  <button
                                    className="btn btn-sm btn-outline-primary align-self-start"
                                    onClick={() =>
                                      handleNotificationRead(
                                        item.notification_id
                                      )
                                    }
                                  >
                                    Mark Read
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
