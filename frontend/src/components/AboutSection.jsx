
function AboutSection() {
  return (
    <>
      {/* About RaktaSahay */}
      <section id="about" className="container py-5">
        <div className="row align-items-center g-5">
          <div className="col-lg-6">
            <img
              src="/about-blood-donation.png"
              alt="Blood donation at a healthcare facility"
              className="img-fluid rounded-4 shadow-sm w-100"
              style={{ maxHeight: "420px", objectFit: "cover" }}
            />
          </div>

          <div className="col-lg-6">
            <span className="text-danger fw-semibold">
              ABOUT RAKTASAHAY
            </span>

            <h2 className="fw-bold mt-2 mb-3">
              Connecting Blood Donors With Those in Need
            </h2>

            <p className="text-secondary">
              RaktaSahay is a web application designed to connect
              verified blood donors with hospitals during emergencies.
              It uses rule-based matching to identify compatible,
              eligible donors within a 5 km radius.
            </p>

            <p className="text-secondary">
              The platform also helps blood banks organize donation
              camps and notify nearby donors, supporting community
              participation in blood donation.
            </p>

            <div className="row g-3 mt-3">
              <div className="col-6">
                <div className="p-3 bg-light rounded-3">
                  <i className="bi bi-geo-alt-fill text-danger fs-3"></i>
                  <h6 className="fw-bold mt-2">5 KM Matching</h6>
                  <small className="text-secondary">
                    Location-based donor discovery
                  </small>
                </div>
              </div>

              <div className="col-6">
                <div className="p-3 bg-light rounded-3">
                  <i className="bi bi-shield-check text-success fs-3"></i>
                  <h6 className="fw-bold mt-2">Verified Donors</h6>
                  <small className="text-secondary">
                    Verification-based matching
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold">How RaktaSahay Works</h2>
            <p className="text-secondary">
              Three roles working together to support blood donation.
            </p>
          </div>

          <div className="row g-4">
            {[
              {
                icon: "bi-person-heart",
                title: "Blood Donors",
                description:
                  "Register, submit verification documents, and respond to emergency alerts through secure email links."
              },
              {
                icon: "bi-hospital",
                title: "Hospitals",
                description:
                  "Create emergency requests and receive responses from eligible, compatible nearby donors."
              },
              {
                icon: "bi-calendar-heart",
                title: "Blood Banks",
                description:
                  "Organize donation camps and notify verified donors within a 5 km radius."
              }
            ].map((item) => (
              <div className="col-md-4" key={item.title}>
                <div className="card h-100 border-0 shadow-sm rounded-4">
                  <div className="card-body text-center p-4">
                    <i
                      className={`bi ${item.icon} text-danger`}
                      style={{ fontSize: "42px" }}
                    ></i>
                    <h5 className="fw-bold mt-3">{item.title}</h5>
                    <p className="text-secondary mb-0">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-5">
            <img
                src="/donation-camp.jpg"
                alt="Person donating blood while holding a heart"
                className="img-fluid rounded-4 shadow-sm"
                style={{
                    width: "100%",
                    maxWidth: "850px",
                    maxHeight: "360px",
                    objectFit: "cover",
                    objectPosition: "center"
                }}
            />

            <h4 className="fw-bold mt-4">
                A Small Act of Kindness Can Make a Big Difference
            </h4>

            <p className="text-secondary">
                Join RaktaSahay and help connect communities through
                    voluntary blood donation.
            </p>
        </div>
        </div>
      </section>
    </>
  );
}

export default AboutSection;
