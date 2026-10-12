from routes.auth_routes import auth_bp
from flask import Flask, jsonify
from db import get_db_connection

app = Flask(__name__)
app.register_blueprint(auth_bp)


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
    app.run(debug=True)