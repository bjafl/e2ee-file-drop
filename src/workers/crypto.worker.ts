// crypto.worker.ts
import type { DecryptFileWorkerPayload, EncryptFileWorkerPayload, EncryptFileWorkerResponse, FileDecryptedMessage } from '@/types/data';
import nacl from 'tweetnacl';
// import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

self.onmessage = async (e) => {
  const { type, data } = e.data;
  
  if (type === 'encryptFile') {
    const { unencrypted, recipientPublicKey, senderSecretKey } = data as EncryptFileWorkerPayload;
    
    // Generate nonce
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    
    // Encrypt
    const encrypted = nacl.box(
      unencrypted,
      nonce,
      recipientPublicKey,
      senderSecretKey
    );
    
    self.postMessage({
      type: 'fileEncrypted',
      data: {
        encrypted,
        nonce,
        originalSize: unencrypted.length
      } 
    } as EncryptFileWorkerResponse);
  }
  
  if (type === 'decryptFile') {
    const { encrypted, nonce, senderPublicKey, recipientSecretKey } = data as DecryptFileWorkerPayload;
    
    const decrypted = nacl.box.open(
      encrypted,
      nonce,
      senderPublicKey,
      recipientSecretKey
    );
    
    if (!decrypted) {
      self.postMessage({ type: 'decryptError' });
      return;
    }
    
    self.postMessage({
      type: 'fileDecrypted',
      data: { decrypted }
    } as FileDecryptedMessage);
  }
};