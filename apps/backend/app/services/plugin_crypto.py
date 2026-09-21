import base64
import json
import logging
from typing import Dict, Any, Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.core.config import settings

logger = logging.getLogger("yash.ai.plugin.crypto")


class PluginCryptoService:
    """
    Cryptographic service for securely encrypting and decrypting plugin credentials,
    OAuth tokens, and API keys at rest. Zero plaintext secrets in database.
    """

    def __init__(self):
        self._fernet = self._init_fernet()

    def _init_fernet(self) -> Fernet:
        custom_key = getattr(settings, "ENCRYPTION_KEY", None)
        if custom_key and len(custom_key.strip()) == 44:
            try:
                return Fernet(custom_key.strip().encode("utf-8"))
            except Exception as e:
                logger.warning(f"[PluginCrypto] Invalid custom ENCRYPTION_KEY format: {e}. Falling back to KDF.")

        # Deterministic derivation from JWT_SECRET_KEY
        salt = b"yash_ai_plugin_crypto_salt_2026_v1"
        secret_bytes = settings.JWT_SECRET_KEY.encode("utf-8")
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100_000,
        )
        derived_key = base64.urlsafe_b64encode(kdf.derive(secret_bytes))
        return Fernet(derived_key)

    def encrypt_secret(self, plaintext: str) -> str:
        """Encrypts a single string secret into a base64 ciphertext."""
        if not plaintext:
            return ""
        return self._fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")

    def decrypt_secret(self, ciphertext: str) -> str:
        """Decrypts a base64 ciphertext back to plaintext string."""
        if not ciphertext:
            return ""
        try:
            return self._fernet.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
        except Exception as e:
            logger.error(f"[PluginCrypto] Decryption failure: {e}")
            raise ValueError("Failed to decrypt secret. Possible key mismatch or data corruption.")

    def encrypt_credentials(self, creds: Dict[str, Any]) -> str:
        """Serializes and encrypts a dictionary of credentials into ciphertext."""
        payload = json.dumps(creds)
        return self.encrypt_secret(payload)

    def decrypt_credentials(self, ciphertext: str) -> Dict[str, Any]:
        """Decrypts and parses a dictionary of credentials from ciphertext."""
        if not ciphertext:
            return {}
        decrypted_json = self.decrypt_secret(ciphertext)
        try:
            return json.loads(decrypted_json)
        except Exception as e:
            logger.error(f"[PluginCrypto] JSON decode failure on decrypted credentials: {e}")
            return {}

    @staticmethod
    def mask_secret(secret: str) -> str:
        """Returns a safe, masked representation for UI presentation (e.g. 'sk-...1234')."""
        if not secret:
            return ""
        clean = secret.strip()
        if len(clean) <= 6:
            return "••••••"
        prefix = clean[:3]
        suffix = clean[-4:]
        return f"{prefix}••••••••{suffix}"


_crypto_instance = PluginCryptoService()


def get_plugin_crypto() -> PluginCryptoService:
    return _crypto_instance
