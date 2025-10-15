import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Inbox, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBrowserStorage } from '@/hooks/useBrowserStorage';
import { useApi } from '@/hooks/useApi';
import { DownloadFileCard } from './DownloadFileCard';
import { SessionList } from './SessionList';
import type { SessionInfo } from '@/types/api';

export function DownloadPage() {
  const { sessionId: sessionIdParam } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { storedValues } = useBrowserStorage();
  const { getSession } = useApi();

  // If sessionId in URL, show single download card
  const selectedSession = sessionIdParam ? storedValues[sessionIdParam] : null;

  useEffect(() => {
    if (sessionIdParam) return; // Don't load list if showing single session

    const loadSessions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const sessionIds = Object.keys(storedValues);

        // Filter out expired sessions
        const now = Date.now();
        const validSessionIds = sessionIds.filter((id) => {
          const expiry = storedValues[id].expiresAt;
          return expiry > now;
        });

        // Fetch session info for each
        const sessionPromises = validSessionIds.map(async (sessionId) => {
          try {
            const data = await getSession(sessionId);
            return {
              sessionId,
              expiresAt: new Date(
                storedValues[sessionId].expiresAt
              ).toISOString(),
              status: data.status,
              senderPublicKey: data.senderPublicKey,
              mimeType: data.mimeType,
              fileSize: data.fileSize,
              fileName: data.fileName,
            };
          } catch (err) {
            console.error(`Failed to fetch session ${sessionId}:`, err);
            return null;
          }
        });

        const results = await Promise.all(sessionPromises);
        const validSessions = results
          .filter((s) => s !== null)
          .map((s) => {
            return { ...s, expiresAt: Number(s.expiresAt) } as SessionInfo;
          });

        setSessions(validSessions);
      } catch (err) {
        console.error('Error loading sessions:', err);
        setError('Kunne ikke laste økter');
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, [sessionIdParam, storedValues, getSession]);

  // Single session view
  if (sessionIdParam) {
    if (!selectedSession) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 flex items-center justify-center">
          <Card className="w-full max-w-2xl">
            <CardContent className="py-12">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Privat nøkkel ikke funnet for denne økten. Kan ikke dekryptere
                  filen.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <DownloadFileCard
            sessionId={sessionIdParam}
            privateKey={selectedSession.myPrivateKey}
            onComplete={() => {
              // Optionally navigate back to list after download
              setTimeout(() => navigate('/download'), 2000);
            }}
          />
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
            <Download className="w-8 h-8" />
            Motta filer
          </h1>
          <p className="text-slate-600">Dine ventende nedlastinger</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Laster økter...</p>
            </CardContent>
          </Card>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <Inbox className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium text-slate-700">
                  Ingen ventende nedlastinger
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Når noen sender deg en fil vil den dukke opp her
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <SessionList
            sessions={sessions}
            title="Dine økter"
            showFilters={sessions.length > 5}
          />
        )}
      </div>
    </div>
  );
}
