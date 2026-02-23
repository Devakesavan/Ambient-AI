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

# Add FFmpeg from imageio-ffmpeg to PATH for Whisper
try:
    import imageio_ffmpeg
    import shutil
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(ffmpeg_exe)
    # Whisper expects 'ffmpeg' or 'ffmpeg.exe' in PATH, but imageio-ffmpeg has versioned names
    # Create a copy named 'ffmpeg.exe' if it doesn't exist
    target_ffmpeg = os.path.join(ffmpeg_dir, "ffmpeg.exe")
    if not os.path.exists(target_ffmpeg):
        shutil.copy2(ffmpeg_exe, target_ffmpeg)
        print(f"[AI Service] Created ffmpeg.exe copy at: {target_ffmpeg}")
    os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
    print(f"[AI Service] FFmpeg added to PATH from: {ffmpeg_dir}")
except Exception as e:
    print(f"[AI Service] Warning: Could not set FFmpeg path: {e}")

from config import settings

_whisper_model = None
_gemini_model = None


def _use_gemini() -> bool:
    return bool(settings.gemini_api_key and settings.gemini_api_key.strip())


def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        import whisper
        import torch
        
        # Use "tiny" for fastest transcription with GPU
        model_name = getattr(settings, "whisper_model", "tiny") or "tiny"
        
        # Check if CUDA is available for GPU acceleration
        device = "cuda" if torch.cuda.is_available() else "cpu"
        
        print("\n" + "="*60)
        print("            WHISPER AI TRANSCRIPTION ENGINE")
        print("="*60)
        print(f"  Model:      {model_name.upper()}")
        print(f"  Device:     {device.upper()}")
        
        if device == "cuda":
            gpu_name = torch.cuda.get_device_name(0)
            gpu_mem = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            print(f"  GPU:        {gpu_name}")
            print(f"  VRAM:       {gpu_mem:.1f} GB")
            print(f"  Status:     GPU ACCELERATION ENABLED")
        else:
            print(f"  Status:     CPU MODE (No GPU detected)")
        
        print("="*60 + "\n")
        
        _whisper_model = whisper.load_model(model_name, device=device)
        print(f"[Whisper] Model loaded successfully on {device.upper()}")
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
        _gemini_model = genai.GenerativeModel("gemini-2.5-flash", safety_settings=safety_settings)
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
            # Log blocked/filtered responses
            if hasattr(response, 'prompt_feedback'):
                print(f"[Gemini] Prompt feedback: {response.prompt_feedback}")
    except Exception as e:
        print(f"[Gemini] API error: {e}")
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


def transcribe_audio(audio_bytes: bytes, consultation_id: int, filename: str = "recording.webm") -> str:
    """Transcribe audio with auto-detect for English/Tamil/mixed using GPU-accelerated Whisper."""
    import time
    start_time = time.time()
    
    try:
        print(f"\\n{'='*60}")
        print(f"  AUDIO TRANSCRIPTION - Consultation #{consultation_id}")
        print(f"{'='*60}")
        print(f"  File:       {filename}")
        print(f"  Size:       {len(audio_bytes):,} bytes ({len(audio_bytes)/1024:.1f} KB)")
        
        model = _get_whisper_model()
        
        # Get file extension from filename, default to .webm
        ext = os.path.splitext(filename)[1].lower() if filename else ".webm"
        if not ext:
            ext = ".webm"
        # Map common extensions to ffmpeg-compatible formats
        ext_map = {".mp3": ".mp3", ".wav": ".wav", ".webm": ".webm", ".ogg": ".ogg", ".m4a": ".m4a", ".flac": ".flac"}
        suffix = ext_map.get(ext, ".webm")
        print(f"  Format:     {suffix}")
        
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        
        try:
            # For longer audio (>30KB likely means >30 seconds), use better quality settings
            is_long_audio = len(audio_bytes) > 30000
            beam = 5 if is_long_audio else 3  # Better accuracy
            best_of = 3 if is_long_audio else 2
            
            print(f"  Mode:       {'Long Audio' if is_long_audio else 'Short Audio'} (beam={beam}, best_of={best_of})")
            print(f"  Status:     Transcribing with GPU...")
            
            result = model.transcribe(
                tmp_path,
                language=None,  # Auto-detect (English, Tamil, or mixed)
                verbose=False,
                task="transcribe",
                beam_size=beam,
                best_of=best_of,
                initial_prompt="Medical consultation between doctor and patient. Includes symptoms, diagnosis, medications, and follow-up instructions. May be in English, Tamil, or both. Capture all medical terms, drug names, dosages, and timing instructions accurately."
            )
            raw_text = (result.get("text") or "").strip()
            detected_lang = result.get("language", "unknown")
            
            elapsed = time.time() - start_time
            print(f"  Language:   {detected_lang.upper()}")
            print(f"  Duration:   {elapsed:.2f} seconds")
            print(f"  Output:     {len(raw_text)} characters")
            print(f"{'='*60}")
            print(f"\\n[Transcription Result]:")
            print(f"{raw_text[:500]}{'...' if len(raw_text) > 500 else ''}")
            print()

            if not raw_text:
                print(f"[Transcribe] Empty result — audio may be silent or corrupt")
                raise ValueError("Transcription returned empty result. The audio may be silent, too short, or in an unsupported format. Please try again.")

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
    except Exception as e:
        import traceback
        print(f"[Transcribe] ERROR: {e}")
        print(traceback.format_exc())
        raise RuntimeError(f"Audio transcription failed: {str(e)}. Please check the audio file and try again.")


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
    """Extract clinical information from the actual conversation with high precision."""
    if not transcript or not transcript.strip():
        return EMPTY_CLINICAL_REPORT.copy()
    
    print(f"\n[Clinical Extraction] Processing transcript ({len(transcript)} chars)...")
    
    # If Gemini not available, try simple pattern-based extraction
    if not _use_gemini():
        return _extract_clinical_info_simple(transcript)

    prompt = f"""You are a highly skilled medical AI assistant analyzing a doctor-patient consultation transcript.

TASK: Create a CONCISE clinical summary from this conversation. Extract key medical information only.

OUTPUT REQUIREMENTS - BE BRIEF AND SPECIFIC:

1. SYMPTOMS: List patient's complaints in SHORT comma-separated format
   - Example: "headache, fever, body ache, cough"
   - Keep it under 50 characters if possible

2. DIAGNOSIS: State the doctor's diagnosis in ONE SHORT phrase
   - Example: "viral flu" or "common cold" or "upper respiratory infection"
   - Just the condition name, nothing else

3. MEDICATIONS: List prescription in BRIEF format
   - Example: "Paracetamol 500mg - twice daily for 3 days"
   - Include: drug name, dosage, frequency
   - Keep each medicine on one line

4. FOLLOW_UP: Short instruction for patient
   - Example: "Return if symptoms persist beyond 5 days"
   - Keep it brief and actionable

CRITICAL RULES:
- Be CONCISE - no long sentences or explanations
- Extract ONLY what is explicitly mentioned
- Do NOT start with "I will prescribe" or "Based on" - just state the facts
- Use empty string "" if information is not mentioned

Transcript:
{transcript[:8000]}

Return ONLY a valid JSON object with exactly these keys: symptoms, diagnosis, medications, follow_up.
No markdown formatting, just the JSON object."""
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

            # If Gemini left some fields empty but others are present, run the more
            # lenient extractor and use it to fill ONLY the missing pieces. This lets
            # the AI infer likely diagnosis/medications/follow-up from context when
            # the strict extractor was too conservative.
            if any(not out[k] for k in ("symptoms", "diagnosis", "medications", "follow_up")):
                try:
                    alt = _extract_clinical_info_lenient(transcript)
                    for key in ("symptoms", "diagnosis", "medications", "follow_up"):
                        if not out.get(key) and alt.get(key):
                            out[key] = alt[key]
                except Exception:
                    pass
            
            # If everything is still empty, fall back fully to lenient extraction.
            if not any(out.values()):
                return _extract_clinical_info_lenient(transcript)
            
            # Log extraction results
            print(f"\\n{'='*60}")
            print(f"  CLINICAL EXTRACTION RESULTS")
            print(f"{'='*60}")
            print(f"  Symptoms:    {out.get('symptoms', 'N/A')[:80]}")
            print(f"  Diagnosis:   {out.get('diagnosis', 'N/A')[:80]}")
            print(f"  Medications: {out.get('medications', 'N/A')[:80]}")
            print(f"  Follow-up:   {out.get('follow_up', 'N/A')[:80]}")
            print(f"{'='*60}\\n")
            
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
    
    prompt = f"""Analyze this doctor-patient conversation and create a BRIEF clinical summary.

Extract in SHORT format:
1. SYMPTOMS: Patient complaints (comma-separated, e.g., "headache, fever, cough")
2. DIAGNOSIS: Doctor's diagnosis (just the condition name, e.g., "viral flu")
3. MEDICATIONS: Prescriptions (drug, dose, frequency - keep brief)
4. FOLLOW_UP: When to return/warning signs (one short sentence)

IMPORTANT: Be CONCISE. No long explanations. Just key facts.

Transcript:
{transcript[:6000]}

Return ONLY JSON with keys: symptoms, diagnosis, medications, follow_up"""
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


def _strip_speaker_labels(transcript: str) -> str:
    """Remove Doctor:/Patient: labels from transcript so Gemini focuses on content, not labels."""
    lines = []
    for line in transcript.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue
        # Remove speaker prefix if present
        for prefix in ("Doctor:", "Patient:", "doctor:", "patient:"):
            if stripped.startswith(prefix):
                stripped = stripped[len(prefix):].strip()
                break
        if stripped:
            lines.append(stripped)
    return "\n".join(lines)


def extract_all_teach_back_answers(questions: List[str], full_transcript: str, original_clinical_report: Dict[str, str] = None) -> List[str]:
    """Extract all teach-back answers with intelligent content matching and summarization."""
    if not questions:
        return []
    
    print(f"\n[Teach-Back Extraction] Processing {len(questions)} questions...")
    print(f"[Teach-Back Extraction] Transcript length: {len(full_transcript)} chars")
    
    # Strip speaker labels — diarization is unreliable and confuses extraction
    clean_transcript = _strip_speaker_labels(full_transcript)
    print(f"[Teach-Back Extraction] Cleaned transcript (no labels):\n{clean_transcript[:300]}...")
    
    if not _use_gemini():
        # Fallback: split transcript by sentences
        sentences = [s.strip() for s in re.split(r'[.!?]+', clean_transcript) if s.strip()]
        # Even-indexed sentences are likely doctor questions, odd-indexed are patient answers
        patient_answers = [f"Patient responded: {s}" for i, s in enumerate(sentences) if i % 2 == 1]
        while len(patient_answers) < len(questions):
            patient_answers.append("")
        return patient_answers[:len(questions)]
    
    questions_formatted = "\n".join([f"Q{i+1}: {q}" for i, q in enumerate(questions)])
    
    # Include clinical report context for better matching
    clinical_context = ""
    if original_clinical_report:
        clinical_context = f"""\n\nORIGINAL CLINICAL INFORMATION (for reference):
- Symptoms: {original_clinical_report.get('symptoms', 'N/A')}
- Diagnosis: {original_clinical_report.get('diagnosis', 'N/A')}
- Medications: {original_clinical_report.get('medications', 'N/A')}
- Follow-up: {original_clinical_report.get('follow_up', 'N/A')}"""
    
    prompt = f"""You are analyzing a teach-back conversation where a doctor asks questions to verify a patient's understanding of their treatment.

TEACH-BACK QUESTIONS ASKED BY THE DOCTOR:
{questions_formatted}
{clinical_context}

FULL CONVERSATION (speaker labels removed — figure out who said what from CONTEXT):
{clean_transcript[:6000]}

IMPORTANT: The above text has NO speaker labels because the automatic labeling was unreliable.
Use CONTEXT to determine what the patient said vs what the doctor said:
- Doctor's lines: questions, confirmations like "Good", "Correct", prompts like "Now tell me..."
- Patient's lines: answers about medications, dosages, timing, symptoms, follow-up instructions

TASK: For each teach-back question, find and summarize what the PATIENT said in response.

RULES:
1. MATCH BY CONTENT — find where the patient talks about the topic of each question:
   - Medication question → find mentions of drug names, dosages, frequency, duration
   - Follow-up question → find mentions of when to return, conditions for returning
   - Warning signs question → find mentions of emergency symptoms, when to seek help

2. FORMAT each answer as: "Patient responded: [concise 1-2 sentence summary]"
   Examples:
   - "Patient responded: Will take fluticasone inhaler, two puffs twice a day for ten days."
   - "Patient responded: Should come back if fever returns or breathing gets worse."
   - "Patient responded: Will return immediately if trouble breathing, cough worsens, or fever comes back."

3. Only write "Patient did not address this question." if the topic is truly NEVER mentioned.

Return a JSON array with exactly {len(questions)} strings:
["Patient responded: ...", "Patient responded: ...", "Patient responded: ..."]

Return ONLY the JSON array, no markdown, no explanation."""

    try:
        result = _gemini_generate(prompt)
        print(f"[Teach-Back Extraction] Raw Gemini response: {result[:300] if result else '(empty)'}")
        if result:
            # Clean the response to extract JSON
            result = result.strip()
            if result.startswith("```"):
                result = result.split("```")[1]
                if result.startswith("json"):
                    result = result[4:]
            result = result.strip()
            
            data = json.loads(result)
            if isinstance(data, list):
                # Ensure we have the right number of answers
                answers = []
                for a in data:
                    ans = str(a).strip() if a else ""
                    # Ensure proper format
                    if ans and not ans.lower().startswith("patient"):
                        ans = f"Patient responded: {ans}"
                    answers.append(ans)
                    
                while len(answers) < len(questions):
                    answers.append("Patient did not address this question.")
                
                # Log extracted answers
                print(f"\n{'='*60}")
                print(f"  TEACH-BACK ANSWERS EXTRACTED")
                print(f"{'='*60}")
                for i, (q, a) in enumerate(zip(questions, answers)):
                    q_short = q[:50] + "..." if len(q) > 50 else q
                    a_short = a[:80] + "..." if len(a) > 80 else a
                    print(f"  Q{i+1}: {q_short}")
                    print(f"  A{i+1}: {a_short if a else '(No answer)'}")
                    print()
                print(f"{'='*60}\n")
                
                return answers[:len(questions)]
            else:
                print(f"[extract_all_teach_back_answers] Gemini returned non-list: {type(data)}")
        else:
            print("[extract_all_teach_back_answers] Gemini returned empty response")
    except json.JSONDecodeError as e:
        print(f"[extract_all_teach_back_answers] JSON parse error: {e}")
        print(f"[extract_all_teach_back_answers] Raw result was: {result[:200] if result else '(none)'}")
    except Exception as e:
        import traceback
        print(f"[extract_all_teach_back_answers] Error: {e}")
        print(traceback.format_exc())
    
    # Fallback to sequential extraction
    print("[extract_all_teach_back_answers] Falling back to individual extraction")
    return [extract_answer_for_question(q, full_transcript) for q in questions]


def extract_answer_for_question(question: str, full_transcript: str) -> str:
    """Extract and summarize the patient's specific answer to this question only."""
    if not _use_gemini():
        return ""  # Avoid repeating full transcript for every question when AI is unavailable

    # Strip speaker labels — diarization is unreliable
    clean_transcript = _strip_speaker_labels(full_transcript)

    prompt = f"""You are analyzing a doctor-patient teach-back conversation. The conversation may be in English, Tamil, or a MIX of both.

DOCTOR'S QUESTION:
"{question}"

FULL CONVERSATION (speaker labels removed because they were unreliable):
{clean_transcript[:4000]}

IMPORTANT: There are NO speaker labels. Use CONTEXT to figure out which parts are the patient speaking:
- Doctor says: questions, confirmations ("Good", "Correct"), prompts
- Patient says: answers about medications, dosages, timing, symptoms, when to return

TASK: Find and SUMMARIZE what the patient said in response to the above question.

INSTRUCTIONS:
1. Find the part of the conversation where someone ANSWERS this question (that's the patient)
2. Create a BRIEF SUMMARY (1-2 sentences)
3. Start your response with "Patient responded: "
4. If patient answered correctly, summarize the key points
5. If patient was confused, note that briefly

EXAMPLES:
- "Patient responded: Will take Paracetamol 500mg twice daily after food."
- "Patient responded: Should return if symptoms don't improve in 5 days."
- "Patient responded: Mentioned breathing difficulty as warning sign."
- "Patient did not address this question."

Return ONLY the summary line."""
    try:
        result = _gemini_generate(prompt)
        if result and result.strip():
            response = result.strip()[:500]
            # Ensure proper format
            if not response.lower().startswith("patient"):
                response = f"Patient responded: {response}"
            return response
    except Exception as e:
        print(f"[extract_answer_for_question] Error: {e}")
    return "Patient did not address this question."


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


def compute_overall_understanding_score(
    questions: list[str],
    answers: list[str],
    per_question_scores: list[int],
    correct_info: str,
) -> int:
    """Have Gemini compute a holistic overall understanding score considering all Q&A together."""
    if not questions or not any(answers):
        return 0
    if not _use_gemini():
        # Fallback: simple average
        valid = [s for s in per_question_scores if s is not None]
        return round(sum(valid) / len(valid)) if valid else 0

    qa_block = ""
    for i, (q, a, s) in enumerate(zip(questions, answers, per_question_scores), 1):
        qa_block += f"Q{i}: {q}\nPatient Answer: {a or '(no answer)'}\nPer-Question Score: {s}/100\n\n"

    prompt = f"""You are a senior medical educator evaluating a patient's OVERALL understanding of their medical instructions using the teach-back method.

CLINICAL INFORMATION (what the patient should know):
{correct_info}

TEACH-BACK QUESTIONS AND PATIENT RESPONSES:
{qa_block}

YOUR TASK:
Evaluate the patient's OVERALL understanding holistically — not just an average of individual scores. Consider:

1. **Critical Knowledge Gaps**: Did the patient miss any CRITICAL information (e.g., wrong medication dosage, missed warning signs)? A single dangerous gap should lower the overall score significantly.
2. **Pattern of Understanding**: Does the patient show a consistent pattern of understanding, or is it scattered?
3. **Safety Assessment**: Would this patient be SAFE to go home based on their demonstrated understanding?
4. **Key Areas Coverage**:
   - Medication understanding (names, dosage, frequency, duration)
   - Follow-up plan awareness (when to return, what to watch for)
   - Warning signs recognition (when to seek emergency care)
5. **Coherence**: Do the answers together paint a picture of someone who understood the consultation, or someone who caught fragments?

SCORING GUIDELINES:
- 90-100: Patient demonstrates comprehensive understanding across ALL areas. Safe for discharge with confidence. No critical gaps.
- 75-89: Good understanding overall with minor gaps. Safe for discharge. May need brief reinforcement on 1-2 points.
- 60-74: Moderate understanding. Some important gaps exist. Would benefit from re-education before discharge.
- 40-59: Limited understanding. Significant gaps in critical areas. Needs substantial re-education.
- 20-39: Poor understanding. Multiple critical gaps. Not safe to discharge without thorough re-education.
- 0-19: Minimal/no understanding demonstrated. Immediate re-education required.

IMPORTANT: This is a HOLISTIC evaluation. A patient who gets one question perfectly (100) but completely fails two critical questions (0, 10) should NOT get 37 (average) — they should get lower because the gaps are dangerous. Conversely, a patient with consistent 70s showing solid partial understanding may deserve higher than 70 overall.

Return ONLY a single integer score from 0-100. No explanation, just the number."""

    try:
        result = _gemini_generate(prompt)
        if result:
            cleaned = result.strip()
            numbers = re.findall(r'\d+', cleaned)
            if numbers:
                return max(0, min(100, int(numbers[0])))
    except Exception:
        pass
    # Fallback: weighted average
    valid = [s for s in per_question_scores if s is not None]
    return round(sum(valid) / len(valid)) if valid else 0


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