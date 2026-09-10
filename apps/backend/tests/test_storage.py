import pytest
import io
import asyncio
from app.services.storage.factory import get_storage_provider
from app.services.storage.local_storage import LocalStorageProvider

@pytest.mark.asyncio
async def test_local_storage_upload_and_retrieve():
    provider = LocalStorageProvider(base_dir="uploads/test_assets")
    dummy_file = io.BytesIO(b"test image content binary payload")
    key = "projects/test-proj/assets/test_img.png"
    url = await provider.upload(dummy_file, key, "image/png")
    assert "/assets/raw/" in url or "test_img.png" in url
    
    download_url = await provider.get_download_url(key)
    assert download_url is not None
    
    deleted = await provider.delete(key)
    assert deleted is True

@pytest.mark.asyncio
async def test_factory_returns_provider():
    provider = get_storage_provider()
    assert provider is not None
