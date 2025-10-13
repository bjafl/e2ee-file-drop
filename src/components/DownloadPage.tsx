// components/DownloadPage.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileCheck, Loader2, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/useApi';
import { useBrowserStorage } from '@/hooks/useBrowserStorage';
import { useFileEncryption } from '@/hooks/useFileEncryption';

type Status = 'checking' | 'waiting' | 'ready' | 'downloading' | 'decrypting' | 'complete' | 'error';

export function DownloadPage() {
  const { sessionId: sessionIdParam } = useParams<{ sessionId: string }>();
  const [sessionId, setSessionId] = useState<string | null>(sessionIdParam || null);
  
  const [status, setStatus] = useState<Status>('checking');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [privateKey, setPrivateKey] = useState<string | undefined>(undefined);
  const [senderPublicKey, setSenderPublicKey] = useState<string | undefined>(undefined);
  const { getSession, downloadSessionFile } = useApi();
  const { storedValues: storedKeys } = useBrowserStorage();
  const { decryptFile } = useFileEncryption({ privateKey });

  useEffect(() => {
    if (sessionIdParam) {
      setSessionId(sessionIdParam);
    }
  }, [sessionIdParam]);

  useEffect(() => {
    if (!sessionId) {
      
      // setError('Ingen session ID i URL');
      // setStatus('error');
      return;
    }
    const privateKey = storedKeys[sessionId]?.myPrivateKey;
    if (!privateKey) {
      setError('Privat nøkkel ikke funnet i nettleseren din. Kan ikke dekryptere filen.');
      setStatus('error');
      return;
    }
    setPrivateKey(privateKey);

    const checkStatus = async () => {


      setStatus('checking');
      setError(null);
      try {
        const data = await getSession(sessionId);
        
        if (data.status === 'uploaded') {
          setStatus('ready');
          setFileName(data.fileName);
          setFileSize(data.fileSize);
          setSenderPublicKey(data.senderPublicKey);
        } else {
          setStatus('waiting');
        }
      } catch (err) {
        console.error(err);
        setError('Fant ikke status for økt med ID: ' + sessionId);
        setStatus('error');
      }
    };

    checkStatus();

    // Poll every 2 seconds if waiting
    const interval = setInterval(() => {
      if (status === 'waiting' || status === 'checking') {
        checkStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, status, getSession, storedKeys]);

  const handleDownload = async () => {
    if (!sessionId) return;

    setStatus('downloading');
    setProgress(0);
    setError(null);

    try {
      const file = await downloadSessionFile(sessionId);

      if (file.senderPublicKey != senderPublicKey) {
        console.warn("Sender public key mismatch!"); // TODO: handle this properly
        if (!file.senderPublicKey) file.senderPublicKey = senderPublicKey; // TODO handle missing pub key
      }

      // Decrypt
      setProgress(60);
      setStatus('decrypting');
      const decryptedFile = await decryptFile(file); //TODO: handle missing pub key

      // Download
      setProgress(100);
      const url = URL.createObjectURL(decryptedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = decryptedFile.name || 'decrypted-file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt');
      setStatus('error');
      setProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Lock className="w-6 h-6" />
            Motta kryptert fil
          </CardTitle>
          <CardDescription>
            Filen dekrypteres i nettleseren din
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Checking status */}
          {status === 'checking' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
              <p className="text-slate-600">Sjekker status...</p>
            </div>
          )}

          {/* Waiting for file */}
          {status === 'waiting' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-slate-700">
                  Venter på fil...
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Siden oppdateres automatisk når filen er klar
                </p>
              </div>
              <Badge variant="outline" className="mt-2">
                Session ID: {sessionId?.slice(0, 8)}...
              </Badge>
            </div>
          )}

          {/* Ready to download */}
          {status === 'ready' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-6 bg-green-50 rounded-lg border border-green-200">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FileCheck className="w-8 h-8 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-green-900">Fil klar til nedlasting</p>
                  {fileName && (
                    <p className="text-sm text-green-700 mt-1 font-mono">
                      {fileName}
                    </p>
                  )}
                  {fileSize && (
                    <p className="text-sm text-green-600 mt-1">
                      {formatFileSize(fileSize)}
                    </p>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleDownload} 
                className="w-full"
                size="lg"
              >
                <Download className="w-4 h-4 mr-2" />
                Last ned og dekrypter
              </Button>

              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Filen dekrypteres lokalt i nettleseren din. Ingen kan lese innholdet under overføringen.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Downloading/Decrypting */}
          {(status === 'downloading' || status === 'decrypting') && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <div className="text-center">
                  <p className="font-medium text-slate-700">
                    {status === 'downloading' ? 'Laster ned...' : 'Dekrypterer...'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Vennligst vent
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Fremdrift</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          )}

          {/* Complete */}
          {status === 'complete' && (
            <Alert className="border-green-200 bg-green-50">
              <FileCheck className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Fil lastet ned og dekryptert! Sjekk nedlastingsmappen din.
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}