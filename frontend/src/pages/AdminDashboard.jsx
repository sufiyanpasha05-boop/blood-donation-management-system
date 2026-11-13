
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, logoutUser } from "../services/auth";
import {
  getPendingRegistrations,
  verifyOrganization,
  getOrganizations,
  getAllDonors,
  getAllEmergencyRequests,
} from "../services/adminService";

const menu = [
  { id: "overview", label: "Overview", icon: "bi-grid-1x2" },
  { id: "hospitals", label: "Hospitals", icon: "bi-hospital" },
  { id: "bloodbanks", label: "Blood Banks", icon: "bi-droplet-half" },
  { id: "donors", label: "Donors", icon: "bi-people" },
  { id: "requests", label: "Emergency Requests", icon: "bi-heart-pulse" },
];


const cards = [
  { title: "Hospitals", icon: "bi-hospital", color: "#c8102e" },
  { title: "Blood Banks", icon: "bi-droplet-half", color: "#008f8b" },
  { title: "Registered Donors", icon: "bi-people", color: "#c8102e" },
  { title: "Pending Approvals", icon: "bi-clock-history", color: "#008f8b" },
  { title: "Total Requests", icon: "bi-heart-pulse", color: "#c8102e" },
  { title: "Open Requests", icon: "bi-exclamation-circle", color: "#dc3545" },
  { title: "Fulfilled Requests", icon: "bi-check-circle", color: "#198754" },
  { title: "Verified Organizations", icon: "bi-shield-check", color: "#008f8b" },
];


function AdminDashboard() {
  const [active, setActive] = useState("overview");
  const navigate = useNavigate();
  const session = getSession();
  const [hospitals, setHospitals] = useState([]);
  const [bloodBanks, setBloodBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [allHospitals, setAllHospitals] = useState([]);
  const [allBloodBanks, setAllBloodBanks] = useState([]);
  const [allDonors, setAllDonors] = useState([]);
  const [allRequests, setAllRequests] = useState([]);

  const handleLogout = () => {
    logoutUser();
    navigate("/login", { replace: true });
  };


const loadPending = async () => {
  setLoading(true);
  setError("");

  try {
    const data = await getPendingRegistrations();

    setHospitals(data.hospitals || []);
    setBloodBanks(data.blood_banks || []);
  } catch (err) {
    setError(
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Unable to load pending registrations."
    );
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadPending();
  loadOrganizations();
  loadDonors();
  loadEmergencyRequests();
}, []);

const handleVerification = async (role, id, decision) => {
  const organization = role === "hospital" ? "hospital" : "blood bank";

  const confirmed = window.confirm(
    `Are you sure you want to ${decision.toLowerCase()} this ${organization}?`
  );

  if (!confirmed) return false;

  setProcessing(`${role}-${id}`);
  setError("");
  setSuccess("");

  try {
    await verifyOrganization(role, id, decision);

    setSuccess(
      `${organization} registration ${decision.toLowerCase()} successfully.`
    );

    await loadPending();
    await loadOrganizations();
    return true;
  } catch (err) {
    setError(
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Verification failed."
    );
  } finally {
    setProcessing(null);
  }
};
    const loadOrganizations = async () => {
  try {
    const data = await getOrganizations();

    setAllHospitals(data.hospitals || []);
    setAllBloodBanks(data.blood_banks || []);
  } catch (err) {
    setError(
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Unable to load organizations."
    );
  }
};

const loadDonors = async () => {
  try {
    const data = await getAllDonors();
    setAllDonors(data.donors || []);
  } catch (err) {
    console.error("Failed to load donors:", err);
  }
};


const loadEmergencyRequests = async () => {
  try {
    const data = await getAllEmergencyRequests();
    setAllRequests(data.requests || []);
  } catch (err) {
    console.error("Failed to load emergency requests:", err);
    setError(
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Unable to load emergency requests."
    );
  }
};


const totalRequests = allRequests.length;

const openRequests = allRequests.filter(
  (item) => item.request_status === "Open"
).length;

const fulfilledRequests = allRequests.filter(
  (item) => item.request_status === "Fulfilled"
).length;

const verifiedHospitals = allHospitals.filter(
  (item) => item.verification_status === "Verified"
).length;

const verifiedBloodBanks = allBloodBanks.filter(
  (item) => item.verification_status === "Verified"
).length;

  const current = menu.find((item) => item.id === active);

  return (
    <div className="admin-layout">
      <style>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: #f5f7fa;
          color: #263648;
        }

        .admin-sidebar {
          width: 245px;
          background: #243448;
          color: white;
          padding: 24px 14px;
          flex-shrink: 0;
        }

        .admin-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 21px;
          font-weight: 800;
          padding: 5px 10px 35px;
        }

        .admin-brand img {
          width: 42px;
          height: 42px;
          object-fit: contain;
        }

        .admin-nav {
          width: 100%;
          background: transparent;
          border: 0;
          color: #c9d3df;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 15px;
          margin-bottom: 6px;
          border-radius: 11px;
          text-align: left;
          font-size: 14px;
        }

        .admin-nav:hover,
        .admin-nav.active {
          background: #c8102e;
          color: white;
        }

        .admin-main {
          flex: 1;
          min-width: 0;
        }

        .admin-header {
          background: white;
          padding: 17px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e9edf1;
        }

        .admin-content {
          padding: 30px;
        }

        .admin-stat {
          background: white;
          border-radius: 17px;
          padding: 23px;
          border: 1px solid #edf0f4;
          height: 100%;
        }

        .admin-stat-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          font-size: 22px;
          background: #f7f8fa;
        }

        .admin-panel {
          background: white;
          border: 1px solid #edf0f4;
          border-radius: 17px;
          padding: 24px;
        }

        @media (max-width: 768px) {
          .admin-layout {
            flex-direction: column;
          }

          .admin-sidebar {
            width: 100%;
            padding: 12px;
          }

          .admin-brand {
            padding-bottom: 12px;
          }

          .admin-menu {
            display: flex;
            overflow-x: auto;
            gap: 6px;
          }

          .admin-nav {
            width: auto;
            white-space: nowrap;
          }

          .admin-header,
          .admin-content {
            padding: 18px;
          }
        }
      `}</style>

      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src="/raktasahay-logo.png" alt="RaktaSahay" />
          <span>RaktaSahay</span>
        </div>

        <div className="small text-uppercase text-white-50 px-3 mb-3">
          Administration
        </div>

        <nav className="admin-menu" aria-label="Admin navigation">
          {menu.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-nav ${active === item.id ? "active" : ""}`}
              onClick={() => setActive(item.id)}
            >
              <i className={`bi ${item.icon}`}></i>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h5 className="fw-bold mb-1">Admin Dashboard</h5>
            <span className="text-secondary small">
              RaktaSahay Management Portal
            </span>
          </div>

          <div className="d-flex align-items-center gap-3">
            <span className="badge text-bg-success">Admin</span>

            <button
              className="btn btn-outline-danger btn-sm"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right me-1"></i>
              Logout
            </button>
          </div>
        </header>

        <div className="admin-content">
          <h3 className="fw-bold mb-1">
            {active === "overview" ? "Dashboard Overview" : current.label}
          </h3>

          <p className="text-secondary mb-4">
            {active === "overview"
              ? "Manage organizations and monitor platform activity."
              : `Manage ${current.label.toLowerCase()} on RaktaSahay.`}
          </p>

          {active === "overview" ? (
            <>
              <div className="row g-3 mb-4">
                {cards.map((card) => (
                  <div className="col-sm-6 col-xl-3" key={card.title}>
                    <div className="admin-stat">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="text-secondary small mb-2">
                            {card.title}
                          </div>
                          <h2 className="fw-bold mb-0">
                            {card.title === "Hospitals"
                            ? allHospitals.length
                            : card.title === "Blood Banks"
                            ? allBloodBanks.length
                            : card.title === "Registered Donors"
                            ? allDonors.length
                            : card.title === "Pending Approvals"
                            ? hospitals.length + bloodBanks.length
                            : card.title === "Total Requests"
                            ? totalRequests
                            : card.title === "Open Requests"
                            ? openRequests
                            : card.title === "Fulfilled Requests"
                            ? fulfilledRequests
                            : card.title === "Verified Organizations"
                            ? verifiedHospitals + verifiedBloodBanks
                            : "—"}
                          </h2>

                        </div>

                        <div
                          className="admin-stat-icon"
                          style={{ color: card.color }}
                        >
                          <i className={`bi ${card.icon}`}></i>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>


<div className="admin-panel mb-4">
  <h5 className="fw-bold mb-3">
    <i className="bi bi-heart-pulse text-danger me-2"></i>
    Recent Emergency Requests
  </h5>

  <div className="table-responsive">
    <table className="table table-hover align-middle">
      <thead>
        <tr>
          <th>Request ID</th>
          <th>Hospital</th>
          <th>Blood Group</th>
          <th>Urgency</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        {[...allRequests]
          .sort(
            (a, b) =>
              new Date(b.created_at) - new Date(a.created_at)
          )
          .slice(0, 5)
          .map((item) => (
            <tr key={item.id}>
              <td>#{item.id}</td>
              <td>{item.hospital_name || "Unknown Hospital"}</td>
              <td>{item.blood_group}</td>
              <td>{item.urgency}</td>
              <td>
                <span
                  className={`badge ${
                    item.request_status === "Open"
                      ? "text-bg-primary"
                      : item.request_status === "Fulfilled"
                      ? "text-bg-success"
                      : "text-bg-secondary"
                  }`}
                >
                  {item.request_status}
                </span>
              </td>
            </tr>
          ))}
      </tbody>
    </table>

    {allRequests.length === 0 && (
      <p className="text-secondary text-center py-3">
        No emergency requests found.
      </p>
    )}
  </div>
</div>

<div className="admin-panel">
  <h5 className="fw-bold mb-3">
    <i className="bi bi-shield-check text-danger me-2"></i>
    Pending Verifications
  </h5>

  {error && (
    <div className="alert alert-danger" role="alert">
      {error}
    </div>
  )}

  {success && (
    <div className="alert alert-success" role="status">
      {success}
    </div>
  )}

  {loading ? (
    <p className="text-secondary">Loading registrations...</p>
  ) : hospitals.length + bloodBanks.length === 0 ? (
    <p className="text-secondary mb-0">
      No pending organization registrations.
    </p>
  ) : (
    <div className="table-responsive">
      <table className="table align-middle">
        <thead>
          <tr>
            <th>Organization</th>
            <th>Type</th>
            <th>Email</th>
            <th>Registration No.</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {[
            ...hospitals.map((item) => ({
              ...item,
              role: "hospital",
            })),
            ...bloodBanks.map((item) => ({
              ...item,
              role: "blood_bank",
            })),
          ].map((item) => (
            <tr key={`${item.role}-${item.id}`}>
              <td className="fw-semibold">{item.name}</td>

              <td>
                {item.role === "hospital"
                  ? "Hospital"
                  : "Blood Bank"}
              </td>

              <td>{item.email}</td>

              <td>{item.registration_no || "—"}</td>

                <td>
                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setSelectedOrganization(item)}
                >
                    <i className="bi bi-eye me-1"></i>
                    View Details
                </button>
                </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>

            </>

) : (
  <div className="admin-panel">
    <h5 className="fw-bold mb-3">{current.label}</h5>

    {error && (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    )}

    {active === "hospitals" || active === "bloodbanks" ? (
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>ID</th>
              <th>Organization</th>
              <th>Email</th>
              <th>Registration No.</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {(active === "hospitals"
              ? allHospitals
              : allBloodBanks
            ).map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td className="fw-semibold">{item.name}</td>
                <td>{item.email}</td>
                <td>{item.registration_no || "—"}</td>
                <td>
                  <span
                    className={`badge ${
                      item.verification_status?.toLowerCase() === "verified"
                        ? "text-bg-success"
                        : item.verification_status?.toLowerCase() === "pending"
                        ? "text-bg-warning"
                        : "text-bg-danger"
                    }`}
                  >
                    {item.verification_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(active === "hospitals"
          ? allHospitals
          : allBloodBanks
        ).length === 0 && (
          <p className="text-secondary text-center py-3">
            No organizations found.
          </p>
        )}
      </div>

    ) : active === "donors" ? (
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Blood Group</th>
              <th>Verification</th>
              <th>Availability</th>
            </tr>
          </thead>

          <tbody>
            {allDonors.map((donor) => (
              <tr key={donor.id}>
                <td>{donor.id}</td>
                <td>{donor.name}</td>
                <td>{donor.email}</td>
                <td>{donor.blood_group}</td>
                <td>{donor.verification_status}</td>
                <td>{donor.availability}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {allDonors.length === 0 && (
          <p className="text-secondary text-center py-3">
            No registered donors found.
          </p>
        )}
      </div>

    ) : active === "requests" ? (
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Hospital</th>
              <th>Blood Group</th>
              <th>Urgency</th>
              <th>Status</th>
              <th>Created At</th>
            </tr>
          </thead>

          <tbody>
            {allRequests.map((item) => (
              <tr key={item.id}>
                <td>#{item.id}</td>
                <td className="fw-semibold">
                  {item.hospital_name || "Unknown Hospital"}
                </td>
                <td>{item.blood_group}</td>
                <td>
                  <span
                    className={`badge ${
                      item.urgency === "Critical"
                        ? "text-bg-danger"
                        : "text-bg-warning"
                    }`}
                  >
                    {item.urgency}
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${
                      item.request_status === "Open"
                        ? "text-bg-primary"
                        : item.request_status === "Fulfilled"
                        ? "text-bg-success"
                        : "text-bg-secondary"
                    }`}
                  >
                    {item.request_status}
                  </span>
                </td>
                <td>
                  {item.created_at
                    ? new Date(item.created_at).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {allRequests.length === 0 && (
          <p className="text-secondary text-center py-3">
            No emergency requests found.
          </p>
        )}
      </div>
    ) : (
      <p className="text-secondary mb-0">
        This section will be connected to the backend next.
      </p>
    )}

  </div>
)}

<p className="text-secondary small mt-4">
  Signed in as: {session?.role || "admin"}
</p>
        </div>
      </main>

    {selectedOrganization && (
    <div
        className="modal d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-label="Organization verification details"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
        <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow">
            <div className="modal-header">
            <h5 className="modal-title fw-bold">
                Organization Verification Details
            </h5>
            <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => setSelectedOrganization(null)}
            />
            </div>

            <div className="modal-body p-4">
            <div className="row g-3">
                {[
                ["Organization Name", selectedOrganization.name],
                [
                    "Organization Type",
                    selectedOrganization.role === "hospital"
                    ? "Hospital"
                    : "Blood Bank",
                ],
                ["Registration Number", selectedOrganization.registration_no],
                ["Email", selectedOrganization.email],
                ["Phone Number", selectedOrganization.phone],
                ["Registered Address", selectedOrganization.address],
                ["Latitude", selectedOrganization.latitude],
                ["Longitude", selectedOrganization.longitude],
                [
                    "Registration Date",
                    selectedOrganization.created_at
                    ? new Date(
                        selectedOrganization.created_at
                        ).toLocaleString()
                    : null,
                ],
                [
                    "Verification Status",
                    selectedOrganization.verification_status,
                ],
                ].map(([label, value]) => (
                <div className="col-md-6" key={label}>
                    <div className="text-secondary small mb-1">
                    {label}
                    </div>
                    <div className="fw-semibold text-break">
                    {value ?? "Not provided"}
                    </div>
                </div>
                ))}
            </div>

            <div className="alert alert-info mt-4 mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Review the registration details before approving
                or rejecting this organization.
            </div>
            </div>

            <div className="modal-footer">
            <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setSelectedOrganization(null)}
            >
                Close
            </button>

            <button
            type="button"
            className="btn btn-outline-danger"
            disabled={processing !== null}
            onClick={async () => {
                const item = selectedOrganization;

                const updated = await handleVerification(
                item.role,
                item.id,
                "Rejected"
                );

                if (updated) {
                setSelectedOrganization(null);
                }
            }}
            >
            Reject
            </button>

            <button
                type="button"
                className="btn btn-success"
                disabled={processing !== null}
                onClick={async () => {
                    const item = selectedOrganization;

                    const updated = await handleVerification(
                        item.role,
                        item.id,
                        "Verified"
                    );

                    if (updated) {
                        setSelectedOrganization(null);
                    }
                    }}
            >
                Approve Registration
            </button>
            </div>
        </div>
        </div>
    </div>
    )}

    </div>

  );
}

export default AdminDashboard;
