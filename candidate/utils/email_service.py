"""
Email notification service for HirePro.
Uses Gmail SMTP (configured via SMTP_* env vars).
"""
import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")

BRAND_COLOR  = "#6366f1"
LOGO_INITIALS = "S"


def _send(to_email: str, subject: str, html_body: str) -> bool:
    """Low-level SMTP send. Returns True on success, False on failure."""
    if not SMTP_USER or not SMTP_PASS:
        logger.warning("[email] SMTP_USER / SMTP_PASS not configured — skipping email.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"HirePro Careers <{SMTP_USER}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        logger.info(f"[email] Sent '{subject}' → {to_email}")
        return True
    except Exception as e:
        logger.error(f"[email] Failed to send to {to_email}: {e}")
        return False


def _base_template(content_html: str) -> str:
    """Wrap content in a clean, branded email shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>HirePro</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:16px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);
                     padding:32px 40px;text-align:center;">
            <div style="display:inline-block;width:48px;height:48px;
                        background:rgba(255,255,255,0.2);border-radius:12px;
                        line-height:48px;font-size:22px;font-weight:800;
                        color:#fff;margin-bottom:12px;">S</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;
                       letter-spacing:-0.5px;">HirePro</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">
              AI-Powered Recruitment Platform
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            {content_html}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:24px 40px;text-align:center;
                     border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
              This is an automated message from HirePro. Please do not reply to this email.<br/>
              © {datetime.now().year} Sigmoid. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ─────────────────────────────────────────────────────────────────────────────
# Public notification functions
# ─────────────────────────────────────────────────────────────────────────────

def send_interview_scheduled_email(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    scheduled_at: Optional[str] = None,
    interview_link: Optional[str] = None,
    notes: Optional[str] = None,
) -> bool:
    """
    Send the candidate an email confirming their AI interview has been scheduled.
    """
    # Format the date/time nicely if provided
    date_display = "To be confirmed"
    if scheduled_at:
        try:
            dt = datetime.fromisoformat(scheduled_at)
            date_display = dt.strftime("%A, %d %B %Y at %I:%M %p")
        except Exception:
            date_display = scheduled_at

    link_row = ""
    if interview_link:
        link_row = f"""
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
            <span style="color:#64748b;font-size:14px;">Interview Link</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;">
            <a href="{interview_link}" style="color:#6366f1;font-size:14px;font-weight:600;">
              Join Interview →
            </a>
          </td>
        </tr>"""

    notes_row = ""
    if notes and notes.strip() and notes.lower() != "ai interview initiated":
        notes_row = f"""
        <tr>
          <td colspan="2" style="padding:16px 0 0;">
            <div style="background:#f8fafc;border-radius:8px;padding:14px 16px;
                        border-left:3px solid #6366f1;">
              <p style="margin:0;color:#64748b;font-size:13px;font-weight:600;
                         text-transform:uppercase;letter-spacing:0.5px;">Notes from HR</p>
              <p style="margin:6px 0 0;color:#1e293b;font-size:14px;line-height:1.6;">
                {notes}
              </p>
            </div>
          </td>
        </tr>"""

    content = f"""
    <h2 style="margin:0 0 6px;color:#1e293b;font-size:20px;font-weight:700;">
      🎯 Your AI Interview is Scheduled
    </h2>
    <p style="margin:0 0 28px;color:#64748b;font-size:15px;line-height:1.6;">
      Hi <strong>{candidate_name}</strong>, congratulations! You've been shortlisted and your
      AI-powered interview for the role below has been scheduled.
    </p>

    <!-- Detail card -->
    <div style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:28px;
                border:1px solid #e2e8f0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
            <span style="color:#64748b;font-size:14px;">Position</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;">
            <strong style="color:#1e293b;font-size:14px;">{job_title}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
            <span style="color:#64748b;font-size:14px;">Scheduled For</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;">
            <strong style="color:#1e293b;font-size:14px;">{date_display}</strong>
          </td>
        </tr>
        {link_row}
        {notes_row}
      </table>
    </div>

    <!-- What to expect -->
    <div style="margin-bottom:28px;">
      <h3 style="margin:0 0 12px;color:#1e293b;font-size:16px;font-weight:600;">
        📋 What to Expect
      </h3>
      <ul style="margin:0;padding:0 0 0 20px;color:#475569;font-size:14px;line-height:2;">
        <li>The interview is AI-powered and conducted via your browser.</li>
        <li>You will be asked technical and behavioural questions relevant to the role.</li>
        <li>Your video and audio will be monitored for integrity purposes.</li>
        <li>Ensure you have a stable internet connection, a working webcam and microphone.</li>
        <li>Find a quiet, well-lit environment before starting.</li>
      </ul>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:8px;">
      <a href="http://localhost:5173/#candidate"
         style="display:inline-block;padding:14px 36px;
                background:linear-gradient(135deg,#6366f1,#4f46e5);
                color:#ffffff;text-decoration:none;border-radius:10px;
                font-weight:700;font-size:15px;letter-spacing:0.3px;">
        Log In &amp; Start Interview →
      </a>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:12px;">
      Log in to the candidate portal to access your interview.
    </p>"""

    return _send(
        to_email=candidate_email,
        subject=f"🎯 Interview Scheduled — {job_title} | HirePro",
        html_body=_base_template(content),
    )


def send_application_received_email(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
) -> bool:
    """Send a confirmation when a candidate applies for a job."""
    content = f"""
    <h2 style="margin:0 0 6px;color:#1e293b;font-size:20px;font-weight:700;">
      ✅ Application Received
    </h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
      Hi <strong>{candidate_name}</strong>, we've received your application for
      <strong>{job_title}</strong>. Our team will review your profile and get back to you soon.
    </p>
    <p style="color:#475569;font-size:14px;line-height:1.8;">
      You can track your application status by logging into your candidate portal at any time.
    </p>
    <div style="text-align:center;margin-top:28px;">
      <a href="http://localhost:5173/#candidate"
         style="display:inline-block;padding:14px 36px;
                background:linear-gradient(135deg,#6366f1,#4f46e5);
                color:#ffffff;text-decoration:none;border-radius:10px;
                font-weight:700;font-size:15px;">
        View Application Status →
      </a>
    </div>"""

    return _send(
        to_email=candidate_email,
        subject=f"Application Received — {job_title} | HirePro",
        html_body=_base_template(content),
    )
