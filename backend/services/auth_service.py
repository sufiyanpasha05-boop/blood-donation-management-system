import os
import jwt
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from models.user_model import create_user, get_user_by_email_or_phone


def hash_password(password):
    return generate_password_hash(password)


def verify_password(password, password_hash):
    return check_password_hash(password_hash, password)



def register_user(role, full_name, email, phone, password,
                  registration_no=None, address=None,
                  latitude=None, longitude=None):

    if role not in ("hospital", "blood_bank"):
        raise ValueError("Invalid registration role")

    if not all([
        full_name, email, phone, password,
        registration_no, address
    ]):
        raise ValueError("All required fields must be provided")

    if len(password) < 12:
        raise ValueError("Password must contain at least 12 characters")

    if latitude is None or longitude is None:
        raise ValueError("Location coordinates are required")

    password_hash = hash_password(password)

    user_id = create_user(
        role=role,
        full_name=full_name,
        email=email,
        phone=phone,
        password_hash=password_hash,
        registration_no=registration_no,
        address=address,
        latitude=latitude,
        longitude=longitude
    )

    return user_id


def login_user(login, password):
    user = get_user_by_email_or_phone(login)

    # Check whether account exists
    if not user:
        return None, "Invalid email/phone or password"

    # Verify password
    if not verify_password(password, user["password_hash"]):
        return None, "Invalid email/phone or password"

    # Check hospital and blood bank verification
    if user["role"] in ["hospital", "blood_bank"]:

        if user["verification_status"] != "Verified":
            return None, "Account is not verified or is suspended"

    return user, None

def create_token(user):
    payload = {
        "user_id": user["user_id"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }

    token = jwt.encode(
        payload,
        os.getenv("JWT_SECRET"),
        algorithm="HS256"
    )

    return token


def decode_token(token):
    try:
        payload = jwt.decode(
            token,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )

        return payload

    except jwt.ExpiredSignatureError:
        return None

    except jwt.InvalidTokenError:
        return None