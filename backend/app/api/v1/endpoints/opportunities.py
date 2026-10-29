from datetime import datetime, timedelta
import math
import re
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.db.session import get_db
from app.models.opportunity import Opportunity, OpportunityType
from app.models.source import Source
from app.schemas.opportunity import (
    OpportunityResponse,
    OpportunityPaginated,
    OpportunityFromUrlRequest,
    OpportunityFromTextRequest,
)
from app.ingestion.http_client import http_client
from app.ingestion.deduplication import clean_url, compute_content_hash
from app.services.ai_service import ai_service
from app.core.logging import logger

router = APIRouter()


def get_or_create_manual_source(db: Session) -> Source:
    source = db.query(Source).filter(Source.name == "manual_entry").first()
    if not source:
        source = Source(
            name="manual_entry",
            type="manual",
            enabled=True,
            interval_hours=24,
            config={"description": "User-added opportunities via URL or pasted text."},
        )
        db.add(source)
        db.commit()
        db.refresh(source)
    return source


@router.get("", response_model=OpportunityPaginated)
def list_opportunities(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: Optional[OpportunityType] = None,
    remote: Optional[bool] = None,
    source_id: Optional[str] = None,
    posted_since: Optional[datetime] = None,
    deadline_within_days: Optional[int] = Query(None, ge=1, le=365),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Search and filter opportunities with pagination.
    Supports filtering by type, remote readiness, source, posted date, deadline, and text query.
    """
    query = db.query(Opportunity).filter(Opportunity.status == "active")

    if type:
        query = query.filter(Opportunity.type == type)
    if remote is not None:
        query = query.filter(Opportunity.remote == remote)
    if source_id:
        query = query.filter(Opportunity.source_id == source_id)
    if posted_since:
        query = query.filter(Opportunity.posted_at >= posted_since)
    if deadline_within_days:
        cutoff = datetime.utcnow() + timedelta(days=deadline_within_days)
        query = query.filter(and_(Opportunity.deadline != None, Opportunity.deadline <= cutoff, Opportunity.deadline >= datetime.utcnow()))
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                Opportunity.title.ilike(term),
                Opportunity.org.ilike(term),
                Opportunity.description.ilike(term),
            )
        )

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    items = query.order_by(Opportunity.posted_at.desc().nullslast()).offset(offset).limit(page_size).all()

    # Map source names
    source_map = {s.id: s.name for s in db.query(Source.id, Source.name).all()}

    response_items = [
        OpportunityResponse(
            id=item.id,
            source_id=item.source_id,
            source_name=source_map.get(item.source_id, "Source"),
            external_id=item.external_id,
            type=item.type,
            title=item.title,
            org=item.org,
            description=item.description,
            skills=item.skills or [],
            location=item.location,
            remote=item.remote,
            pay_min=item.pay_min,
            pay_max=item.pay_max,
            currency=item.currency,
            deadline=item.deadline,
            posted_at=item.posted_at,
            url=item.url,
            created_at=item.created_at,
            duplicate_of_id=item.duplicate_of_id,
            status=item.status,
        )
        for item in items
    ]

    return OpportunityPaginated(
        items=response_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
def get_opportunity(opportunity_id: str, db: Session = Depends(get_db)):
    """Retrieve full details of a specific opportunity."""
    opp = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")

    source = db.query(Source).filter(Source.id == opp.source_id).first()
    return OpportunityResponse(
        id=opp.id,
        source_id=opp.source_id,
        source_name=source.name if source else "Source",
        external_id=opp.external_id,
        type=opp.type,
        title=opp.title,
        org=opp.org,
        description=opp.description,
        skills=opp.skills or [],
        location=opp.location,
        remote=opp.remote,
        pay_min=opp.pay_min,
        pay_max=opp.pay_max,
        currency=opp.currency,
        deadline=opp.deadline,
        posted_at=opp.posted_at,
        url=opp.url,
        created_at=opp.created_at,
        duplicate_of_id=opp.duplicate_of_id,
        status=opp.status,
    )


@router.post("/from-url", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_opportunity_from_url(payload: OpportunityFromUrlRequest, db: Session = Depends(get_db)):
    """
    Fetches a public web page, strips boilerplate/HTML, and parses structured
    opportunity attributes using Claude. Offers fallback to /from-text on fetch failure.
    """
    target_url = clean_url(payload.url.strip())
    try:
        resp = await http_client.get(target_url, use_cache=False)
        html_content = resp.text
    except Exception as e:
        logger.warning(f"Could not fetch public page {target_url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Could not retrieve webpage at {target_url} ({str(e)}). "
                "The site may have anti-bot protections or require JavaScript. "
                "Please copy and paste the posting text directly using 'Add by Text' (/api/v1/opportunities/from-text)."
            ),
        )

    # Strip HTML to clean text
    clean_text = re.sub(r'<script.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
    clean_text = re.sub(r'<style.*?</style>', '', clean_text, flags=re.DOTALL | re.IGNORECASE)
    clean_text = re.sub(r'<[^>]+>', ' ', clean_text)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()

    if len(clean_text) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract readable text from page. Please paste the posting text directly.",
        )

    parsed = await ai_service.parse_resume(clean_text[:6000])

    source = get_or_create_manual_source(db)
    ext_id = f"url-{hash(target_url)}"
    content_hash = compute_content_hash(parsed.headline or "Opportunity", parsed.full_name or "Company", target_url)

    opp = Opportunity(
        source_id=source.id,
        external_id=ext_id,
        type=OpportunityType.JOB,
        title=parsed.headline or "Extracted Web Opportunity",
        org=parsed.full_name or "Web Employer",
        description=clean_text[:3000],
        skills=parsed.skills or ["Full-Stack"],
        location=parsed.location or "Remote",
        remote=True,
        url=target_url,
        content_hash=content_hash,
        raw={"source_url": target_url},
        status="active",
    )
    db.add(opp)
    db.commit()
    db.refresh(opp)

    return OpportunityResponse(
        id=opp.id,
        source_id=opp.source_id,
        source_name=source.name,
        external_id=opp.external_id,
        type=opp.type,
        title=opp.title,
        org=opp.org,
        description=opp.description,
        skills=opp.skills,
        location=opp.location,
        remote=opp.remote,
        pay_min=opp.pay_min,
        pay_max=opp.pay_max,
        currency=opp.currency,
        deadline=opp.deadline,
        posted_at=opp.posted_at,
        url=opp.url,
        created_at=opp.created_at,
        duplicate_of_id=opp.duplicate_of_id,
        status=opp.status,
    )


@router.post("/from-text", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_opportunity_from_text(payload: OpportunityFromTextRequest, db: Session = Depends(get_db)):
    """
    Accepts pasted opportunity text, uses Claude to extract structured fields,
    and saves to opportunities.
    """
    parsed = await ai_service.parse_resume(payload.text[:6000])

    source = get_or_create_manual_source(db)
    url_target = payload.source_url or "https://opportunityradar.app/manual-entry"
    ext_id = f"text-{hash(payload.text[:100])}"
    content_hash = compute_content_hash(parsed.headline or "Manual Opportunity", parsed.full_name or "Company", url_target)

    opp = Opportunity(
        source_id=source.id,
        external_id=ext_id,
        type=OpportunityType.JOB,
        title=parsed.headline or "Pasted Opportunity",
        org=parsed.full_name or "Independent",
        description=payload.text[:4000],
        skills=parsed.skills or ["Software Engineering"],
        location=parsed.location or "Remote",
        remote=True,
        url=url_target,
        content_hash=content_hash,
        raw={"input_type": "text"},
        status="active",
    )
    db.add(opp)
    db.commit()
    db.refresh(opp)

    return OpportunityResponse(
        id=opp.id,
        source_id=opp.source_id,
        source_name=source.name,
        external_id=opp.external_id,
        type=opp.type,
        title=opp.title,
        org=opp.org,
        description=opp.description,
        skills=opp.skills,
        location=opp.location,
        remote=opp.remote,
        pay_min=opp.pay_min,
        pay_max=opp.pay_max,
        currency=opp.currency,
        deadline=opp.deadline,
        posted_at=opp.posted_at,
        url=opp.url,
        created_at=opp.created_at,
        duplicate_of_id=opp.duplicate_of_id,
        status=opp.status,
    )
