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


def save_medical_image(consultation_id: int, original_filename: str, image_bytes: bytes) -> tuple[str, str]:
    """Save a medical image and return (stored_filename, filepath)."""
    ensure_storage()
    images_dir = os.path.join(settings.storage_path, "images")
    if not os.path.exists(images_dir):
        os.makedirs(images_dir, exist_ok=True)
    
    # Get extension from original filename
    ext = os.path.splitext(original_filename)[1].lower() or ".jpg"
    import uuid
    stored_filename = f"consultation_{consultation_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(images_dir, stored_filename)
    
    with open(filepath, "wb") as f:
        f.write(image_bytes)
    
    return stored_filename, filepath


def get_image_path(filename: str) -> str:
    """Get the full path for a stored image."""
    return os.path.join(settings.storage_path, "images", filename)


def save_signature(doctor_id: int, original_filename: str, image_bytes: bytes) -> str:
    """Save a doctor's e-signature image and return the stored filename."""
    ensure_storage()
    sig_dir = os.path.join(settings.storage_path, "signatures")
    if not os.path.exists(sig_dir):
        os.makedirs(sig_dir, exist_ok=True)
    ext = os.path.splitext(original_filename)[1].lower() or ".png"
    stored_filename = f"signature_doctor_{doctor_id}{ext}"
    filepath = os.path.join(sig_dir, stored_filename)
    with open(filepath, "wb") as f:
        f.write(image_bytes)
    return stored_filename


def get_signature_path(filename: str) -> str:
    """Get the full path for a stored signature."""
    return os.path.join(settings.storage_path, "signatures", filename)
