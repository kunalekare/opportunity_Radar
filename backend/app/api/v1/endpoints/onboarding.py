from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.onboarding import ExtractedResumeData, OnboardingCompleteRequest
from app.schemas.profile import ProfileCreate, ProfileResponse
from app.services.ai_service import ai_service
from app.services.profile_service import ProfileService

router = APIRouter()


@router.post("/upload-resume", response_model=ExtractedResumeData)
async def upload_and_parse_resume(
    file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    """
    Accepts resume as PDF file or plain text, extracts content,
    and calls Claude (Anthropic SDK) to return structured JSON
    (skills, education, experience summary, suggested keywords).
    """
    resume_content = ""
    
    if file:
        content_type = file.content_type or ""
        file_bytes = await file.read()
        if "pdf" in content_type.lower() or (file.filename and file.filename.lower().endswith(".pdf")):
            resume_content = ai_service.extract_text_from_pdf(file_bytes)
        else:
            resume_content = file_bytes.decode("utf-8", errors="ignore")
    elif raw_text and raw_text.strip():
        resume_content = raw_text.strip()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide either a resume PDF file or paste plain text.",
        )

    if not resume_content or len(resume_content.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract readable text from the provided resume.",
        )

    # Call AI service with Claude SDK
    extracted_data = await ai_service.parse_resume(resume_content)
    return extracted_data


@router.post("/complete", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def complete_onboarding(
    req: OnboardingCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Finalizes the onboarding wizard, persists the reviewed and edited
    profile, and activates the user's opportunity radar.
    """
    service = ProfileService(db)
    profile_in = ProfileCreate(**req.model_dump())
    return service.create_or_update_profile(current_user.id, profile_in)
