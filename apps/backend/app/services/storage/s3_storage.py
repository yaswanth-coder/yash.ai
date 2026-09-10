import logging
import asyncio
from typing import BinaryIO, Optional
from app.services.storage.base import IStorageProvider

logger = logging.getLogger("yash.ai.storage.s3")


class S3StorageProvider(IStorageProvider):
    """
    AWS S3 storage provider for production Yash.AI deployments.
    Generates secure presigned URLs for client-side uploads and downloads.
    Never exposes S3 credentials or makes buckets publicly readable.
    """

    def __init__(
        self,
        bucket_name: str,
        region_name: str = "us-east-1",
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
        endpoint_url: Optional[str] = None,
    ):
        self.bucket_name = bucket_name
        self.region_name = region_name
        self.endpoint_url = endpoint_url

        try:
            import boto3
            from botocore.config import Config

            session_kwargs = {"region_name": region_name}
            if aws_access_key_id and aws_secret_access_key:
                session_kwargs["aws_access_key_id"] = aws_access_key_id
                session_kwargs["aws_secret_access_key"] = aws_secret_access_key

            self.session = boto3.Session(**session_kwargs)
            self.s3_client = self.session.client(
                "s3",
                endpoint_url=endpoint_url,
                config=Config(signature_version="s3v4")
            )
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            self.s3_client = None

    async def upload(self, file_obj: BinaryIO, storage_key: str, content_type: str = "application/octet-stream") -> str:
        if not self.s3_client:
            raise RuntimeError("S3 client is not configured.")

        clean_key = storage_key.lstrip("/\\")
        
        def _upload():
            if hasattr(file_obj, "seek"):
                file_obj.seek(0)
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                clean_key,
                ExtraArgs={"ContentType": content_type}
            )

        await asyncio.to_thread(_upload)
        return await self.get_download_url(clean_key)

    async def get_download_url(self, storage_key: str, expires_in_seconds: int = 3600) -> str:
        if not self.s3_client:
            raise RuntimeError("S3 client is not configured.")

        clean_key = storage_key.lstrip("/\\")

        def _presign():
            return self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": clean_key},
                ExpiresIn=expires_in_seconds
            )

        return await asyncio.to_thread(_presign)

    async def generate_presigned_upload_url(self, storage_key: str, content_type: str, expires_in_seconds: int = 900) -> dict:
        """
        Generates S3 presigned post or put url for direct client uploads.
        """
        if not self.s3_client:
            raise RuntimeError("S3 client is not configured.")

        clean_key = storage_key.lstrip("/\\")

        def _presign_put():
            return self.s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": clean_key,
                    "ContentType": content_type
                },
                ExpiresIn=expires_in_seconds
            )

        url = await asyncio.to_thread(_presign_put)
        return {"upload_url": url, "storage_key": clean_key, "method": "PUT"}

    async def delete(self, storage_key: str) -> bool:
        if not self.s3_client:
            return False

        clean_key = storage_key.lstrip("/\\")

        def _delete():
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=clean_key)

        try:
            await asyncio.to_thread(_delete)
            return True
        except Exception as e:
            logger.error(f"Failed to delete S3 object {clean_key}: {e}")
            return False

    async def exists(self, storage_key: str) -> bool:
        if not self.s3_client:
            return False

        clean_key = storage_key.lstrip("/\\")

        def _head():
            try:
                self.s3_client.head_object(Bucket=self.bucket_name, Key=clean_key)
                return True
            except Exception:
                return False

        return await asyncio.to_thread(_head)
