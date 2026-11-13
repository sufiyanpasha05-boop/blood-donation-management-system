
function HeroAnimation() {
  return (
    <div className="rakta-hero-visual">
      <style>{`
        .rakta-hero-visual {
          position: relative;
          width: min(100%, 520px);
          aspect-ratio: 1;
          margin: auto;
          isolation: isolate;
        }

        .rakta-hero-visual::before {
          content: "";
          position: absolute;
          inset: 13%;
          border-radius: 50%;
          background: linear-gradient(
            135deg,
            rgba(240, 70, 85, .20),
            rgba(255, 235, 230, .55),
            rgba(0, 143, 139, .15)
          );
          filter: blur(1px);
          z-index: -1;
        }

        .hero-orbit {
          position: absolute;
          border-radius: 50%;
          border: 1px dashed rgba(200, 16, 46, .25);
          animation: hero-orbit-spin 35s linear infinite;
        }

        .hero-orbit.outer {
          inset: 3%;
          border-color: rgba(0, 143, 139, .22);
        }

        .hero-orbit.middle {
          inset: 12%;
          animation-duration: 28s;
          animation-direction: reverse;
        }

        .hero-orbit.inner {
          inset: 23%;
          border-color: rgba(200, 16, 46, .12);
          animation-duration: 20s;
        }

        @keyframes hero-orbit-spin {
          to { transform: rotate(360deg); }
        }

        .hero-logo-center {
          position: absolute;
          inset: 23%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: hero-float 5s ease-in-out infinite;
        }

        .hero-logo-center img {
          width: 100%;
          max-width: 275px;
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 15px 25px rgba(0,0,0,.08));
        }

        @keyframes hero-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }

        .hero-floating-card {
          position: absolute;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 16px;
          background: rgba(255,255,255,.96);
          border: 1px solid rgba(255,255,255,.9);
          border-radius: 18px;
          box-shadow: 0 12px 35px rgba(0,0,0,.08);
          animation: card-float 6s ease-in-out infinite;
          transition: box-shadow .25s;
        }

        .hero-floating-card:hover {
          box-shadow: 0 18px 40px rgba(0,0,0,.14);
        }

        .hero-floating-card.hospital {
          top: 19%;
          left: 0;
        }

        .hero-floating-card.donors {
          right: 0;
          bottom: 19%;
          animation-delay: -3s;
        }

        @keyframes card-float {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -10px; }
        }

        .hero-card-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }

        .hero-card-icon.hospital {
          color: #dc3545;
          background: #fff0f1;
        }

        .hero-card-icon.donors {
          color: #008f8b;
          background: #e5f7f4;
        }

        .hero-card-title {
          font-weight: 700;
          font-size: 13px;
          color: #273849;
          white-space: nowrap;
        }

        .hero-card-subtitle {
          color: #7b8794;
          font-size: 11px;
          white-space: nowrap;
        }

        .hero-top-label {
          position: absolute;
          top: 8%;
          right: 1%;
          padding: 9px 15px;
          border-radius: 30px;
          background: #dcf8f4;
          color: #287c79;
          font-weight: 700;
          font-size: 11px;
          transform: rotate(6deg);
          z-index: 2;
        }

        @media (max-width: 576px) {
          .rakta-hero-visual {
            width: min(100%, 360px);
          }

          .hero-floating-card {
            padding: 8px;
            gap: 7px;
            border-radius: 12px;
          }

          .hero-card-icon {
            width: 30px;
            height: 30px;
            font-size: 16px;
          }

          .hero-card-title {
            font-size: 10px;
          }

          .hero-card-subtitle {
            font-size: 9px;
          }

          .hero-top-label {
            font-size: 9px;
            padding: 6px 9px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-orbit,
          .hero-logo-center,
          .hero-floating-card {
            animation: none;
          }
        }
      `}</style>

      <div className="hero-orbit outer"></div>
      <div className="hero-orbit middle"></div>
      <div className="hero-orbit inner"></div>

      <div className="hero-logo-center">
        <img
          src="/raktasahay-logo.png"
          alt="RaktaSahay logo"
        />
      </div>

      <div className="hero-top-label">
        Care moves faster together ✳
      </div>

      <div className="hero-floating-card hospital">
        <div className="hero-card-icon hospital">
          <i className="bi bi-hospital"></i>
        </div>
        <div>
          <div className="hero-card-title">Hospital Request</div>
          <div className="hero-card-subtitle">Verified organizations</div>
        </div>
        <i className="bi bi-circle-fill text-success"
           style={{ fontSize: 8 }}></i>
      </div>

      <div className="hero-floating-card donors">
        <div className="hero-card-icon donors">
          <i className="bi bi-heart-fill"></i>
        </div>
        <div>
          <div className="hero-card-title">Nearby Donors</div>
          <div className="hero-card-subtitle">Compatibility first</div>
        </div>
        <i className="bi bi-check-lg text-success"></i>
      </div>
    </div>
  );
}

export default HeroAnimation;
