from datetime import datetime, timedelta
import hashlib
import re
from typing import Optional, List, Dict, Tuple
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
from app.core.config import settings
from app.core.logging import logger
from app.ingestion.base import OpportunityCreate

# Check for rapidfuzz or fallback to token set similarity
try:
    from rapidfuzz import fuzz
    RAPIDFUZZ_AVAILABLE = True
except ImportError:
    RAPIDFUZZ_AVAILABLE = False


def clean_url(raw_url: str) -> str:
    """Removes tracking query parameters (utm_*, ref, fbclid, gclid, etc.)."""
    try:
        parsed = urlparse(raw_url)
        tracking_params = {
            "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
            "ref", "source", "fbclid", "gclid", "msclkid", "mc_cid", "mc_eid"
        }
        filtered_query = [
            (k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
            if k.lower() not in tracking_params and not k.lower().startswith("utm_")
        ]
        new_query = urlencode(filtered_query)
        cleaned = urlunparse((
            parsed.scheme,
            parsed.netloc.lower(),
            parsed.path.rstrip("/"),
            parsed.params,
            new_query,
            ""  # remove fragment
        ))
        return cleaned
    except Exception:
        return raw_url.strip()


def compute_content_hash(title: str, org: str, cleaned_url: str) -> str:
    """Level 2 content hash computed on normalized title, organization, and cleaned URL."""
    norm_title = re.sub(r'\W+', '', title.lower())
    norm_org = re.sub(r'\W+', '', org.lower())
    norm_url = cleaned_url.lower()
    raw_str = f"{norm_title}:{norm_org}:{norm_url}"
    return hashlib.sha256(raw_str.encode("utf-8")).hexdigest()


def compute_text_similarity(str1: str, str2: str) -> float:
    """Computes string similarity percentage (0-100) using rapidfuzz or token overlap."""
    if not str1 or not str2:
        return 0.0
    if RAPIDFUZZ_AVAILABLE:
        return float(fuzz.token_set_ratio(str1, str2))
    
    # Fallback token overlap
    tokens1 = set(re.findall(r'\w+', str1.lower()))
    tokens2 = set(re.findall(r'\w+', str2.lower()))
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    return (2.0 * len(intersection)) / (len(tokens1) + len(tokens2)) * 100.0


def is_expired(opp: OpportunityCreate, max_age_days: Optional[int] = None) -> bool:
    """
    Checks if opportunity has expired:
    1. Deadline has passed
    2. Posted date is older than max_age_days (default 45)
    """
    now = datetime.utcnow()
    max_days = max_age_days or settings.MAX_OPPORTUNITY_AGE_DAYS
    
    if opp.deadline and opp.deadline < now:
        return True
        
    if opp.posted_at and opp.posted_at < (now - timedelta(days=max_days)):
        return True

    return False


def calculate_richness_score(opp: OpportunityCreate) -> int:
    """Heuristic richness score: favors postings with more skills, longer description, pay range."""
    score = len(opp.description or "")
    score += len(opp.skills or []) * 100
    if opp.pay_min:
        score += 200
    if opp.pay_max:
        score += 200
    if opp.deadline:
        score += 150
    return score
