Create an ad set with targeting, budget, placements, and schedule. Defaults to Facebook + Instagram (no Audience Network).

Use the `mcp__meta-ads__create_adset` tool.

Required from user:
- campaign_id: Campaign to add the ad set to
- name: Ad set name
- optimization_goal: LINK_CLICKS, LANDING_PAGE_VIEWS, IMPRESSIONS, REACH, LEAD_GENERATION, OFFSITE_CONVERSIONS, or VALUE
- targeting (at minimum geo_locations with countries)

Optional:
- daily_budget or lifetime_budget (in dollars)
- bid_strategy: LOWEST_COST_WITHOUT_CAP (default), COST_CAP, BID_CAP
- placements: Custom Facebook/Instagram positions
- start_time / end_time (ISO 8601)
- temperature: COLD, WARM, or HOT
- page_id, pixel_id

Ask for any missing required fields before calling the tool.

$ARGUMENTS
