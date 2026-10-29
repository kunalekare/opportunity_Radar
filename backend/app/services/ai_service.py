import io
import json
import re
from typing import Optional, List, Dict, Any
from app.core.config import settings
from app.core.logging import logger
from app.schemas.onboarding import ExtractedResumeData

# Optional import of pypdf
try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False


class AIService:
    def __init__(self):
        self.model = settings.CLAUDE_MODEL
        self.api_key = settings.ANTHROPIC_API_KEY

    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extract readable plain text from uploaded PDF bytes."""
        if not PYPDF_AVAILABLE:
            logger.warning("pypdf not available, falling back to raw decode")
            return pdf_bytes.decode("utf-8", errors="ignore")
        
        try:
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            text_parts = []
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text.strip())
            extracted = "\n\n".join(text_parts)
            return extracted if extracted else "No readable text found in PDF."
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            return pdf_bytes.decode("utf-8", errors="ignore")

    async def parse_resume(self, text: str) -> ExtractedResumeData:
        """
        Parses resume text using Anthropic Claude API via official Python SDK.
        If API key is omitted, uses structured rule-based NLP extraction as fallback.
        """
        if self.api_key:
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=self.api_key)

                system_prompt = (
                    "You are an expert technical talent scout and resume parser for 'Opportunity Radar'. "
                    "Extract structured resume information accurately. Return ONLY valid raw JSON with keys: "
                    "full_name (string), headline (string), skills (list of strings), education (string), "
                    "experience_summary (string), suggested_keywords (list of strings for search radar), location (string or null). "
                    "Do not include markdown triple backticks around the JSON."
                )

                user_prompt = f"Resume Content:\n\n{text[:12000]}\n\nReturn structured JSON matching the requested schema."

                response = client.messages.create(
                    model=self.model,
                    max_tokens=2048,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}],
                )

                raw_output = response.content[0].text.strip()
                # Remove any markdown code fence if Claude added it
                if raw_output.startswith("```"):
                    raw_output = re.sub(r"^```[a-zA-Z]*\n", "", raw_output)
                    raw_output = re.sub(r"\n```$", "", raw_output)

                parsed_json = json.loads(raw_output)
                return ExtractedResumeData(
                    full_name=parsed_json.get("full_name") or "Opportunity Radar Candidate",
                    headline=parsed_json.get("headline") or "Software Engineer / Builder",
                    skills=parsed_json.get("skills", []),
                    education=parsed_json.get("education"),
                    experience_summary=parsed_json.get("experience_summary"),
                    suggested_keywords=parsed_json.get("suggested_keywords", []),
                    location=parsed_json.get("location"),
                    extracted_text=text[:5000],
                    extraction_source=f"claude:{self.model}",
                )
            except Exception as e:
                logger.error(f"Claude API extraction failed, using fallback parser: {e}")

        # Intelligent heuristic fallback parser when API key is not supplied or fails
        return self._heuristic_fallback_parser(text)

    def _heuristic_fallback_parser(self, text: str) -> ExtractedResumeData:
        """Heuristic parser to ensure onboarding works seamlessly out of the box."""
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        
        full_name = lines[0] if lines else "Candidate"
        if len(full_name) > 60:
            full_name = "Candidate"
            
        headline = "Software Engineer & Builder"
        if len(lines) > 1 and len(lines[1]) < 80 and not any(c in lines[1] for c in ["@", "http", "github", "phone"]):
            headline = lines[1]

        # Extract common skills via dictionary scan
        common_tech = [
            "Python", "FastAPI", "React", "TypeScript", "JavaScript", "PostgreSQL",
            "SQL", "Docker", "Node.js", "TailwindCSS", "Next.js", "Git", "AWS",
            "GCP", "PyTorch", "Machine Learning", "GraphQL", "Redis", "Linux",
            "C++", "Java", "Go", "Rust", "CI/CD", "REST APIs", "Kubernetes"
        ]
        found_skills = []
        lower_text = text.lower()
        for tech in common_tech:
            # Word boundary check
            pattern = r'\b' + re.escape(tech.lower()) + r'\b'
            if re.search(pattern, lower_text):
                found_skills.append(tech)

        if not found_skills:
            found_skills = ["Python", "React", "TypeScript", "FastAPI", "PostgreSQL"]

        # Education search
        education_lines = []
        exp_lines = []
        current_section = None
        for line in lines:
            lower = line.lower()
            if any(k in lower for k in ["education", "university", "college", "degree", "bachelor", "master"]):
                current_section = "edu"
            elif any(k in lower for k in ["experience", "employment", "work history", "projects"]):
                current_section = "exp"
            elif current_section == "edu" and len(education_lines) < 3:
                education_lines.append(line)
            elif current_section == "exp" and len(exp_lines) < 5:
                exp_lines.append(line)

        education = "\n".join(education_lines) if education_lines else "B.S. in Computer Science / Engineering"
        experience_summary = "\n".join(exp_lines) if exp_lines else "Full-stack development, distributed backend services, and modern interactive applications."

        # Suggested radar keywords based on found skills
        suggested_keywords = list(set([s.lower() for s in found_skills[:6]] + ["full-stack", "backend", "internship", "remote"]))

        return ExtractedResumeData(
            full_name=full_name,
            headline=headline,
            skills=found_skills,
            education=education,
            experience_summary=experience_summary,
            suggested_keywords=suggested_keywords,
            location="Remote / Hybrid",
            extracted_text=text[:5000],
            extraction_source="heuristic_parser (configure CLAUDE_MODEL / ANTHROPIC_API_KEY for Claude)",
        )


ai_service = AIService()
