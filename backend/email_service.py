"""
Email service for Ambient AI Healthcare.
Sends emails via Microsoft Graph API using an access token from Graph Explorer.

How to get the token:
  1. Go to https://developer.microsoft.com/en-us/graph/graph-explorer
  2. Sign in with your Microsoft account
  3. Click "Modify permissions" → enable Mail.Send → Consent
  4. Copy the access token and paste it in .env as MS_GRAPH_ACCESS_TOKEN
  5. Set MS_GRAPH_SENDER_EMAIL to the email you signed in with

Note: Graph Explorer tokens expire after ~1 hour. Refresh by re-visiting Graph Explorer.
"""
import json
import urllib.request
import urllib.error

from config import settings


def send_welcome_email(
    sender_email: str,
    to_email: str,
    patient_name: str,
    patient_uid: str,
    password: str,
    phone: str | None = None,
    address: str | None = None,
    language: str = "en",
):
    """Send a welcome email to a newly registered patient."""
    print(f"[Email] === SEND WELCOME EMAIL ===")
    print(f"[Email] From (admin): {sender_email}")
    print(f"[Email] To: {to_email}")
    print(f"[Email] Token set: {bool(settings.ms_graph_access_token)} (len={len(settings.ms_graph_access_token) if settings.ms_graph_access_token else 0})")

    if not settings.ms_graph_access_token:
        print("[Email] ❌ MS_GRAPH_ACCESS_TOKEN not set in .env — skipping")
        return

    lang_label = {"en": "English", "ta": "Tamil (தமிழ்)", "hi": "Hindi (हिंदी)"}.get(language, language)

    subject = f"Welcome to Ambient AI Healthcare — Your Patient ID: {patient_uid}"

    html_body = f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#0f766e,#0d9488);padding:28px 32px;">
        <h1 style="color:#fff;margin:0;font-size:22px;">🏥 Ambient AI Healthcare</h1>
        <p style="color:#ccfbf1;margin:8px 0 0;font-size:14px;">St. Joseph's Hospital</p>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#1e293b;margin:0 0 8px;font-size:20px;">Welcome, {patient_name}!</h2>
        <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Your patient account has been created. Below are your login details. Please keep this email safe.
        </p>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px;">
          <h3 style="color:#0f766e;margin:0 0 16px;font-size:16px;border-bottom:2px solid #f0fdfa;padding-bottom:8px;">📋 Account Details</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:140px;">Patient ID</td>
                <td style="padding:8px 0;color:#1e293b;font-size:15px;font-weight:700;letter-spacing:2px;"><span style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:6px;padding:4px 12px;">{patient_uid}</span></td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Full Name</td>
                <td style="padding:8px 0;color:#1e293b;font-size:14px;font-weight:600;">{patient_name}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Email</td>
                <td style="padding:8px 0;color:#1e293b;font-size:14px;">{to_email}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Phone</td>
                <td style="padding:8px 0;color:#1e293b;font-size:14px;">{phone or '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Address</td>
                <td style="padding:8px 0;color:#1e293b;font-size:14px;">{address or '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Language</td>
                <td style="padding:8px 0;color:#1e293b;font-size:14px;">{lang_label}</td></tr>
          </table>
        </div>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:24px;margin-bottom:24px;">
          <h3 style="color:#92400e;margin:0 0 12px;font-size:16px;">🔐 Login Credentials</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#92400e;font-size:13px;width:140px;">Email (Login)</td>
                <td style="padding:6px 0;color:#78350f;font-size:14px;font-weight:600;">{to_email}</td></tr>
            <tr><td style="padding:6px 0;color:#92400e;font-size:13px;">Password</td>
                <td style="padding:6px 0;color:#78350f;font-size:14px;font-weight:600;font-family:monospace;letter-spacing:1px;">{password}</td></tr>
          </table>
          <p style="color:#b45309;font-size:12px;margin:12px 0 0;font-style:italic;">⚠️ Please change your password after first login.</p>
        </div>
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;">
          <h3 style="color:#0369a1;margin:0 0 8px;font-size:14px;">📱 How to Access</h3>
          <ol style="color:#475569;font-size:13px;line-height:1.8;margin:0;padding-left:20px;">
            <li>Visit the Ambient AI Healthcare portal</li>
            <li>Log in with the credentials above</li>
            <li>View your reports and medical images</li>
            <li>Download your take-home report as PDF</li>
          </ol>
        </div>
      </div>
      <div style="background:#f1f5f9;padding:16px 32px;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center;">
          Automated email from Ambient AI Healthcare — St. Joseph's Hospital.
        </p>
      </div>
    </div>
    """

    # Build Graph API request — like a curl command
    url = f"https://graph.microsoft.com/v1.0/users/{sender_email}/sendMail"

    payload = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "HTML",
                "content": html_body,
            },
            "toRecipients": [
                {"emailAddress": {"address": to_email}}
            ],
        },
        "saveToSentItems": True,
    }

    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", f"Bearer {settings.ms_graph_access_token}")
    req.add_header("Content-Type", "application/json")

    print(f"[Email] POST {url}")
    print(f"[Email] To: {to_email}")

    try:
        with urllib.request.urlopen(req) as resp:
            print(f"[Email] ✅ SUCCESS — HTTP {resp.status} — Email sent to {to_email}!")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"[Email] ❌ FAILED — HTTP {e.code}")
        print(f"[Email] Response: {error_body}")
        if e.code == 401:
            print(f"[Email] Token expired! Get a new one from Graph Explorer and update MS_GRAPH_ACCESS_TOKEN in .env")
        elif e.code == 403:
            print(f"[Email] Permission denied! Make sure Mail.Send is consented in Graph Explorer")
        raise RuntimeError(f"Graph API error {e.code}: {error_body}")
    except Exception as e:
        print(f"[Email] ❌ ERROR: {type(e).__name__}: {e}")
        raise
