import nacl from "tweetnacl";
import { decodeBase64, encodeBase64 } from "tweetnacl-util";
import { useCallback, useRef, useEffect, useState } from "react";
import type {
  ContentFormat,
  DecryptFileWorkerPayload,
  EncryptedFile,
  EncryptFileWorkerPayload,
  EncryptFileWorkerResponse,
  FileDecryptedMessage,
} from "@/types/data";
import {
  encryptFile as encryptFileFunc,
  decryptFile as decryptFileFunc,
} from "@/lib/cryptoUtils";

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
  const [cryptoWorkerReady, setCryptoWorkerReady] = useState(false);

  useEffect(() => {
    if (generateNewKeyPair) {
      setKeyPair(nacl.box.keyPair());
    } else if (keyPairInit) {
      setKeyPair(keyPairInit);
    } else if (privateKey) {
      const secretKey =
        typeof privateKey === "string" ? decodeBase64(privateKey) : privateKey;
      setKeyPair(nacl.box.keyPair.fromSecretKey(secretKey));
    }
  }, [generateNewKeyPair, keyPairInit, privateKey]);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/crypto.worker.ts", import.meta.url),
      { type: "module" }
    );

    workerRef.current.onmessage = (e) => {
      if (e.data.type === "pong") {
        setCryptoWorkerReady(true);
      }
    };

    // Ping worker to check if it's ready
    workerRef.current.postMessage({ type: "ping" });

    return () => {
      workerRef.current?.terminate();
      setCryptoWorkerReady(false);
    };
  }, []);

  const encryptFileWithWorker = useCallback(
    (
      keyPair: nacl.BoxKeyPair,
      file: File,
      fileBytes: Uint8Array,
      recipientPublicKey: string
    ) => {
      if (!workerRef.current || !cryptoWorkerReady) {
        throw new Error("Crypto worker not ready");
      }
      return new Promise<EncryptedFile<Blob>>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Encryption timeout"));
        }, 30000); // 30 second timeout

        workerRef.current!.onmessage = (e) => {
          if (e.data.type === "fileEncrypted") {
            const response: EncryptFileWorkerResponse = e.data;
            clearTimeout(timeout);
            setProgress(100);
            const encryptedArray = new Uint8Array(response.data.encrypted);
            const md5Hash = nacl.hash(encryptedArray);
            const encryptedBlob = new Blob([encryptedArray], {
              type: "application/octet-stream",
            });
            resolve({
              encrypted: encryptedBlob,
              nonce: encodeBase64(response.data.nonce),
              fileName: file.name,
              mimeType: file.type,
              fileSize: response.data.originalSize,
              contentMD5: encodeBase64(md5Hash),
            });
          }
        };

        workerRef.current!.postMessage({
          type: "encryptFile",
          data: {
            unencrypted: fileBytes,
            recipientPublicKey: decodeBase64(recipientPublicKey),
            senderSecretKey: keyPair.secretKey,
          } as EncryptFileWorkerPayload,
        });

        setProgress(60);
      });
    },
    [cryptoWorkerReady]
  );

  const encryptFileSync = useCallback(
    (
      keyPair: nacl.BoxKeyPair,
      file: File,
      fileBytes: Uint8Array,
      recipientPublicKey: string
    ) => {
      const { encrypted, nonce, originalSize } = encryptFileFunc({
        unencrypted: fileBytes,
        recipientPublicKey: decodeBase64(recipientPublicKey),
        senderSecretKey: keyPair.secretKey,
      });

      setProgress(100);
      const encryptedArray = new Uint8Array(encrypted);
      const md5Hash = nacl.hash(encryptedArray);
      const encryptedBlob = new Blob([encryptedArray], {
        type: "application/octet-stream",
      });
      return {
        encrypted: encryptedBlob,
        nonce: encodeBase64(nonce),
        fileName: file.name,
        mimeType: file.type,
        fileSize: originalSize,
        contentMD5: encodeBase64(md5Hash),
      };
    },
    []
  );

  const encryptFile = useCallback(
    async (
      file: File,
      recipientPublicKey: string
    ): Promise<EncryptedFile<Blob>> => {
      if (!keyPair) {
        throw new Error("No local key pair found");
      }

      setIsProcessing(true);
      setProgress(0);

      // Read file
      const fileBytes = new Uint8Array(await file.arrayBuffer());
      setProgress(30);

      // Encrypt in worker

      try {
        const result = await encryptFileWithWorker(
          keyPair,
          file,
          fileBytes,
          recipientPublicKey
        );
        return result;
      } catch (error) {
        console.error(
          "Worker encryption failed, falling back to synchronous processing",
          error
        );
        return encryptFileSync(keyPair, file, fileBytes, recipientPublicKey);
      } finally {
        setIsProcessing(false);
      }
    },
    [encryptFileSync, encryptFileWithWorker, keyPair]
  );

  const decryptFileWithWorker = useCallback(
    <T extends ContentFormat>(
      keyPair: nacl.BoxKeyPair,
      encryptedData: EncryptedFile<T>,
      encryptedPayload: Uint8Array
    ) => {
      if (!workerRef.current || !cryptoWorkerReady) {
        throw new Error("Crypto worker not ready");
      }
      return new Promise<File>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Decryption timeout"));
        }, 30000);

        workerRef.current!.onmessage = (e) => {
          if (e.data.type === "fileDecrypted") {
            const message = e.data as FileDecryptedMessage;
            clearTimeout(timeout);
            setProgress(100);

            const file = new File(
              [new Uint8Array(message.data.decrypted)],
              encryptedData.fileName,
              { type: encryptedData.mimeType }
            );
            resolve(file);
          }

          if (e.data.type === "decryptError") {
            console.error(e.data);
            clearTimeout(timeout);
            reject(new Error("Decryption failed"));
          }
        };
        workerRef.current!.postMessage({
          type: "decryptFile",
          data: {
            encrypted: encryptedPayload,
            nonce: decodeBase64(encryptedData.nonce),
            senderPublicKey: decodeBase64(encryptedData.senderPublicKey || ""), //TODO: handle missing pub key
            recipientSecretKey: keyPair.secretKey,
          } as DecryptFileWorkerPayload,
        });

        setProgress(50);
      });
    },
    [cryptoWorkerReady]
  );

  const decryptFileSync = useCallback(
    <T extends ContentFormat>(
      keyPair: nacl.BoxKeyPair,
      encryptedData: EncryptedFile<T>,
      encryptedPayload: Uint8Array
    ) => {
      const decryptedBytes = decryptFileFunc({
        encrypted: encryptedPayload,
        nonce: decodeBase64(encryptedData.nonce),
        senderPublicKey: decodeBase64(encryptedData.senderPublicKey || ""),
        recipientSecretKey: keyPair.secretKey,
      });

      return new File(
        [new Uint8Array(decryptedBytes)],
        encryptedData.fileName,
        { type: encryptedData.mimeType }
      );
    },
    []
  );

  const decryptFile = useCallback(
    async <T extends ContentFormat>(
      encryptedData: EncryptedFile<T>
      // senderPublicKey: string
    ): Promise<File> => {
      if (!keyPair) {
        throw new Error("No local key pair found");
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
      try {
        return decryptFileWithWorker<T>(
          keyPair,
          encryptedData,
          encryptedPayload
        );
      } catch (error) {
        console.error("Worker decryption failed, falling back to synchronous processing", error);
        return decryptFileSync<T>(keyPair, encryptedData, encryptedPayload);
      } finally {
        setIsProcessing(false);
      }
    },
    [decryptFileSync, decryptFileWithWorker, keyPair]
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
