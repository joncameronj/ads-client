Upload a local video file to Meta. Returns the video_id for use in /create-creative. Supports MP4, MOV. Large files use resumable upload.

Use the `mcp__meta-ads__upload_video` tool.

Required from user:
- file_path: Absolute path to local video file

Optional:
- title: Video title in Meta library

Return the video_id so the user can use it with /create-creative.

$ARGUMENTS
