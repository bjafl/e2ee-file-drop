export interface SessionData {
  senderPublicKey?: string;
  recipientPublicKey: string;
  expiresAt: number;
  nonce?: string;
  mimeType?: string;
  s3Key?: string;
  fileSize?: number;
  fileName?: string;
  contentMD5?: string;
}
export interface SessionMetadata {
  status?: "waiting" | "uploading" | "uploaded" | "downloading" | "downloaded";
}
export type Session = SessionData & SessionMetadata;

export interface UploadUrlPayload {
  senderPublicKey: string; // base64
  uploadComplete?: boolean; // if true, marks session as 'uploaded'
  metadata?: {
    fileName: string;
    fileSize: number;
    nonce: string;
    mimeType: string;
    contentMD5: string; // base64
  };
}
