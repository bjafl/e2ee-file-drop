import { useMemo, type FC } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { format as formatDate } from "date-fns";
import type { SessionInfo, SessionStatus } from "@/types/api";
import { Hash, Key, Calendar, File, FileType, HardDrive } from "lucide-react";
import { Badge } from "./ui/badge";
import { cn, formatFileSize } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const SessionItem: FC<SessionInfo> = ({
  sessionId,
  expiresAt,
  status,
  senderPublicKey,
  fileName,
  mimeType,
  fileSize,
}) => {
  const { t } = useTranslation();
  const formattedDate = useMemo(() => {
    try {
      return formatDate(new Date(expiresAt), "dd.MM.yyyy HH:mm:ss");
    } catch {
      return t("unknown");
    }
  }, [expiresAt, t]);

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
  return (
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
      <CardContent className="space-y-3">
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
      </CardContent>
    </Card>
  );
};
