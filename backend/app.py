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


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5002)),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
        use_reloader=False
    )