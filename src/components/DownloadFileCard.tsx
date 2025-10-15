import { useState, useEffect } from 'react';
import { Download, FileCheck, Loader2, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/useApi';
import { useFileEncryption } from '@/hooks/useFileEncryption';
import { useTranslation } from 'react-i18next';

type Status =
  | 'checking'
  | 'waiting'
  | 'ready'
  | 'downloading'
  | 'decrypting'
  | 'complete'
  | 'error';

interface DownloadFileCardProps {
  sessionId: string;
  privateKey: string;
  onComplete?: () => void;
}

export function DownloadFileCard({
  sessionId,
  privateKey,
  onComplete,
}: DownloadFileCardProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('checking');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [senderPublicKey, setSenderPublicKey] = useState<string | undefined>(
    undefined
  );
  const [nonce, setNonce] = useState<string | undefined>(undefined);

  const { getSession, downloadSessionFile } = useApi();
  const { decryptFile } = useFileEncryption({ privateKey });

  useEffect(() => {
    const checkStatus = async () => {
      setError(null);
      try {
        const data = await getSession(sessionId);

        if (data.status === 'uploaded') {
          setStatus('ready');
          setFileName(data.fileName);
          setFileSize(data.fileSize);
          setSenderPublicKey(data.senderPublicKey);
          setNonce(data.nonce);
        } else {
          setStatus('waiting');
        }
      } catch (err) {
        console.error(err);
        setError(t('downloadFileCard.errors.sessionNotFound', { sessionId }));
        setStatus('error');
      }
    };

    checkStatus();

    // Poll every 2 seconds if waiting or checking
    const interval = setInterval(() => {
      if (status === 'waiting' || status === 'checking') {
        checkStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, status, getSession]);

  const handleDownload = async () => {
    setStatus('downloading');
    setProgress(0);
    setError(null);

    try {
      const file = await downloadSessionFile(sessionId);

      file.fileName = fileName || file.fileName;
      file.fileSize = fileSize || file.fileSize;
      file.nonce = nonce || file.nonce;
      file.senderPublicKey = senderPublicKey || file.senderPublicKey;

      if (file.senderPublicKey !== senderPublicKey) {
        console.warn('Sender public key mismatch!');
        if (!file.senderPublicKey) file.senderPublicKey = senderPublicKey;
      }

      setProgress(60);
      setStatus('decrypting');
      const decryptedFile = await decryptFile(file);

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
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('downloadFileCard.errors.unknown'));
      setStatus('error');
      setProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Lock className="w-6 h-6" />
          {t('downloadFileCard.title')}
        </CardTitle>
        <CardDescription>{t('downloadFileCard.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Checking status */}
        {status === 'checking' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
            <p className="text-slate-600">{t('downloadFileCard.checkingStatus')}</p>
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
                {t('downloadFileCard.waitingForUploadTitle')}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {t('downloadFileCard.waitingForUploadDescription')}
              </p>
            </div>
            <Badge variant="outline" className="mt-2">
              {t('downloadFileCard.sessionIdBadge', { sessionId: sessionId.slice(0, 8) })}
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
                <p className="font-medium text-green-900">
                  {t('downloadFileCard.fileReadyTitle')}
                </p>
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

            <Button onClick={handleDownload} className="w-full" size="lg">
              <Download className="w-4 h-4 mr-2" />
              {t('downloadFileCard.downloadAndDecrypt')}
            </Button>

            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                {t('downloadFileCard.endToEndEncryptionNote')}
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
                  {status === 'downloading'
                    ? t('downloadFileCard.downloading')
                    : t('downloadFileCard.decrypting')}
                </p>
                <p className="text-sm text-slate-500 mt-1">{t('pleaseWait')}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>{t('progress')}</span>
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
              {t('downloadFileCard.completedNote')}
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {error && status === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('errorTitle')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
