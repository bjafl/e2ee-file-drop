import type { CreateSessionResponse, SessionResponse, UploadUrlPayload, UploadUrlResponse } from "@/types/api";
import type { EncryptedFile, EncryptedFileMetadata } from "@/types/data";
import { useCallback } from "react";


export function useApi() {
  const getSession = useCallback(async (sessionId: string) => {
    const response = await fetch(`/api/get-session/${sessionId}`);
    if (!response.ok) throw new Error('Failed to fetch session');
    return (await response.json()) as SessionResponse;
  }, []);

  const getUploadUrl = useCallback(async (sessionId: string, payload: UploadUrlPayload) => {
    const response = await fetch(`/api/get-upload-url/${sessionId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to get upload URL');
    return (await response.json()) as UploadUrlResponse;
  }, []);

  const getDownloadUrl = useCallback(async (sessionId: string) => {
    const response = await fetch(`/api/get-download-url/${sessionId}`);
    if (!response.ok) throw new Error('Failed to get download URL');
    return (await response.json()) as { downloadUrl: string };
  }, []);

  const createSession = useCallback(async (publicKey: string) => {
    const response = await fetch(`/api/create-session`, {
      method: 'POST',
      body: JSON.stringify({ publicKey }),
    });
    if (!response.ok) throw new Error('Failed to create session');
    return (await response.json()) as CreateSessionResponse;
  }, []);

  const downloadSessionFile = useCallback(async (sessionId: string) => {
    const downloadUrl = await getDownloadUrl(sessionId);
    const blobResponse = await fetch(downloadUrl.downloadUrl);
    if (!blobResponse.ok) throw new Error('Failed to download file');

    // const sessionId = blobResponse.headers.get('x-amz-meta-sessionid');
    // const encrypted = blobResponse.headers.get('x-amz-meta-encrypted');
    const metadata: EncryptedFileMetadata = {
      fileName: blobResponse.headers.get('x-amz-meta-filename') || '',
      fileSize: parseInt(blobResponse.headers.get('Content-Length') || '0', 10),
      nonce: blobResponse.headers.get('x-amz-meta-nonce') || '',
      mimeType: blobResponse.headers.get('x-amz-meta-mimetype') || 'application/octet-stream',
      senderPublicKey: blobResponse.headers.get('x-amz-meta-publickey') || '',
      contentMD5: blobResponse.headers.get('ContentMD5') || '',
    };

    const blob = await blobResponse.blob();
    const file: EncryptedFile<Blob> = {
      encrypted: blob,
      ...metadata
    };
    return file;
  }, [getDownloadUrl]);

  const deleteSession = useCallback(async (sessionId: string) => {
    const response = await fetch(`/api/delete-session/${sessionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete session');
  }, []);

  return { getSession, getUploadUrl, getDownloadUrl, createSession, downloadSessionFile, deleteSession };
}
