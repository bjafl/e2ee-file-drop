
type SessionStatus = 'waiting' | 'uploading' | 'uploaded' | 'downloaded';
export interface UploadUrlResponse {
  uploadUrl?: string;
  status?: SessionStatus;
}

export interface UploadUrlPayload {
  senderPublicKey?: string; // base64
  uploadComplete?: boolean; // if true, marks session as 'uploaded'
  metadata?: {
    fileName: string;
    fileSize: number;
    nonce: string;
    mimeType: string;
  };
}

export interface SessionResponse {
  recipientPublicKey: string;
  status: SessionStatus;
  senderPublicKey?: string;
  nonce?: string;
  mimeType?: string;
  fileSize?: number;
  fileName?: string;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
}

export interface CreateSessionResponse {
  sessionId: string;
}

export interface CreateSessionPayload {
  publicKey: string; // base64

}

export interface ErrorResponse {
  error: string;
}