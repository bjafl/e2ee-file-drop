// components/CreateSession.tsx
import { useState, useEffect, useCallback } from "react";
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
import { Trans, useTranslation } from "react-i18next";

export function CreateSession() {
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const { setValue: setLocalStoragePrivateKey } = useBrowserStorage();
  const { createSession: apiCreateSession } = useApi();

  const newKeypair = useCallback(() => {
    try {
      const keys = nacl.box.keyPair();
      setPrivateKey(encodeBase64(keys.secretKey));
      return encodeBase64(keys.publicKey);
    } catch (error) {
      console.error("Error generating key pair:", error);
      return null;
    }
  }, []);

  const newSession = useCallback(async (publicKey: string) => {
    try {
      const response = await apiCreateSession(publicKey);
      return response.sessionId;
    } catch (error) {
      console.error("Error creating session:", error);
      return null;
    }
  }, [apiCreateSession]);

  useEffect(() => {
    if (sessionId) return;
    async function createSession() {
      setCreating(true);
      setError(null);

      const publicKey = newKeypair();
      if (!publicKey) {
        setError(t("createSessionPage.errors.keyGenerationFailed"));
        setCreating(false);
        return;
      }

      const sessionId = await newSession(publicKey);
      if (!sessionId) {
        setError(t("createSessionPage.errors.createSessionFailed"));
        setCreating(false);
        return;
      }
      setSessionId(sessionId);
      setCreating(false);
    }

    createSession();
  }, [apiCreateSession, newKeypair, newSession, sessionId, t]);

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
          title: t("createSessionPage.shareTitle"),
          text: t("createSessionPage.shareText"),
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
          <CardTitle className="text-2xl">{t("createSessionPage.title")}</CardTitle>
          <CardDescription>
            {t("createSessionPage.shareDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {creating && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
              <p className="text-slate-600">
                {t("createSessionPage.status.generatingKeys")}
              </p>
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
                        {t("createSessionPage.linkTitle")}
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
                        {t("createSessionPage.copied")}!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        {t("createSessionPage.copyLink")}
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
                      {t("createSessionPage.shareBtn")}
                    </Button>
                  )}
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  <Trans
                    i18nKey="createSessionPage.receiveNote"
                    components={{ 1: <strong className="font-medium" /> }}
                  />
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
                  {t("createSessionPage.goToDownloadPage")} →
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
