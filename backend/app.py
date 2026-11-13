import os
from routes.auth_routes import auth_bp
from routes.admin_routes import admin_bp
from routes.donor_routes import donor_bp
from routes.emergency_routes import emergency_bp
from routes.donor_response_routes import donor_response_bp
from routes.camp_routes import camp_bp
from flask import Flask, jsonify
from db import get_db_connection
from flask_cors import CORS

app = Flask(__name__)
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                os.getenv("FRONTEND_URL", "http://localhost:5173")
            ]
        }
    }
)
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(donor_bp)
app.register_blueprint(emergency_bp)
app.register_blueprint(donor_response_bp)
app.register_blueprint(camp_bp)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

@app.route("/")
def home():
    return "Blood Donation Matching Platform API is running!"


@app.route("/api/health")
def health():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT 1")
        result = cursor.fetchone()

        cursor.close()
        conn.close()

        if result[0] == 1:
            return jsonify({
                "status": "success",
                "message": "Flask and MySQL are connected"
            })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route("/api/test-smtp", methods=["GET"])
def test_smtp():
    import os
    import socket

    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))

    try:
        with socket.create_connection((host, port), timeout=5):
            return {
                "status": "success",
                "message": "SMTP server is reachable"
            }, 200

    except Exception as e:
        app.logger.error(
            "SMTP connectivity test failed: %s",
            type(e).__name__
        )
        return {
            "status": "error",
            "error_type": type(e).__name__,
            "message": "SMTP connection failed"
        }, 503


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5002)),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
        use_reloader=False
    )


from flask import jsonify, g
from utils.auth import role_required
from gmail_service import send_gmail

@app.route("/api/admin/test-gmail", methods=["POST"])
@role_required("admin")
def test_gmail_delivery():
    try:
        recipient = os.environ["SMTP_EMAIL"]

        send_gmail(
            recipient,
            "RaktaSahay Render Gmail Test",
            "This email was sent from the deployed Render backend."
        )

        return jsonify({
            "status": "success",
            "message": "Gmail API accepted the test email"
        }), 200

    except Exception as e:
        app.logger.error(
            "Gmail API test failed: %s",
            type(e).__name__
        )

        return jsonify({
            "status": "error",
            "message": "Gmail API test failed"
        }), 500
