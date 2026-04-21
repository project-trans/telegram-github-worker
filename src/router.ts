async function verifySignature(
  body: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const sigParts = signatureHeader.split("=");
  if (sigParts.length !== 2 || sigParts[0] !== "sha256") return false;

  const sigBytes = hexToBytes(sigParts[1]);
  const dataBytes = encoder.encode(body);

  return crypto.subtle.verify("HMAC", key, sigBytes, dataBytes);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export { verifySignature };
