import os
import shutil
import asyncio
from typing import BinaryIO
from pathlib import Path
from app.services.storage.base import IStorageProvider


class LocalStorageProvider(IStorageProvider):
    """
    Local file storage provider for Yash.AI development environments.
    Stores files under the specified base directory and exposes them via authenticated streaming endpoints.
    """

    def __init__(self, base_dir: str = "uploads/assets"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_path(self, storage_key: str) -> Path:
        clean_key = storage_key.lstrip("/\\").replace("..", "_")
        full_path = self.base_dir / clean_key
        return full_path

    async def upload(self, file_obj: BinaryIO, storage_key: str, content_type: str = "application/octet-stream") -> str:
        target_path = self._resolve_path(storage_key)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        def _write():
            if hasattr(file_obj, "seek"):
                file_obj.seek(0)
            if hasattr(file_obj, "read"):
                data = file_obj.read()
            else:
                data = bytes(file_obj)

            with open(target_path, "wb") as f:
                f.write(data)

        await asyncio.to_thread(_write)

        clean_key = storage_key.lstrip("/\\")
        return f"/assets/raw/{clean_key}"

    async def get_download_url(self, storage_key: str, expires_in_seconds: int = 3600) -> str:
        clean_key = storage_key.lstrip("/\\")
        return f"/assets/raw/{clean_key}"

    async def delete(self, storage_key: str) -> bool:
        target_path = self._resolve_path(storage_key)

        def _delete():
            if target_path.exists() and target_path.is_file():
                target_path.unlink()
                return True
            return False

        return await asyncio.to_thread(_delete)

    async def exists(self, storage_key: str) -> bool:
        target_path = self._resolve_path(storage_key)
        return target_path.exists() and target_path.is_file()
