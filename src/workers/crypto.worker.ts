// crypto.worker.ts
import { decryptFile, encryptFile } from "@/lib/cryptoUtils";
import type {
  DecryptFileWorkerPayload,
  EncryptFileWorkerPayload,
  EncryptFileWorkerResponse,
  FileDecryptedMessage,
} from "@/types/data";

self.onmessage = async (e) => {
  const { type, data } = e.data;

  if (type === "ping") {
    self.postMessage({ type: "pong" });
  }

  if (type === "encryptFile") {
    const encryptedData = encryptFile(data as EncryptFileWorkerPayload);

    self.postMessage({
      type: "fileEncrypted",
      data: encryptedData,
    } as EncryptFileWorkerResponse);
  }

  if (type === "decryptFile") {

    try {
      const decrypted = decryptFile(data as DecryptFileWorkerPayload);
      self.postMessage({
        type: "fileDecrypted",
        data: { decrypted },
      } as FileDecryptedMessage);
    } catch (error) {
      self.postMessage({ type: "decryptError", message: `${error}` });
      return;
    }
  }
};
