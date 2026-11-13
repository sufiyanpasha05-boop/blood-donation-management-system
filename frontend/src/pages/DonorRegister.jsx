import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const initial = { name: "", age: "", gender: "", blood_group: "", phone: "", email: "", address: "", latitude: "", longitude: "", last_donation_date: "" };
const groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function DonorRegister() {
  const [form, setForm] = useState(initial);
  const [document, setDocument] = useState(null);
  const [locationMode, setLocationMode] = useState("current");
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const change = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  const locate = () => {
    setError("");
    if (!navigator.geolocation) return setError("Geolocation is not supported. Enter coordinates manually.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((prev) => ({ ...prev, latitude: String(coords.latitude), longitude: String(coords.longitude) }));
        setLocating(false);
      },
      () => { setError("Unable to detect location. Allow permission or enter coordinates manually."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    setError(""); setSuccess("");
    const lat = Number(form.latitude), lon = Number(form.longitude);
    if (!form.latitude.trim() || !form.longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return setError("Please provide valid location coordinates.");
    }
    if (Number(form.age) < 18 || Number(form.age) > 65) return setError("Age must be between 18 and 65.");
    if (!document) return setError("Please upload a supporting document.");
    const extension = document.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "jpg", "jpeg", "png"].includes(extension)) return setError("Only PDF, JPG and PNG documents are accepted.");
    if (form.last_donation_date && form.last_donation_date > new Date().toLocaleDateString("en-CA")) return setError("Last donation date cannot be in the future.");
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    payload.append("document", document);
    setLoading(true);
    try {
      // Use native fetch so the browser sets the multipart boundary automatically.
      // The API client supplies the configured base URL, but not its JSON headers.
      const baseURL = api.defaults.baseURL.replace(/\/$/, "");
      const response = await fetch(`${baseURL}/donors/register`, {
        method: "POST",
        body: payload,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Registration failed");
      setSuccess(`${result.message || "Registration submitted"}. Your application is pending verification.`);
      setForm(initial); setDocument(null);
      event.target.reset();
    } catch (err) {
      setError(err.message || "Unable to submit registration. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-vh-100 py-5" style={{ background: "#f5f7fa" }}>
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-4 p-md-5">
            <div className="text-center mb-4">
              <Link to="/"><img src="/raktasahay-logo.png" alt="RaktaSahay" width="68" /></Link>
              <h2 className="fw-bold mt-2" style={{ color: "#c8102e" }}>Become a Blood Donor</h2>
              <p className="text-secondary">Register without an account. Your information will be reviewed before activation.</p>
            </div>
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {success && <div className="alert alert-success" role="status">{success}</div>}
            <form onSubmit={submit}>
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label fw-semibold">Full Name *</label><input className="form-control" name="name" value={form.name} onChange={change} required /></div>
                <div className="col-md-3"><label className="form-label fw-semibold">Age *</label><input type="number" min="18" max="65" className="form-control" name="age" value={form.age} onChange={change} required /></div>
                <div className="col-md-3"><label className="form-label fw-semibold">Gender</label><select className="form-select" name="gender" value={form.gender} onChange={change}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div>
                <div className="col-md-6"><label className="form-label fw-semibold">Blood Group *</label><select className="form-select" name="blood_group" value={form.blood_group} onChange={change} required><option value="">Select blood group</option>{groups.map((group) => <option key={group} value={group}>{group}</option>)}</select></div>
                <div className="col-md-6"><label className="form-label fw-semibold">Phone *</label><input type="tel" className="form-control" name="phone" value={form.phone} onChange={change} required /></div>
                <div className="col-md-6"><label className="form-label fw-semibold">Email (optional)</label><input type="email" className="form-control" name="email" value={form.email} onChange={change} /></div>
                <div className="col-md-6"><label className="form-label fw-semibold">Last Donation Date (optional)</label><input type="date" className="form-control" name="last_donation_date" value={form.last_donation_date} max={new Date().toLocaleDateString("en-CA")} onChange={change} /></div>
                <div className="col-12"><label className="form-label fw-semibold">Residential Address *</label><textarea className="form-control" name="address" rows="2" value={form.address} onChange={change} required /></div>
                <div className="col-12">
                  <label className="form-label fw-semibold d-block">Your Location *</label>
                  <div className="d-flex gap-4 mb-3">
                    <label><input type="radio" checked={locationMode === "current"} onChange={() => setLocationMode("current")} /> Current location</label>
                    <label><input type="radio" checked={locationMode === "manual"} onChange={() => setLocationMode("manual")} /> Enter manually</label>
                  </div>
                  {locationMode === "current" && <button type="button" className="btn btn-outline-primary mb-3" onClick={locate} disabled={locating}>{locating ? "Detecting location..." : "Use My Current Location"}</button>}
                  <div className="row g-3">
                    <div className="col-md-6"><label className="form-label">Latitude</label><input type="number" step="any" min="-90" max="90" className="form-control" name="latitude" value={form.latitude} onChange={change} readOnly={locationMode === "current"} required /></div>
                                        <div className="col-md-6"><label className="form-label">Longitude</label><input type="number" step="any" min="-180" max="180" className="form-control" name="longitude" value={form.longitude} onChange={change} readOnly={locationMode === "current"} required /></div>
                  </div>
                  <small className="text-secondary">Your location is used to find nearby donation opportunities. You can enter coordinates from a map.</small>
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">Supporting Document * (PDF, JPG or PNG)</label>
                  <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDocument(e.target.files?.[0] || null)} required />
                  <small className="text-secondary">Upload a blood group certificate or relevant test report. Avoid uploading unrelated personal records.</small>
                </div>
              </div>
              <p className="text-secondary small mt-3 mb-0">By submitting, you consent to your information being used for donor verification and blood donation coordination. Registration does not establish medical eligibility to donate.</p>
              <button type="submit" className="btn btn-danger w-100 py-3 mt-3 fw-semibold" disabled={loading || locating}>{loading ? "Submitting..." : "Submit Donor Registration"}</button>
            </form>
            <p className="text-center mt-4 mb-0"><Link to="/">Back to Home</Link> · <Link to="/register">Hospital / Blood Bank Registration</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
