import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g
from datetime import date
from math import radians, sin, cos, sqrt, atan2
from services.email_service import send_email
from db import get_db_connection
from utils.auth import role_required
from flask import current_app
from threading import Thread

emergency_bp = Blueprint(
    "emergency", __name__, url_prefix="/api/emergency"
)

# Compatible red-cell donor groups for each recipient group.
COMPATIBILITY = {
    "O-": ["O-"],
    "O+": ["O-", "O+"],
    "A-": ["O-", "A-"],
    "A+": ["O-", "O+", "A-", "A+"],
    "B-": ["O-", "B-"],
    "B+": ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
}

def distance_km(lat1, lon1, lat2, lon2):
    radius = 6371.0

    dlat = radians(float(lat2) - float(lat1))
    dlon = radians(float(lon2) - float(lon1))

    a = (
        sin(dlat / 2) ** 2
        + cos(radians(float(lat1)))
        * cos(radians(float(lat2)))
        * sin(dlon / 2) ** 2
    )

    return radius * 2 * atan2(sqrt(a), sqrt(max(0, 1 - a)))

def send_emergency_emails(email_list, app):
    with app.app_context():
        for email_data in email_list:
            try:
                send_email(
                    email_data["to"],
                    email_data["subject"],
                    email_data["message"]
                )
            except Exception:
                current_app.logger.exception(
                    "Emergency email delivery failed"
                )


@emergency_bp.route("/create", methods=["POST"])
@role_required("hospital")
def create_emergency():
    data = request.get_json(silent=True) or {}

    blood_group = str(data.get("blood_group", "")).upper().strip()
    urgency = data.get("urgency")

    description = data.get("description", "")

    if not isinstance(description, str):
        return jsonify({
            "message": "Description must be text"
        }), 400

    description = description.strip()

    if len(description) > 500:
        return jsonify({
            "message": "Description cannot exceed 500 characters"
        }), 400

    if blood_group not in COMPATIBILITY:
        return jsonify({"message": "Invalid blood group"}), 400

    if urgency not in ("Normal", "Urgent", "Critical"):
        return jsonify({"message": "Invalid urgency"}), 400

    hospital_id = g.current_user["user_id"]

    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Hospital location comes from registration.
        cursor.execute("""
            SELECT name, address, latitude, longitude,
                   verification_status
            FROM hospital
            WHERE hospital_id = %s
        """, (hospital_id,))

        hospital = cursor.fetchone()

        if not hospital or hospital["verification_status"] != "Verified":
            return jsonify({
                "message": "Verified hospital required"
            }), 403

        if hospital["latitude"] is None or hospital["longitude"] is None:
            return jsonify({
                "message": "Hospital location is missing"
            }), 400

        cursor.execute("""
            INSERT INTO emergency_requests
                (hospital_id, blood_group, urgency,
                description, request_status)
            VALUES (%s, %s, %s, %s, 'Open')
        """, (
            hospital_id,
            blood_group,
            urgency,
            description or None
        ))

        request_id = cursor.lastrowid

        # Select preliminary eligible donors.
        compatible_groups = COMPATIBILITY[blood_group]
        placeholders = ",".join(["%s"] * len(compatible_groups))

        cursor.execute(f"""
            SELECT donor_id, email, blood_group, latitude, longitude,
                   last_donation_date
            FROM donor
            WHERE verification_status = 'Verified'
              AND availability_status = 'Available'
              AND blood_group IN ({placeholders})
              AND latitude IS NOT NULL
              AND longitude IS NOT NULL
        """, tuple(compatible_groups))

        donors = cursor.fetchall()
        matches = []
        pending_emails = []

        for donor in donors:
            last_date = donor["last_donation_date"]

            # For this demo, use a conservative 90-day
            # preliminary interval. Unknown dates require review.
            if last_date is None:
                continue

            days_since = (date.today() - last_date).days

            if days_since < 90:
                continue

            distance = distance_km(
                hospital["latitude"],
                hospital["longitude"],
                donor["latitude"],
                donor["longitude"]
            )

            if distance > 5:
                continue

            # Store match.
            cursor.execute("""
                INSERT INTO donor_matches
                    (request_id, donor_id, distance_km,
                     match_status, donor_response, donation_status)
                VALUES (%s, %s, %s, 'Notified', 'Pending', 'Pending')
            """, (
                request_id,
                donor["donor_id"],
                round(distance, 2)
            ))


            # Generate a secure donor response token.
            token = secrets.token_urlsafe(32)

            token_hash = hashlib.sha256(
                token.encode("utf-8")
            ).hexdigest()

            expires_at = (
                datetime.now(timezone.utc).replace(tzinfo=None)
                + timedelta(hours=24)
            )

            # Store internal notification with response token.
            message = (
                f"{urgency} blood request for {blood_group} "
                f"at {hospital['name']}. "
                "Please respond to the emergency request."
            )

            cursor.execute("""
                INSERT INTO notifications
                    (donor_id, request_id, notification_type,
                     message, location, response,
                     response_token_hash, token_expires_at)
                VALUES (
                    %s, %s, 'Emergency SOS',
                    %s, %s, 'Pending', %s, %s
                )
            """, (
                donor["donor_id"],
                request_id,
                message,
                hospital["address"],
                token_hash,
                expires_at
            ))


            # Prepare email for delivery after database commit.
            if donor.get("email"):
                frontend_url = os.getenv(
                    "FRONTEND_URL",
                    "http://localhost:5173"
                ).rstrip("/")

                response_link = f"{frontend_url}/donor/respond/{token}"
                subject = f"RaktaSahay Emergency SOS - {blood_group}"

                email_message = (
                    f"Emergency Blood Donation Request\n\n"
                    f"Hospital: {hospital['name']}\n"
                    f"Blood Group Needed: {blood_group}\n"
                    f"Urgency: {urgency}\n"
                    f"Location: {hospital['address']}\n\n"
                    f"View and respond to this request:\n"
                    f"{response_link}\n\n"
                    f"This link expires in 24 hours.\n\n"
                    f"RaktaSahay Notifications"
                )

                pending_emails.append({
                    "to": donor["email"],
                    "subject": subject,
                    "message": email_message
                })

            matches.append({
                "donor_id": donor["donor_id"],
                "distance_km": round(distance, 2)
            })


        conn.commit()

        
        if pending_emails:
            app = current_app._get_current_object()

            Thread(
                target=send_emergency_emails,
                args=(pending_emails.copy(), app),
                daemon=True
            ).start()

        return jsonify({
            "status": "success",
            "message": "Emergency request created",
            "request_id": request_id,
            "blood_group": blood_group,
            "urgency": urgency,
            "description": description,
            "matched_donors": len(matches),
            "matches": matches,
            "emails_queued": len(pending_emails)
        }), 201


    except Exception:
        if conn:
            conn.rollback()

        return jsonify({
            "status": "error",
            "message": "Emergency request failed"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@emergency_bp.route("/matches/<int:match_id>/response", methods=["PUT"])
@role_required("hospital")
def update_donor_response(match_id):
    data = request.get_json(silent=True) or {}
    response = data.get("response")

    if response not in ("Accepted", "Rejected"):
        return jsonify({
            "message": "Response must be Accepted or Rejected"
        }), 400

    hospital_id = g.current_user["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT dm.match_id, dm.donor_id, dm.request_id,
                   dm.donor_response, er.request_status,
                   h.verification_status
            FROM donor_matches dm
            JOIN emergency_requests er
                ON dm.request_id = er.request_id
            JOIN hospital h
                ON er.hospital_id = h.hospital_id
            WHERE dm.match_id = %s
              AND er.hospital_id = %s
            FOR UPDATE
        """, (match_id, hospital_id))

        match = cursor.fetchone()

        if not match:
            return jsonify({
                "message": "Match not found for this hospital"
            }), 404

        if match["verification_status"] != "Verified":
            return jsonify({
                "message": "Hospital is not verified"
            }), 403

        if match["request_status"] != "Open":
            return jsonify({
                "message": "Emergency request is not open"
            }), 409

        if match["donor_response"] != "Pending":
            return jsonify({
                "message": "Donor has already responded"
            }), 409

        cursor.execute("""
            UPDATE donor_matches
            SET donor_response = %s,
                response_at = NOW(),
                match_status = %s
            WHERE match_id = %s
        """, (
            response,
            "Rejected" if response == "Rejected" else "Notified",
            match_id
        ))

        cursor.execute("""
            UPDATE notifications
            SET response = %s,
                response_at = NOW()
            WHERE request_id = %s
              AND donor_id = %s
              AND notification_type = 'Emergency SOS'
              AND response = 'Pending'
        """, (
            response,
            match["request_id"],
            match["donor_id"]
        ))

        notification_type = (
            "Donor Accepted"
            if response == "Accepted"
            else "Donor Rejected"
        )

        message = (
            f"Donor #{match['donor_id']} has "
            f"{response.lower()} emergency request "
            f"#{match['request_id']}."
        )

        cursor.execute("""
            INSERT INTO hospital_notifications
                (hospital_id, request_id, donor_id,
                 notification_type, message)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            hospital_id,
            match["request_id"],
            match["donor_id"],
            notification_type,
            message
        ))

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Donor response updated",
            "match_id": match_id,
            "donor_response": response,
            "hospital_notified": True
        }), 200

    except Exception:
        conn.rollback()
        return jsonify({
            "message": "Failed to update donor response"
        }), 500

    finally:
        cursor.close()
        conn.close()

@emergency_bp.route("/my-requests", methods=["GET"])
@role_required("hospital")
def my_emergency_requests():
    hospital_id = g.current_user["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT er.request_id, er.blood_group,
                   er.urgency, er.description,
                   er.request_status, er.created_at,
                   COUNT(dm.match_id) AS total_matches,
                   SUM(CASE WHEN dm.donor_response = 'Accepted'
                            THEN 1 ELSE 0 END) AS accepted,
                   SUM(CASE WHEN dm.donor_response = 'Pending'
                            THEN 1 ELSE 0 END) AS pending,
                   SUM(CASE WHEN dm.donor_response = 'Rejected'
                            THEN 1 ELSE 0 END) AS rejected
            FROM emergency_requests er
            LEFT JOIN donor_matches dm
                ON er.request_id = dm.request_id
            WHERE er.hospital_id = %s
            GROUP BY er.request_id, er.blood_group,
                     er.urgency, er.request_status,
                     er.created_at
            ORDER BY er.created_at DESC, er.request_id DESC
        """, (hospital_id,))

        requests = cursor.fetchall()

        for item in requests:
            item["created_at"] = item["created_at"].isoformat()

        return jsonify({
            "status": "success",
            "requests": requests
        }), 200

    finally:
        cursor.close()
        conn.close()


@emergency_bp.route("/hospital-notifications", methods=["GET"])
@role_required("hospital")
def get_hospital_notifications():
    hospital_id = g.current_user["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT notification_id, request_id, donor_id,
                   notification_type, message,
                   is_read, created_at
            FROM hospital_notifications
            WHERE hospital_id = %s
            ORDER BY created_at DESC, notification_id DESC
        """, (hospital_id,))

        notifications = cursor.fetchall()

        for item in notifications:
            item["created_at"] = item["created_at"].isoformat()
            item["is_read"] = bool(item["is_read"])

        return jsonify({
            "status": "success",
            "notifications": notifications
        }), 200

    finally:
        cursor.close()
        conn.close()


@emergency_bp.route(
    "/hospital-notifications/<int:notification_id>/read",
    methods=["PUT"]
)
@role_required("hospital")
def mark_hospital_notification_read(notification_id):
    hospital_id = g.current_user["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE hospital_notifications
            SET is_read = TRUE
            WHERE notification_id = %s
              AND hospital_id = %s
        """, (notification_id, hospital_id))

        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({
                "message": "Notification not found or already read"
            }), 404

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Notification marked as read"
        }), 200

    finally:
        cursor.close()
        conn.close()


@emergency_bp.route("/matches/<int:match_id>/donation", methods=["PUT"])
@role_required("hospital")
def update_donation_status(match_id):
    data = request.get_json(silent=True) or {}
    status = data.get("donation_status")

    if status not in ("Donated", "Not Donated"):
        return jsonify({
            "message": "Status must be Donated or Not Donated"
        }), 400

    hospital_id = g.current_user["user_id"]
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT dm.match_id, dm.donor_id,
                   dm.donor_response, dm.donation_status,
                   er.request_status, h.verification_status
            FROM donor_matches dm
            JOIN emergency_requests er
                ON dm.request_id = er.request_id
            JOIN hospital h
                ON er.hospital_id = h.hospital_id
            WHERE dm.match_id = %s
              AND er.hospital_id = %s
            FOR UPDATE
        """, (match_id, hospital_id))

        match = cursor.fetchone()

        if not match:
            return jsonify({"message": "Match not found"}), 404

        if match["verification_status"] != "Verified":
            return jsonify({"message": "Hospital not verified"}), 403

        if match["request_status"] != "Open":
            return jsonify({"message": "Request is not open"}), 409

        if match["donor_response"] != "Accepted":
            return jsonify({
                "message": "Only accepted donors can be updated"
            }), 409

        if match["donation_status"] != "Pending":
            return jsonify({
                "message": "Donation status already recorded"
            }), 409

        cursor.execute("""
            UPDATE donor_matches
            SET donation_status = %s,
                match_status = %s
            WHERE match_id = %s
        """, (
            status,
            "Completed" if status == "Donated" else "Notified",
            match_id
        ))

        if status == "Donated":
            cursor.execute("""
                UPDATE donor
                SET last_donation_date = CURDATE(),
                    total_donations = COALESCE(total_donations, 0) + 1,
                    availability_status = 'Unavailable'
                WHERE donor_id = %s
            """, (match["donor_id"],))

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Donation status updated",
            "match_id": match_id,
            "donation_status": status
        }), 200

    except Exception:
        if conn:
            conn.rollback()

        return jsonify({
            "message": "Failed to update donation status"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@emergency_bp.route("/requests/<int:request_id>/status", methods=["PUT"])
@role_required("hospital")
def update_emergency_request_status(request_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get("request_status")

    if new_status not in ("Fulfilled", "Cancelled"):
        return jsonify({
            "message": "Status must be Fulfilled or Cancelled"
        }), 400

    hospital_id = g.current_user["user_id"]
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT er.request_id, er.request_status,
                   h.verification_status
            FROM emergency_requests er
            JOIN hospital h
                ON er.hospital_id = h.hospital_id
            WHERE er.request_id = %s
              AND er.hospital_id = %s
            FOR UPDATE
        """, (request_id, hospital_id))

        emergency = cursor.fetchone()

        if not emergency:
            return jsonify({
                "message": "Request not found for this hospital"
            }), 404

        if emergency["verification_status"] != "Verified":
            return jsonify({
                "message": "Hospital is not verified"
            }), 403

        if emergency["request_status"] != "Open":
            return jsonify({
                "message": "Request is already closed"
            }), 409

        if new_status == "Fulfilled":
            cursor.execute("""
                SELECT COUNT(*) AS donated_count
                FROM donor_matches
                WHERE request_id = %s
                  AND donor_response = 'Accepted'
                  AND donation_status = 'Donated'
            """, (request_id,))

            result = cursor.fetchone()

            if result["donated_count"] == 0:
                return jsonify({
                    "message": (
                        "Cannot fulfill request without "
                        "a confirmed donation"
                    )
                }), 409

        cursor.execute("""
            UPDATE emergency_requests
            SET request_status = %s
            WHERE request_id = %s
        """, (new_status, request_id))

        # Invalidate unused donor response links.
        cursor.execute("""
            UPDATE notifications
            SET token_used_at = UTC_TIMESTAMP()
            WHERE request_id = %s
              AND notification_type = 'Emergency SOS'
              AND response = 'Pending'
              AND response_token_hash IS NOT NULL
              AND token_used_at IS NULL
        """, (request_id,))

        conn.commit()

        return jsonify({
            "status": "success",
            "request_id": request_id,
            "request_status": new_status,
            "message": "Emergency request status updated"
        }), 200

    except Exception:
        if conn:
            conn.rollback()

        return jsonify({
            "message": "Failed to update request status"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@emergency_bp.route(
    "/requests/<int:request_id>/donors",
    methods=["GET"]
)
@role_required("hospital")
def get_request_donors(request_id):
    hospital_id = g.current_user["user_id"]

    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Verify request belongs to logged-in hospital
        # and hospital is verified.
        cursor.execute("""
            SELECT er.request_id, er.request_status
            FROM emergency_requests er
            JOIN hospital h
                ON er.hospital_id = h.hospital_id
            WHERE er.request_id = %s
              AND er.hospital_id = %s
              AND h.verification_status = 'Verified'
        """, (request_id, hospital_id))

        emergency = cursor.fetchone()

        if not emergency:
            return jsonify({
                "message": "Request not found or access denied"
            }), 404

        # Fetch matched donors.
        # Reveal personal details only after acceptance.
        cursor.execute("""
            SELECT
                dm.match_id,
                dm.donor_id,
                dm.distance_km,
                dm.match_status,
                dm.donor_response,
                dm.donation_status,
                dm.response_at,

                d.blood_group,

                CASE
                    WHEN dm.donor_response = 'Accepted'
                    THEN d.name
                    ELSE NULL
                END AS donor_name,

                CASE
                    WHEN dm.donor_response = 'Accepted'
                    THEN d.phone
                    ELSE NULL
                END AS donor_phone,

                CASE
                    WHEN dm.donor_response = 'Accepted'
                    THEN d.email
                    ELSE NULL
                END AS donor_email

            FROM donor_matches dm
            JOIN donor d
                ON dm.donor_id = d.donor_id
            WHERE dm.request_id = %s
            ORDER BY
                CASE dm.donor_response
                    WHEN 'Accepted' THEN 1
                    WHEN 'Pending' THEN 2
                    WHEN 'No Response' THEN 3
                    ELSE 4
                END,
                dm.distance_km ASC
        """, (request_id,))

        donors = cursor.fetchall()

        for donor in donors:
            if donor["response_at"]:
                donor["response_at"] = (
                    donor["response_at"].isoformat()
                )

            donor["distance_km"] = float(
                donor["distance_km"]
            )

        return jsonify({
            "status": "success",
            "request_id": request_id,
            "request_status": emergency["request_status"],
            "total_matches": len(donors),
            "donors": donors
        }), 200

    except Exception:
        import traceback
        traceback.print_exc()

        return jsonify({
            "message": "Failed to fetch matched donors"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
