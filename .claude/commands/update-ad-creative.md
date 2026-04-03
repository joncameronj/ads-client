Update the copy or media on an existing ad. Creates a new creative with the changes and swaps it on the ad. Only provide fields you want to change.

Use the `mcp__meta-ads__update_ad_creative` tool.

Required from user:
- ad_id: Ad ID to update

Optional (provide at least one):
- primary_text: New main body text
- headline: New headline
- description: New description
- call_to_action: New CTA type
- image_hash: New image (from /upload-image)
- video_id: New video (from /upload-video)

Confirm what was changed on the ad.

$ARGUMENTS
