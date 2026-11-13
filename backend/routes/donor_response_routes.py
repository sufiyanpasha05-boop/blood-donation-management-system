
import secrets
import hashlib
from datetime import datetime, timedelta, timezone

from flask import Blueprint, request, jsonify, g
from db import get_db_connection
from utils.auth import role_required

donor_response_bp = Blueprint(
    "donor_response",
    __name__,
    url_prefix="/api/donor-response"
)


def hash_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# Temporary demo endpoint: hospital generates a link
# for a pending match belonging to its own open request.
@donor_response_bp.route("/generate/<int:match_id>", methods=["POST"])
@role_required("hospital")
def generate_response_link(match_id):
    hospital_id = g.current_user["user_id"]
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT n.notification_id, dm.donor_response,
                   er.request_status, h.verification_status
            FROM donor_matches dm
            JOIN emergency_requests er
                ON er.request_id = dm.request_id
            JOIN hospital h
                ON h.hospital_id = er.hospital_id
            JOIN notifications n
                ON n.request_id = dm.request_id
               AND n.donor_id = dm.donor_id
               AND n.notification_type = 'Emergency SOS'
            WHERE dm.match_id = %s
              AND er.hospital_id = %s
            FOR UPDATE
        """, (match_id, hospital_id))

        record = cursor.fetchone()

        if not record:
            return jsonify({"message": "Match not found"}), 404

        if record["verification_status"] != "Verified":
            return jsonify({"message": "Hospital not verified"}), 403

        if (record["request_status"] != "Open"
                or record["donor_response"] != "Pending"):
            return jsonify({
                "message": "Match is no longer pending"
            }), 409

        token = secrets.token_urlsafe(32)
        token_hash = hash_token(token)
        expires = datetime.now(timezone.utc).replace(
            tzinfo=None
        ) + timedelta(hours=24)

        cursor.execute("""
            UPDATE notifications
            SET response_token_hash = %s,
                token_expires_at = %s,
                token_used_at = NULL
            WHERE notification_id = %s
              AND response = 'Pending'
        """, (token_hash, expires, record["notification_id"]))

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Response link generated for testing",
            "expires_at_utc": expires.isoformat() + "Z",
            "response_url": (
                "http://localhost:5173"
                f"/donor/respond/{token}"
            )
        }), 200

    except Exception:
        conn.rollback()
        return jsonify({"message": "Link generation failed"}), 500

    finally:
        cursor.close()
        conn.close()


@donor_response_bp.route("/<token>", methods=["GET"])
def view_response_link(token):
    token_hash = hash_token(token)
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT er.request_id, er.blood_group, er.urgency,
                   er.request_status, h.name AS hospital_name,
                   n.response, n.token_used_at,
                   n.token_expires_at
            FROM notifications n
            JOIN emergency_requests er
                ON er.request_id = n.request_id
            JOIN hospital h
                ON h.hospital_id = er.hospital_id
            WHERE n.response_token_hash = %s
              AND n.notification_type = 'Emergency SOS'
        """, (token_hash,))

        record = cursor.fetchone()

        if not record:
            return jsonify({"message": "Invalid link"}), 404

        if (record["token_used_at"] is not None
                or record["response"] != "Pending"):
            return jsonify({"message": "Link already used"}), 409

        if record["request_status"] != "Open":
            return jsonify({"message": "Request is closed"}), 409

        if (record["token_expires_at"] is None
                or record["token_expires_at"]
                <= datetime.now(timezone.utc).replace(tzinfo=None)):
            return jsonify({"message": "Link expired"}), 410

        return jsonify({
            "status": "success",
            "request_id": record["request_id"],
            "hospital": record["hospital_name"],
            "blood_group": record["blood_group"],
            "urgency": record["urgency"],
            "message": "You may accept or reject this request"
        }), 200

    finally:
        cursor.close()
        conn.close()


@donor_response_bp.route("/<token>", methods=["POST"])
def submit_donor_response(token):
    data = request.get_json(silent=True) or {}
    decision = data.get("response")

    if decision not in ("Accepted", "Rejected"):
        return jsonify({
            "message": "Response must be Accepted or Rejected"
        }), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT n.notification_id, n.request_id, n.donor_id,
                   n.response, n.token_used_at, n.token_expires_at,
                   dm.match_id, dm.donor_response,
                   er.hospital_id, er.request_status,
                   h.verification_status
            FROM notifications n
            JOIN emergency_requests er
                ON er.request_id = n.request_id
            JOIN hospital h
                ON h.hospital_id = er.hospital_id
            JOIN donor_matches dm
                ON dm.request_id = n.request_id
               AND dm.donor_id = n.donor_id
            WHERE n.response_token_hash = %s
              AND n.notification_type = 'Emergency SOS'
            FOR UPDATE
        """, (hash_token(token),))

        record = cursor.fetchone()

        if not record:
            return jsonify({"message": "Invalid link"}), 404

        if (record["token_used_at"] is not None
                or record["response"] != "Pending"
                or record["donor_response"] != "Pending"):
            return jsonify({"message": "Link already used"}), 409

        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

        if (record["token_expires_at"] is None
                or record["token_expires_at"] <= now_utc):
            return jsonify({"message": "Link expired"}), 410

        if (record["request_status"] != "Open"
                or record["verification_status"] != "Verified"):
            return jsonify({"message": "Request unavailable"}), 409

        cursor.execute("""
            UPDATE donor_matches
            SET donor_response = %s,
                response_at = UTC_TIMESTAMP(),
                match_status = %s
            WHERE match_id = %s
              AND donor_response = 'Pending'
        """, (
            decision,
            "Rejected" if decision == "Rejected" else "Notified",
            record["match_id"]
        ))

        if cursor.rowcount != 1:
            conn.rollback()
            return jsonify({"message": "Already responded"}), 409

        cursor.execute("""
            UPDATE notifications
            SET response = %s,
                response_at = UTC_TIMESTAMP(),
                token_used_at = UTC_TIMESTAMP()
            WHERE notification_id = %s
              AND response = 'Pending'
              AND token_used_at IS NULL
        """, (decision, record["notification_id"]))

        if cursor.rowcount != 1:
            conn.rollback()
            return jsonify({"message": "Already responded"}), 409

        notification_type = (
            "Donor Accepted" if decision == "Accepted"
            else "Donor Rejected"
        )

        message = (
            f"Donor #{record['donor_id']} has "
            f"{decision.lower()} emergency request "
            f"#{record['request_id']}."
        )

        cursor.execute("""
            INSERT INTO hospital_notifications
                (hospital_id, request_id, donor_id,
                 notification_type, message)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            record["hospital_id"],
            record["request_id"],
            record["donor_id"],
            notification_type,
            message
        ))

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Response recorded successfully",
            "response": decision
        }), 200

    except Exception:
        conn.rollback()
        return jsonify({"message": "Response failed"}), 500

    finally:
        cursor.close()
        conn.close()
