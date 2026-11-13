
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const initialForm = {
  role: "hospital",
  full_name: "",
  registration_no: "",
  email: "",
  phone: "",
  address: "",
  latitude: "",
  longitude: "",
  password: "",
  confirmPassword: "",
};

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [locationMethod, setLocationMethod] = useState("current");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Update form fields
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "latitude" || name === "longitude") {
      setLocationCaptured(false);
    }
  };

  // Switch location entry method
  const changeLocationMethod = (method) => {
    setLocationMethod(method);
    setLocationCaptured(false);
    setError("");

    setForm((prev) => ({
      ...prev,
      latitude: "",
      longitude: "",
    }));
  };

  // Automatically detect current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Your browser does not support location detection.");
      return;
    }

    setError("");
    setLocationCaptured(false);
    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));

        setLocationCaptured(true);
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);

        if (err.code === 1) {
          setError(
            "Location permission denied. Please allow location access or choose Enter Manually."
          );
        } else if (err.code === 2) {
          setError(
            "Location unavailable. Please try again or enter coordinates manually."
          );
        } else {
          setError(
            "Location detection timed out. Please try again."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Submit registration
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 12) {
      setError("Password must contain at least 12 characters.");
      return;
    }

    if (
      form.latitude.trim() === "" ||
      form.longitude.trim() === ""
    ) {
      setError(
        "Please select your current location or enter coordinates manually."
      );
      return;
    }

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError("Please provide valid latitude and longitude.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        role: form.role,
        full_name: form.full_name.trim(),
        registration_no: form.registration_no.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        latitude,
        longitude,
        password: form.password,
      };

      const response = await api.post("/auth/register", payload);

      setSuccess(
        response.data.message ||
          "Registration submitted successfully. Awaiting admin verification."
      );

      setForm({
        ...initialForm,
        role: form.role,
      });

      setLocationCaptured(false);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100 py-5"
      style={{ backgroundColor: "#f5f7fa" }}
    >
      <div className="container" style={{ maxWidth: "780px" }}>
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-4 p-md-5">

            {/* Header */}
            <div className="text-center mb-4">
              <img
                src="/raktasahay-logo.png"
                alt="RaktaSahay"
                width="65"
                className="mb-2"
              />

              <h3
                className="fw-bold mb-1"
                style={{ color: "#c8102e" }}
              >
                RaktaSahay
              </h3>

              <p className="text-secondary">
                Hospital & Blood Bank Registration
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="bi bi-exclamation-circle me-2"></i>
                {error}
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="alert alert-success" role="status">
                <i className="bi bi-check-circle me-2"></i>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* Organization type */}
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Organization Type
                </label>

                <select
                  className="form-select"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  required
                >
                  <option value="hospital">Hospital</option>
                  <option value="blood_bank">Blood Bank</option>
                </select>
              </div>

              <div className="row g-3">

                {/* Organization name */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Organization Name
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    name="full_name"
                    placeholder="Enter organization name"
                    value={form.full_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Registration number */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Registration Number
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    name="registration_no"
                    placeholder="Enter registration number"
                    value={form.registration_no}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Email */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Email Address
                  </label>

                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    placeholder="organization@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Phone */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    className="form-control"
                    name="phone"
                    placeholder="Enter phone number"
                    value={form.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Address */}
                <div className="col-12">
                  <label className="form-label fw-semibold">
                    Organization Address
                  </label>

                  <textarea
                    className="form-control"
                    name="address"
                    rows={3}
                    placeholder="Enter full hospital or blood bank address"
                    value={form.address}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Location selection */}
                <div className="col-12">
                  <label className="form-label fw-semibold">
                    Organization Location
                  </label>

                  <div className="d-flex flex-wrap gap-4 mb-3">
                    <label className="form-check">
                      <input
                        type="radio"
                        className="form-check-input"
                        name="locationMethod"
                        checked={locationMethod === "current"}
                        onChange={() =>
                          changeLocationMethod("current")
                        }
                      />
                      <span className="form-check-label">
                        Current Location
                      </span>
                    </label>

                    <label className="form-check">
                      <input
                        type="radio"
                        className="form-check-input"
                        name="locationMethod"
                        checked={locationMethod === "manual"}
                        onChange={() =>
                          changeLocationMethod("manual")
                        }
                      />
                      <span className="form-check-label">
                        Enter Manually
                      </span>
                    </label>
                  </div>

                  {locationMethod === "current" ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline-primary w-100 py-2"
                        onClick={getCurrentLocation}
                        disabled={locationLoading}
                      >
                        <i className="bi bi-geo-alt me-2"></i>

                        {locationLoading
                          ? "Detecting Location..."
                          : "Use My Current Location"}
                      </button>

                      {locationCaptured && (
                        <div
                          className="alert alert-success mt-3 mb-0"
                          role="status"
                        >
                          <i className="bi bi-check-circle me-2"></i>
                          Location captured successfully.
                        </div>
                      )}

                      <small className="text-secondary d-block mt-2">
                        Use this option when physically present
                        at your hospital or blood bank.
                      </small>
                    </>
                  ) : (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Latitude
                        </label>

                        <input
                          type="number"
                          step="any"
                          min="-90"
                          max="90"
                          className="form-control"
                          name="latitude"
                          placeholder="Example: 12.9716"
                          value={form.latitude}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Longitude
                        </label>

                        <input
                          type="number"
                          step="any"
                          min="-180"
                          max="180"
                          className="form-control"
                          name="longitude"
                          placeholder="Example: 77.5946"
                          value={form.longitude}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="col-12">
                        <small className="text-secondary">
                          Find your organization's coordinates
                          using Google Maps. Right-click the
                          location on the map to copy its
                          latitude and longitude.
                        </small>
                      </div>
                    </div>
                  )}
                </div>

                {/* Password */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Password
                  </label>

                  <input
                    type="password"
                    className="form-control"
                    name="password"
                    placeholder="Create password"
                    minLength={12}
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    required
                  />

                  <small className="text-secondary">
                    Minimum 12 characters
                  </small>
                </div>

                {/* Confirm password */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Confirm Password
                  </label>

                  <input
                    type="password"
                    className="form-control"
                    name="confirmPassword"
                    placeholder="Confirm password"
                    minLength={12}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn w-100 mt-4 py-3 text-white fw-semibold"
                style={{ backgroundColor: "#c8102e" }}
                disabled={loading || locationLoading}
              >
                {loading ? (
                  "Submitting Registration..."
                ) : (
                  <>
                    <i className="bi bi-person-plus me-2"></i>
                    Submit Registration
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-secondary mt-4 mb-0">
              Already registered?{" "}
              <Link to="/login">Login here</Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
