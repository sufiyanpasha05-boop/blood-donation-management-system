
import os
import smtplib
import ssl
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()


def send_email(to_email, subject, message):
    sender = os.getenv("SMTP_EMAIL")
    password = os.getenv("SMTP_APP_PASSWORD")
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))

    if not sender or not password:
        raise RuntimeError("SMTP credentials are missing")

    email = EmailMessage()
    email["From"] = f"RaktaSahay Notifications <{sender}>"
    email["To"] = to_email
    email["Subject"] = subject
    email.set_content(message)

    context = ssl.create_default_context()

    with smtplib.SMTP(host, port, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls(context=context)
        smtp.ehlo()
        smtp.login(sender, password)
        smtp.send_message(email)

    return True
