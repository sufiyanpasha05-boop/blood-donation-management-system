import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, logoutUser } from "../services/auth";


const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5002";

const BASE_URL = `${API_URL}/api/camps`;
const DONOR_URL = `${API_URL}/api/donors`;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const EMPTY_CAMP = {
  camp_name: "", description: "", camp_date: "", start_time: "",
  end_time: "", venue: "", latitude: "", longitude: ""
};
const EMPTY_WALK_IN = { donor_name: "", phone: "", blood_group: "" };

function BloodBankDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");
  const [camps, setCamps] = useState([]);
  const [loadingCamps, setLoadingCamps] = useState(false);
  const [campError, setCampError] = useState("");
  const [campSuccess, setCampSuccess] = useState("");
  const [showCampForm, setShowCampForm] = useState(false);
  const [creatingCamp, setCreatingCamp] = useState(false);
  const [campForm, setCampForm] = useState({ ...EMPTY_CAMP });
  const [campRefresh, setCampRefresh] = useState(0);

  const [selectedCamp, setSelectedCamp] = useState(null);
  const [activeCampPanel, setActiveCampPanel] = useState(null); // "details" or "participants"
  const [campDetails, setCampDetails] = useState(null);
  const [campInterest, setCampInterest] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantsError, setParticipantsError] = useState("");
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInForm, setWalkInForm] = useState({ ...EMPTY_WALK_IN });
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [walkInError, setWalkInError] = useState("");
  const [walkInSuccess, setWalkInSuccess] = useState("");
  const [showRegisteredCheckIn, setShowRegisteredCheckIn] = useState(false);
  const [checkInSearch, setCheckInSearch] = useState("");
  const [checkInDonors, setCheckInDonors] = useState([]);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInSavingId, setCheckInSavingId] = useState(null);
  const [checkInError, setCheckInError] = useState("");
  const [checkInSuccess, setCheckInSuccess] = useState("");
  const [participantActionId, setParticipantActionId] = useState(null);
  const [participantActionError, setParticipantActionError] = useState("");
  const [participantActionSuccess, setParticipantActionSuccess] = useState("");
  const [reportCamps, setReportCamps] = useState([]);
  const [reportCampId, setReportCampId] = useState("");
  const [campReport, setCampReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportCampsLoading, setReportCampsLoading] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const [overviewRefresh, setOverviewRefresh] = useState(0);

  const [managedDonors, setManagedDonors] = useState([]);
  const [donorsLoading, setDonorsLoading] = useState(false);
  const [donorsError, setDonorsError] = useState("");
  const [donorsSuccess, setDonorsSuccess] = useState("");
  const [donorSearch, setDonorSearch] = useState("");
  const [donorGroup, setDonorGroup] = useState("");
  const [donorStatus, setDonorStatus] = useState("");
  const [donorActionId, setDonorActionId] = useState(null);
  const [documentLoadingId, setDocumentLoadingId] = useState(null);
  const [donorRefresh, setDonorRefresh] = useState(0);

  const sections = [
    { id: "overview", label: "Overview" },
    { id: "donors", label: "Donor Management" },
    { id: "camps", label: "Donation Camps" },
    { id: "reports", label: "Camp Reports" }
  ];

  const authHeaders = () => {
    const token = getSession()?.token;
    if (!token) throw new Error("Session expired. Please log in again.");
    return { Authorization: `Bearer ${token}` };
  };

  const requestJSON = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
  };

  useEffect(() => {
    if (activeSection !== "camps") return;
    const controller = new AbortController();
    const loadCamps = async () => {
      setLoadingCamps(true);
      setCampError("");
      try {
        const data = await requestJSON(`${BASE_URL}/my-camps`, {
          signal: controller.signal
        });
        if (!controller.signal.aborted) setCamps(data.camps || []);
      } catch (error) {
        if (!controller.signal.aborted) setCampError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoadingCamps(false);
      }
    };
    loadCamps();
    return () => controller.abort();
  }, [activeSection, campRefresh]);

  useEffect(() => {
    if (activeSection !== "reports") return;
    const controller = new AbortController();
    const loadReportCamps = async () => {
      setReportCampsLoading(true);
      setReportError("");
      try {
        const data = await requestJSON(`${BASE_URL}/my-camps`, { signal: controller.signal });
        if (!controller.signal.aborted) setReportCamps(data.camps || []);
      } catch (error) {
        if (!controller.signal.aborted) setReportError(error.message);
      } finally {
        if (!controller.signal.aborted) setReportCampsLoading(false);
      }
    };
    loadReportCamps();
    return () => controller.abort();
  }, [activeSection, campRefresh]);

  useEffect(() => {
    if (activeSection !== "overview") return;
    const controller = new AbortController();
    const loadOverview = async () => {
      setOverviewLoading(true);
      setOverviewError("");
      try {
        const data = await requestJSON(`${BASE_URL}/my-camps`, { signal: controller.signal });
        const allCamps = data.camps || [];
        const summaries = await Promise.all(
          allCamps.map((camp) =>
            requestJSON(`${BASE_URL}/${camp.camp_id}/summary`, { signal: controller.signal })
          )
        );
        if (controller.signal.aborted) return;
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const totals = summaries.reduce((result, summary) => {
          result.participants += Number(summary.participation?.total_participants || 0);
          result.donations += Number(summary.participation?.successful_donations || 0);
          result.units += Number(summary.collections?.total_units_collected || 0);
          return result;
        }, { participants: 0, donations: 0, units: 0 });
        const upcoming = allCamps.filter(
          (camp) => camp.status === "Scheduled" && camp.camp_date >= today
        );
        setOverviewData({
          ...totals,
          upcomingCount: upcoming.length,
          recentCamps: [...allCamps]
            .sort((a, b) => b.camp_date.localeCompare(a.camp_date))
            .slice(0, 5)
        });
      } catch (error) {
        if (!controller.signal.aborted) setOverviewError(error.message);
      } finally {
        if (!controller.signal.aborted) setOverviewLoading(false);
      }
    };
    loadOverview();
    return () => controller.abort();
  }, [activeSection, campRefresh, overviewRefresh]);

  const loadCampReport = async (campId) => {
    if (!campId) return;
    setReportLoading(true);
    setReportError("");
    setCampReport(null);
    try {
      const data = await requestJSON(`${BASE_URL}/${campId}/summary`);
      setCampReport(data);
    } catch (error) {
      setReportError(error.message);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection !== "donors") return;
    const controller = new AbortController();
    const load = async () => {
      setDonorsLoading(true);
      setDonorsError("");
      try {
        const data = await requestJSON(`${DONOR_URL}/manage`, { signal: controller.signal });
        if (!controller.signal.aborted) setManagedDonors(data.donors || []);
      } catch (error) {
        if (!controller.signal.aborted) setDonorsError(error.message);
      } finally {
        if (!controller.signal.aborted) setDonorsLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [activeSection, donorRefresh]);

  const handleVerifyDonor = async (donor, decision) => {
    if (!window.confirm(`${decision === "Verified" ? "Verify" : "Reject"} donor ${donor.name}?`)) return;
    setDonorActionId(donor.donor_id);
    setDonorsError("");
    setDonorsSuccess("");
    try {
      await requestJSON(`${DONOR_URL}/verify/${donor.donor_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision })
      });
      setDonorsSuccess(`${donor.name} ${decision.toLowerCase()} successfully.`);
      setDonorRefresh((value) => value + 1);
    } catch (error) {
      setDonorsError(error.message);
    } finally {
      setDonorActionId(null);
    }
  };

  const handleViewDonorDocument = async (donor) => {
    setDocumentLoadingId(donor.donor_id);
    setDonorsError("");
    try {
      const response = await fetch(`${DONOR_URL}/${donor.donor_id}/document`, {
        headers: authHeaders()
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to open document");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const viewer = window.open(url, "_blank");
      if (!viewer) {
        URL.revokeObjectURL(url);
        throw new Error("Allow pop-ups for this site to view donor documents.");
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      setDonorsError(error.message);
    } finally {
      setDocumentLoadingId(null);
    }
  };

  const visibleDonors = managedDonors.filter((donor) => {
    const term = donorSearch.trim().toLowerCase();
    return (!term || [donor.name, donor.phone, donor.email].some((value) =>
      String(value || "").toLowerCase().includes(term))) &&
      (!donorGroup || donor.blood_group === donorGroup) &&
      (!donorStatus || donor.verification_status === donorStatus);
  });

  const handleLogout = () => {
    logoutUser();
    navigate("/login", { replace: true });
  };

  const handleCreateCamp = async (event) => {
    event.preventDefault();
    setCreatingCamp(true);
    setCampError("");
    setCampSuccess("");
    try {
      const data = await requestJSON(`${BASE_URL}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...campForm,
          latitude: Number(campForm.latitude),
          longitude: Number(campForm.longitude)
        })
      });
      setCampSuccess(`Camp created successfully! ${data.notified_donors ?? 0} donors notified. Emails sent: ${data.emails_sent ?? 0}.`);
      setCampForm({ ...EMPTY_CAMP });
      setShowCampForm(false);
      setCampRefresh((value) => value + 1);
    } catch (error) {
      setCampError(error.message);
    } finally {
      setCreatingCamp(false);
    }
  };

  const handleViewCamp = async (camp) => {
    setSelectedCamp(camp);
    setActiveCampPanel("details");
    setShowWalkInForm(false);
    setCampDetails(null);
    setCampInterest(null);
    setDetailsError("");
    setLoadingDetails(true);
    try {
      const [details, interest] = await Promise.all([
        requestJSON(`${BASE_URL}/${camp.camp_id}`),
        requestJSON(`${BASE_URL}/${camp.camp_id}/interest`)
      ]);
      setCampDetails(details.camp ?? details);
      setCampInterest(interest.interest ?? interest);
    } catch (error) {
      setDetailsError(error.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadParticipants = async (camp) => {
    setLoadingParticipants(true);
    setParticipantsError("");
    try {
      const data = await requestJSON(`${BASE_URL}/${camp.camp_id}/participants`);
      setParticipants(Array.isArray(data) ? data : data.participants || []);
    } catch (error) {
      setParticipantsError(error.message);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleViewParticipants = async (camp) => {
    setSelectedCamp(camp);
    setActiveCampPanel("participants");
    setShowWalkInForm(false);
    setShowRegisteredCheckIn(false);
    setCheckInError("");
    setCheckInSuccess("");
    setWalkInError("");
    setWalkInSuccess("");
    setParticipants([]);
    setParticipantActionError("");
    setParticipantActionSuccess("");
    await loadParticipants(camp);
  };

  const handleRegisterWalkIn = async (event) => {
    event.preventDefault();
    if (!selectedCamp) return;
    setWalkInLoading(true);
    setWalkInError("");
    setWalkInSuccess("");
    try {
      await requestJSON(`${BASE_URL}/${selectedCamp.camp_id}/walk-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donor_name: walkInForm.donor_name.trim(),
          phone: walkInForm.phone.trim(),
          blood_group: walkInForm.blood_group
        })
      });
      setWalkInForm({ ...EMPTY_WALK_IN });
      setShowWalkInForm(false);
      await loadParticipants(selectedCamp);
      setWalkInSuccess("Walk-in donor registered successfully.");
    } catch (error) {
      setWalkInError(error.message);
    } finally {
      setWalkInLoading(false);
    }
  };

  const openRegisteredCheckIn = async () => {
    if (showRegisteredCheckIn) {
      setShowRegisteredCheckIn(false);
      return;
    }
    setShowWalkInForm(false);
    setShowRegisteredCheckIn(true);
    setCheckInSearch("");
    setCheckInError("");
    setCheckInSuccess("");
    setCheckInLoading(true);
    try {
      const data = await requestJSON(`${DONOR_URL}/manage`);
      setCheckInDonors((data.donors || []).filter((donor) => donor.verification_status === "Verified"));
    } catch (error) {
      setCheckInError(error.message);
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleRegisteredCheckIn = async (donor) => {
    if (!selectedCamp) return;
    setCheckInSavingId(donor.donor_id);
    setCheckInError("");
    setCheckInSuccess("");
    try {
      await requestJSON(`${BASE_URL}/${selectedCamp.camp_id}/registered-check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donor_id: donor.donor_id })
      });
      await loadParticipants(selectedCamp);
      setCheckInSuccess(`${donor.name} marked attended successfully.`);
    } catch (error) {
      setCheckInError(error.message);
    } finally {
      setCheckInSavingId(null);
    }
  };

  const handleAttendance = async (participant, attendance_status) => {
    if (!selectedCamp) return;
    setParticipantActionId(participant.participation_id);
    setParticipantActionError("");
    setParticipantActionSuccess("");
    try {
      await requestJSON(`${BASE_URL}/${selectedCamp.camp_id}/participants/${participant.participation_id}/attendance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendance_status })
      });
      await loadParticipants(selectedCamp);
      setParticipantActionSuccess(`${participant.donor_name || "Donor"} marked ${attendance_status.toLowerCase()}.`);
    } catch (error) {
      setParticipantActionError(error.message);
    } finally {
      setParticipantActionId(null);
    }
  };

  const handleRecordDonation = async (participant) => {
    if (!selectedCamp) return;
    const blood_group = participant.blood_group;
    if (!BLOOD_GROUPS.includes(blood_group)) {
      setParticipantActionError("A confirmed blood group is required before recording a donation.");
      return;
    }
    if (!window.confirm(`Confirm one successful ${blood_group} donation for ${participant.donor_name || "this donor"}? Only confirm after the donation has actually occurred.`)) return;
    setParticipantActionId(participant.participation_id);
    setParticipantActionError("");
    setParticipantActionSuccess("");
    try {
      await requestJSON(`${BASE_URL}/${selectedCamp.camp_id}/participants/${participant.participation_id}/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blood_group })
      });
      await loadParticipants(selectedCamp);
      setParticipantActionSuccess(`Donation recorded for ${participant.donor_name || "donor"}.`);
    } catch (error) {
      setParticipantActionError(error.message);
    } finally {
      setParticipantActionId(null);
    }
  };

  const closeCampPanel = () => {
    setActiveCampPanel(null);
    setSelectedCamp(null);
    setShowWalkInForm(false);
    setShowRegisteredCheckIn(false);
    setWalkInError("");
    setWalkInSuccess("");
    setParticipantActionError("");
    setParticipantActionSuccess("");
  };

  return (
    <div className="d-flex min-vh-100 bg-light">
      <aside className="text-white p-4" style={{ width: "260px", minHeight: "100vh", backgroundColor: "#142b36" }}>
        <div className="d-flex align-items-center gap-2 mb-4">
          <img src="/raktasahay-logo.png" alt="RaktaSahay" width="42" height="42" style={{ objectFit: "contain" }} />
          <h5 className="mb-0 fw-bold">RaktaSahay</h5>
        </div>
        <p className="small text-white-50 mb-4">Blood Bank Dashboard</p>
        <div className="d-grid gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className="btn text-start"
              style={{ color: "white", backgroundColor: activeSection === section.id ? "#008f8b" : "transparent" }}
              onClick={() => { setActiveSection(section.id); closeCampPanel(); }}
            >
              {section.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-outline-light w-100 mt-5" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="flex-grow-1 p-4">
        <div className="bg-white rounded-3 shadow-sm p-4 mb-4">
          <h3 className="fw-bold mb-1">{sections.find((section) => section.id === activeSection)?.label}</h3>
          <p className="text-secondary mb-0">Manage blood donation activities and camp records.</p>
        </div>

        {activeSection === "overview" && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">Blood Bank Overview</h5>
              <button type="button" className="btn btn-outline-danger btn-sm"
                disabled={overviewLoading}
                onClick={() => setOverviewRefresh((value) => value + 1)}>
                {overviewLoading ? "Refreshing..." : "Refresh Overview"}
              </button>
            </div>
            {overviewError && <div className="alert alert-danger" role="alert">{overviewError}</div>}
            {overviewLoading && <p className="text-secondary">Loading overview...</p>}
            {!overviewLoading && !overviewError && overviewData && (
              <>
                <div className="row g-3 mb-4">
                  {[
                    ["Upcoming Camps", overviewData.upcomingCount],
                    ["Total Camp Participants", overviewData.participants],
                    ["Successful Donations", overviewData.donations],
                    ["Units Collected", overviewData.units]
                  ].map(([label, value]) => (
                    <div className="col-md-6 col-xl-3" key={label}>
                      <div className="card border-0 shadow-sm h-100"><div className="card-body">
                        <p className="text-secondary mb-2">{label}</p>
                        <h3 className="fw-bold mb-0" style={{ color: "#142b36" }}>{value}</h3>
                      </div></div>
                    </div>
                  ))}
                </div>
                <div className="card border-0 shadow-sm"><div className="card-body p-4">
                  <h5 className="fw-bold mb-3">Recent Donation Camps</h5>
                  {overviewData.recentCamps.length === 0 ? (
                    <p className="text-secondary mb-0">No donation camps found.</p>
                  ) : (
                    <div className="table-responsive"><table className="table table-hover align-middle">
                      <thead><tr><th>Camp Name</th><th>Date</th><th>Venue</th><th>Status</th></tr></thead>
                      <tbody>{overviewData.recentCamps.map((camp) => (
                        <tr key={camp.camp_id}>
                          <td className="fw-semibold">{camp.camp_name}</td>
                          <td>{camp.camp_date}</td>
                          <td>{camp.venue}</td>
                          <td><span className={`badge ${camp.status === "Completed" ? "bg-success" : camp.status === "Cancelled" ? "bg-secondary" : "bg-primary"}`}>{camp.status}</span></td>
                        </tr>
                      ))}</tbody>
                    </table></div>
                  )}
                  <p className="small text-secondary mb-0">Totals cover this blood bank's donation camps only, not overall blood inventory.</p>
                </div></div>
              </>
            )}
          </div>
        )}

        {activeSection === "camps" && (
          <div className="card border-0 shadow-sm"><div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">Donation Camps</h5>
              <button type="button" className="btn btn-danger" onClick={() => {
                setShowCampForm((value) => !value);
                setCampError("");
                setCampSuccess("");
              }}>{showCampForm ? "Cancel" : "+ Create Camp"}</button>
            </div>

            {campSuccess && <div className="alert alert-success">{campSuccess}</div>}

            {showCampForm && (
              <form onSubmit={handleCreateCamp} className="border rounded-3 p-4 mb-4 bg-light">
                <h6 className="fw-bold mb-3">Create Donation Camp</h6>
                <div className="row g-3">
                  {[
                    ["camp_name", "Camp Name", "text", true],
                    ["camp_date", "Camp Date", "date", true],
                    ["start_time", "Start Time", "time", true],
                    ["end_time", "End Time", "time", true],
                    ["venue", "Venue", "text", true],
                    ["latitude", "Latitude", "number", true],
                    ["longitude", "Longitude", "number", true]
                  ].map(([name, label, type, required]) => (
                    <div className={name === "venue" ? "col-12" : "col-md-6"} key={name}>
                      <label className="form-label" htmlFor={`camp-${name}`}>{label} *</label>
                      <input
                        id={`camp-${name}`}
                        type={type}
                        step={type === "number" ? "any" : undefined}
                        min={name === "latitude" ? -90 : name === "longitude" ? -180 : undefined}
                        max={name === "latitude" ? 90 : name === "longitude" ? 180 : undefined}
                        className="form-control"
                        name={name}
                        value={campForm[name]}
                        onChange={(event) => setCampForm((previous) => ({ ...previous, [name]: event.target.value }))}
                        required={required}
                      />
                    </div>
                  ))}
                  <div className="col-12">
                    <label className="form-label" htmlFor="camp-description">Description</label>
                    <textarea id="camp-description" className="form-control" rows="2" value={campForm.description}
                      onChange={(event) => setCampForm((previous) => ({ ...previous, description: event.target.value }))} />
                  </div>
                  <div className="col-12"><button type="submit" className="btn btn-danger" disabled={creatingCamp}>
                    {creatingCamp ? "Creating Camp..." : "Create Donation Camp"}
                  </button></div>
                </div>
              </form>
            )}

            {loadingCamps && <p className="text-secondary">Loading camps...</p>}
            {campError && <div className="alert alert-danger" role="alert">{campError}</div>}
            {!loadingCamps && !campError && camps.length === 0 && <p className="text-secondary">No donation camps found.</p>}
            {!loadingCamps && !campError && camps.length > 0 && (
              <div className="table-responsive"><table className="table table-hover align-middle">
                <thead><tr><th>Camp Name</th><th>Date</th><th>Time</th><th>Venue</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{camps.map((camp) => (
                  <tr key={camp.camp_id}>
                    <td className="fw-semibold">{camp.camp_name}</td>
                    <td>{camp.camp_date}</td>
                    <td>{camp.start_time} - {camp.end_time}</td>
                    <td>{camp.venue}</td>
                    <td><span className={`badge ${camp.status === "Completed" ? "bg-success" : camp.status === "Cancelled" ? "bg-secondary" : "bg-primary"}`}>{camp.status}</span></td>
                    <td><div className="d-flex gap-2">
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleViewCamp(camp)}>View</button>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleViewParticipants(camp)}>Participants</button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}

            {/* Details and Participants are siblings, so they never overlap. */}
            {selectedCamp && activeCampPanel === "details" && (
              <div className="border rounded-3 p-4 mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0">Camp Details</h5>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeCampPanel}>Close</button>
                </div>
                {loadingDetails && <p className="text-secondary">Loading camp details...</p>}
                {detailsError && <div className="alert alert-danger">{detailsError}</div>}
                {!loadingDetails && !detailsError && campDetails && (
                  <>
                    <div className="row g-3 mb-4">
                      <div className="col-md-6"><strong>Camp Name:</strong> {campDetails.camp_name}</div>
                      <div className="col-md-6"><strong>Date:</strong> {campDetails.camp_date}</div>
                      <div className="col-md-6"><strong>Time:</strong> {campDetails.start_time} - {campDetails.end_time}</div>
                      <div className="col-md-6"><strong>Status:</strong> {campDetails.status}</div>
                      <div className="col-12"><strong>Venue:</strong> {campDetails.venue}</div>
                      <div className="col-12"><strong>Description:</strong> {campDetails.description || "—"}</div>
                    </div>
                    <h6 className="fw-bold mb-3">Donor Interest</h6>
                    {campInterest && (
                      <div className="row g-3">
                        {[
                          ["Invited", Number(campInterest.interested || 0) + Number(campInterest.not_interested || 0) + Number(campInterest.pending || 0)],
                          ["Interested", campInterest.interested],
                          ["Not Interested", campInterest.not_interested],
                          ["Pending", campInterest.pending]
                        ].map(([label, count]) => (
                          <div className="col-md-6 col-xl-3" key={label}>
                            <div className="card bg-light border-0 h-100"><div className="card-body">
                              <p className="text-secondary mb-2">{label}</p>
                              <h4 className="fw-bold mb-0">{count ?? 0}</h4>
                            </div></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {selectedCamp && activeCampPanel === "participants" && (
              <div className="border rounded-3 p-4 mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <h5 className="fw-bold mb-0">Participants — {selectedCamp.camp_name}</h5>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => {
                      setShowWalkInForm((value) => !value);
                      setShowRegisteredCheckIn(false);
                      setWalkInError("");
                    }}>{showWalkInForm ? "Cancel" : "+ Register Walk-in"}</button>
                    <button type="button" className="btn btn-sm btn-outline-success"
                      disabled={selectedCamp.status !== "Scheduled" || checkInLoading}
                      onClick={openRegisteredCheckIn}>
                      {showRegisteredCheckIn ? "Close Registered Check-in" : "+ Registered Donor Check-in"}
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeCampPanel}>Close</button>
                  </div>
                </div>

                {showRegisteredCheckIn && (
                  <div className="border rounded-3 bg-light p-3 mb-4">
                    <h6 className="fw-bold">Search Registered Donor</h6>
                    <p className="text-secondary small">Search by name or phone. Only verified donors are eligible. Existing RSVP records will be reused.</p>
                    <input className="form-control mb-3" type="search" placeholder="Enter donor name or phone number"
                      value={checkInSearch} onChange={(event) => setCheckInSearch(event.target.value)} />
                    {checkInLoading && <p className="text-secondary">Loading registered donors...</p>}
                    {checkInError && <div className="alert alert-danger">{checkInError}</div>}
                    {checkInSuccess && <div className="alert alert-success">{checkInSuccess}</div>}
                    {!checkInLoading && checkInSearch.trim().length < 2 && (
                      <p className="text-secondary small">Type at least 2 characters to find a donor.</p>
                    )}
                    {!checkInLoading && checkInSearch.trim().length >= 2 && (
                      <div className="table-responsive"><table className="table table-sm align-middle">
                        <thead><tr><th>Name</th><th>Phone</th><th>Blood Group</th><th>Camp Status</th><th>Action</th></tr></thead>
                        <tbody>
                          {checkInDonors.filter((donor) =>
                            `${donor.name || ""} ${donor.phone || ""}`.toLowerCase().includes(checkInSearch.trim().toLowerCase())
                          ).slice(0, 25).map((donor) => {
                            const existing = participants.find((p) => Number(p.donor_id) === Number(donor.donor_id));
                            const alreadyAttended = existing?.attendance_status === "Attended";
                            return (
                              <tr key={donor.donor_id}>
                                <td>{donor.name}</td><td>{donor.phone}</td><td>{donor.blood_group}</td>
                                <td>{existing ? existing.attendance_status : "Not checked in"}</td>
                                <td><button type="button" className="btn btn-sm btn-success"
                                  disabled={alreadyAttended || checkInSavingId !== null}
                                  onClick={() => handleRegisteredCheckIn(donor)}>
                                  {alreadyAttended ? "Attended" : checkInSavingId === donor.donor_id ? "Saving..." : "Mark Attended"}
                                </button></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table></div>
                    )}
                  </div>
                )}

                {walkInSuccess && <div className="alert alert-success mt-3">{walkInSuccess}</div>}
                {walkInError && <div className="alert alert-danger mt-3">{walkInError}</div>}
                {showWalkInForm && (
                  <form onSubmit={handleRegisterWalkIn} className="border rounded-3 bg-light p-3 mt-3 mb-4">
                    <h6 className="fw-bold mb-3">Register New Walk-in Donor</h6>
                    <p className="text-secondary small">Register an unregistered donor attending this donation camp. Use a confirmed blood group.</p>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="walkin-name">Donor Name *</label>
                        <input id="walkin-name" type="text" className="form-control" value={walkInForm.donor_name}
                          onChange={(event) => setWalkInForm((previous) => ({ ...previous, donor_name: event.target.value }))} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="walkin-phone">Phone Number *</label>
                        <input id="walkin-phone" type="tel" className="form-control" value={walkInForm.phone}
                          onChange={(event) => setWalkInForm((previous) => ({ ...previous, phone: event.target.value }))} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="walkin-group">Blood Group *</label>
                        <select id="walkin-group" className="form-select" value={walkInForm.blood_group}
                          onChange={(event) => setWalkInForm((previous) => ({ ...previous, blood_group: event.target.value }))} required>
                          <option value="">Select Blood Group</option>
                          {BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
                        </select>
                      </div>
                      <div className="col-12">
                        <button type="submit" className="btn btn-danger" disabled={walkInLoading}>
                          {walkInLoading ? "Registering..." : "Register Walk-in"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {loadingParticipants && <p className="text-secondary">Loading participants...</p>}
                {participantsError && <div className="alert alert-danger">{participantsError}</div>}
                {!loadingParticipants && !participantsError && participants.length === 0 && (
                  <p className="text-secondary">No participants recorded for this camp yet.</p>
                )}
                {participantActionError && <div className="alert alert-danger" role="alert">{participantActionError}</div>}
                {participantActionSuccess && <div className="alert alert-success" role="status">{participantActionSuccess}</div>}
                {!loadingParticipants && !participantsError && participants.length > 0 && (
                  <div className="table-responsive"><table className="table table-hover align-middle">
                    <thead><tr><th>Donor Name</th><th>Blood Group</th><th>Type</th><th>RSVP</th><th>Attendance</th><th>Donation</th><th>Actions</th></tr></thead>
                    <tbody>{participants.map((participant) => {
                      const isScheduled = selectedCamp.status === "Scheduled";
                      const isBusy = participantActionId !== null;
                      const isDonated = participant.donation_status === "Donated";
                      const canRecord = isScheduled && participant.attendance_status === "Attended" && !isDonated && BLOOD_GROUPS.includes(participant.blood_group);
                      const canMarkAttendance = isScheduled && participant.participation_type === "RSVP" && !isDonated && participant.rsvp_status !== "Declined";
                      return (
                        <tr key={participant.participation_id}>
                          <td>{participant.donor_name || participant.name || "—"}</td>
                          <td>{participant.blood_group || "—"}</td>
                          <td>{participant.participation_type || "—"}</td>
                          <td>{participant.rsvp_status || "—"}</td>
                          <td>{participant.attendance_status || "—"}</td>
                          <td>{participant.donation_status || "—"}</td>
                          <td>
                            <div className="d-flex flex-wrap gap-2">
                              {canMarkAttendance && (
                                <>
                                  <button type="button" className="btn btn-sm btn-outline-success"
                                    disabled={isBusy || participant.attendance_status === "Attended"}
                                    onClick={() => handleAttendance(participant, "Attended")}>Attended</button>
                                  <button type="button" className="btn btn-sm btn-outline-secondary"
                                    disabled={isBusy || participant.attendance_status === "Absent"}
                                    onClick={() => handleAttendance(participant, "Absent")}>Absent</button>
                                </>
                              )}
                              {canRecord && (
                                <button type="button" className="btn btn-sm btn-danger" disabled={isBusy}
                                  onClick={() => handleRecordDonation(participant)}>
                                  {participantActionId === participant.participation_id ? "Saving..." : "Record Donation"}
                                </button>
                              )}
                              {isDonated && <span className="badge bg-success">Recorded</span>}
                              {!canMarkAttendance && !canRecord && !isDonated && <span className="text-secondary small">—</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}</tbody>
                  </table></div>
                )}
              </div>
            )}
          </div></div>
        )}

        {activeSection === "reports" && (
          <div className="card border-0 shadow-sm"><div className="card-body p-4">
            <h5 className="fw-bold mb-3">Donation Camp Reports</h5>
            <p className="text-secondary">Review camp participation, attendance, successful donations, and collected units by blood group.</p>
            <div className="row g-3 align-items-end mb-4">
              <div className="col-md-8">
                <label className="form-label" htmlFor="report-camp">Select Donation Camp</label>
                <select id="report-camp" className="form-select" value={reportCampId}
                  onChange={(event) => {
                    setReportCampId(event.target.value);
                    setCampReport(null);
                    setReportError("");
                  }}>
                  <option value="">Choose a camp</option>
                  {reportCamps.map((camp) => (
                    <option key={camp.camp_id} value={String(camp.camp_id)}>
                      {camp.camp_name} — {camp.camp_date} ({camp.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <button type="button" className="btn btn-danger w-100"
                  disabled={!reportCampId || reportLoading || reportCampsLoading}
                  onClick={() => loadCampReport(reportCampId)}>
                  {reportLoading ? "Loading Report..." : "View / Refresh Report"}
                </button>
              </div>
            </div>
            {reportCampsLoading && <p className="text-secondary">Loading camps...</p>}
            {!reportCampsLoading && reportCamps.length === 0 && !reportError &&
              <p className="text-secondary">No camps available for reporting.</p>}
            {reportError && <div className="alert alert-danger" role="alert">{reportError}</div>}
            {campReport && (
              <>
                <div className="border-bottom pb-3 mb-4">
                  <h5 className="fw-bold mb-1">{campReport.camp?.camp_name}</h5>
                  <p className="text-secondary mb-0">
                    {campReport.camp?.camp_date} · {campReport.camp?.venue} · {campReport.camp?.camp_status}
                  </p>
                </div>
                <div className="row g-3 mb-4">
                  {[
                    ["Total Participants", campReport.participation?.total_participants],
                    ["RSVP Donors", campReport.participation?.rsvp_participants],
                    ["Walk-in Donors", campReport.participation?.walk_in_participants],
                    ["Attended", campReport.participation?.attended],
                    ["Absent", campReport.participation?.absent],
                    ["Successful Donations", campReport.participation?.successful_donations],
                    ["Total Units Collected", campReport.collections?.total_units_collected]
                  ].map(([label, value]) => (
                    <div className="col-md-6 col-xl-3" key={label}>
                      <div className="card bg-light border-0 h-100"><div className="card-body">
                        <p className="text-secondary mb-2">{label}</p>
                        <h3 className="fw-bold mb-0" style={{ color: "#142b36" }}>{value ?? 0}</h3>
                      </div></div>
                    </div>
                  ))}
                </div>
                <h6 className="fw-bold mb-3">Blood Group Collection Breakdown</h6>
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead><tr><th>Blood Group</th><th>Units Collected</th></tr></thead>
                    <tbody>
                      {BLOOD_GROUPS.map((group) => (
                        <tr key={group}>
                          <td className="fw-semibold">{group}</td>
                          <td>{campReport.collections?.blood_group_breakdown?.[group] ?? 0}</td>
                        </tr>
                      ))}
                      <tr className="table-light fw-bold">
                        <td>Total</td><td>{campReport.collections?.total_units_collected ?? 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="small text-secondary mb-0">Figures reflect recorded camp donations, not overall blood bank inventory. Use Refresh Report to fetch the latest records.</p>
              </>
            )}
          </div></div>
        )}

        {activeSection === "donors" && (
          <div className="card border-0 shadow-sm"><div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div><h5 className="fw-bold mb-1">Registered Donors</h5>
                <p className="text-secondary mb-0">Review registrations and track donation history.</p></div>
              <button type="button" className="btn btn-outline-danger" disabled={donorsLoading}
                onClick={() => setDonorRefresh((value) => value + 1)}>Refresh Donors</button>
            </div>
            {donorsError && <div className="alert alert-danger" role="alert">{donorsError}</div>}
            {donorsSuccess && <div className="alert alert-success" role="status">{donorsSuccess}</div>}
            <div className="row g-3 mb-3">
              <div className="col-md-5"><label className="form-label">Search donor</label>
                <input className="form-control" placeholder="Name, phone or email" value={donorSearch}
                  onChange={(event) => setDonorSearch(event.target.value)} /></div>
              <div className="col-md-3"><label className="form-label">Blood Group</label>
                <select className="form-select" value={donorGroup} onChange={(event) => setDonorGroup(event.target.value)}>
                  <option value="">All Groups</option>
                  {BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
                </select></div>
              <div className="col-md-4"><label className="form-label">Verification</label>
                <select className="form-select" value={donorStatus} onChange={(event) => setDonorStatus(event.target.value)}>
                  <option value="">All Statuses</option>
                  {["Pending", "Verified", "Rejected"].map((status) => <option key={status} value={status}>{status}</option>)}
                </select></div>
            </div>
            {donorsLoading && <p className="text-secondary">Loading donors...</p>}
            {!donorsLoading && <p className="small text-secondary">Showing {visibleDonors.length} of {managedDonors.length} donors</p>}
            {!donorsLoading && visibleDonors.length === 0 && !donorsError && <p>No matching donors found.</p>}
            {!donorsLoading && visibleDonors.length > 0 && (
              <div className="table-responsive"><table className="table table-hover align-middle">
                <thead><tr><th>Name</th><th>Blood Group</th><th>Phone</th><th>Source</th><th>Availability</th><th>Verification</th><th>Last Donation</th><th>Total Donations</th><th>Camp Visits</th><th>Actions</th></tr></thead>
                <tbody>{visibleDonors.map((donor) => (
                  <tr key={donor.donor_id}>
                    <td className="fw-semibold">{donor.name}</td>
                    <td>{donor.blood_group}</td><td>{donor.phone || "—"}</td>
                    <td>{donor.registration_source || "—"}</td>
                    <td>{donor.availability_status || "—"}</td>
                    <td><span className={`badge ${donor.verification_status === "Verified" ? "bg-success" : donor.verification_status === "Rejected" ? "bg-danger" : "bg-warning text-dark"}`}>
                      {donor.verification_status}</span></td>
                    <td>{donor.last_donation_date || "—"}</td>
                    <td>{donor.total_donations ?? 0}</td>
                    <td>{donor.camp_participation_count ?? 0}</td>
                    <td><div className="d-flex flex-wrap gap-2">
                      {donor.has_document && <button type="button" className="btn btn-sm btn-outline-primary"
                        disabled={documentLoadingId !== null}
                        onClick={() => handleViewDonorDocument(donor)}>
                        {documentLoadingId === donor.donor_id ? "Opening..." : "Document"}</button>}
                      {donor.verification_status === "Pending" && <>
                        <button type="button" className="btn btn-sm btn-outline-success"
                          disabled={donorActionId !== null}
                          onClick={() => handleVerifyDonor(donor, "Verified")}>Verify</button>
                        <button type="button" className="btn btn-sm btn-outline-danger"
                          disabled={donorActionId !== null}
                          onClick={() => handleVerifyDonor(donor, "Rejected")}>Reject</button>
                      </>}
                    </div></td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </div></div>
        )}

      </main>
    </div>
  );
}

export default BloodBankDashboard;
