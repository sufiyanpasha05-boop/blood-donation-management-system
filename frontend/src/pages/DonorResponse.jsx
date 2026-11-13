import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

export default function DonorResponse() {
  const { token } = useParams();

  const [requestData, setRequestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    api.get(`/donor-response/${token}`)
      .then((res) => setRequestData(res.data))
      .catch((err) =>
        setError(err.response?.data?.message || "Unable to open link")
      )
      .finally(() => setLoading(false));
  }, [token]);

  const respond = async (decision) => {
    setSubmitting(true);
    setError("");

    try {
      const res = await api.post(`/donor-response/${token}`, {
        response: decision,
      });

      setResult(res.data.response);
      setRequestData(null);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 600 }}>
      <h1 style={{ color: "red" }}>DONOR RESPONSE PAGE LOADED</h1>
      <h2 className="text-danger fw-bold mb-4">
        RaktaSahay — Emergency Blood Request
      </h2>

      {loading && <p>Loading request...</p>}

      {error && <div className="alert alert-danger">{error}</div>}

      {result && (
        <div className="alert alert-success">
          Your response ({result}) has been recorded successfully.
        </div>
      )}

      {requestData && !result && (
        <div className="card shadow-sm">
          <div className="card-body">
            <h4>Blood Donation Request</h4>

            <p><strong>Hospital:</strong> {requestData.hospital}</p>
            <p><strong>Blood Group:</strong> {requestData.blood_group}</p>
            <p><strong>Urgency:</strong> {requestData.urgency}</p>

            <p>Are you available to donate blood?</p>

            <div className="d-flex gap-3">
              <button
                className="btn btn-success"
                disabled={submitting}
                onClick={() => respond("Accepted")}
              >
                Accept Request
              </button>

              <button
                className="btn btn-outline-danger"
                disabled={submitting}
                onClick={() => respond("Rejected")}
              >
                Decline Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}