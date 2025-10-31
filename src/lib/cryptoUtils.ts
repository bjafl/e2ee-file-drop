import type {
  DecryptFileWorkerPayload,
  EncryptFileWorkerPayload,
} from "@/types/data";
import nacl from "tweetnacl";

export function encryptFile({
  unencrypted,
  recipientPublicKey,
  senderSecretKey,
}: EncryptFileWorkerPayload) {
  // Generate nonce
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  // Encrypt
  const encrypted = nacl.box(
    unencrypted,
    nonce,
    recipientPublicKey,
    senderSecretKey
  );
  return { encrypted, nonce, originalSize: unencrypted.length };
}

export function decryptFile({
  encrypted,
  nonce,
  senderPublicKey,
  recipientSecretKey,
}: DecryptFileWorkerPayload) {
  const decrypted = nacl.box.open(
    encrypted,
    nonce,
    senderPublicKey,
    recipientSecretKey
  );
  if (!decrypted) {
    throw new Error("Decryption failed");
  }
  return decrypted;
}
