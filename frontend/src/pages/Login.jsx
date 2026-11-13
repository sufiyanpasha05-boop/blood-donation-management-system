
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  loginUser,
  logoutUser,
  getDashboardPath,
} from "../services/auth";

function Login() {
  const [role, setRole] = useState("hospital");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);


const handleSubmit = async (e) => {
  e.preventDefault();
  setMessage("");

  if (!login.trim() || !password) {
    setMessage("Please enter your email or phone and password.");
    return;
  }

  setLoading(true);

  try {
    const session = await loginUser(login, password);

    // Always use the role returned by Flask,
    // not the role selected in the frontend.
    if (session.role !== role) {
      setMessage(
        `This account belongs to the ${session.role} role. Please select the correct role.`
      );
      logoutUser();
      return;
    }

    navigate(getDashboardPath(session.role), {
      replace: true,
    });
  } catch (error) {
    setMessage(
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Login failed. Please try again."
    );
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container py-4">
        <div className="row justify-content-center align-items-center g-4">

          {/* LEFT SIDE */}
          <div className="col-lg-6 d-none d-lg-block">
            <div className="p-5">
              <Link
                to="/"
                className="text-decoration-none d-flex align-items-center gap-2 mb-5"
              >
                <img
                  src="/raktasahay-logo.png"
                  alt="RaktaSahay"
                  width="55"
                  height="55"
                  style={{ objectFit: "contain" }}
                />
                <h3 className="fw-bold mb-0" style={{ color: "#c8102e" }}>
                  RaktaSahay
                </h3>
              </Link>

              <h1 className="display-5 fw-bold mb-4">
                Connecting Care.
                <span className="d-block text-danger">
                  Saving Lives.
                </span>
              </h1>

              <p className="lead text-secondary">
                Access your secure dashboard to manage emergency
                blood requests, donor verification and donation camps.
              </p>

              <div className="mt-4">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <i className="bi bi-shield-check fs-3 text-success"></i>
                  <span>Role-based access for verified organizations</span>
                </div>

                <div className="d-flex align-items-center gap-3 mb-3">
                  <i className="bi bi-geo-alt fs-3 text-danger"></i>
                  <span>Location-based emergency donor matching</span>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <i className="bi bi-envelope-heart fs-3 text-success"></i>
                  <span>Emergency and donation camp notifications</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="col-md-8 col-lg-5">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <img
                    src="/raktasahay-logo.png"
                    alt="RaktaSahay"
                    width="65"
                    height="65"
                    style={{ objectFit: "contain" }}
                  />

                  <h3 className="fw-bold mt-3">Welcome Back</h3>
                  <p className="text-secondary small">
                    Sign in to your RaktaSahay account
                  </p>
                </div>

                <form onSubmit={handleSubmit}>
                  <label className="form-label fw-semibold">
                    Login As
                  </label>

                  <div className="row g-2 mb-3">
                    {[
                      { value: "hospital", label: "Hospital", icon: "bi-hospital" },
                      { value: "blood_bank", label: "Blood Bank", icon: "bi-droplet" },
                      { value: "admin", label: "Admin", icon: "bi-shield-lock" }
                    ].map((item) => (
                      <div className="col-4" key={item.value}>
                        <button
                          type="button"
                          className={`btn w-100 btn-sm py-2 ${
                            role === item.value
                              ? "btn-danger"
                              : "btn-outline-secondary"
                          }`}
                          onClick={() => setRole(item.value)}
                          aria-pressed={role === item.value}
                        >
                          <i className={`bi ${item.icon} d-block mb-1`}></i>
                          {item.label}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="login" className="form-label fw-semibold">
                      Email or Phone
                    </label>
                    <input
                      id="login"
                      type="text"
                      className="form-control py-2"
                      placeholder="Enter email or phone number"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="password" className="form-label fw-semibold">
                      Password
                    </label>

                    <div className="input-group">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className="form-control py-2"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />

                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        <i className={`bi ${
                          showPassword ? "bi-eye-slash" : "bi-eye"
                        }`}></i>
                      </button>
                    </div>
                  </div>

                  {message && (
                    <div className="alert alert-info small" role="status">
                      {message}
                    </div>
                  )}

                <button
                    type="submit"
                    className="btn btn-danger w-100 py-2 fw-semibold"
                    disabled={loading}
                    >
                {loading ? (
                <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                    Signing In...
                </>
                ) : (
                <>
                <i className="bi bi-box-arrow-in-right me-2"></i>
                    Sign In
                </>
                )}
                </button>
                </form>

                <div className="text-center mt-4">
                  <p className="text-secondary small mb-2">
                    Don't have an account?
                  </p>

                  <Link
                    to="/register"
                    className="text-danger fw-semibold text-decoration-none"
                  >
                    Register Your Organization
                  </Link>
                </div>

                <hr className="my-4" />

                <div className="text-center">
                  <Link
                    to="/"
                    className="text-secondary small text-decoration-none"
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Back to Homepage
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;
