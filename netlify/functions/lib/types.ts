export interface Session {
  senderPublicKey?: string;
  recipientPublicKey: string;
  expiresAt: number;
  status: "waiting" | "uploading" | "uploaded" | "downloading" | "downloaded";
  nonce?: string;
  mimeType?: string;
  s3Key?: string;
  fileSize?: number;
  fileName?: string;
  contentSHA256?: string;
}

export interface UploadUrlPayload {
  senderPublicKey: string; // base64
  uploadComplete?: boolean; // if true, marks session as 'uploaded'
  metadata?: {
    fileName: string;
    fileSize: number;
    nonce: string;
    mimeType: string;
    contentSHA256: string; // base64
  };
}
