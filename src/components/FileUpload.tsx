// components/FileUpload.tsx
import { useState, useCallback, useEffect } from "react";
import { useParams, /*useNavigate*/ } from "react-router-dom";
import { Upload, File, X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useFileEncryption } from "@/hooks/useFileEncryption";
import { useApi } from "@/hooks/useApi";
import { useBrowserStorage } from "@/hooks/useBrowserStorage";
import { encodeBase64 } from "tweetnacl-util";
import { t } from "i18next";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function FileUpload() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const {
    encryptFile,
    keyPair,
    // isProcessing,
    // progress: encryptionProgress,
  } = useFileEncryption({ generateNewKeyPair: true });
  const { setValue: setStoredKey } = useBrowserStorage();
  const { getUploadUrl, getSession } = useApi();
  // const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'ready' | 'encrypting' | 'uploading' | 'success' | 'error'>('checking');
  const [sessionData, setSessionData] = useState<{
    fileName?: string;
    fileSize?: number;
    recipientPublicKey: string;
    nonce?: string;
  } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
      if (droppedFile.size > MAX_FILE_SIZE) {
        setError(`Filen er for stor. Maks ${MAX_FILE_SIZE / 1024 / 1024} MB`);
        return;
      }
      setFile(droppedFile);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError(`Filen er for stor. Maks ${MAX_FILE_SIZE / 1024 / 1024} MB`);
        return;
      }
      setFile(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
    setStatus('ready');
    setProgress(0);
  };

  const handleUpload = async () => {
    if (!file || !sessionId) return;
    if (!sessionData) {
      setError("Session data not loaded yet");
      return;
    }
    setStatus('uploading');
    setError(null);
    setProgress(0);

    try {
      // Get public key
      setProgress(10);
      if (!keyPair) throw new Error("Key pair not ready");
      const myPublicKey = encodeBase64(keyPair.publicKey);

      // Encrypt file
      setProgress(30);
      const encryptedBlob = await encryptFile(file, sessionData.recipientPublicKey);
      const encryptedSize = encryptedBlob.encrypted.size;
      
      console.log('Encrypted file metadata:', {
        fileName: encryptedBlob.fileName,
        fileSize: encryptedBlob.fileSize,
        nonce: encryptedBlob.nonce,
        senderPublicKey: encryptedBlob.senderPublicKey,
        receiverPublicKey: sessionData.recipientPublicKey,
        contentMD5: encryptedBlob.contentMD5,
      });

      setProgress(50);
      // Get upload URL
      const { uploadUrl } = await getUploadUrl(sessionId, {
        senderPublicKey: myPublicKey,
        metadata: {
          fileName: file.name,
          fileSize: encryptedSize,
          nonce: encryptedBlob.nonce,
          mimeType: file.type,
          contentMD5: encryptedBlob.contentMD5,
        },
      });

      if (!uploadUrl) throw new Error("Failed to get upload URL");

      // Store keys

      setStoredKey(sessionId, {
        theirPublicKey: myPublicKey,
        myPrivateKey: encodeBase64(keyPair.secretKey),
      });

      setProgress(70);

      // Upload to Backblaze
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: encryptedBlob.encrypted,
        headers: {
          // "content-type": "application/octet-stream",
          // "Content-Length": String(encryptedSize),
          // "Content-MD5": encryptedBlob.contentMD5,
          // "x-amz-meta-filename": file.name,
          // "x-amz-meta-nonce": encryptedBlob.nonce,
          // "x-amz-meta-publickey": publicKey,
          // "x-amz-meta-mimetype": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Opplasting feilet");
      }

      try {
        await getUploadUrl(sessionId, {
          uploadComplete: true,
        });
      } catch (err) {
        console.error("Failed to mark upload as complete", err);
      }

      setProgress(100);
      setStatus('success');

      //TODO: Redirect when finished
      // setTimeout(() => {
      //   navigate("/status?id=" + sessionId);
      // }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
      setStatus('error');
      setProgress(0);
    } 
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  useEffect(() => {
    if (status !== 'checking' || !sessionId) return;
    
    const checkStatus = async () => {
      setError(null);
      try {
        const data = await getSession(sessionId);
        console.log('Session data:', { ...data });
        setSessionData({
          fileName: data.fileName,
          fileSize: data.fileSize,
          recipientPublicKey: data.recipientPublicKey,
          nonce: data.nonce,
        });
        setStatus('ready');
      } catch (err) {
        console.error(err);
        setError(t('uploadFileCard.errors.sessionNotFound', { sessionId }));
        setStatus('error');
      }
    };
    checkStatus();
  }, [getSession, sessionId, status]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Send kryptert fil</CardTitle>
          <CardDescription>
            Filen blir kryptert i nettleseren før opplasting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!file ? (
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
                disabled={status !== 'ready'}
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
                <Badge variant="secondary">
                  Maks {MAX_FILE_SIZE / 1024 / 1024} MB
                </Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <File className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                {status === 'ready' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                {status === 'success' && (
                  <div className="p-2 bg-green-100 rounded-full">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                )}
              </div>

              {status === 'uploading' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Laster opp...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {status === 'ready' && (
                <Button onClick={handleUpload} className="w-full" size="lg">
                  <Upload className="w-4 h-4 mr-2" />
                  Krypter og last opp
                </Button>
              )}
            </div>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Fil lastet opp! Mottaker kan nå laste ned filen.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
