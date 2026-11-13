
import { useEffect, useState } from "react";
import {
  registerOrganizationDonor,
  getPendingDonors,
  verifyDonor,
} from "../services/donorService";
import api from "../services/api";
import { getSession } from "../services/auth";

const initialForm = {
  name: "",
  age: "",
  gender: "",
  blood_group: "",
  phone: "",
  email: "",
  address: "",
  latitude: "",
  longitude: "",
  last_donation_date: "",
};

const bloodGroups = [
  "O+", "O-", "A+", "A-",
  "B+", "B-", "AB+", "AB-",
];

export default function DonorManagement() {
  const [tab, setTab] = useState("register");
  const [form, setForm] = useState(initialForm);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewedDonors, setReviewedDonors] = useState({});
  const [documentLoadingId, setDocumentLoadingId] = useState(null);

  const loadDonors = async () => {
    setLoading(true);
    try {
      const data = await getPendingDonors();
      setDonors(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to load pending donors."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "pending") {
      loadDonors();
    }
  }, [tab]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


    const handleReviewDocument = async (donor) => {
    setError("");
    setDocumentLoadingId(donor.donor_id);

    let documentUrl = null;

    try {
        const session = getSession();

        const response = await api.get(
        `/donors/${donor.donor_id}/document`,
        {
            headers: {
            Authorization: `Bearer ${session.token}`,
            },
            responseType: "blob",
        }
        );

        const contentType = response.headers["content-type"];

        if (
        !contentType?.includes("pdf") &&
        !contentType?.startsWith("image/")
        ) {
        throw new Error("Unsupported document format.");
        }

        documentUrl = URL.createObjectURL(response.data);

        // Open document for staff review.
        const previewWindow = window.open(documentUrl, "_blank");

        if (!previewWindow) {
        throw new Error("Please allow pop-ups to view the document.");
        }

        setReviewedDonors((previous) => ({
        ...previous,
        [donor.donor_id]: true,
        }));

        // Give the browser time to load the document.
        setTimeout(() => {
        URL.revokeObjectURL(documentUrl);
        }, 60000);
    } catch (err) {
        if (documentUrl) URL.revokeObjectURL(documentUrl);

        setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to open supporting document."
        );
    } finally {
        setDocumentLoadingId(null);
    }
    };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const payload = {
        ...form,
        age: Number(form.age),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        email: form.email.trim() || null,
        gender: form.gender || null,
        last_donation_date: form.last_donation_date || null,
      };

      const result = await registerOrganizationDonor(payload);

      setSuccess(
        `Donor #${result.donor_id} registered successfully. Awaiting verification.`
      );
      setForm({ ...initialForm });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to register donor."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (donorId, decision) => {
    const confirmed = window.confirm(
      `Are you sure you want to mark donor #${donorId} as ${decision}?`
    );

    if (!confirmed) return;

    setBusyId(donorId);
    setError("");
    setSuccess("");

    try {
      await verifyDonor(donorId, decision);
      setSuccess(`Donor #${donorId} marked as ${decision}.`);
      await loadDonors();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to update donor verification."
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h3 className="fw-bold mb-2">Donor Management</h3>
      <p className="text-secondary mb-4">
        Register donors and review pending donor verifications.
      </p>

      <div className="d-flex gap-2 mb-4 flex-wrap">
        <button
          type="button"
          className={`btn ${
            tab === "register" ? "btn-danger" : "btn-outline-danger"
          }`}
          onClick={() => {
            setTab("register");
            setError("");
            setSuccess("");
          }}
        >
          Register Donor
        </button>

        <button
          type="button"
          className={`btn ${
            tab === "pending" ? "btn-danger" : "btn-outline-danger"
          }`}
          onClick={() => {
            setTab("pending");
            setError("");
            setSuccess("");
          }}
        >
          Pending Verification
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {success && (
        <div className="alert alert-success">{success}</div>
      )}

      {tab === "register" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h5 className="fw-semibold mb-4">
              Register New Donor
            </h5>

            <form onSubmit={handleRegister}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-control"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    className="form-control"
                    name="age"
                    min="18"
                    max="65"
                    value={form.age}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-select"
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label">Blood Group</label>
                  <select
                    className="form-select"
                    name="blood_group"
                    value={form.blood_group}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select blood group</option>
                    {bloodGroups.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-control"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Email (Optional)</label>
                  <input
                    className="form-control"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-control"
                    name="address"
                    rows="2"
                    value={form.address}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Latitude</label>
                  <input
                    className="form-control"
                    name="latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={form.latitude}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Longitude</label>
                  <input
                    className="form-control"
                    name="longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={form.longitude}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Last Donation Date (Optional)
                  </label>
                  <input
                    className="form-control"
                    name="last_donation_date"
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    value={form.last_donation_date}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-danger mt-4"
                disabled={submitting}
              >
                {submitting
                  ? "Registering..."
                  : "Register Donor"}
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === "pending" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {loading ? (
              <p className="p-4">Loading pending donors...</p>
            ) : donors.length === 0 ? (
              <p className="p-4 text-secondary mb-0">
                No pending donors found.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Donor ID</th>
                      <th>Name</th>
                      <th>Age</th>
                      <th>Blood Group</th>
                      <th>Phone</th>
                      <th>Source</th>
                      <th>Document</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {donors.map((donor) => (
                      <tr key={donor.donor_id}>
                        <td>#{donor.donor_id}</td>
                        <td>{donor.name}</td>
                        <td>{donor.age}</td>
                        <td>{donor.blood_group}</td>
                        <td>{donor.phone}</td>
                        <td>{donor.registration_source}</td>
                        <td>
                        {donor.supporting_document ? (
                            <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            disabled={documentLoadingId === donor.donor_id}
                            onClick={() => handleReviewDocument(donor)}
                            >
                            {documentLoadingId === donor.donor_id
                                ? "Opening..."
                                : "Review Document"}
                            </button>
                        ) : (
                            <span className="text-secondary small">
                            No document
                            </span>
                        )}
                        </td>

                        <td>
                        <div className="d-flex gap-2">


                        <button
                        type="button"
                        className="btn btn-success btn-sm"
                        disabled={
                            busyId !== null ||
                            (donor.registration_source === "Individual" &&
                            !reviewedDonors[donor.donor_id])
                        }
                        onClick={() =>
                            handleVerify(donor.donor_id, "Verified")
                        }
                        >
                        Verify
                        </button>

                        <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        disabled={
                            busyId !== null ||
                            (donor.registration_source === "Individual" &&
                            !reviewedDonors[donor.donor_id])
                        }
                        onClick={() =>
                            handleVerify(donor.donor_id, "Rejected")
                        }
                        >
                        Reject
                        </button>
                          </div>
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
    </div>
  );
}
