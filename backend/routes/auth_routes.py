from utils.auth import token_required
from flask import Blueprint, request, jsonify, g
from services.auth_service import register_user, login_user, create_token
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    role = data.get("role")
    full_name = data.get("full_name")
    email = data.get("email")
    phone = data.get("phone")
    password = data.get("password")

    if not all([role, full_name, email, phone, password]):
        return jsonify({
            "status": "error",
            "message": "All fields are required"
        }), 400

    try:
        user_id = register_user(
            role,
            full_name,
            email,
            phone,
            password
        )

        return jsonify({
            "status": "success",
            "message": "User registered successfully",
            "user_id": user_id
        }), 201

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    login_value = data.get("login")
    password = data.get("password")

    if not login_value or not password:
        return jsonify({
            "status": "error",
            "message": "Email/phone and password are required"
        }), 400

    try:
        user, error = login_user(login_value, password)

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
                "email_verified": user["email_verified"],
                "phone_verified": user["phone_verified"]
            }
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

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