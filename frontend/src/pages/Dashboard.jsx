
import { useNavigate } from "react-router-dom";
import {
  getSession,
  logoutUser,
} from "../services/auth";

function Dashboard({ title }) {
  const navigate = useNavigate();
  const session = getSession();

  const handleLogout = () => {
    logoutUser();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar bg-white shadow-sm px-4 py-3">
        <div className="d-flex align-items-center gap-2">
          <img
            src="/raktasahay-logo.png"
            alt="RaktaSahay"
            width="42"
          />
          <span className="fw-bold text-danger fs-5">
            RaktaSahay
          </span>
        </div>

        <button
          className="btn btn-outline-danger"
          onClick={handleLogout}
        >
          <i className="bi bi-box-arrow-right me-2"></i>
          Logout
        </button>
      </nav>

      <main className="container py-5">
        <h2 className="fw-bold">{title}</h2>

        <p className="text-secondary">
          Welcome to your RaktaSahay dashboard.
        </p>

        <div className="card border-0 shadow-sm rounded-4 mt-4">
          <div className="card-body p-4">
            <h5 className="fw-bold">
              <i className="bi bi-shield-check text-success me-2"></i>
              Authentication Successful
            </h5>

            <p className="mb-1">
              <strong>Role:</strong> {session?.role}
            </p>

            <p className="mb-0">
              Your session is active.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
