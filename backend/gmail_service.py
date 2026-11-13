
import os
import json
import base64

from email.message import EmailMessage
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send"
]


def send_gmail(to_email, subject, message):
    token_json = os.getenv("GMAIL_TOKEN_JSON")

    if not token_json:
        raise RuntimeError("GMAIL_TOKEN_JSON is missing")

    token_data = json.loads(token_json)

    credentials = Credentials.from_authorized_user_info(
        token_data,
        SCOPES
    )

    if not credentials.valid:
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            raise RuntimeError("Gmail authorization is invalid")

    email = EmailMessage()
    email["To"] = to_email
    email["From"] = os.environ["SMTP_EMAIL"]
    email["Subject"] = subject
    email.set_content(message)

    encoded_message = base64.urlsafe_b64encode(
        email.as_bytes()
    ).decode("utf-8")

    service = build(
        "gmail",
        "v1",
        credentials=credentials,
        cache_discovery=False
    )

    service.users().messages().send(
        userId="me",
        body={"raw": encoded_message}
    ).execute()

    return True
