export interface CryptoKeyMap {
  myPrivateKey: string; // base64
  theirPublicKey?: string; // base64
}

export interface CryptoKeyMapWithExpiry extends CryptoKeyMap {
  expiresAt: number; // timestamp
}

export interface LocalStorageCryptoKeyMap {
  [sessionId: string]: CryptoKeyMapWithExpiry;
}

export interface EncryptedFileMetadata {
  fileName: string;
  fileSize: number;
  nonce: string;
  mimeType: string;
  contentMD5: string; // base64
  senderPublicKey?: string; // base64
}

export type ContentFormat = Blob | string | Uint8Array;
export type EncryptedFile<T extends ContentFormat> = {
  encrypted: T;
} & EncryptedFileMetadata;

export interface DecryptFileWorkerPayload {
  encrypted: Uint8Array;
  nonce: Uint8Array;
  senderPublicKey: Uint8Array;
  recipientSecretKey: Uint8Array;
}

export interface EncryptFileWorkerPayload {
  unencrypted: Uint8Array;
  recipientPublicKey: Uint8Array;
  senderSecretKey: Uint8Array;
}

export interface EncryptFileWorkerResponse {
  type: "fileEncrypted";
  data: {
    encrypted: Uint8Array;
    nonce: Uint8Array;
    originalSize: number;
  };
}

export interface FileDecryptedMessage {
  type: "fileDecrypted";
  data: {
    decrypted: Uint8Array;
  };
}
