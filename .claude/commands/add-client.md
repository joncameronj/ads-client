Add a new client account to the Meta Ads MCP server.

Use the `mcp__meta-ads__add_account` tool.

Required from user:
- client_id: Short unique slug (e.g. "acme-corp", "client-123")
- name: Human-readable client name (e.g. "Acme Corporation")
- access_token: Meta system user long-lived access token
- ad_account_id: Meta ad account ID (with or without `act_` prefix)
- app_secret: Meta app secret (used for appsecret_proof HMAC signing)

Optional:
- page_id: Default Facebook Page ID
- pixel_id: Default Meta Pixel ID
- api_version: Meta API version (default: v24.0)

If any required field is missing, prompt the user for it before calling the tool. Treat access_token and app_secret as sensitive — do not echo them back in full; show only the last 4 characters when confirming.

If this is the first account, it will be auto-activated. Otherwise, remind the user they can run `/switch-account` to activate it.

Confirm success by showing the client_id, name, and ad_account_id.

$ARGUMENTS
