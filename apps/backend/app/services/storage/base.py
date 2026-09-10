from abc import ABC, abstractmethod
from typing import BinaryIO, Optional


class IStorageProvider(ABC):
    """
    Abstract storage provider interface for Yash.AI Universal Asset Engine.
    Supports seamless dual-mode execution:
    - Local storage for zero-dependency development.
    - AWS S3 presigned URLs for cloud production.
    """

    @abstractmethod
    async def upload(self, file_obj: BinaryIO, storage_key: str, content_type: str = "application/octet-stream") -> str:
        """
        Uploads file content to storage and returns an accessible URL or streaming identifier.
        """
        pass

    @abstractmethod
    async def get_download_url(self, storage_key: str, expires_in_seconds: int = 3600) -> str:
        """
        Generates a direct download/streaming URL (presigned S3 URL or authenticated local streaming endpoint).
        """
        pass

    @abstractmethod
    async def delete(self, storage_key: str) -> bool:
        """
        Removes the asset at storage_key from the underlying storage provider.
        """
        pass

    @abstractmethod
    async def exists(self, storage_key: str) -> bool:
        """
        Checks whether the asset exists in storage.
        """
        pass
