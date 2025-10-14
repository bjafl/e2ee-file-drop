import { AlertCircle, Upload, X } from "lucide-react";
import { Button } from "./ui/button";
import { useFileEncryption } from "@/hooks/useFileEncryption";
import { useState, useCallback, useRef } from "react";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { decodeBase64, encodeBase64 } from "tweetnacl-util";
import type { EncryptedFile } from "@/types/data";
import nacl from "tweetnacl";

export default function EncryptDecryptTest() {
  const {
    encryptFile,
    decryptFile,
    keyPair,
    // isProcessing,
    // progress: encryptionProgress,
  } = useFileEncryption({ generateNewKeyPair: true });

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState<string | null>(null);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
    }
  };

  const handleEncrypt = async () => {
    if (!file) return;
    if (!keyPair?.publicKey) {
      setError("Key pair not ready");
      return;
    }
    setEncrypting(true);
    setError(null);
    const publicKey = encodeBase64(keyPair.publicKey);

    // Encrypt file
    const encryptedBlob = await encryptFile(file, publicKey);

    downloadFile(encryptedBlob.encrypted, file.name + ".enc");

    removeFile();
    setEncrypting(false);
    setNonce(encryptedBlob.nonce);
  };

  const downloadFile = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleDecrypt = async () => {
    if (!file || !nonce) return;
    if (!keyPair?.publicKey) {
      setError("Key pair not ready");
      return;
    }
    setDecrypting(true);
    setError(null);
    const publicKey = encodeBase64(keyPair.publicKey);

    // Encrypt file
    const encryptedFile: EncryptedFile<Blob> = {
      encrypted: file,
      fileName: file.name.replace(/\.enc$/, ""),
      fileSize: file.size,
      nonce,
      mimeType: "application/octet-stream",
      senderPublicKey: publicKey,
    };
    const decryptedBlob = await decryptFile(encryptedFile);

    downloadFile(decryptedBlob, file.name);

    removeFile();
    setDecrypting(false);
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
  };

  const handleEncryptTxtBox = (w = true) => {
    if (w) {
      encryptWorker();
    } else {
      encryptNacl();
    }
  };
  const encryptWorker = async () => {
    if (!textAreaRef.current || !keyPair) return;
    const inputArr = new TextEncoder().encode(textAreaRef.current.value);
    const file = new File([inputArr], "text.txt", { type: "text/plain" });
    const publicKey = encodeBase64(keyPair.publicKey);
    const encrypted = await encryptFile(file, publicKey);
    const uint8Array = new Uint8Array(await encrypted.encrypted.arrayBuffer());
    setNonce(encrypted.nonce);
    textAreaRef.current.value = encodeBase64(uint8Array);
  };
  const encryptNacl = () => {
    if (!textAreaRef.current || !keyPair) return;
    const inputArr = new TextEncoder().encode(textAreaRef.current.value);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    setNonce(encodeBase64(nonce));
    const enc = nacl.box(inputArr, nonce, keyPair.publicKey, keyPair.secretKey);
    textAreaRef.current.value = encodeBase64(enc);
  };
  const handleDecryptTxtBox = (w=true) => {
    if (w) {
      decryptWorker();
    } else {
      decryptNacl();
    }
  };

  const decryptNacl = () => {
    if (!textAreaRef.current || !keyPair || !nonce) return;
    const encArr = decodeBase64(textAreaRef.current.value);
    const decrypted = nacl.box.open(
      encArr,
      decodeBase64(nonce),
      keyPair.publicKey,
      keyPair.secretKey
    );
    if (!decrypted) {
      console.error("Decryption failed");
      setError("Decryption failed");
      return;
    }
    textAreaRef.current.value = new TextDecoder().decode(decrypted);
  };
  const decryptWorker = async () => {
    if (!textAreaRef.current || !keyPair || !nonce) return;
    const encArr = decodeBase64(textAreaRef.current.value);
    const encryptedBlob = new Blob([new Uint8Array(encArr)], { type: "application/octet-stream" });
    const encryptedFile: EncryptedFile<Blob> = {
      encrypted: encryptedBlob,
      fileName: "text.txt",
      fileSize: encArr.length,
      nonce,
      mimeType: "text/plain",
      senderPublicKey: encodeBase64(keyPair.publicKey),
    };
    const decrypted = await decryptFile(encryptedFile);
    const arrayBuffer = await decrypted.arrayBuffer();
    textAreaRef.current.value = new TextDecoder().decode(arrayBuffer);
  };
  return (
    <div className="p-4 flex flex-col">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Send kryptert fil</CardTitle>
        </CardHeader>
        <CardContent>
          <h1 className="text-2xl font-bold mb-4">Encrypt/Decrypt Test</h1>
          <div
            className={`relative border-2 border-dashed rounded-lg p-12 transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-slate-300 hover:border-slate-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleChange}
              disabled={encrypting}
            />
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="p-4 bg-slate-100 rounded-full">
                <Upload className="w-8 h-8 text-slate-600" />
              </div>
              <div>
                <p className="text-lg font-medium text-slate-700">
                  Dra og slipp fil her
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  eller klikk for å velge fil
                </p>
              </div>
            </div>
          </div>
          <div className="my-4 flex items-center justify-center">
            <Button
              onClick={handleEncrypt}
              size="lg"
              disabled={!file || encrypting || decrypting}
            >
              <Upload className="w-4 h-4 mr-2" />
              Encrypt
            </Button>
            <Button
              onClick={handleDecrypt}
              size="lg"
              disabled={!file || encrypting || decrypting}
            >
              Decrypt File
            </Button>
            <Button variant="ghost" size="icon" onClick={removeFile}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">tekstboks test</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            ref={textAreaRef}
            className="w-full h-32 p-2 border border-slate-300 rounded-md"
            placeholder="Skriv inn tekst her..."
          ></textarea>
        </CardContent>
        <CardFooter>
          <Button onClick={() => handleEncryptTxtBox()} type="submit">
            krypter
          </Button>
          <Button onClick={() => handleDecryptTxtBox()} type="submit">
            dekrypter
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
