
from flask import Blueprint, request, jsonify, g
from utils.auth import token_required, role_required
from services.auth_service import (
    register_user,
    login_user,
    create_token
)

import traceback

auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)


# ----------------------------------
# 1. HOSPITAL / BLOOD BANK REGISTER
# ----------------------------------

@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json(silent=True) or {}

    role = data.get("role")
    full_name = data.get("full_name")
    email = data.get("email")
    phone = data.get("phone")
    password = data.get("password")
    registration_no = data.get("registration_no")
    address = data.get("address")
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if role not in ("hospital", "blood_bank"):
        return jsonify({
            "status": "error",
            "message": "Only hospitals and blood banks can register"
        }), 400

    if not all([
        full_name,
        email,
        phone,
        password,
        registration_no,
        address
    ]) or latitude is None or longitude is None:

        return jsonify({
            "status": "error",
            "message": "All registration fields are required"
        }), 400

    try:
        latitude = float(latitude)
        longitude = float(longitude)

        if not (-90 <= latitude <= 90):
            raise ValueError("Invalid latitude")

        if not (-180 <= longitude <= 180):
            raise ValueError("Invalid longitude")

        user_id = register_user(
            role=role,
            full_name=full_name,
            email=email,
            phone=phone,
            password=password,
            registration_no=registration_no,
            address=address,
            latitude=latitude,
            longitude=longitude
        )

        return jsonify({
            "status": "success",
            "message": "Registration submitted. Awaiting admin verification.",
            "user_id": user_id,
            "verification_status": "Pending"
        }), 201

    except ValueError as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400

    except Exception:
        print("REGISTRATION ERROR:", flush=True)
        traceback.print_exc()

        return jsonify({
            "status": "error",
            "message": "Registration failed due to a server error"
        }), 500


# ----------------------------------
# 2. LOGIN
# ----------------------------------

@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json(silent=True) or {}

    login_value = data.get("login")
    password = data.get("password")

    if not login_value or not password:
        return jsonify({
            "status": "error",
            "message": "Email/phone and password are required"
        }), 400

    try:
        user, error = login_user(
            login_value,
            password
        )

        if error:
            return jsonify({
                "status": "error",
                "message": error
            }), 401

        token = create_token(user)

        return jsonify({
            "status": "success",
            "message": "Login successful",
            "token": token,
            "user": {
                "user_id": user["user_id"],
                "role": user["role"],
                "full_name": user["full_name"],
                "email": user["email"],
                "phone": user["phone"],
                "verification_status": user["verification_status"]
            }
        }), 200

    except Exception:
        print("LOGIN ERROR:", flush=True)
        traceback.print_exc()

        return jsonify({
            "status": "error",
            "message": "An internal server error occurred"
        }), 500


# ----------------------------------
# 3. AUTHENTICATED USER
# ----------------------------------

@auth_bp.route("/me", methods=["GET"])
@token_required
def me():

    return jsonify({
        "status": "success",
        "message": "Authenticated user",
        "user": {
            "user_id": g.current_user["user_id"],
            "role": g.current_user["role"]
        }
    }), 200


# ----------------------------------
# 4. HOSPITAL ACCESS TEST
# ----------------------------------

@auth_bp.route("/hospital-test", methods=["GET"])
@role_required("hospital")
def hospital_test():

    return jsonify({
        "status": "success",
        "message": "Hospital access granted",
        "hospital_id": g.current_user["user_id"]
    }), 200
