

export interface UploadUrlResponse {
  uploadUrl: string;
  authorizationToken: string;
  fileName: string;
  contentType: string;
}

export interface SessionResponse {
  senderPublicKey: string;
  recipientPublicKey: string;
  status: 'waiting' | 'uploading' | 'uploaded' | 'downloaded';
  fileName?: string;
  fileSize?: number;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
}

export interface CreateSessionResponse {
  sessionId: string;
}