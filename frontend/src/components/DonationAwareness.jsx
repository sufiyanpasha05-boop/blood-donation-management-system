
function DonationAwareness() {
  const benefits = [
    {
      icon: "bi-heart-pulse",
      title: "Support Patients",
      description:
        "Voluntary blood donation helps hospitals maintain blood supplies for patients in need."
    },
    {
      icon: "bi-shield-check",
      title: "Safe Donation",
      description:
        "Donation centers screen donors and use sterile, single-use equipment."
    },
    {
      icon: "bi-people",
      title: "Help Your Community",
      description:
        "Regular voluntary donors help strengthen the local blood supply."
    }
  ];

  const faqs = [
    {
      question: "Who can donate blood?",
      answer:
        "Eligibility depends on age, weight, hemoglobin, health, and local donation guidelines. A qualified healthcare professional makes the final decision."
    },
    {
      question: "How often can I donate blood?",
      answer:
        "Donation intervals depend on local medical guidelines and donation type. RaktaSahay currently uses a simplified 90-day interval for emergency donor matching."
    },
    {
      question: "How does RaktaSahay find donors?",
      answer:
        "Hospitals create emergency requests. RaktaSahay filters donors using blood group compatibility, verification, availability, eligibility, and a 5 km distance limit."
    },
    {
      question: "Will donors receive emergency notifications?",
      answer:
        "Eligible, verified, available donors may receive emergency email alerts. Donors can respond using secure links without logging in."
    },
    {
      question: "Can blood banks organize donation camps?",
      answer:
        "Yes. Verified blood banks can create donation camps and notify nearby verified donors."
    }
  ];

  return (
    <>
      {/* Awareness Section */}
      <section id="awareness" className="container py-5">
        <div className="text-center mb-5">
          <span className="text-danger fw-semibold">
            BLOOD DONATION AWARENESS
          </span>
          <h2 className="fw-bold mt-2">
            Why Blood Donation Matters
          </h2>
          <p className="text-secondary">
            Learn how voluntary blood donation supports patients
            and communities.
          </p>
        </div>

        <div className="row g-4">
          {benefits.map((item) => (
            <div className="col-md-4" key={item.title}>
              <div className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-4 text-center">
                  <div className="mb-3">
                    <i
                      className={`bi ${item.icon} text-danger`}
                      style={{ fontSize: "42px" }}
                    ></i>
                  </div>
                  <h5 className="fw-bold">{item.title}</h5>
                  <p className="text-secondary mb-0">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="alert alert-light border mt-4 rounded-4 p-4">
          <h5 className="fw-bold">
            <i className="bi bi-clock-history text-danger me-2"></i>
            Donation Cooling Period
          </h5>
          <p className="mb-0 text-secondary">
            RaktaSahay applies a 90-day eligibility interval
            in its emergency matching prototype. Actual donation
            eligibility and intervals must follow applicable
            medical guidelines and professional assessment.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-light py-5">
        <div className="container" style={{ maxWidth: "900px" }}>
          <div className="text-center mb-5">
            <h2 className="fw-bold">
              Frequently Asked Questions
            </h2>
            <p className="text-secondary">
              Answers to common questions about blood donation
              and RaktaSahay.
            </p>
          </div>

          <div className="accordion" id="raktaFaq">
            {faqs.map((faq, index) => (
              <div className="accordion-item" key={index}>
                <h2 className="accordion-header">
                  <button
                    className={`accordion-button ${
                      index === 0 ? "" : "collapsed"
                    }`}
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#faq-${index}`}
                    aria-expanded={index === 0}
                    aria-controls={`faq-${index}`}
                  >
                    {faq.question}
                  </button>
                </h2>

                <div
                  id={`faq-${index}`}
                  className={`accordion-collapse collapse ${
                    index === 0 ? "show" : ""
                  }`}
                  data-bs-parent="#raktaFaq"
                >
                  <div className="accordion-body text-secondary">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default DonationAwareness;
