/**
 * File upload result
 *
 * Contains information about a file uploaded to the server.
 */
export interface ServiceUploadResult {
  /** Storage path on the server */
  path: string;
  /** Original filename */
  filename: string;
  /** File size (bytes) */
  size: number;
}
