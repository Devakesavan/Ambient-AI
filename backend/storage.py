"""
File storage for Ambient AI Healthcare.
"""
import os
from config import settings


def ensure_storage():
    path = settings.storage_path
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)
    return path


def save_audio(consultation_id: int, extension: str = "webm") -> str:
    ensure_storage()
    filename = f"consultation_{consultation_id}.{extension}"
    filepath = os.path.join(settings.storage_path, filename)
    return filepath


def save_transcript(consultation_id: int, content: str) -> str:
    ensure_storage()
    filename = f"consultation_{consultation_id}_transcript.txt"
    filepath = os.path.join(settings.storage_path, filename)
    with open(filepath, "w") as f:
        f.write(content)
    return filepath
