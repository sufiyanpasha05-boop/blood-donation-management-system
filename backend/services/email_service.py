
import os
import smtplib
import ssl
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()

from gmail_service import send_gmail

def send_email(to_email, subject, message):
    return send_gmail(to_email, subject, message)
