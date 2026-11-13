
from flask import Blueprint, request, jsonify, g
from db import get_db_connection
from utils.auth import role_required

admin_bp = Blueprint(
    "admin",
    __name__,
    url_prefix="/api/admin"
)



@admin_bp.route("/pending", methods=["GET"])
@role_required("admin")
def pending_registrations():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Pending hospitals
        cursor.execute("""
            SELECT
                hospital_id AS id,
                name,
                email,
                phone,
                registration_no,
                address,
                latitude,
                longitude,
                created_at,
                verification_status
            FROM hospital
            WHERE verification_status = 'Pending'
            ORDER BY created_at DESC
        """)

        hospitals = cursor.fetchall()

        # Pending blood banks
        cursor.execute("""
            SELECT
                blood_bank_id AS id,
                name,
                email,
                phone,
                license_no AS registration_no,
                address,
                latitude,
                longitude,
                created_at,
                verification_status
            FROM blood_bank
            WHERE verification_status = 'Pending'
            ORDER BY created_at DESC
        """)

        blood_banks = cursor.fetchall()

        # Convert datetime values to ISO strings
        for organization in hospitals + blood_banks:
            if organization["created_at"]:
                organization["created_at"] = (
                    organization["created_at"].isoformat()
                )

        return jsonify({
            "status": "success",
            "hospitals": hospitals,
            "blood_banks": blood_banks
        }), 200

    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/verify/<role>/<int:user_id>", methods=["PUT"])
@role_required("admin")
def verify_registration(role, user_id):

    if role not in ("hospital", "blood_bank"):
        return jsonify({"message": "Invalid role"}), 400

    data = request.get_json(silent=True) or {}
    decision = data.get("decision")

    if decision not in ("Verified", "Rejected"):
        return jsonify({
            "message": "Decision must be Verified or Rejected"
        }), 400

    table = "hospital" if role == "hospital" else "blood_bank"
    id_column = "hospital_id" if role == "hospital" else "blood_bank_id"

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            f"""
            UPDATE {table}
            SET verification_status = %s,
                verified_by = %s
            WHERE {id_column} = %s
              AND verification_status = 'Pending'
            """,
            (decision, g.current_user["user_id"], user_id)
        )

        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({
                "message": "Pending registration not found"
            }), 404

        conn.commit()

        return jsonify({
            "status": "success",
            "message": f"{role} registration {decision.lower()}"
        }), 200

    except Exception:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()
@admin_bp.route("/organizations", methods=["GET"])
@role_required("admin")
def get_organizations():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT hospital_id AS id, name, email,
                   registration_no, verification_status
            FROM hospital
        """)
        hospitals = cursor.fetchall()

        cursor.execute("""
            SELECT blood_bank_id AS id, name, email,
                license_no AS registration_no,
                verification_status
            FROM blood_bank
        """)
        blood_banks = cursor.fetchall()

        return jsonify({
            "status": "success",
            "hospitals": hospitals,
            "blood_banks": blood_banks
        }), 200

    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/donors", methods=["GET"])
@role_required("admin")
def get_all_donors():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT donor_id AS id,
                   name,
                   email,
                   blood_group,
                   verification_status,
                   availability_status AS availability
            FROM donor
            ORDER BY donor_id DESC
        """)

        donors = cursor.fetchall()

        return jsonify({
            "status": "success",
            "donors": donors,
            "total": len(donors)
        }), 200

    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/emergency-requests", methods=["GET"])
@role_required("admin")
def get_all_emergency_requests():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                er.request_id AS id,
                er.hospital_id,
                h.name AS hospital_name,
                er.blood_group,
                er.urgency,
                er.request_status,
                er.created_at
            FROM emergency_requests er
            LEFT JOIN hospital h
                ON er.hospital_id = h.hospital_id
            ORDER BY er.created_at DESC
        """)

        requests = cursor.fetchall()

        for item in requests:
            if item["created_at"]:
                item["created_at"] = item["created_at"].isoformat()

        return jsonify({
            "status": "success",
            "requests": requests,
            "total": len(requests)
        }), 200

    finally:
        cursor.close()
        conn.close()
