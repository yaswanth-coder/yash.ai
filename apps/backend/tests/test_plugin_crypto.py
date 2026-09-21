import pytest
from app.services.plugin_crypto import PluginCryptoService


def test_crypto_roundtrip():
    crypto = PluginCryptoService()
    secret = "ghp_1234567890abcdefghijklmnopqrstuvwxyz"
    encrypted = crypto.encrypt_secret(secret)

    assert encrypted != secret
    assert len(encrypted) > len(secret)

    decrypted = crypto.decrypt_secret(encrypted)
    assert decrypted == secret


def test_crypto_credentials_dict_roundtrip():
    crypto = PluginCryptoService()
    creds = {
        "api_key": "test_api_key_xyz",
        "access_token": "oauth_token_12345",
        "refresh_token": "refresh_token_67890",
        "expires_in": 3600
    }
    ciphertext = crypto.encrypt_credentials(creds)
    assert isinstance(ciphertext, str)
    assert "test_api_key_xyz" not in ciphertext
    assert "oauth_token_12345" not in ciphertext

    decrypted = crypto.decrypt_credentials(ciphertext)
    assert decrypted == creds


def test_crypto_mask_secret():
    assert PluginCryptoService.mask_secret("ghp_1234567890abcdef") == "ghp••••••••cdef"
    assert PluginCryptoService.mask_secret("short") == "••••••"
    assert PluginCryptoService.mask_secret("") == ""
