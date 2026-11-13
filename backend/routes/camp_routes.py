import hashlib
import secrets
from datetime import timezone
from datetime import timedelta
from datetime import date, datetime
from flask import Blueprint, request, jsonify, g
from services.email_service import send_email
from db import get_db_connection
from utils.auth import role_required
from routes.emergency_routes import distance_km

camp_bp = Blueprint("camps", __name__, url_prefix="/api/camps")


@camp_bp.route("/create", methods=["POST"])
@role_required("blood_bank")
def create_camp():
    data = request.get_json(silent=True) or {}

    camp_name = str(data.get("camp_name") or "").strip()
    description = str(data.get("description") or "").strip()
    camp_date = data.get("camp_date")
    start_time = data.get("start_time")
    end_time = data.get("end_time")
    venue = str(data.get("venue") or "").strip()

    try:
        camp_day = date.fromisoformat(camp_date)
        start = datetime.strptime(start_time, "%H:%M").time()
        end = datetime.strptime(end_time, "%H:%M").time()
        latitude = float(data.get("latitude"))
        longitude = float(data.get("longitude"))
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid date, time or coordinates"}), 400

    if not camp_name or not venue:
        return jsonify({"message": "Camp name and venue are required"}), 400

    if camp_day < date.today():
        return jsonify({"message": "Camp date cannot be in the past"}), 400

    if start >= end:
        return jsonify({"message": "End time must be after start time"}), 400

    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return jsonify({"message": "Invalid coordinates"}), 400

    blood_bank_id = g.current_user["user_id"]
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT name, verification_status
            FROM blood_bank
            WHERE blood_bank_id = %s
        """, (blood_bank_id,))

        bank = cursor.fetchone()

        if not bank or bank["verification_status"] != "Verified":
            return jsonify({"message": "Verified blood bank required"}), 403

        cursor.execute("""
            INSERT INTO donation_camps
                (blood_bank_id, camp_name, description, camp_date,
                 start_time, end_time, venue, latitude, longitude)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            blood_bank_id, camp_name, description, camp_day,
            start, end, venue, latitude, longitude
        ))

        camp_id = cursor.lastrowid

        cursor.execute("""
            SELECT donor_id, email, latitude, longitude
            FROM donor
            WHERE verification_status = 'Verified'
              AND latitude IS NOT NULL
              AND longitude IS NOT NULL
        """)

        donors = cursor.fetchall()
        notified_count = 0
        pending_emails = []

        for donor in donors:
            distance = distance_km(
                latitude,
                longitude,
                donor["latitude"],
                donor["longitude"]
            )

            if distance > 5:
                continue

            message = (
                f"Blood donation camp: {camp_name}. "
                f"Organized by {bank['name']}. "
                f"Date: {camp_day}. Time: {start_time}-{end_time}. "
                f"Venue: {venue}."
            )



            # Generate a secure response token for this donor.
            token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(
                token.encode("utf-8")
            ).hexdigest()

            expires_at = min(
                datetime.now(timezone.utc).replace(tzinfo=None)
                + timedelta(days=7),
                datetime.combine(camp_day, start)
                - timedelta(hours=5, minutes=30)
            )

            # Create notification linked to the camp.
            cursor.execute("""
                INSERT INTO notifications
                    (donor_id, blood_bank_id, camp_id,
                     notification_type, message, event_date,
                     location, response,
                     response_token_hash, token_expires_at)
                VALUES (
                    %s, %s, %s, 'Donation Camp',
                    %s, %s, %s, 'Pending', %s, %s
                )
            """, (
                donor["donor_id"],
                blood_bank_id,
                camp_id,
                message,
                datetime.combine(camp_day, start),
                venue,
                token_hash,
                expires_at
            ))


            # Prepare camp email for sending after commit.
            if donor.get("email"):
                response_link = (
                    f"http://127.0.0.1:5002/api/camps/respond/{token}"
                )

                subject = f"RaktaSahay Donation Camp - {camp_name}"

                email_message = (
                    f"Blood Donation Camp Invitation\n\n"
                    f"Camp: {camp_name}\n"
                    f"Organized by: {bank['name']}\n"
                    f"Date: {camp_day}\n"
                    f"Time: {start_time} - {end_time}\n"
                    f"Venue: {venue}\n\n"
                    f"Respond to this invitation:\n"
                    f"{response_link}\n\n"
                    f"Please respond before the camp starts.\n\n"
                    f"RaktaSahay Notifications"
                )

                pending_emails.append({
                    "to": donor["email"],
                    "subject": subject,
                    "message": email_message
                })

            notified_count += 1


        conn.commit()

        emails_sent = 0
        emails_failed = 0

        for email_data in pending_emails:
            try:
                send_email(
                    email_data["to"],
                    email_data["subject"],
                    email_data["message"]
                )
                emails_sent += 1
            except Exception:
                emails_failed += 1

        return jsonify({
            "status": "success",
            "message": "Donation camp created",
            "camp_id": camp_id,
            "notified_donors": notified_count,
            "emails_sent": emails_sent,
            "emails_failed": emails_failed
        }), 201

    except Exception:
        if conn:
            conn.rollback()
        return jsonify({"message": "Failed to create camp"}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@camp_bp.route("/my-camps", methods=["GET"])
@role_required("blood_bank")
def get_my_camps():
    blood_bank_id = g.current_user["user_id"]
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT camp_id, camp_name, description,
                   camp_date, start_time, end_time,
                   venue, latitude, longitude, status
            FROM donation_camps
            WHERE blood_bank_id = %s
            ORDER BY camp_date DESC
        """, (blood_bank_id,))

        camps = cursor.fetchall()

        for camp in camps:
            camp["camp_date"] = camp["camp_date"].isoformat()
            camp["start_time"] = str(camp["start_time"])
            camp["end_time"] = str(camp["end_time"])
            camp["latitude"] = float(camp["latitude"])
            camp["longitude"] = float(camp["longitude"])

        return jsonify({
            "status": "success",
            "camps": camps
        }), 200

    finally:
        cursor.close()
        conn.close()

@camp_bp.route("/<int:camp_id>", methods=["GET"])
@role_required("blood_bank")
def get_camp(camp_id):
    blood_bank_id = g.current_user["user_id"]
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT camp_id, camp_name, description,
                   camp_date, start_time, end_time,
                   venue, latitude, longitude, status
            FROM donation_camps
            WHERE camp_id = %s AND blood_bank_id = %s
        """, (camp_id, blood_bank_id))

        camp = cursor.fetchone()

        if not camp:
            return jsonify({"message": "Camp not found"}), 404

        camp["camp_date"] = camp["camp_date"].isoformat()
        camp["start_time"] = str(camp["start_time"])
        camp["end_time"] = str(camp["end_time"])
        camp["latitude"] = float(camp["latitude"])
        camp["longitude"] = float(camp["longitude"])

        return jsonify({
            "status": "success",
            "camp": camp
        }), 200

    finally:
        cursor.close()
        conn.close()


@camp_bp.route("/<int:camp_id>/status", methods=["PUT"])
@role_required("blood_bank")
def update_camp_status(camp_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get("status")

    if new_status not in ("Cancelled", "Completed"):
        return jsonify({
            "message": "Status must be Cancelled or Completed"
        }), 400

    blood_bank_id = g.current_user["user_id"]
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT dc.status, dc.camp_date, dc.end_time,
                   bb.verification_status
            FROM donation_camps dc
            JOIN blood_bank bb
                ON dc.blood_bank_id = bb.blood_bank_id
            WHERE dc.camp_id = %s
              AND dc.blood_bank_id = %s
            FOR UPDATE
        """, (camp_id, blood_bank_id))

        camp = cursor.fetchone()

        if not camp:
            return jsonify({"message": "Camp not found"}), 404

        if camp["verification_status"] != "Verified":
            return jsonify({
                "message": "Verified blood bank required"
            }), 403

        if camp["status"] != "Scheduled":
            return jsonify({
                "message": "Camp is already closed"
            }), 409

        if new_status == "Completed":
            camp_end = datetime.combine(
                camp["camp_date"],
                (datetime.min + camp["end_time"]).time()
            )

            if datetime.now() < camp_end:
                return jsonify({
                    "message": "Cannot complete camp before its end time"
                }), 409

            # Check attendance and donation records.
            cursor.execute("""
                SELECT
                    COUNT(*) AS total_participants,

                    COALESCE(SUM(
                        attendance_status = 'Not Marked'
                    ), 0) AS unmarked_attendance,

                    COALESCE(SUM(
                        donation_status = 'Donated'
                    ), 0) AS successful_donations,

                    COALESCE(SUM(
                        donation_status = 'Donated'
                        AND (
                            attendance_status <> 'Attended'
                            OR donation_date IS NULL
                            OR blood_group IS NULL
                        )
                    ), 0) AS invalid_donations

                FROM camp_participants
                WHERE camp_id = %s
            """, (camp_id,))

            stats = cursor.fetchone()

            if stats["unmarked_attendance"] > 0:
                return jsonify({
                    "message": "Mark attendance for all participants before completing camp",
                    "unmarked_attendance": int(
                        stats["unmarked_attendance"]
                    )
                }), 409

            if stats["invalid_donations"] > 0:
                return jsonify({
                    "message": "Some donation records are incomplete"
                }), 409

            # Verify that collection totals match donation records.
            cursor.execute("""
                SELECT COALESCE(SUM(units_collected), 0) AS total_units
                FROM camp_collections
                WHERE camp_id = %s
            """, (camp_id,))

            collection = cursor.fetchone()

            if int(stats["successful_donations"]) != int(
                collection["total_units"]
            ):
                return jsonify({
                    "message": "Donation count and collection units do not match",
                    "successful_donations": int(
                        stats["successful_donations"]
                    ),
                    "total_units": int(
                        collection["total_units"]
                    )
                }), 409

        cursor.execute("""
            UPDATE donation_camps
            SET status = %s
            WHERE camp_id = %s
        """, (new_status, camp_id))

        conn.commit()

        return jsonify({
            "status": "success",
            "camp_id": camp_id,
            "camp_status": new_status
        }), 200

    except Exception:
        if conn:
            conn.rollback()
        return jsonify({
            "message": "Failed to update camp status"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@camp_bp.route("/respond/<token>", methods=["POST"])
def respond_to_camp(token):
    data = request.get_json(silent=True) or {}
    response = data.get("response")

    if response not in ("Interested", "Not Interested"):
        return jsonify({
            "message": "Response must be Interested or Not Interested"
        }), 400

    token_hash = hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()

    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)


        cursor.execute("""
            SELECT n.notification_id,
                n.donor_id,
                n.camp_id,
                n.response,
                n.token_expires_at,
                n.token_used_at,
                dc.status AS camp_status,
                dc.camp_date
            FROM notifications n
            JOIN donation_camps dc
                ON n.camp_id = dc.camp_id
            WHERE n.response_token_hash = %s
            AND n.notification_type = 'Donation Camp'
            FOR UPDATE
        """, (token_hash,))


        notification = cursor.fetchone()

        if not notification:
            return jsonify({"message": "Invalid response link"}), 404

        if (notification["response"] != "Pending"
                or notification["token_used_at"] is not None):
            return jsonify({"message": "Already responded"}), 409

        if notification["camp_status"] != "Scheduled":
            return jsonify({"message": "Camp is not active"}), 409

        if notification["camp_date"] < date.today():
            return jsonify({"message": "Camp date has passed"}), 409

        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

        if (notification["token_expires_at"] is None
                or notification["token_expires_at"] <= now_utc):
            return jsonify({"message": "Response link expired"}), 410

        cursor.execute("""
            UPDATE notifications
            SET response = %s,
                response_at = UTC_TIMESTAMP(),
                token_used_at = UTC_TIMESTAMP()
            WHERE notification_id = %s
              AND response = 'Pending'
              AND token_used_at IS NULL
        """, (response, notification["notification_id"]))

        if cursor.rowcount != 1:
            conn.rollback()
            return jsonify({"message": "Already responded"}), 409

        # Convert notification response into RSVP status.
        rsvp_status = (
            "Confirmed"
            if response == "Interested"
            else "Declined"
        )
        attendance_status = (
            "Not Marked"
            if response == "Interested"
            else "Absent"
        )

        # Check whether this donor already has a camp record.
        cursor.execute("""
            SELECT participation_id
            FROM camp_participants
            WHERE camp_id = %s
            AND donor_id = %s
            FOR UPDATE
        """, (
            notification["camp_id"],
            notification["donor_id"]
        ))

        existing_participant = cursor.fetchone()

        if existing_participant:
            cursor.execute("""
                UPDATE camp_participants
                SET rsvp_status = %s,
                    attendance_status = CASE
                        WHEN %s = 'Declined'
                            AND donation_status = 'Not Donated'
                        THEN 'Absent'
                        ELSE attendance_status
                    END
                WHERE participation_id = %s
            """, (
                rsvp_status,
                rsvp_status,
                existing_participant["participation_id"]
            ))
        else:
            cursor.execute("""
                INSERT INTO camp_participants
                    (camp_id, donor_id, participation_type,
                    rsvp_status, attendance_status,
                    donation_status)
                VALUES (%s, %s, 'RSVP', %s, %s, 'Not Donated')
            """, (
                notification["camp_id"],
                notification["donor_id"],
                rsvp_status,
                attendance_status
            ))

        conn.commit()


        return jsonify({
            "status": "success",
            "message": "Camp response recorded",
            "response": response
        }), 200

    except Exception:
        if conn:
            conn.rollback()
        return jsonify({"message": "Failed to record response"}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@camp_bp.route("/<int:camp_id>/interest", methods=["GET"])
@role_required("blood_bank")
def get_camp_interest(camp_id):
    blood_bank_id = g.current_user["user_id"]
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT dc.camp_id, dc.camp_name, dc.status,
                   bb.verification_status
            FROM donation_camps dc
            JOIN blood_bank bb
                ON dc.blood_bank_id = bb.blood_bank_id
            WHERE dc.camp_id = %s
              AND dc.blood_bank_id = %s
        """, (camp_id, blood_bank_id))

        camp = cursor.fetchone()

        if not camp:
            return jsonify({"message": "Camp not found"}), 404

        if camp["verification_status"] != "Verified":
            return jsonify({
                "message": "Verified blood bank required"
            }), 403

        cursor.execute("""
            SELECT
                COUNT(*) AS total_notified,
                COALESCE(SUM(response = 'Interested'), 0)
                    AS interested,
                COALESCE(SUM(response = 'Not Interested'), 0)
                    AS not_interested,
                COALESCE(SUM(response = 'Pending'), 0)
                    AS pending
            FROM notifications
            WHERE camp_id = %s
              AND notification_type = 'Donation Camp'
        """, (camp_id,))

        counts = cursor.fetchone()

        return jsonify({
            "status": "success",
            "camp_id": camp["camp_id"],
            "camp_name": camp["camp_name"],
            "camp_status": camp["status"],
            "total_notified": int(counts["total_notified"]),
            "interested": int(counts["interested"]),
            "not_interested": int(counts["not_interested"]),
            "pending": int(counts["pending"])
        }), 200

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@camp_bp.route("/<int:camp_id>/walk-in", methods=["POST"])
@role_required("blood_bank")
def register_walk_in(camp_id):
    data = request.get_json(silent=True) or {}

    donor_name = str(data.get("donor_name") or "").strip()
    phone = str(data.get("phone") or "").strip()
    blood_group = str(data.get("blood_group") or "").strip().upper()

    valid_groups = {
        "A+", "A-", "B+", "B-",
        "AB+", "AB-", "O+", "O-"
    }

    if not donor_name or not phone:
        return jsonify({
            "message": "Donor name and phone are required"
        }), 400

    if blood_group not in valid_groups:
        return jsonify({
            "message": "Valid blood group is required"
        }), 400

    blood_bank_id = g.current_user["user_id"]
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT dc.status, bb.verification_status
            FROM donation_camps dc
            JOIN blood_bank bb
                ON dc.blood_bank_id = bb.blood_bank_id
            WHERE dc.camp_id = %s
              AND dc.blood_bank_id = %s
            FOR UPDATE
        """, (camp_id, blood_bank_id))

        camp = cursor.fetchone()

        if not camp:
            return jsonify({"message": "Camp not found"}), 404

        if camp["verification_status"] != "Verified":
            return jsonify({
                "message": "Verified blood bank required"
            }), 403

        if camp["status"] != "Scheduled":
            return jsonify({
                "message": "Camp is not open for registration"
            }), 409

        cursor.execute("""
            INSERT INTO camp_participants
                (camp_id, donor_name, phone, blood_group,
                 participation_type, attendance_status)
            VALUES
                (%s, %s, %s, %s, 'Walk-in', 'Attended')
        """, (
            camp_id,
            donor_name,
            phone,
            blood_group
        ))

        participation_id = cursor.lastrowid
        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Walk-in participant registered",
            "participation_id": participation_id,
            "blood_group": blood_group
        }), 201

    except Exception:
        if conn:
            conn.rollback()
        return jsonify({
            "message": "Failed to register walk-in participant"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@camp_bp.route("/<int:camp_id>/participants", methods=["GET"])
@role_required("blood_bank")
def get_camp_participants(camp_id):
    blood_bank_id = g.current_user["user_id"]
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT camp_id
            FROM donation_camps
            WHERE camp_id = %s
              AND blood_bank_id = %s
        """, (camp_id, blood_bank_id))

        if not cursor.fetchone():
            return jsonify({
                "message": "Camp not found"
            }), 404

        cursor.execute("""
            SELECT
                cp.participation_id,
                cp.donor_id,
                COALESCE(cp.donor_name, d.name) AS donor_name,
                COALESCE(cp.phone, d.phone) AS phone,
                COALESCE(cp.blood_group, d.blood_group) AS blood_group,
                cp.participation_type,
                cp.rsvp_status,
                cp.attendance_status,
                cp.donation_status,
                cp.donation_date,
                cp.created_at
            FROM camp_participants cp
            LEFT JOIN donor d
                ON cp.donor_id = d.donor_id
            WHERE cp.camp_id = %s
            ORDER BY cp.created_at DESC,
                     cp.participation_id DESC
        """, (camp_id,))

        participants = cursor.fetchall()

        for participant in participants:
            if participant["donation_date"]:
                participant["donation_date"] = (
                    participant["donation_date"].isoformat()
                )

            if participant["created_at"]:
                participant["created_at"] = (
                    participant["created_at"].isoformat()
                )

        return jsonify({
            "status": "success",
            "camp_id": camp_id,
            "total_participants": len(participants),
            "participants": participants
        }), 200

    except Exception:
        return jsonify({
            "message": "Failed to fetch camp participants"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@camp_bp.route(
    "/<int:camp_id>/participants/<int:participation_id>/attendance",
    methods=["PUT"]
)
@role_required("blood_bank")
def update_camp_attendance(camp_id, participation_id):
    data = request.get_json(silent=True) or {}
    attendance = data.get("attendance_status")

    if attendance not in ("Attended", "Absent"):
        return jsonify({
            "message": "Attendance must be Attended or Absent"
        }), 400

    blood_bank_id = g.current_user["user_id"]
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT dc.status, bb.verification_status
            FROM donation_camps dc
            JOIN blood_bank bb
                ON dc.blood_bank_id = bb.blood_bank_id
            WHERE dc.camp_id = %s
              AND dc.blood_bank_id = %s
            FOR UPDATE
        """, (camp_id, blood_bank_id))

        camp = cursor.fetchone()

        if not camp:
            return jsonify({"message": "Camp not found"}), 404

        if camp["verification_status"] != "Verified":
            return jsonify({
                "message": "Verified blood bank required"
            }), 403

        if camp["status"] != "Scheduled":
            return jsonify({
                "message": "Completed or cancelled camps cannot be edited"
            }), 409

        cursor.execute("""
            SELECT participation_id, attendance_status,
                   donation_status
            FROM camp_participants
            WHERE participation_id = %s
              AND camp_id = %s
            FOR UPDATE
        """, (participation_id, camp_id))

        participant = cursor.fetchone()

        if not participant:
            return jsonify({
                "message": "Participant not found"
            }), 404

        if (attendance == "Absent"
                and participant["donation_status"] == "Donated"):
            return jsonify({
                "message": "A donor who donated cannot be marked absent"
            }), 409

        cursor.execute("""
            UPDATE camp_participants
            SET attendance_status = %s
            WHERE participation_id = %s
              AND camp_id = %s
        """, (attendance, participation_id, camp_id))

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Attendance updated",
            "participation_id": participation_id,
            "attendance_status": attendance
        }), 200

    except Exception:
        if conn:
            conn.rollback()
        return jsonify({
            "message": "Failed to update attendance"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@camp_bp.route(
    "/<int:camp_id>/participants/<int:participation_id>/donate",
    methods=["POST"]
)
@role_required("blood_bank")
def record_camp_donation(camp_id, participation_id):
    data = request.get_json(silent=True) or {}
    blood_group = str(data.get("blood_group") or "").strip().upper()

    valid_groups = {
        "A+", "A-", "B+", "B-",
        "AB+", "AB-", "O+", "O-"
    }

    if blood_group not in valid_groups:
        return jsonify({
            "message": "Valid blood group is required"
        }), 400

    blood_bank_id = g.current_user["user_id"]
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT dc.status, dc.camp_date,
                   bb.verification_status
            FROM donation_camps dc
            JOIN blood_bank bb
                ON dc.blood_bank_id = bb.blood_bank_id
            WHERE dc.camp_id = %s
              AND dc.blood_bank_id = %s
            FOR UPDATE
        """, (camp_id, blood_bank_id))

        camp = cursor.fetchone()

        if not camp:
            return jsonify({"message": "Camp not found"}), 404

        if camp["verification_status"] != "Verified":
            return jsonify({
                "message": "Verified blood bank required"
            }), 403

        if camp["status"] != "Scheduled":
            return jsonify({
                "message": "Camp records are finalized"
            }), 409

        if camp["camp_date"] != date.today():
            return jsonify({
                "message": "Donations can only be recorded on the camp date"
            }), 409

        cursor.execute("""
            SELECT donor_id, attendance_status,
                   donation_status
            FROM camp_participants
            WHERE participation_id = %s
              AND camp_id = %s
            FOR UPDATE
        """, (participation_id, camp_id))

        participant = cursor.fetchone()

        if not participant:
            return jsonify({
                "message": "Participant not found"
            }), 404

        if participant["attendance_status"] != "Attended":
            return jsonify({
                "message": "Mark attendance before recording donation"
            }), 409

        if participant["donation_status"] == "Donated":
            return jsonify({
                "message": "Donation already recorded"
            }), 409

        donor_id = participant["donor_id"]

        if donor_id is not None:
            cursor.execute("""
                SELECT blood_group
                FROM donor
                WHERE donor_id = %s
            """, (donor_id,))

            donor = cursor.fetchone()

            if not donor:
                return jsonify({
                    "message": "Registered donor not found"
                }), 404

            if donor["blood_group"] != blood_group:
                return jsonify({
                    "message": "Blood group does not match donor record"
                }), 409

        cursor.execute("""
            UPDATE camp_participants
            SET donation_status = 'Donated',
                donation_date = %s,
                blood_group = %s
            WHERE participation_id = %s
              AND camp_id = %s
        """, (
            camp["camp_date"],
            blood_group,
            participation_id,
            camp_id
        ))

        cursor.execute("""
            INSERT INTO camp_collections
                (camp_id, blood_group, units_collected)
            VALUES (%s, %s, 1)
            ON DUPLICATE KEY UPDATE
                units_collected = units_collected + 1
        """, (camp_id, blood_group))

        if donor_id is not None:
            cursor.execute("""
                UPDATE donor
                SET last_donation_date = %s,
                    total_donations = total_donations + 1,
                    camp_participation_count =
                        camp_participation_count + 1
                WHERE donor_id = %s
            """, (camp["camp_date"], donor_id))

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Donation recorded successfully",
            "participation_id": participation_id,
            "blood_group": blood_group,
            "units_added": 1
        }), 201

    except Exception:
        if conn:
            conn.rollback()
        return jsonify({
            "message": "Failed to record donation"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@camp_bp.route("/<int:camp_id>/summary", methods=["GET"])
@role_required("blood_bank")
def get_camp_summary(camp_id):
    blood_bank_id = g.current_user["user_id"]
    conn = None
    cursor = None

    blood_groups = [
        "A+", "A-", "B+", "B-",
        "AB+", "AB-", "O+", "O-"
    ]

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Verify that this camp belongs to the blood bank.
        cursor.execute("""
            SELECT camp_id, camp_name, camp_date,
                   venue, status
            FROM donation_camps
            WHERE camp_id = %s
              AND blood_bank_id = %s
        """, (camp_id, blood_bank_id))

        camp = cursor.fetchone()

        if not camp:
            return jsonify({
                "message": "Camp not found"
            }), 404

        # Count registered camp participants.
        cursor.execute("""
            SELECT
                COUNT(*) AS total_participants,

                COALESCE(SUM(
                    participation_type = 'RSVP'
                ), 0) AS rsvp_participants,

                COALESCE(SUM(
                    participation_type = 'Walk-in'
                ), 0) AS walk_in_participants,

                COALESCE(SUM(
                    attendance_status = 'Attended'
                ), 0) AS attended,

                COALESCE(SUM(
                    attendance_status = 'Absent'
                ), 0) AS absent,

                COALESCE(SUM(
                    donation_status = 'Donated'
                ), 0) AS successful_donations

            FROM camp_participants
            WHERE camp_id = %s
        """, (camp_id,))

        counts = cursor.fetchone()

        # Read authoritative camp collection totals.
        cursor.execute("""
            SELECT blood_group, units_collected
            FROM camp_collections
            WHERE camp_id = %s
        """, (camp_id,))

        collection_rows = cursor.fetchall()

        collections = {
            group: 0 for group in blood_groups
        }

        for row in collection_rows:
            collections[row["blood_group"]] = int(
                row["units_collected"]
            )

        total_units = sum(collections.values())

        return jsonify({
            "status": "success",
            "camp": {
                "camp_id": camp["camp_id"],
                "camp_name": camp["camp_name"],
                "camp_date": camp["camp_date"].isoformat(),
                "venue": camp["venue"],
                "camp_status": camp["status"]
            },
            "participation": {
                "total_participants": int(
                    counts["total_participants"]
                ),
                "rsvp_participants": int(
                    counts["rsvp_participants"]
                ),
                "walk_in_participants": int(
                    counts["walk_in_participants"]
                ),
                "attended": int(counts["attended"]),
                "absent": int(counts["absent"]),
                "successful_donations": int(
                    counts["successful_donations"]
                )
            },
            "collections": {
                "total_units_collected": total_units,
                "blood_group_breakdown": collections
            }
        }), 200

    except Exception:
        return jsonify({
            "message": "Failed to generate camp summary"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@camp_bp.route("/<int:camp_id>/registered-check-in", methods=["POST"])
@role_required("blood_bank")
def registered_donor_check_in(camp_id):
    """Check in an existing verified donor without creating a duplicate donor."""
    data = request.get_json(silent=True) or {}
    try:
        donor_id = int(data.get("donor_id"))
        if donor_id <= 0:
            raise ValueError()
    except (TypeError, ValueError):
        return jsonify({"message": "Valid donor_id is required"}), 400

    blood_bank_id = g.current_user["user_id"]
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT dc.status, bb.verification_status
            FROM donation_camps dc
            JOIN blood_bank bb ON bb.blood_bank_id = dc.blood_bank_id
            WHERE dc.camp_id = %s AND dc.blood_bank_id = %s
            FOR UPDATE
        """, (camp_id, blood_bank_id))
        camp = cursor.fetchone()
        if not camp:
            return jsonify({"message": "Camp not found"}), 404
        if camp["verification_status"] != "Verified":
            return jsonify({"message": "Verified blood bank required"}), 403
        if camp["status"] != "Scheduled":
            return jsonify({"message": "Camp is not open for check-in"}), 409

        cursor.execute("""
            SELECT donor_id, name, blood_group, verification_status
            FROM donor WHERE donor_id = %s
        """, (donor_id,))
        donor = cursor.fetchone()
        if not donor:
            return jsonify({"message": "Registered donor not found"}), 404
        if donor["verification_status"] != "Verified":
            return jsonify({"message": "Only verified donors can check in"}), 409

        cursor.execute("""
            SELECT participation_id, attendance_status, donation_status,
                   rsvp_status
            FROM camp_participants
            WHERE camp_id = %s AND donor_id = %s
            FOR UPDATE
        """, (camp_id, donor_id))
        existing = cursor.fetchone()
        if existing:
            if existing["attendance_status"] == "Attended":
                return jsonify({"message": "Donor is already marked attended for this camp"}), 409
            if existing["donation_status"] == "Donated":
                return jsonify({"message": "Donation already recorded for this donor"}), 409
            cursor.execute("""
                UPDATE camp_participants
                SET attendance_status = 'Attended',
                    rsvp_status = CASE WHEN participation_type = 'RSVP'
                        THEN 'Confirmed' ELSE rsvp_status END
                WHERE participation_id = %s
            """, (existing["participation_id"],))
            participation_id = existing["participation_id"]
            status_code = 200
        else:
            cursor.execute("""
                INSERT INTO camp_participants
                    (camp_id, donor_id, blood_group, participation_type,
                     rsvp_status, attendance_status, donation_status)
                VALUES (%s, %s, %s, 'Walk-in', 'Pending', 'Attended', 'Not Donated')
            """, (camp_id, donor_id, donor["blood_group"]))
            participation_id = cursor.lastrowid
            status_code = 201
        conn.commit()
        return jsonify({
            "status": "success",
            "message": "Registered donor marked attended",
            "participation_id": participation_id,
            "donor_id": donor_id
        }), status_code
    except Exception:
        if conn:
            conn.rollback()
        return jsonify({"message": "Failed to check in registered donor"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
