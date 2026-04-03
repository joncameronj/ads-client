Parse a local markdown file containing structured ad copy. Extracts headlines, primary text, descriptions, and CTA for each variation.

Use the `mcp__meta-ads__parse_ad_copy_markdown` tool.

Required from user:
- file_path: Absolute path to the markdown file with ad copy

Expected markdown format:
```
# Ad Copy - Campaign Name
## Variation 1: Hook-based
### Primary Text
Main body copy...
### Headline
Short headline
### Description
Optional description
### CTA
LEARN_MORE
```

Present the parsed variations clearly so the user can review before creating creatives.

$ARGUMENTS
