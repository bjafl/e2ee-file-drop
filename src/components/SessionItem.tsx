import { useMemo, useState, type FC } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { format as formatDate } from "date-fns";
import type { SessionInfo, SessionStatus } from "@/types/api";
import {
  Hash,
  Key,
  Calendar,
  File,
  FileType,
  HardDrive,
  Trash2,
  Download,
  Check,
  CircleX,

} from "lucide-react";
import { Badge } from "./ui/badge";
import { cn, formatFileSize } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogHeader,
  AlertDialogFooter,
} from "./ui/alert-dialog";
import { useApi } from "@/hooks/useApi";

export const SessionItem: FC<SessionInfo & { onDeleted: () => void }> = ({
  sessionId,
  expiresAt,
  status,
  senderPublicKey,
  fileName,
  mimeType,
  fileSize,
  onDeleted,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deleteSession } = useApi();
  const formattedDate = useMemo(() => {
    try {
      return formatDate(new Date(expiresAt), "dd.MM.yyyy HH:mm:ss");
    } catch {
      return t("unknown");
    }
  }, [expiresAt, t]);
  const [state, setState] = useState<"normal" | "deleting" | "deleted" | "error">("normal");
  const [error, setError] = useState<string | null>(null);

  const getStatusBadgeVariant = (status?: SessionStatus) => {
    switch (status) {
      case "uploaded":
        return "default";
      case "downloaded":
        return "secondary";
      case "uploading":
        return "outline";
      case "waiting":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusBadgeColor = (status?: SessionStatus) => {
    switch (status) {
      case "uploaded":
        return "text-green-600";
      case "downloaded":
        return "text-blue-600";
      case "uploading":
        return "text-yellow-600";
      case "waiting":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const gotoDownloadPage = () => {
    navigate(`/download/${sessionId}`);
  };

  const handleDelete = async () => {
    setState("deleting");
    try {
      await deleteSession(sessionId);
    } catch {
      setError(t("sessionItem.deleteFailed"));
      setState("error");
      return;
    }
    setState("deleted");
    onDeleted();
  };

  return (
    <div className="relative">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{sessionId}</h2>
            </div>
            <Badge
              variant={getStatusBadgeVariant(status)}
              className={cn("capitalize", getStatusBadgeColor(status))}
            >
              {status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col h-full space-y-3">
          {fileName && (
            <div className="flex items-start gap-2">
              <File className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("sessionItem.fileName")}
                </p>
                <p className="text-sm truncate" title={fileName}>
                  {fileName}
                </p>
              </div>
            </div>
          )}
          {mimeType && (
            <div className="flex items-center gap-2">
              <FileType className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("sessionItem.mimeType")}
                </p>
                <p className="text-sm font-mono">{mimeType}</p>
              </div>
            </div>
          )}
          {fileSize !== undefined && (
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("sessionItem.fileSize")}
                </p>
                <p className="text-sm">{formatFileSize(fileSize)}</p>
              </div>
            </div>
          )}
          {senderPublicKey && (
            <div className="flex items-start gap-2">
              <Key className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("sessionItem.senderPublicKey")}
                </p>
                <p className="text-sm font-mono break-all">{senderPublicKey}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("sessionItem.expiresAt")}
              </p>
              <p className="text-sm">{formattedDate}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-auto">
            <Button variant="outline" onClick={gotoDownloadPage}>
              <Download className="h-4 w-4" /> {t("download")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger>
                <Button
                  variant="ghost"
                  onClick={handleDelete}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> {t("delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteAlert.title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("deleteAlert.description")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t("deleteAlert.cancelBtn")}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    {t("deleteAlert.confirmBtn")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

        <Card className={cn(state == "normal" ? "hidden" : "", "absolute inset-0 bg-background/80 backdrop-blur-sm pointer-events-none w-full h-full")}>
          <CardContent className="text-center text-sm text-slate-500 py-10">
            {state === "deleted" ? (
              <>
                <Check className="inline-block mr-1 text-green-700" />{" "}
                {t("deleted")}
              </>
            ) : state === "deleting" ? (
              <>
                <Trash2 className="inline-block mr-1 text-red-700" /> {t("deleting")}...
              </>
            ) : (
              <>
                <CircleX className="inline-block mr-1 text-red-700" /> {error}:
              </>
            )}

          </CardContent>
        </Card>
    </div>
  );
};
