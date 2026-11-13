
import { useState } from "react";

const compatibility = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"]
};

const bloodGroups = Object.keys(compatibility);
const RADIUS = 5;

// Fictional data for the educational simulator
const donors = [
  { id: 1, name: "Donor A", blood: "O+", distance: 1.2, angle: 210, eligible: true },
  { id: 2, name: "Donor B", blood: "A+", distance: 2.8, angle: 320, eligible: true },
  { id: 3, name: "Donor C", blood: "O-", distance: 4.3, angle: 65, eligible: true },
  { id: 4, name: "Donor D", blood: "B+", distance: 6.4, angle: 145, eligible: true },
  { id: 5, name: "Donor E", blood: "O+", distance: 3.1, angle: 120, eligible: false }
];

function BloodCompatibility() {
  const [selectedGroup, setSelectedGroup] = useState("O+");
  const [mode, setMode] = useState("donate");
  const [neededGroup, setNeededGroup] = useState("O+");

  const compatibleGroups =
    mode === "donate"
      ? compatibility[selectedGroup]
      : bloodGroups.filter((group) =>
          compatibility[group].includes(selectedGroup)
        );

  const isMatch = (donor) =>
    donor.distance <= RADIUS &&
    donor.eligible &&
    compatibility[donor.blood].includes(neededGroup);

  const matches = donors.filter(isMatch);

  return (
    <section id="compatibility" className="container py-3">
      <style>{`
        .sim-card {
          background: #fff;
          border: 1px solid #e9edf0;
          border-radius: 18px;
          box-shadow: 0 5px 20px rgba(0,0,0,.04);
          height: 100%;
          padding: 18px;
        }

        .sim-heading {
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .sim-description {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 12px;
        }

        .blood-btn {
          width: 100%;
          padding: 8px 2px;
          border: 1px solid #dce2e7;
          background: #fff;
          border-radius: 9px;
          color: #526070;
          font-weight: 700;
          font-size: 13px;
          transition: .2s;
        }

        .blood-btn:hover {
          border-color: #dc3545;
          color: #dc3545;
        }

        .blood-btn.selected {
          background: #dc3545;
          border-color: #dc3545;
          color: #fff;
        }

        .blood-display {
          width: 58px;
          height: 58px;
          background: linear-gradient(135deg,#ef4054,#c8102e);
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 20px;
          margin: 12px auto 5px;
          box-shadow: 0 5px 15px rgba(200,16,46,.17);
        }

        .result-chip {
          background: #fff0f2;
          color: #c8102e;
          border: 1px solid #f7cdd3;
          border-radius: 25px;
          padding: 5px 10px;
          font-size: 12px;
          font-weight: 700;
        }

        .sim-result-box {
          background: #f7f8fa;
          border-radius: 12px;
          padding: 10px;
          margin-top: 14px;
        }

        .radar-box {
          background: linear-gradient(135deg,#e3f7f3,#eaf4fa);
          border: 1px solid #d4e9e7;
          border-radius: 16px;
          padding: 10px 12px;
          overflow: hidden;
        }

        .radar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #428b8b;
          font-size: 11px;
          font-weight: 700;
        }

        .demo-label {
          background: white;
          color: #008f8b;
          border-radius: 20px;
          padding: 5px 9px;
          font-size: 10px;
        }

        .rakta-radar-area {
          width: min(100%, 190px);
          aspect-ratio: 1;
          margin: 3px auto;
          position: relative;
          border-radius: 50%;
          overflow: hidden;
        }

        .radar-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%,-50%);
          border: 1px dashed rgba(0,143,139,.4);
          border-radius: 50%;
        }

        .ring-1 { width: 33%; height: 33%; }
        .ring-2 { width: 65%; height: 65%; }
        .ring-3 { width: 94%; height: 94%; }

        .radar-line-h,
        .radar-line-v {
          position: absolute;
          background: rgba(0,143,139,.25);
        }

        .radar-line-h {
          top: 50%;
          width: 100%;
          height: 1px;
        }

        .radar-line-v {
          left: 50%;
          width: 1px;
          height: 100%;
        }

        .radar-sweep {
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 50%;
          transform-origin: bottom right;
          background: linear-gradient(
            45deg,
            rgba(0,143,139,.18),
            transparent 75%
          );
          border-radius: 100% 0 0 0;
          animation: radar-spin 7s linear infinite;
        }

        @keyframes radar-spin {
          to { transform: rotate(360deg); }
        }

        .hospital-marker {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%,-50%);
          width: 48px;
          height: 48px;
          background: white;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 12px rgba(0,0,0,.08);
          z-index: 3;
        }

        .hospital-marker i {
          font-size: 19px;
          color: #dc3545;
          line-height: 1;
        }

        .hospital-marker small {
          font-size: 9px;
          font-weight: 700;
        }

        .donor-marker {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
          background: #a8bcc2;
          transform: translate(-50%,-50%);
          z-index: 2;
          transition: background .3s;
          box-shadow: 0 2px 5px rgba(0,0,0,.12);
        }

        .donor-marker.active {
          background: #dc3545;
          box-shadow: 0 0 0 4px rgba(220,53,69,.13);
        }

        .radar-legend {
          display: flex;
          justify-content: center;
          gap: 15px;
          flex-wrap: wrap;
          color: #428b8b;
          font-size: 10px;
          font-weight: 600;
          margin-top: 4px;
        }

        .legend-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 5px;
        }

        .match-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }

        .match-chip {
          background: white;
          border: 1px solid #e2e7ea;
          border-radius: 20px;
          padding: 5px 9px;
          font-size: 11px;
          color: #526070;
        }

        @media (max-width: 576px) {
          .sim-card { padding: 14px; }
          .rakta-radar-area { width: min(100%, 180px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .radar-sweep { animation: none; }
        }
      `}</style>

      {/* SECTION HEADING */}
      <div className="text-center mb-3">
        <span className="text-danger fw-bold small">
          SMART DONOR MATCHING
        </span>

        <h2 className="fw-bold mt-1 mb-1">
          Explore How RaktaSahay Matches Donors
        </h2>

        <p className="text-secondary small mb-0">
          Interactive blood compatibility and location-based matching.
        </p>
      </div>

      <div className="row g-3 align-items-stretch">

        {/* LEFT SIMULATOR */}
        <div className="col-lg-6">
          <div className="sim-card">
            <h4 className="sim-heading">
              <i className="bi bi-droplet-fill text-danger me-2"></i>
              Blood Compatibility
            </h4>

            <p className="sim-description">
              Explore compatible red blood cell donation groups.
            </p>

            <div className="d-flex gap-2 mb-2">
              <button
                className={`btn btn-sm flex-fill ${
                  mode === "donate" ? "btn-danger" : "btn-outline-danger"
                }`}
                onClick={() => setMode("donate")}
              >
                Donate To
              </button>

              <button
                className={`btn btn-sm flex-fill ${
                  mode === "receive" ? "btn-danger" : "btn-outline-danger"
                }`}
                onClick={() => setMode("receive")}
              >
                Receive From
              </button>
            </div>

            <div className="row g-2">
              {bloodGroups.map((group) => (
                <div className="col-3" key={group}>
                  <button
                    className={`blood-btn ${
                      selectedGroup === group ? "selected" : ""
                    }`}
                    onClick={() => setSelectedGroup(group)}
                    aria-pressed={selectedGroup === group}
                  >
                    {group}
                  </button>
                </div>
              ))}
            </div>

            <div className="text-center mt-2">
              <div className="blood-display">
                {selectedGroup}
              </div>

              <i className="bi bi-arrow-down-circle-fill text-danger fs-5 d-block my-1"></i>

              <p className="fw-semibold small mb-2">
                {mode === "donate"
                  ? "Can donate to"
                  : "Can receive from"}
              </p>

              <div className="d-flex flex-wrap justify-content-center gap-2">
                {compatibleGroups.map((group) => (
                  <span className="result-chip" key={group}>
                    {group}
                  </span>
                ))}
              </div>
            </div>

            <div className="sim-result-box text-center">
              <strong className="small">
                {compatibleGroups.length} compatible blood groups
              </strong>
              <p className="text-secondary mb-0" style={{ fontSize: 11 }}>
                General ABO/Rh red cell compatibility
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIMULATOR */}
        <div className="col-lg-6">
          <div className="sim-card">
            <h4 className="sim-heading">
              <i
                className="bi bi-geo-alt-fill me-2"
                style={{ color: "#008f8b" }}
              ></i>
              Location-Based Matching
            </h4>

            <p className="sim-description">
              Find eligible compatible donors near a hospital.
            </p>

            <div className="d-flex justify-content-between align-items-center mb-2 gap-3">
              <div className="flex-grow-1">
                <label className="form-label small fw-semibold mb-1">
                  Required Blood Group
                </label>
                <select
                  className="form-select form-select-sm"
                  value={neededGroup}
                  onChange={(e) => setNeededGroup(e.target.value)}
                >
                  {bloodGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>

              <span
                className="badge rounded-pill"
                style={{
                  background: "#e3f7f3",
                  color: "#008f8b",
                  whiteSpace: "nowrap"
                }}
              >
                <i className="bi bi-geo-alt me-1"></i>
                Fixed 5 km
              </span>
            </div>

            {/* RADAR */}
            <div className="radar-box">
              <div className="radar-header">
                <span className="demo-label">● DEMO MODE</span>
                <span>5 km radius</span>
              </div>

              <div className="rakta-radar-area">
                <div className="radar-ring ring-1"></div>
                <div className="radar-ring ring-2"></div>
                <div className="radar-ring ring-3"></div>

                <div className="radar-line-h"></div>
                <div className="radar-line-v"></div>
                <div className="radar-sweep"></div>

                <div className="hospital-marker">
                  <i className="bi bi-plus-lg"></i>
                  <small>Hospital</small>
                </div>

                {donors.map((donor) => {
                  const angle = donor.angle * Math.PI / 180;

                  // Position based on distance from hospital.
                  // 5 km corresponds to the outer radar ring.
                  const distanceRatio = donor.distance / RADIUS;
                  const x = 50 + Math.cos(angle) * distanceRatio * 47;
                  const y = 50 + Math.sin(angle) * distanceRatio * 47;

                  // Keep markers inside the radar visualization.
                  const markerX = Math.max(3, Math.min(97, x));
                  const markerY = Math.max(3, Math.min(97, y));

                  return (
                    <div
                      key={donor.id}
                      className={`donor-marker ${
                        isMatch(donor) ? "active" : ""
                      }`}
                      style={{
                        left: `${markerX}%`,
                        top: `${markerY}%`
                      }}
                      title={`${donor.name}: ${donor.blood}, ${donor.distance} km`}
                    />
                  );
                })}
              </div>

              <div className="radar-legend">
                <span>
                  <i
                    className="legend-dot"
                    style={{ background: "#dc3545" }}
                  ></i>
                  Compatible & nearby
                </span>
                <span>
                  <i
                    className="legend-dot"
                    style={{ background: "#a8bcc2" }}
                  ></i>
                  Not selected
                </span>
              </div>
            </div>

            {/* MATCH RESULTS */}
            <div className="sim-result-box">
              <div className="d-flex justify-content-between align-items-center">
                <strong className="small">Eligible Donor Matches</strong>
                <span className="badge bg-success">
                  {matches.length} found
                </span>
              </div>

              <div className="match-list">
                {matches.length > 0 ? (
                  matches.map((donor) => (
                    <span className="match-chip" key={donor.id}>
                      <i className="bi bi-person-check-fill text-success me-1"></i>
                      {donor.name} ({donor.blood}) · {donor.distance} km
                    </span>
                  ))
                ) : (
                  <span className="text-secondary small">
                    No eligible compatible donors found.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-secondary mt-3 mb-0"
         style={{ fontSize: 11 }}>
        <i className="bi bi-info-circle me-1"></i>
        Educational simulation using fictional donors. Actual emergency
        matching uses verified donors, eligibility, blood compatibility,
        and a fixed 5 km radius. Clinical testing is required before transfusion.
      </p>
    </section>
  );
}

export default BloodCompatibility;
