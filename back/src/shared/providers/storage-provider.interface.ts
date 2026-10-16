export interface UploadParams {
  bucket: string;
  path: string;
  content: Buffer;
  contentType: string;
}

export interface IStorageProvider {
  upload(params: UploadParams): Promise<string>;
  delete(bucket: string, path: string): Promise<void>;
  getUrl(bucket: string, path: string): string;
  getSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string>;
}
