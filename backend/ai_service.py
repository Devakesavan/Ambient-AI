"""
AI Service: Local Whisper (STT) + Gemini (LLM).
Whisper runs locally - no API key needed. Gemini for extraction/translation.
"""
import json
import os
import re
import tempfile
from functools import lru_cache
from typing import Any, Dict, List, Optional

from config import settings

_whisper_model = None
_gemini_model = None


def _use_gemini() -> bool:
    return bool(settings.gemini_api_key and settings.gemini_api_key.strip())


def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        import whisper
        # "base" = faster (good for English); "small" = better for Tamil (set in .env if needed)
        model_name = getattr(settings, "whisper_model", "base") or "base"
        _whisper_model = whisper.load_model(model_name)
    return _whisper_model


def _get_gemini_model():
    global _gemini_model
    if _gemini_model is None:
        import google.generativeai as genai
        from google.generativeai.types import HarmCategory, HarmBlockThreshold
        genai.configure(api_key=settings.gemini_api_key)
        safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        }
        _gemini_model = genai.GenerativeModel("gemini-1.5-flash", safety_settings=safety_settings)
    return _gemini_model


try:
    from deep_translator import GoogleTranslator  # type: ignore[import-untyped]
except ImportError:
    GoogleTranslator = None

LANG_NAMES = {"en": "English", "ta": "Tamil", "hi": "Hindi"}


# ── Translation cache (process-lifetime, ~256 entries) ──────────────────────
# Caches GoogleTranslator results so the same text is never translated twice.
@lru_cache(maxsize=256)
def _cached_deep_translate(text: str, target_code: str) -> str:
    """Cached wrapper around GoogleTranslator so repeated strings cost nothing."""
    if GoogleTranslator is None:
        return text
    try:
        return GoogleTranslator(source="auto", target=target_code).translate(text) or text
    except Exception:
        return text


def translate_text(text: str, target_language: str) -> str:
    """Fast translation with medical terminology preservation, handling mixed Tamil-English."""
    if not text or not text.strip():
        return text
    if target_language == "en" or not target_language:
        return text
    if target_language not in ("ta", "hi"):
        return text
    lang_name = LANG_NAMES.get(target_language, target_language)
    target_code = "ta" if target_language == "ta" else "hi"

    # ── Fast path: GoogleTranslator first (5-10x faster than Gemini) ──────
    # Only route medical/clinical text with speaker labels through Gemini,
    # everything else goes straight to GoogleTranslator (cached).
    has_medical = any(kw in text for kw in ("Doctor:", "Patient:", "mg", "tablet", "dosage"))

    if not has_medical or not _use_gemini():
        result = _cached_deep_translate(text[:4500], target_code)
        if result and result.strip():
            return result.strip()

    # ── Gemini path: only for medical/clinical content ─────────────────────
    # Minimal prompt → fewer tokens → faster response
    prompt = (
        f"Translate to {lang_name}. Rules: keep 'Doctor:'/'Patient:' labels unchanged; "
        f"keep drug names/dosages in English; return ONLY the translated text.\n\n{text[:3000]}"
    )
    try:
        result = _gemini_generate(prompt)
        if result and result.strip():
            return result.strip()
    except Exception:
        pass

    # Fallback to GoogleTranslator if Gemini failed
    result = _cached_deep_translate(text[:4500], target_code)
    return result.strip() if result else text


def translate_batch(texts: Dict[str, str], target_language: str) -> Dict[str, str]:
    """Batch translate multiple texts at once for better performance."""
    if target_language == "en" or not target_language:
        return texts
    if not _use_gemini():
        # Fast path: all via cached GoogleTranslator (no Gemini round-trip)
        target_code = "ta" if target_language == "ta" else "hi"
        return {k: (_cached_deep_translate(v, target_code) if v else v) for k, v in texts.items()}
    
    lang_name = LANG_NAMES.get(target_language, target_language)
    target_code = "ta" if target_language == "ta" else "hi"
    
    # Combine all texts into one prompt for batch translation
    items = [(key, value) for key, value in texts.items() if value]
    if not items:
        return texts
    
    combined = "\n\n".join([f"### {key.upper()} ###\n{value}" for key, value in items])
    
    # Compact prompt – fewer tokens = faster Gemini response
    prompt = (
        f"Translate to {lang_name}. Keep 'Doctor:'/'Patient:' labels, drug names, and dosages in English. "
        f"Return text with the same ### SECTION ### markers.\n\n{combined[:5000]}"
    )
    
    try:
        result = _gemini_generate(prompt)
        if result and result.strip():
            translated = result.strip()
            output = {}
            # Parse sections
            for key, original_value in items:
                marker = f"### {key.upper()} ###"
                if marker in translated:
                    start_idx = translated.find(marker) + len(marker)
                    # Find next section or end
                    next_markers = [translated.find(f"### {k.upper()} ###", start_idx) for k, _ in items if k != key]
                    next_markers = [idx for idx in next_markers if idx != -1]
                    end_idx = min(next_markers) if next_markers else len(translated)
                    section = translated[start_idx:end_idx].strip()
                    output[key] = section if section else original_value
                else:
                    output[key] = original_value
            # Add any missing keys
            for key in texts.keys():
                if key not in output:
                    output[key] = texts[key]
            return output
    except Exception:
        pass
    
    # Fallback: fast cached GoogleTranslator (still faster than sequential Gemini calls)
    return {k: (_cached_deep_translate(v, target_code) if v else v) for k, v in texts.items()}


def _gemini_generate(prompt: str, system_instruction: str = "") -> str:
    model = _get_gemini_model()
    full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
    try:
        response = model.generate_content(full_prompt)
        try:
            text = response.text
            return text.strip() if text else ""
        except (ValueError, AttributeError):
            if response.candidates:
                parts = response.candidates[0].content.parts
                if parts:
                    part_text = getattr(parts[0], "text", None)
                    if part_text:
                        return part_text.strip()
    except Exception:
        pass
    return ""


MOCK_TRANSCRIPT = """Doctor: Good morning, how are you feeling today?
Patient: I have been having headaches for the past week, and some fever.
Doctor: Any other symptoms? Cough, body ache?
Patient: Yes, body ache and mild cough. I took paracetamol but it did not help much.
Doctor: I see. Based on your symptoms, this appears to be a viral flu. I will prescribe:
- Paracetamol 500mg, two tablets three times a day after food
- Rest for at least 3 days
- Plenty of fluids
Patient: Okay doctor, when should I come back?
Doctor: If symptoms persist beyond 5 days or you develop breathing difficulty, come immediately. Otherwise, follow up in one week.
Patient: Thank you doctor."""


def transcribe_audio(audio_bytes: bytes, consultation_id: int) -> str:
    """Transcribe audio with auto-detect for English/Tamil/mixed. Fast path: one pass, minimal post-processing."""
    try:
        model = _get_whisper_model()
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            # Single pass with auto-detect: correct for both English and Tamil, and faster (no Tamil-first retry)
            result = model.transcribe(
                tmp_path,
                language=None,  # Auto-detect (English, Tamil, or mixed) - fixes English not detecting
                verbose=False,
                task="transcribe",
                beam_size=1,  # Faster decoding (default 5 is slower)
                initial_prompt="Medical consultation between doctor and patient. May be in English, Tamil, or both. Preserve exact words spoken."
            )
            raw_text = (result.get("text") or "").strip()

            if not raw_text:
                return MOCK_TRANSCRIPT.strip()

            # Optional: only post-process if transcript contains Tamil and looks garbled (saves time for English)
            has_tamil = any("\u0B80" <= c <= "\u0BFF" for c in raw_text)
            if has_tamil and _use_gemini():
                cleaned_text = post_process_tamil_transcription(raw_text)
            else:
                cleaned_text = raw_text

            # Format with speaker labels: use fast heuristic if no Gemini or already has labels
            if "Doctor:" in cleaned_text or "Patient:" in cleaned_text:
                return cleaned_text
            if not _use_gemini():
                formatted = _format_transcript_simple(cleaned_text)
                return formatted
            formatted = format_transcript_with_speakers_multilingual(cleaned_text)
            return formatted if formatted else cleaned_text
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    except Exception:
        return MOCK_TRANSCRIPT.strip()


def _format_transcript_simple(raw_text: str) -> str:
    """Fast heuristic speaker labels without API call."""
    sentences = [s.strip() for s in re.split(r"[.!?]+", raw_text) if s.strip()]
    if len(sentences) <= 1:
        return f"Doctor: {raw_text}"
    return "\n".join(
        f"{'Doctor' if i % 2 == 0 else 'Patient'}: {s}" for i, s in enumerate(sentences)
    )


def post_process_tamil_transcription(raw_text: str) -> str:
    """Post-process Tamil transcription to fix common errors and improve accuracy."""
    if not raw_text or not _use_gemini():
        return raw_text
    
    # Check if text contains Tamil characters
    has_tamil = any('\u0B80' <= char <= '\u0BFF' for char in raw_text)
    
    if not has_tamil:
        return raw_text
    
    prompt = f"""You are correcting a Tamil transcription from a medical consultation. The transcription may have errors.

TASK: Fix the Tamil text to be grammatically correct and meaningful, while preserving English medical terms and speaker labels.

RULES:
1. Correct Tamil spelling and grammar errors
2. Preserve English medical terminology (drug names, dosages, etc.)
3. Keep speaker labels ("Doctor:", "Patient:") exactly as-is
4. Maintain the meaning and context of the conversation
5. If Tamil text is completely garbled, try to reconstruct meaningful Tamil based on context
6. Preserve mixed Tamil-English code-switching patterns

Original transcription (may contain errors):
{raw_text[:5000]}

Return the corrected transcription with proper Tamil text, preserving all structure and English medical terms."""
    
    try:
        result = _gemini_generate(prompt)
        if result and result.strip():
            corrected = result.strip()
            # Ensure we got meaningful output
            if len(corrected) > len(raw_text) * 0.5:  # At least 50% of original length
                return corrected
    except Exception:
        pass
    
    return raw_text


def format_transcript_with_speakers(raw_text: str) -> str:
    """Format raw transcript with Doctor/Patient speaker labels (legacy function)."""
    return format_transcript_with_speakers_multilingual(raw_text)


def format_transcript_with_speakers_multilingual(raw_text: str) -> str:
    """Format raw transcript with Doctor/Patient speaker labels, handling mixed Tamil-English."""
    if not raw_text or not raw_text.strip():
        return raw_text
    
    # If already formatted, return as-is
    if "Doctor:" in raw_text or "Patient:" in raw_text:
        return raw_text
    
    if not _use_gemini():
        # Simple heuristic fallback
        sentences = [s.strip() for s in raw_text.replace('!', '.').replace('?', '.').split('.') if s.strip()]
        if len(sentences) <= 1:
            return f"Doctor: {raw_text}"
        formatted = []
        for i, sent in enumerate(sentences):
            speaker = "Doctor" if i % 2 == 0 else "Patient"
            formatted.append(f"{speaker}: {sent}")
        return "\n".join(formatted)
    
    # Check if text contains Tamil
    has_tamil = any('\u0B80' <= char <= '\u0BFF' for char in raw_text)
    
    prompt = f"""You are formatting a doctor-patient conversation transcript. The conversation may be in English, Tamil, or a MIX of both languages (code-switching).

CRITICAL INSTRUCTIONS:
1. Identify who is speaking based on context:
   - Medical questions, explanations, diagnoses, prescriptions = Doctor
   - Symptoms, concerns, questions about treatment = Patient
2. Format as: "Doctor: [statement]" or "Patient: [statement]"
3. PRESERVE the original language - if someone speaks in Tamil, keep it in PROPER Tamil text (not phonetic); if English, keep English; if mixed, keep the mix
4. Keep medical terminology exactly as spoken (preserve English medical terms even in Tamil sentences)
5. Preserve the natural flow and language switching
6. Each speaker's statement should be on a new line
7. Do NOT translate - keep the transcript in the original languages used
8. If Tamil text appears garbled or phonetic, convert it to proper Tamil script
9. Ensure Tamil text is grammatically correct and meaningful

Raw transcript (may contain English, Tamil, or both):
{raw_text[:5000]}

Return the formatted transcript with proper speaker labels, preserving all languages exactly as spoken. Ensure Tamil text is in proper Tamil script, not phonetic transcription."""
    
    try:
        result = _gemini_generate(prompt)
        if result and result.strip():
            formatted = result.strip()
            # Ensure it has the proper format
            if "Doctor:" in formatted or "Patient:" in formatted:
                return formatted
    except Exception:
        pass
    
    # Fallback: simple formatting
    sentences = [s.strip() for s in raw_text.replace('!', '.').replace('?', '.').split('.') if s.strip()]
    if len(sentences) <= 1:
        return f"Doctor: {raw_text}"
    formatted = []
    for i, sent in enumerate(sentences):
        speaker = "Doctor" if i % 2 == 0 else "Patient"
        formatted.append(f"{speaker}: {sent}")
    return "\n".join(formatted)


# Empty report: use when transcript is missing or extraction must not hallucinate
EMPTY_CLINICAL_REPORT = {
    "symptoms": "",
    "diagnosis": "",
    "medications": "",
    "follow_up": "",
}


def extract_clinical_info(transcript: str) -> Dict[str, str]:
    """Extract clinical information from the actual conversation. Extract what's present, avoid hallucination."""
    if not transcript or not transcript.strip():
        return EMPTY_CLINICAL_REPORT.copy()
    
    # If Gemini not available, try simple pattern-based extraction
    if not _use_gemini():
        return _extract_clinical_info_simple(transcript)

    prompt = f"""Extract clinical information from this doctor-patient conversation transcript.

TASK: Analyze the conversation and extract medical information into a JSON format.

EXTRACTION RULES:
1. Extract what is CLEARLY mentioned in the conversation
2. For symptoms: What the PATIENT reports (pain, fever, cough, etc.)
3. For diagnosis: What the DOCTOR diagnoses or assesses
4. For medications: What the DOCTOR prescribes (drug name, dosage, frequency, timing)
5. For follow_up: When to return, warning signs, or follow-up instructions from DOCTOR
6. Output all information in English

EXAMPLE:
If transcript says: "Patient: I have headaches and fever. Doctor: This is viral flu. Take Paracetamol 500mg twice daily. Come back in a week."
Then extract:
{{
  "symptoms": "Headaches, Fever",
  "diagnosis": "Viral flu",
  "medications": "Paracetamol 500mg, twice daily",
  "follow_up": "Come back in a week"
}}

Return ONLY a valid JSON object with these exact keys: symptoms, diagnosis, medications, follow_up.
Use empty string "" only if that information is truly not mentioned in the conversation.

Transcript:
{transcript[:6000]}"""
    try:
        result = _gemini_generate(prompt)
        if result and result.strip():
            cleaned = result.strip()
            # Remove markdown code blocks if present
            if cleaned.startswith("```json"):
                cleaned = cleaned.replace("```json", "").replace("```", "").strip()
            elif cleaned.startswith("```"):
                cleaned = cleaned.replace("```", "").strip()
            
            # Try to find JSON in the response
            json_start = cleaned.find("{")
            json_end = cleaned.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                cleaned = cleaned[json_start:json_end]
            
            data = json.loads(cleaned)
            out = {
                "symptoms": str(data.get("symptoms", "")).strip(),
                "diagnosis": str(data.get("diagnosis", "")).strip(),
                "medications": str(data.get("medications", "")).strip(),
                "follow_up": str(data.get("follow_up", "")).strip()
            }
            
            # If all empty, try lenient extraction
            if not any(out.values()):
                return _extract_clinical_info_lenient(transcript)
            
            return out
    except json.JSONDecodeError as e:
        # JSON parsing failed, try lenient extraction
        return _extract_clinical_info_lenient(transcript)
    except Exception as e:
        # Any other error, try lenient extraction
        return _extract_clinical_info_lenient(transcript)
    
    # Final fallback
    return _extract_clinical_info_lenient(transcript)


def _extract_clinical_info_lenient(transcript: str) -> Dict[str, str]:
    """More lenient extraction when strict extraction returns empty."""
    if not _use_gemini():
        return _extract_clinical_info_simple(transcript)
    
    prompt = f"""You are analyzing a doctor-patient conversation. Extract medical information.

Read the conversation carefully and extract:
1. SYMPTOMS: What the patient complains about (headache, pain, fever, cough, etc.)
2. DIAGNOSIS: What condition the doctor identifies or assesses
3. MEDICATIONS: What medicines the doctor prescribes (name, dosage, how to take)
4. FOLLOW_UP: When to return, warning signs, or instructions

Return a JSON object with keys: symptoms, diagnosis, medications, follow_up.
Extract what you can understand from the conversation. Be thorough.

Transcript:
{transcript[:6000]}

Return ONLY JSON, no explanations."""
    try:
        result = _gemini_generate(prompt)
        if result and result.strip():
            cleaned = result.strip()
            # Remove markdown code blocks
            if cleaned.startswith("```json"):
                cleaned = cleaned.replace("```json", "").replace("```", "").strip()
            elif cleaned.startswith("```"):
                cleaned = cleaned.replace("```", "").strip()
            
            # Find JSON object
            json_start = cleaned.find("{")
            json_end = cleaned.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                cleaned = cleaned[json_start:json_end]
            
            data = json.loads(cleaned)
            out = {
                "symptoms": str(data.get("symptoms", "")).strip(),
                "diagnosis": str(data.get("diagnosis", "")).strip(),
                "medications": str(data.get("medications", "")).strip(),
                "follow_up": str(data.get("follow_up", "")).strip()
            }
            return out
    except Exception:
        pass
    return _extract_clinical_info_simple(transcript)


def _extract_clinical_info_simple(transcript: str) -> Dict[str, str]:
    """Simple pattern-based extraction as fallback when AI is unavailable."""
    out = EMPTY_CLINICAL_REPORT.copy()
    transcript_lower = transcript.lower()
    
    # Extract symptoms from Patient lines
    symptom_keywords = {
        "headache": "headache", "headaches": "headache",
        "fever": "fever",
        "pain": "pain", "ache": "pain", "aching": "pain",
        "cough": "cough", "coughing": "cough",
        "body ache": "body ache", "body pain": "body ache",
        "nausea": "nausea",
        "vomiting": "vomiting",
        "diarrhea": "diarrhea",
        "dizziness": "dizziness"
    }
    symptoms_found = []
    lines = transcript.split("\n")
    for line in lines:
        if "patient:" in line.lower():
            line_lower = line.lower()
            for keyword, symptom in symptom_keywords.items():
                if keyword in line_lower and symptom not in symptoms_found:
                    symptoms_found.append(symptom)
    
    if symptoms_found:
        out["symptoms"] = ", ".join(set(symptoms_found))
    
    # Extract diagnosis from Doctor lines
    diagnosis_keywords = ["diagnosis", "appears to be", "this is", "you have", "it's", "it is", "viral", "flu", "infection"]
    lines = transcript.split("\n")
    for line in lines:
        if "doctor:" in line.lower():
            line_lower = line.lower()
            if any(kw in line_lower for kw in ["viral flu", "flu", "infection", "diagnosis"]):
                # Extract diagnosis sentence
                sentences = re.split(r"[.!?]+", line)
                for sent in sentences:
                    sent_lower = sent.lower()
                    if any(kw in sent_lower for kw in ["viral", "flu", "infection", "diagnosis", "appears"]):
                        out["diagnosis"] = sent.strip()
                        break
                if out["diagnosis"]:
                    break
    
    # Extract medications from Doctor lines
    med_keywords = ["prescribe", "medicine", "tablet", "pill", "medication", "take", "mg", "paracetamol", "ibuprofen"]
    med_sentences = []
    lines = transcript.split("\n")
    for line in lines:
        if "doctor:" in line.lower():
            line_lower = line.lower()
            if any(kw in line_lower for kw in med_keywords):
                # Extract medication information
                sentences = re.split(r"[.!?]+", line)
                for sent in sentences:
                    if any(kw in sent.lower() for kw in med_keywords):
                        med_sentences.append(sent.strip())
    
    if med_sentences:
        out["medications"] = ". ".join(med_sentences[:3])  # Up to 3 medication sentences
    
    # Extract follow-up from Doctor lines
    followup_keywords = ["come back", "return", "follow up", "follow-up", "next week", "next visit", "if symptoms", "immediately"]
    followup_sentences = []
    lines = transcript.split("\n")
    for line in lines:
        if "doctor:" in line.lower():
            line_lower = line.lower()
            if any(kw in line_lower for kw in followup_keywords):
                sentences = re.split(r"[.!?]+", line)
                for sent in sentences:
                    if any(kw in sent.lower() for kw in followup_keywords):
                        followup_sentences.append(sent.strip())
    
    if followup_sentences:
        out["follow_up"] = ". ".join(followup_sentences[:2])  # Up to 2 follow-up sentences
    
    return out


MOCK_TEACH_BACK_QUESTIONS = [
    "Can you tell me what medication the doctor prescribed and how to take it?",
    "When should you come back for a follow-up?",
    "What warning signs mean you should return immediately?",
]


def generate_teach_back_questions(clinical_report: Dict[str, str], preferred_language: str = "en") -> List[str]:
    if not _use_gemini():
        return MOCK_TEACH_BACK_QUESTIONS.copy()
    lang_note = f" Write questions in {preferred_language}." if preferred_language != "en" else ""
    prompt = f"""You are a medical AI assistant. Generate exactly 3 teach-back questions a doctor can ask the patient to verify their understanding of the medical instructions.

Guidelines:
- Generate exactly 3 questions
- Questions should test understanding of: (1) medications and how to take them, (2) follow-up timing, (3) warning signs/red flags
- Use simple, clear language that patients can understand
- Each question should focus on one key concept
{lang_note}

Clinical Summary:
Symptoms: {clinical_report.get('symptoms', '')}
Diagnosis: {clinical_report.get('diagnosis', '')}
Medications: {clinical_report.get('medications', '')}
Follow-up: {clinical_report.get('follow_up', '')}

Return ONLY a JSON array of exactly 3 strings, e.g. ["Question 1?", "Question 2?", "Question 3?"]"""
    try:
        result = _gemini_generate(prompt)
        if result:
            cleaned = result.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned.replace("```json", "").replace("```", "").strip()
            elif cleaned.startswith("```"):
                cleaned = cleaned.replace("```", "").strip()
            data = json.loads(cleaned)
            if isinstance(data, list) and len(data) >= 3:
                return [str(q).strip() for q in data[:3]]
    except Exception:
        pass
    return MOCK_TEACH_BACK_QUESTIONS.copy()


def extract_answer_for_question(question: str, full_transcript: str) -> str:
    """Extract the patient's specific answer, handling mixed Tamil-English."""
    if not _use_gemini():
        return full_transcript[:500]
    
    prompt = f"""You are analyzing a doctor-patient conversation transcript. The conversation may be in English, Tamil, or a MIX of both languages.

DOCTOR'S QUESTION:
"{question}"

FULL CONVERSATION TRANSCRIPT:
{full_transcript[:4000]}

Extract ONLY the patient's direct answer to this specific question.

CRITICAL INSTRUCTIONS:
- Look for the patient's response (marked with "Patient:" or the patient's statement) that directly addresses this question
- Include the complete answer, even if it spans multiple sentences
- PRESERVE the original language - if patient answered in Tamil, keep Tamil; if English, keep English; if mixed (Tamil+English), keep the mix
- Preserve medical terminology exactly as spoken (keep English medical terms even in Tamil answers)
- Do NOT translate - extract the answer in the language(s) it was spoken

Return ONLY the patient's answer text in the original language(s), nothing else. If the patient didn't answer this question, return "No answer provided"."""
    try:
        result = _gemini_generate(prompt)
        if result and result.strip() and "no answer" not in result.lower():
            return result.strip()[:800]  # Increased length for complete answers
    except Exception:
        pass
    return full_transcript[:500]


def compute_understanding_score(question: str, patient_answer: str, correct_info: str) -> int:
    """Compute understanding score, handling mixed Tamil-English answers."""
    if not patient_answer or not patient_answer.strip():
        return 0
    if not _use_gemini():
        return 75
    
    # Determine question type for more accurate scoring
    question_lower = question.lower()
    is_medication_q = any(word in question_lower for word in ["medication", "medicine", "prescribe", "take", "dosage", "tablet", "pill"])
    is_followup_q = any(word in question_lower for word in ["follow", "come back", "return", "when", "next visit", "appointment"])
    is_warning_q = any(word in question_lower for word in ["warning", "sign", "symptom", "immediately", "emergency", "danger", "red flag"])
    
    question_type = "medication" if is_medication_q else ("follow-up" if is_followup_q else ("warning" if is_warning_q else "general"))
    
    prompt = f"""You are a medical AI assistant evaluating a patient's understanding of medical instructions using the teach-back method.

CRITICAL: The patient's answer may be in English, Tamil, or a MIX of both languages. Evaluate based on MEANING, not language.

DOCTOR'S QUESTION (Type: {question_type}):
{question}

PATIENT'S ANSWER (may be in English, Tamil, or mixed):
{patient_answer}

EXPECTED CORRECT INFORMATION (from clinical report):
{correct_info}

EVALUATION INSTRUCTIONS:
1. Analyze what the question is asking about (medications, follow-up timing, warning signs, etc.)
2. Check if the patient's answer addresses the question directly - evaluate MEANING, not exact words
3. Verify the accuracy of key details mentioned by the patient (understand Tamil answers correctly)
4. Assess completeness - did they mention all important points?
5. LANGUAGE HANDLING:
   - If patient answered in Tamil, understand the Tamil meaning and compare with expected information
   - If patient answered in mixed Tamil-English, evaluate both parts
   - Focus on MEDICAL ACCURACY of the meaning, not the language used
   - Medical terms may be in English even in Tamil sentences - that's correct

SCORING RUBRIC (Be strict but fair):
- 90-100 (Excellent): Patient demonstrates excellent understanding - accurately mentions ALL or MOST key details:
  * For medication questions: Correct drug name, dosage, frequency, timing (e.g., "after food"), duration
  * For follow-up questions: Correct timing (e.g., "1 week", "5 days"), conditions for return
  * For warning questions: Correct warning signs mentioned
  Answer is clear, comprehensive, and medically accurate (regardless of language).

- 70-89 (Good): Patient shows good understanding - mentions MOST key points correctly but may miss ONE minor detail. Answer is mostly accurate and addresses the core question.

- 50-69 (Partial): Patient shows partial understanding - mentions SOME correct information but misses IMPORTANT details or has minor inaccuracies. Answer addresses the question but is incomplete or has gaps.

- 30-49 (Limited): Patient shows limited understanding - mentions VERY FEW correct details, significant gaps, or has notable inaccuracies. Answer is vague, partially wrong, or shows confusion.

- 0-29 (Poor): Patient shows poor/no understanding - provides incorrect information, completely wrong answer, irrelevant response, or no meaningful answer to the question.

SPECIFIC EVALUATION FOR {question_type.upper()} QUESTIONS:
- Focus on the key information relevant to this question type
- For follow-up questions: Check if patient mentions timing, conditions, or warning signs correctly (understand Tamil timing expressions)
- For medication questions: Verify drug name, dosage, frequency, and timing are correct (may be mentioned in Tamil)
- For warning questions: Ensure patient identifies the correct warning signs (may be described in Tamil)

IMPORTANT:
- Accuracy is critical in medical contexts - be strict but fair
- Evaluate MEANING, not language - a correct answer in Tamil should score the same as in English
- If patient's answer is completely wrong or irrelevant → score 0-29
- If patient mentions correct key points but misses important details → score 50-69
- Only score 90+ if answer is comprehensive, accurate, and complete
- Consider partial credit for partially correct answers
- Understand Tamil medical expressions and compare with expected information

Return ONLY a single integer score from 0-100, nothing else. No explanation, just the number."""
    try:
        result = _gemini_generate(prompt)
        if result:
            cleaned = result.strip()
            # Extract first number found in the response
            numbers = re.findall(r'\d+', cleaned)
            if numbers:
                score = max(0, min(100, int(numbers[0])))
                return score
    except Exception:
        pass
    return 75


def generate_patient_report(
    clinical_report: Dict[str, str],
    transcript: str,
    preferred_language: str = "en",
) -> Dict[str, Any]:
    """Generate a well-formatted patient report."""
    lang_name = LANG_NAMES.get(preferred_language, "English")
    lang_note = f" Write the entire report in {lang_name}." if preferred_language != "en" else ""
    
    content_prompt = f"""You are a medical AI assistant creating a patient-friendly take-home report.

Create a clear, well-formatted take-home report for the patient based on this clinical information. Use plain language that patients can easily understand.{lang_note}

IMPORTANT: Preserve English medical terminology (drug names, dosages, medical conditions) even if writing in {lang_name}. Mix English medical terms with {lang_name} explanations.

Clinical Information:
- Diagnosis: {clinical_report.get('diagnosis', '')}
- Symptoms: {clinical_report.get('symptoms', '')}
- Medications: {clinical_report.get('medications', '')}
- Follow-up: {clinical_report.get('follow_up', '')}

Structure the report with clear, well-formatted sections:

=== DIAGNOSIS ===
[What the doctor found - explain in simple terms]

=== MEDICATIONS ===
[List each medication with complete instructions]
- Medication name: [name]
- Dosage: [amount]
- How to take: [frequency, timing, e.g., "2 tablets 3 times daily after food"]
- Duration: [how long to take]

=== IMPORTANT INSTRUCTIONS ===
[Follow-up instructions, when to return, what to do]

=== WARNING SIGNS ===
[When to return immediately - list specific warning signs]

Use a warm, reassuring tone. Make it easy to read and understand. Use clear section headers and bullet points.

Return the complete report text with proper formatting, no JSON or code markers."""
    
    content = ""
    if _use_gemini():
        try:
            content = _gemini_generate(content_prompt)
            if content:
                content = content.strip()
        except Exception:
            pass
    
    if not content or len(content) < 50:
        # Fallback with proper formatting
        content = f"""=== YOUR VISIT SUMMARY ===

=== DIAGNOSIS ===
{clinical_report.get('diagnosis', 'Not specified')}

=== MEDICATIONS ===
{clinical_report.get('medications', 'No medications prescribed')}

=== IMPORTANT INSTRUCTIONS ===
{clinical_report.get('follow_up', 'No specific follow-up instructions')}

=== WARNING SIGNS ===
Return immediately if you experience:
- Breathing difficulty or shortness of breath
- Severe pain that doesn't improve
- High fever (above 101°F/38.5°C)
- Any other severe or concerning symptoms

If you have questions, contact your doctor or hospital. Download and keep this report for your records."""
    
    warning_signs = "Breathing difficulty, severe pain, high fever, or any other severe symptoms."
    if _use_gemini():
        try:
            warning_prompt = f"""Extract warning signs or red flags from this follow-up instruction: {clinical_report.get('follow_up', '')}
Return a concise list of warning signs, or if none mentioned, return: "Breathing difficulty, severe pain, high fever, or any other severe symptoms."
Return only the warning signs text, nothing else."""
            warning_result = _gemini_generate(warning_prompt)
            if warning_result and warning_result.strip():
                warning_signs = warning_result.strip()
        except Exception:
            pass
    
    return {
        "language": preferred_language,
        "content": content,
        "diagnosis_summary": clinical_report.get("diagnosis", ""),
        "medication_instructions": clinical_report.get("medications", ""),
        "warning_signs": warning_signs,
    }