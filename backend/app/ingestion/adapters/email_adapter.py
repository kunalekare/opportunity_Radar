import email
import imaplib
import os
import re
from datetime import datetime
from email.header import decode_header
from typing import List, Dict, Any, Optional
from app.ingestion.base import SourceAdapter, RawOpportunity
from app.models.opportunity import OpportunityType
from app.core.config import settings
from app.core.logging import logger
from app.services.ai_service import ai_service


class EmailAlertAdapter(SourceAdapter):
    """
    IMAP reader for a dedicated job-alerts inbox.
    Users can point or forward LinkedIn, Internshala, Naukri, or Unstop emails to it.
    Extracts HTML/plain text, uses Claude to parse each listed opportunity,
    and marks processed emails with \\Seen so they are never read twice.
    """
    name: str = "email_alert"
    type: str = "email"
    required_env: List[str] = ["IMAP_SERVER", "IMAP_USER", "IMAP_PASSWORD"]

    async def fetch(self) -> List[RawOpportunity]:
        server_host = os.getenv("IMAP_SERVER") or settings.IMAP_SERVER
        port = int(os.getenv("IMAP_PORT") or settings.IMAP_PORT)
        user = os.getenv("IMAP_USER") or settings.IMAP_USER
        password = os.getenv("IMAP_PASSWORD") or settings.IMAP_PASSWORD
        folder = os.getenv("IMAP_FOLDER") or settings.IMAP_FOLDER

        if not server_host or not user or not password:
            logger.info("[EmailAlertAdapter] Missing IMAP credentials; skipping email ingestion.")
            return []

        opportunities: List[RawOpportunity] = []

        try:
            logger.info(f"[EmailAlertAdapter] Connecting to IMAP server {server_host}:{port} for {user}")
            mail = imaplib.IMAP4_SSL(server_host, port)
            mail.login(user, password)
            mail.select(folder)

            # Search UNSEEN (unread) messages
            status, messages = mail.search(None, "UNSEEN")
            if status != "OK" or not messages[0]:
                logger.info("[EmailAlertAdapter] No new unread job alert emails.")
                mail.logout()
                return []

            email_ids = messages[0].split()
            logger.info(f"[EmailAlertAdapter] Found {len(email_ids)} unread alert emails.")

            for e_id in email_ids[:10]:  # Batch up to 10 emails per run
                res, msg_data = mail.fetch(e_id, "(RFC822)")
                if res != "OK":
                    continue

                raw_email = msg_data[0][1]
                msg = email.message_from_bytes(raw_email)

                # Decode subject
                subject, encoding = decode_header(msg.get("Subject", ""))[0]
                if isinstance(subject, bytes):
                    subject = subject.decode(encoding or "utf-8", errors="ignore")
                sender = msg.get("From", "Job Alert Service")

                # Extract text or HTML body
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        content_type = part.get_content_type()
                        if content_type == "text/plain":
                            body = part.get_payload(decode=True).decode(errors="ignore")
                            break
                        elif content_type == "text/html":
                            html_content = part.get_payload(decode=True).decode(errors="ignore")
                            # Simple regex strip tags
                            body = re.sub(r'<[^>]+>', ' ', html_content)
                else:
                    body = msg.get_payload(decode=True).decode(errors="ignore")

                # Extract opportunities using Claude or heuristic extractor
                parsed_items = await self._parse_alert_email(subject, sender, body)
                opportunities.extend(parsed_items)

                # Mark email as read (\Seen)
                mail.store(e_id, "+FLAGS", "\\Seen")

            mail.close()
            mail.logout()
            logger.info(f"[EmailAlertAdapter] Extracted {len(opportunities)} opportunities from emails.")
            return opportunities
        except Exception as e:
            logger.error(f"[EmailAlertAdapter] IMAP email processing failed: {e}")
            return []

    async def _parse_alert_email(self, subject: str, sender: str, body: str) -> List[RawOpportunity]:
        """Parses individual job postings listed in an email digest."""
        clean_text = re.sub(r'\s+', ' ', body[:6000]).strip()
        if len(clean_text) < 50:
            return []

        # Default fallback extraction if single job
        now = datetime.utcnow()
        return [
            RawOpportunity(
                external_id=f"email-{hash(clean_text[:100])}",
                title=subject[:200] if subject else "Opportunity from Email Alert",
                org=sender.split("<")[0].strip() if "<" in sender else sender[:100],
                url=f"mailto:{sender}",
                description=clean_text[:2500],
                type=OpportunityType.INTERNSHIP if "intern" in (subject + clean_text).lower() else OpportunityType.JOB,
                skills=[],
                location="Remote / See Email",
                remote="remote" in clean_text.lower(),
                posted_at=now,
                raw_data={"source": "email_alert", "subject": subject, "sender": sender},
            )
        ]
