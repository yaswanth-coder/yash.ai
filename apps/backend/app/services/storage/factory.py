import os
import logging
from app.core.config import settings
from app.services.storage.base import IStorageProvider
from app.services.storage.local_storage import LocalStorageProvider
from app.services.storage.s3_storage import S3StorageProvider

logger = logging.getLogger("yash.ai.storage.factory")

_global_storage_provider: IStorageProvider = None


def get_storage_provider() -> IStorageProvider:
    """
    Factory that returns the appropriate storage provider:
    - S3StorageProvider when AWS S3 credentials and bucket are defined.
    - LocalStorageProvider for zero-dependency local development and testing.
    """
    global _global_storage_provider
    if _global_storage_provider is not None:
        return _global_storage_provider

    bucket_name = getattr(settings, "AWS_S3_BUCKET", None) or os.getenv("AWS_S3_BUCKET", "").strip()
    access_key = getattr(settings, "AWS_ACCESS_KEY_ID", None) or os.getenv("AWS_ACCESS_KEY_ID", "").strip()
    secret_key = getattr(settings, "AWS_SECRET_ACCESS_KEY", None) or os.getenv("AWS_SECRET_ACCESS_KEY", "").strip()
    region_name = getattr(settings, "AWS_REGION", None) or os.getenv("AWS_REGION", "us-east-1").strip()
    endpoint_url = getattr(settings, "AWS_ENDPOINT_URL", None) or os.getenv("AWS_ENDPOINT_URL", "").strip() or None

    if bucket_name and access_key and secret_key:
        logger.info(f"[Storage] Initializing AWS S3 Storage Provider targeting bucket: '{bucket_name}' ({region_name})")
        _global_storage_provider = S3StorageProvider(
            bucket_name=bucket_name,
            region_name=region_name,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            endpoint_url=endpoint_url
        )
    else:
        logger.info("[Storage] AWS S3 credentials not provided. Initializing LocalStorageProvider (uploads/assets).")
        base_dir = getattr(settings, "LOCAL_STORAGE_DIR", "uploads/assets")
        _global_storage_provider = LocalStorageProvider(base_dir=base_dir)

    return _global_storage_provider
