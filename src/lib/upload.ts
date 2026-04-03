import { readFile, stat } from 'fs/promises';
import { basename } from 'path';
import { metaApiRequest, getAdAccountId } from '../meta/client.js';
import type {
  MetaImageUploadResponse,
  MetaVideoUploadStartResponse,
  MetaVideoUploadTransferResponse,
  MetaVideoResponse,
} from '../meta/types.js';

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks for resumable upload
const SIMPLE_UPLOAD_THRESHOLD = 100 * 1024 * 1024; // 100MB

/**
 * Upload a local image file to Meta ad account's image library.
 * Returns the image hash needed for creating ad creatives.
 */
export async function uploadImage(
  filePath: string
): Promise<{ image_hash: string; url: string }> {
  const fileBuffer = await readFile(filePath);
  const filename = basename(filePath);
  const accountId = getAdAccountId();

  const formData = new FormData();
  formData.append('filename', filename);
  formData.append('bytes', fileBuffer.toString('base64'));

  const response = await metaApiRequest<MetaImageUploadResponse>(
    `${accountId}/adimages`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const imageData = Object.values(response.images)[0];
  if (!imageData) {
    throw new Error('Image upload succeeded but no image data returned');
  }

  return {
    image_hash: imageData.hash,
    url: imageData.url,
  };
}

/**
 * Upload a local video file to Meta ad account's video library.
 * Uses simple upload for files <100MB, resumable upload for larger files.
 */
export async function uploadVideo(
  filePath: string,
  title?: string
): Promise<{ video_id: string; thumbnail_url?: string }> {
  const fileStats = await stat(filePath);
  const fileSize = fileStats.size;
  const accountId = getAdAccountId();

  if (fileSize < SIMPLE_UPLOAD_THRESHOLD) {
    return uploadVideoSimple(filePath, accountId, title);
  }
  return uploadVideoResumable(filePath, fileSize, accountId, title);
}

async function uploadVideoSimple(
  filePath: string,
  accountId: string,
  title?: string
): Promise<{ video_id: string; thumbnail_url?: string }> {
  const fileBuffer = await readFile(filePath);
  const filename = basename(filePath);

  const formData = new FormData();
  formData.append('source', new Blob([fileBuffer]), filename);
  if (title) formData.append('title', title);

  const response = await metaApiRequest<{ id: string }>(
    `${accountId}/advideos`,
    {
      method: 'POST',
      body: formData,
    }
  );

  // Fetch thumbnail after upload
  const thumbnailUrl = await getVideoThumbnail(response.id);

  return {
    video_id: response.id,
    thumbnail_url: thumbnailUrl,
  };
}

async function uploadVideoResumable(
  filePath: string,
  fileSize: number,
  accountId: string,
  title?: string
): Promise<{ video_id: string; thumbnail_url?: string }> {
  // Phase 1: Start
  const startParams: Record<string, string> = {
    upload_phase: 'start',
    file_size: fileSize.toString(),
  };

  const startResponse = await metaApiRequest<MetaVideoUploadStartResponse>(
    `${accountId}/advideos`,
    { method: 'POST', params: startParams }
  );

  const { upload_session_id, video_id } = startResponse;
  let startOffset = parseInt(startResponse.start_offset, 10);
  let endOffset = parseInt(startResponse.end_offset, 10);

  // Phase 2: Transfer chunks
  const fileBuffer = await readFile(filePath);

  while (startOffset < endOffset) {
    const chunkEnd = Math.min(startOffset + CHUNK_SIZE, fileSize);
    const chunk = fileBuffer.subarray(startOffset, chunkEnd);

    const formData = new FormData();
    formData.append('upload_phase', 'transfer');
    formData.append('upload_session_id', upload_session_id);
    formData.append('start_offset', startOffset.toString());
    formData.append('video_file_chunk', new Blob([chunk]), 'chunk');

    const transferResponse = await metaApiRequest<MetaVideoUploadTransferResponse>(
      `${accountId}/advideos`,
      { method: 'POST', body: formData }
    );

    startOffset = parseInt(transferResponse.start_offset, 10);
    endOffset = parseInt(transferResponse.end_offset, 10);
  }

  // Phase 3: Finish
  const finishParams: Record<string, string> = {
    upload_phase: 'finish',
    upload_session_id,
  };
  if (title) finishParams.title = title;

  await metaApiRequest(
    `${accountId}/advideos`,
    { method: 'POST', params: finishParams }
  );

  const thumbnailUrl = await getVideoThumbnail(video_id);

  return {
    video_id,
    thumbnail_url: thumbnailUrl,
  };
}

async function getVideoThumbnail(videoId: string): Promise<string | undefined> {
  try {
    const video = await metaApiRequest<MetaVideoResponse>(videoId, {
      params: { fields: 'thumbnails' },
    });
    const preferred = video.thumbnails?.data.find(t => t.is_preferred);
    return preferred?.uri || video.thumbnails?.data[0]?.uri;
  } catch {
    return undefined;
  }
}
