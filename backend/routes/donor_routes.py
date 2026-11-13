
import os
import uuid
from datetime import date

from flask import Blueprint, request, jsonify, g, send_from_directory
from werkzeug.utils import secure_filename
from mysql.connector import IntegrityError

from db import get_db_connection
from utils.auth import role_required


donor_bp = Blueprint(
    "donors", __name__, url_prefix="/api/donors"
)

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "uploads", "donors"
)

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}
BLOOD_GROUPS = {
    "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
}


@donor_bp.route("/register", methods=["POST"])
def register_donor():
    data = request.form
    document = request.files.get("document")

    required = [
        "name", "age", "blood_group", "phone",
        "address", "latitude", "longitude"
    ]

    if any(not data.get(field) for field in required):
        return jsonify({
            "status": "error",
            "message": "Required fields are missing"
        }), 400

    if not document or not document.filename:
        return jsonify({
            "status": "error",
            "message": "Supporting document is required"
        }), 400

    extension = document.filename.rsplit(".", 1)[-1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        return jsonify({
            "status": "error",
            "message": "Only PDF, JPG and PNG files are allowed"
        }), 400

    try:
        age = int(data["age"])
        latitude = float(data["latitude"])
        longitude = float(data["longitude"])

        if not 18 <= age <= 65:
            raise ValueError("Age must be between 18 and 65")

        if not -90 <= latitude <= 90:
            raise ValueError("Invalid latitude")

        if not -180 <= longitude <= 180:
            raise ValueError("Invalid longitude")

        blood_group = data["blood_group"].upper()

        if blood_group not in BLOOD_GROUPS:
            raise ValueError("Invalid blood group")

        last_donation = data.get("last_donation_date") or None

        if last_donation:
            donation_date = date.fromisoformat(last_donation)
            if donation_date > date.today():
                raise ValueError("Donation date cannot be in the future")

    except (ValueError, TypeError) as error:
        return jsonify({
            "status": "error",
            "message": str(error)
        }), 400

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    filename = secure_filename(document.filename)
    saved_name = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, saved_name)

    conn = None
    cursor = None

    try:
        document.save(file_path)

        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            INSERT INTO donor (
                name, age, gender, blood_group,
                phone, email, address,
                latitude, longitude,
                registration_source,
                supporting_document, document_type,
                verification_status,
                availability_status,
                last_donation_date
            )
            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
        """

        values = (
            data["name"].strip(),
            age,
            data.get("gender") or None,
            blood_group,
            data["phone"].strip(),
            data.get("email") or None,
            data["address"].strip(),
            latitude,
            longitude,
            "Individual",
            saved_name,
            extension,
            "Pending",
            "Unavailable",
            last_donation
        )

        cursor.execute(query, values)
        donor_id = cursor.lastrowid
        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Donor registration submitted",
            "donor_id": donor_id,
            "verification_status": "Pending"
        }), 201

    except (IntegrityError, Exception):
        if conn:
            conn.rollback()

        if os.path.exists(file_path):
            os.remove(file_path)

        return jsonify({
            "status": "error",
            "message": "Donor registration failed"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@donor_bp.route("/pending", methods=["GET"])
@role_required("admin", "hospital", "blood_bank")
def pending_donors():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT donor_id, name, age, blood_group,
                   phone, registration_source,
                   supporting_document,
                   verification_status
            FROM donor
            WHERE verification_status = 'Pending'
        """)

        return jsonify({
            "status": "success",
            "donors": cursor.fetchall()
        }), 200

    finally:
        cursor.close()
        conn.close()


@donor_bp.route("/verify/<int:donor_id>", methods=["PUT"])
@role_required("admin", "hospital", "blood_bank")
def verify_donor(donor_id):
    data = request.get_json(silent=True) or {}
    decision = data.get("decision")

    if decision not in ("Verified", "Rejected"):
        return jsonify({
            "status": "error",
            "message": "Decision must be Verified or Rejected"
        }), 400

    role = g.current_user["role"]
    user_id = g.current_user["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Hospitals and blood banks must be verified.
        if role in ("hospital", "blood_bank"):
            table = "hospital" if role == "hospital" else "blood_bank"
            id_column = (
                "hospital_id" if role == "hospital"
                else "blood_bank_id"
            )

            cursor.execute(
                f"""
                SELECT verification_status
                FROM {table}
                WHERE {id_column} = %s
                """,
                (user_id,)
            )

            organization = cursor.fetchone()

            if not organization or organization[0] != "Verified":
                return jsonify({
                    "status": "error",
                    "message": "Organization is not verified"
                }), 403

        cursor.execute("""
            UPDATE donor
            SET verification_status = %s,
                availability_status = %s,
                verified_by_id = %s,
                verified_by_role = %s
            WHERE donor_id = %s
              AND verification_status = 'Pending'
        """, (
            decision,
            "Available" if decision == "Verified" else "Unavailable",
            user_id,
            role,
            donor_id
        ))

        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({
                "status": "error",
                "message": "Pending donor not found"
            }), 404

        conn.commit()

        return jsonify({
            "status": "success",
            "message": f"Donor {decision.lower()}",
            "donor_id": donor_id,
            "verified_by_role": role,
            "verified_by_id": user_id
        }), 200

    except Exception:
        conn.rollback()
        return jsonify({
            "status": "error",
            "message": "Donor verification failed"
        }), 500

    finally:
        cursor.close()
        conn.close()



@donor_bp.route("/register-organization", methods=["POST"])
@role_required("hospital", "blood_bank")
def register_organization_donor():
    data = request.get_json(silent=True) or {}

    required = [
        "name", "age", "blood_group", "phone",
        "address", "latitude", "longitude"
    ]

    if any(data.get(field) is None or str(data.get(field)).strip() == ""
           for field in required):
        return jsonify({
            "status": "error",
            "message": "Required fields are missing"
        }), 400

    try:
        age = int(data["age"])
        latitude = float(data["latitude"])
        longitude = float(data["longitude"])
        blood_group = str(data["blood_group"]).upper().strip()

        if not 18 <= age <= 65:
            raise ValueError("Age must be between 18 and 65")

        if not -90 <= latitude <= 90:
            raise ValueError("Invalid latitude")

        if not -180 <= longitude <= 180:
            raise ValueError("Invalid longitude")

        if blood_group not in BLOOD_GROUPS:
            raise ValueError("Invalid blood group")

        last_donation = data.get("last_donation_date") or None
        if last_donation:
            donation_date = date.fromisoformat(last_donation)
            if donation_date > date.today():
                raise ValueError("Donation date cannot be in the future")

    except (ValueError, TypeError) as error:
        return jsonify({
            "status": "error",
            "message": str(error)
        }), 400

    role = g.current_user["role"]
    registered_by_id = g.current_user["user_id"]

    source = "Hospital" if role == "hospital" else "Blood Bank"

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Confirm the organization is still verified
        table = "hospital" if role == "hospital" else "blood_bank"
        id_column = "hospital_id" if role == "hospital" else "blood_bank_id"

        cursor.execute(
            f"""
            SELECT verification_status
            FROM {table}
            WHERE {id_column} = %s
            """,
            (registered_by_id,)
        )

        organization = cursor.fetchone()

        if not organization or organization[0] != "Verified":
            return jsonify({
                "status": "error",
                "message": "Organization is not verified"
            }), 403

        cursor.execute("""
            INSERT INTO donor (
                name, age, gender, blood_group,
                phone, email, address,
                latitude, longitude,
                registration_source,
                registered_by_id,
                verification_status,
                availability_status,
                last_donation_date
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            data["name"].strip(),
            age,
            data.get("gender"),
            blood_group,
            str(data["phone"]).strip(),
            data.get("email"),
            data["address"].strip(),
            latitude,
            longitude,
            source,
            registered_by_id,
            "Pending",
            "Unavailable",
            last_donation
        ))

        donor_id = cursor.lastrowid
        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Donor registered. Awaiting verification.",
            "donor_id": donor_id,
            "registration_source": source,
            "verification_status": "Pending"
        }), 201

    except Exception:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()

@donor_bp.route("/<int:donor_id>/document", methods=["GET"])
@role_required("admin", "hospital", "blood_bank")
def view_donor_document(donor_id):
    role = g.current_user["role"]
    user_id = g.current_user["user_id"]

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Only verified organizations can review documents
        if role in ("hospital", "blood_bank"):
            table = "hospital" if role == "hospital" else "blood_bank"
            id_column = (
                "hospital_id" if role == "hospital"
                else "blood_bank_id"
            )

            cursor.execute(
                f"""
                SELECT verification_status
                FROM {table}
                WHERE {id_column} = %s
                """,
                (user_id,)
            )

            organization = cursor.fetchone()

            if not organization or organization["verification_status"] != "Verified":
                return jsonify({
                    "status": "error",
                    "message": "Organization is not verified"
                }), 403

        cursor.execute(
            """
            SELECT supporting_document
            FROM donor
            WHERE donor_id = %s
            """,
            (donor_id,)
        )

        donor = cursor.fetchone()

        if not donor:
            return jsonify({
                "status": "error",
                "message": "Donor not found"
            }), 404

        filename = donor["supporting_document"]

        if not filename:
            return jsonify({
                "status": "error",
                "message": "No supporting document uploaded"
            }), 404

        return send_from_directory(
            UPLOAD_DIR,
            filename,
            as_attachment=False
        )

    finally:
        cursor.close()
        conn.close()

@donor_bp.route("/manage", methods=["GET"])
@role_required("admin", "hospital", "blood_bank")
def manage_donors():
    """List donors for authorized organization dashboards (read-only)."""
    role = g.current_user["role"]
    user_id = g.current_user["user_id"]
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if role in ("hospital", "blood_bank"):
            table = "hospital" if role == "hospital" else "blood_bank"
            id_col = "hospital_id" if role == "hospital" else "blood_bank_id"
            cursor.execute(
                f"SELECT verification_status FROM {table} WHERE {id_col} = %s",
                (user_id,)
            )
            organization = cursor.fetchone()
            if not organization or organization["verification_status"] != "Verified":
                return jsonify({"status": "error", "message": "Organization is not verified"}), 403

        cursor.execute("""
            SELECT donor_id, name, age, blood_group, phone, email,
                   registration_source, verification_status,
                   availability_status, last_donation_date,
                   total_donations, camp_participation_count,
                   CASE WHEN supporting_document IS NULL OR supporting_document = ''
                        THEN 0 ELSE 1 END AS has_document
            FROM donor
            ORDER BY donor_id DESC
        """)
        donors = cursor.fetchall()
        for donor in donors:
            if donor["last_donation_date"] is not None:
                donor["last_donation_date"] = donor["last_donation_date"].isoformat()
            donor["has_document"] = bool(donor["has_document"])
        return jsonify({"status": "success", "donors": donors}), 200
    except Exception:
        return jsonify({"status": "error", "message": "Unable to load donors"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
