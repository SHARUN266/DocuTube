/**
 * Cryptographic helper to encrypt and decrypt strings (like API keys) in the browser
 * using the native Web Crypto API (AES-GCM 256-bit).
 *
 * It derives a secure AES key from a passphrase (e.g. the Clerk user ID) using PBKDF2.
 */

// Convert a base64 string back to a Uint8Array
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Convert a Uint8Array to a base64 string
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Encrypts an API key using a passphrase (e.g., Clerk User ID)
 */
export async function encryptApiKey(apiKey: string, passphrase: string): Promise<string> {
  if (!window || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is not supported in this environment");
  }

  const encoder = new TextEncoder();
  
  // 1. Import raw passphrase text as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // 2. We use the passphrase itself (hashed or truncated) as a salt for PBKDF2.
  // Using a deterministic salt linked to the user's passphrase/ID ensures we can 
  // consistently derive the same key for the same user without storing the salt separately.
  const salt = encoder.encode(passphrase.substring(0, 16).padEnd(16, "s"));

  // 3. Derive the AES key
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  // 4. Generate random 12-byte IV (initialization vector)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 5. Encrypt the plaintext API key
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encoder.encode(apiKey)
  );

  // 6. Pack IV + Encrypted Data into a single Uint8Array
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const combined = new Uint8Array(iv.length + encryptedArray.length);
  combined.set(iv);
  combined.set(encryptedArray, iv.length);

  // 7. Return base64 string
  return bytesToBase64(combined);
}

/**
 * Decrypts an API key using the same passphrase (e.g., Clerk User ID)
 */
export async function decryptApiKey(encryptedBase64: string, passphrase: string): Promise<string> {
  if (!window || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is not supported in this environment");
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // 1. Unpack Base64 back into IV + Encrypted Data
  const combined = base64ToBytes(encryptedBase64);
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);

  // 2. Import raw passphrase text
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // 3. Derive the AES key (matching the parameters used in encryption)
  const salt = encoder.encode(passphrase.substring(0, 16).padEnd(16, "s"));
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  // 4. Decrypt
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedData
  );

  return decoder.decode(decryptedBuffer);
}
