Break down performance metrics by dimension (age, gender, placement, device, country).

Use the `mcp__meta-ads__get_breakdowns` tool.

Required from user:
- object_id: Campaign, ad set, or ad ID
- level: "campaign", "adset", or "ad"
- breakdown: "age", "gender", "placement", "device", "country", or "age,gender"

Optional:
- date_preset: today, yesterday, last_7d (default), last_14d, last_30d, lifetime

Present results in a table sorted by the most relevant metric.

$ARGUMENTS
