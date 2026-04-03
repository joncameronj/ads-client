Create an ad creative from copy text + uploaded media. Requires either image_hash (from /upload-image) or video_id (from /upload-video).

Use the `mcp__meta-ads__create_creative` tool.

Required from user:
- name: Creative name
- primary_text: Main ad body text (appears above the creative)
- headline: Short headline below the creative
- link_url: Landing page URL

Optional:
- image_hash: From /upload-image
- video_id: From /upload-video
- description: Supporting text
- call_to_action: LEARN_MORE (default), SHOP_NOW, SIGN_UP, BOOK_NOW, CONTACT_US, DOWNLOAD, GET_QUOTE, APPLY_NOW, SUBSCRIBE, CALL_NOW, GET_OFFER, WATCH_MORE, SEND_MESSAGE, ORDER_NOW, OPEN_LINK
- page_id: Facebook Page ID

Ask for any missing required fields before calling the tool.

$ARGUMENTS
