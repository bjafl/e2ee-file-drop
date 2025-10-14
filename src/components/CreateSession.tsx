// components/CreateSession.tsx
import { useState, useEffect } from "react";
import { Link, Share2, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import nacl from "tweetnacl";
import { useBrowserStorage } from "@/hooks/useBrowserStorage";
import { useApi } from "@/hooks/useApi";
import { encodeBase64 } from "tweetnacl-util";


export function CreateSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const {
    setValue: setLocalStoragePrivateKey,
  } = useBrowserStorage();
  const { createSession: apiCreateSession } = useApi();

  useEffect(() => {
    if (sessionId) return;
    async function createSession() {
      try {
        // Generate key pair
        const keys = nacl.box.keyPair();


        // Send public key to server
        const publicKeyBase64 = encodeBase64(keys.publicKey);
        const response = await apiCreateSession(publicKeyBase64);
        const newSessionId = response.sessionId;

        setSessionId(newSessionId);
        setPrivateKey(encodeBase64(keys.secretKey));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Noe gikk galt");
      } finally {
        setCreating(false);
      }
    }

    createSession();
  }, [apiCreateSession, sessionId]);

  useEffect(() => {
    if (!sessionId || !privateKey) return;
    setLocalStoragePrivateKey(sessionId, { myPrivateKey: privateKey });
  }, [sessionId, privateKey, setLocalStoragePrivateKey]);

  const shareUrl = sessionId
    ? `${window.location.origin}/send/${sessionId}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Send meg en kryptert fil",
          text: "Bruk denne lenken for å sende meg en kryptert fil",
          url: shareUrl,
        });
      } catch (err) {
        console.log("Sharing cancelled or failed:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Motta fil</CardTitle>
          <CardDescription>
            Del lenken med avsenderen for å motta en kryptert fil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {creating && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
              <p className="text-slate-600">Genererer krypteringsnøkler...</p>
            </div>
          )}

          {sessionId && !creating && (
            <>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-start gap-3">
                    <Link className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 mb-2">
                        Din unike lenke:
                      </p>
                      <p className="font-mono text-sm break-all text-slate-900">
                        {shareUrl}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="flex-1"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Kopiert!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Kopier lenke
                      </>
                    )}
                  </Button>

                  {sessionId && (
                    <Button
                      onClick={handleShare}
                      variant="outline"
                      className="flex-1"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Del
                    </Button>
                  )}
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Viktig:</strong> Hold denne siden åpen til du har
                  mottatt filen. Krypteringsnøklene lagres kun i nettleseren
                  din.
                </AlertDescription>
              </Alert>

              <div className="pt-4 border-t">
                <Button
                  variant="link"
                  className="w-full"
                  onClick={() =>
                    (window.location.href = `/download/${sessionId}`)
                  }
                >
                  Gå til nedlastingsside →
                </Button>
              </div>
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
