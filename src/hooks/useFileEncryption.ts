import nacl from 'tweetnacl';
import { decodeBase64, encodeBase64 } from 'tweetnacl-util';
import { useCallback, useRef, useEffect, useState } from 'react';
import type {
  ContentFormat,
  DecryptFileWorkerPayload,
  EncryptedFile,
  EncryptFileWorkerPayload,
  EncryptFileWorkerResponse,
  FileDecryptedMessage,
} from '@/types/data';

interface UseFileEncryptionOptions {
  keyPair?: nacl.BoxKeyPair;
  privateKey?: Uint8Array | string; // string must be base64 encoded
  generateNewKeyPair?: boolean;
}

export function useFileEncryption({
  keyPair: keyPairInit,
  privateKey,
  generateNewKeyPair = false,
}: UseFileEncryptionOptions = {}) {
  const workerRef = useRef<Worker | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [keyPair, setKeyPair] = useState<nacl.BoxKeyPair | null>(
    keyPairInit || null
  );

  useEffect(() => {
    if (generateNewKeyPair) {
      setKeyPair(nacl.box.keyPair());
    } else if (keyPairInit) {
      setKeyPair(keyPairInit);
    } else if (privateKey) {
      const secretKey =
        typeof privateKey === 'string' ? decodeBase64(privateKey) : privateKey;
      setKeyPair(nacl.box.keyPair.fromSecretKey(secretKey));
    }
  }, [generateNewKeyPair, keyPairInit, privateKey]);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/crypto.worker.ts', import.meta.url),
      { type: 'module' }
    );

    return () => workerRef.current?.terminate();
  }, []);

  const encryptFile = useCallback(
    async (
      file: File,
      recipientPublicKey: string
    ): Promise<EncryptedFile<Blob>> => {
      if (!keyPair || !workerRef.current) {
        throw new Error('Not ready');
      }

      setIsProcessing(true);
      setProgress(0);

      // Read file
      const fileBytes = new Uint8Array(await file.arrayBuffer());
      setProgress(30);

      // Encrypt in worker
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Encryption timeout'));
        }, 30000); // 30 second timeout

        workerRef.current!.onmessage = (e) => {
          if (e.data.type === 'fileEncrypted') {
            const response: EncryptFileWorkerResponse = e.data;
            clearTimeout(timeout);
            setProgress(100);
            setIsProcessing(false);

            const encryptedBlob = new Blob(
              [response.data.encrypted.buffer as ArrayBuffer],
              { type: 'application/octet-stream' }
            );
            resolve({
              encrypted: encryptedBlob,
              nonce: encodeBase64(response.data.nonce),
              fileName: file.name,
              mimeType: file.type,
              fileSize: encryptedBlob.size,
            });
          }
        };

        workerRef.current!.postMessage({
          type: 'encryptFile',
          data: {
            unencrypted: fileBytes,
            recipientPublicKey: decodeBase64(recipientPublicKey),
            senderSecretKey: keyPair.secretKey,
          } as EncryptFileWorkerPayload,
        });

        setProgress(60);
      });
    },
    [keyPair]
  );

  const decryptFile = useCallback(
    async <T extends ContentFormat>(
      encryptedData: EncryptedFile<T>
      // senderPublicKey: string
    ): Promise<File> => {
      if (!keyPair || !workerRef.current) {
        throw new Error('Not ready');
      }

      setIsProcessing(true);
      setProgress(0);

      let encryptedPayload: Uint8Array;
      if (encryptedData.encrypted instanceof Uint8Array) {
        encryptedPayload = encryptedData.encrypted;
      } else if (encryptedData.encrypted instanceof Blob) {
        const arrayBuffer = await encryptedData.encrypted.arrayBuffer();
        encryptedPayload = new Uint8Array(arrayBuffer);
      } else {
        // string
        encryptedPayload = decodeBase64(encryptedData.encrypted);
      }
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Decryption timeout'));
        }, 30000);

        workerRef.current!.onmessage = (e) => {
          if (e.data.type === 'fileDecrypted') {
            const message = e.data as FileDecryptedMessage;
            clearTimeout(timeout);
            setProgress(100);
            setIsProcessing(false);

            const file = new File(
              [message.data.decrypted.buffer as ArrayBuffer],
              encryptedData.fileName,
              { type: encryptedData.mimeType }
            );
            resolve(file);
          }

          if (e.data.type === 'decryptError') {
            clearTimeout(timeout);
            setIsProcessing(false);
            reject(new Error('Decryption failed'));
          }
        };
        workerRef.current!.postMessage({
          type: 'decryptFile',
          data: {
            encrypted: encryptedPayload,
            nonce: decodeBase64(encryptedData.nonce),
            senderPublicKey: decodeBase64(encryptedData.senderPublicKey || ''), //TODO: handle missing pub key
            recipientSecretKey: keyPair.secretKey,
          } as DecryptFileWorkerPayload,
        });

        setProgress(50);
      });
    },
    [keyPair]
  );

  return {
    keyPair,
    setKeyPair,
    encryptFile,
    decryptFile,
    isProcessing,
    progress,
  };
}
