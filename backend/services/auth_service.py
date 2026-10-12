import os
import jwt
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from models.user_model import create_user, get_user_by_email_or_phone


def hash_password(password):
    return generate_password_hash(password)


def verify_password(password, password_hash):
    return check_password_hash(password_hash, password)


def register_user(role, full_name, email, phone, password):
    password_hash = hash_password(password)

    user_id = create_user(
        role,
        full_name,
        email,
        phone,
        password_hash
    )

    return user_id

def login_user(login, password):
    user = get_user_by_email_or_phone(login)

    if not user:
        return None, "Invalid email/phone or password"

    if not user["is_active"]:
        return None, "Account is inactive"

    if not verify_password(password, user["password_hash"]):
        return None, "Invalid email/phone or password"

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