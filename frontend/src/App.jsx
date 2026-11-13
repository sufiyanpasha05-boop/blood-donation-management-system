
import { useState } from "react";
import "./index.css";
import BloodCompatibility from "./components/BloodCompatibility";
import AboutSection from "./components/AboutSection";
import DonationAwareness from "./components/DonationAwareness";
import HeroAnimation from "./components/HeroAnimation";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import HospitalDashboard from "./pages/HospitalDashboard";
import BloodBankDashboard from "./pages/BloodBankDashboard";
import DonorRegister from "./pages/DonorRegister";
import DonorResponse from "./pages/DonorResponse";

function Home() {
  const [message, setMessage] = useState("");

  return (
    <div className="min-vh-100">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg bg-white shadow-sm">
        <div className="container">
          <a className="navbar-brand d-flex align-items-center gap-2" href="/">
            <img
              src="/raktasahay-logo.png"
              alt="RaktaSahay"
              width="50"
              height="50"
              style={{ objectFit: "contain" }}
            />
            <span className="fw-bold fs-4 brand-name">
              RaktaSahay
            </span>
          </a>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNavbar"
            aria-controls="mainNavbar"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="mainNavbar">
            <div className="navbar-nav ms-auto align-items-lg-center gap-lg-3">
              <a className="nav-link active" href="/">Home</a>
              <a className="nav-link" href="#about">About</a>
              <a className="nav-link" href="#how-it-works">How It Works</a>
              <a className="nav-link" href="#compatibility">Blood Compatibility</a>
              <a className="btn btn-outline-danger" href="/login">Login</a>
              <a className="btn btn-danger" href="/register">Register</a>
              <a className="nav-link" href="#faq">FAQs</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section py-5">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-7">
              <span className="badge text-bg-light border mb-3">
                Blood Donation & Emergency Support
              </span>

              <h1 className="display-4 fw-bold mb-4">
                Every Drop Counts.
                <span className="d-block text-danger">
                  Every Life Matters.
                </span>
              </h1>

              <p className="lead text-secondary mb-4">
                RaktaSahay connects verified blood donors with
                hospitals during emergencies and helps blood banks
                organize donation camps.
              </p>

              <a href="/donor/register" className="btn btn-danger btn-lg me-3 mb-2">
                Become a Donor
              </a>

              <a href="#about" className="btn btn-outline-secondary btn-lg mb-2">
                Learn More
              </a>

              {message && (
                <div className="alert alert-success mt-3" role="status">
                  {message}
                </div>
              )}
            </div>

            <div className="col-lg-5 text-center">
              <HeroAnimation />
            </div>
          </div>
        </div>
      </section>

      <AboutSection />
      <BloodCompatibility />
      <DonationAwareness />
      <footer className="text-center py-4 border-top bg-white">
        <p className="text-secondary mb-0">
          © 2026 RaktaSahay | Blood Donation Matching Platform
        </p>
      </footer>
    </div>
  );
}


function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/donor/respond/:token"
        element={
          <h1 style={{ color: "red", padding: "50px" }}>
            DONOR ROUTE WORKING
          </h1>
        }
      />

      {/* Admin Dashboard */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />
      </Route>
      <Route path="/donor/register" element={<DonorRegister />} />

      {/* Hospital Dashboard */}
      <Route element={<ProtectedRoute allowedRoles={["hospital"]} />}>
        <Route
          path="/hospital/dashboard"
          element={<HospitalDashboard />}
        />
      </Route>

      {/* Blood Bank Dashboard */}
      <Route element={<ProtectedRoute allowedRoles={["blood_bank"]} />}>
        <Route
          path="/blood-bank/dashboard"
          element={<BloodBankDashboard />}
        />
      </Route>

      {/* Unauthorized Access */}
      <Route
        path="/unauthorized"
        element={
          <div className="container py-5 text-center">
            <h2>Access Denied</h2>
            <p>You do not have permission to access this page.</p>
            <a href="/login" className="btn btn-danger">
              Back to Login
            </a>
          </div>
        }
      />
    </Routes>



  );
}

export default App;