from functools import wraps

from flask import request, jsonify, g

from services.auth_service import decode_token


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({
                "status": "error",
                "message": "Authorization token is required"
            }), 401

        if not auth_header.startswith("Bearer "):
            return jsonify({
                "status": "error",
                "message": "Invalid authorization format"
            }), 401

        token = auth_header.split(" ", 1)[1]

        payload = decode_token(token)

        if not payload:
            return jsonify({
                "status": "error",
                "message": "Invalid or expired token"
            }), 401

        g.current_user = payload

        return f(*args, **kwargs)

    return decorated