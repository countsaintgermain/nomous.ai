import hashlib

def calculate_file_hash(file_path: str) -> str:
    """Oblicza hash SHA-256 dla pliku w celu deduplikacji."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Czytanie w blokach 4kb
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()
