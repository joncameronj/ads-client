# ads-client — Build Workstream Log

**Project:** Meta Ads MCP Server  
**Repo:** https://github.com/joncameronj/ads-client  
**Date:** April 1–2, 2026

---

## Session Overview

This document tracks the build session for `ads-client` — a standalone MCP server for managing Meta (Facebook/Instagram) ads from Claude Code CLI. It covers repo creation and a multi-client account management feature.

---

## Step 1 — Create the GitHub Repository

### Question
> "Can we create a new GitHub repo and then give me the funding details so I can share it."

### Clarifications Asked
- Public or private?
- Repo name (`ads-client` or different)?
- Personal account (`joncameronj`) or an org?

### User Decision
> "Put it under joncameronj and use that same name."

### Problem Encountered
Before creating the first commit, `.env.example` was found to contain **real credentials** — not placeholders:
- `META_ACCESS_TOKEN=EAATaIzslnIgBRO...`
- `META_APP_SECRET=1f44e58cc137d832...`
- `META_AD_ACCOUNT_ID`, `META_PAGE_ID`, `META_PIXEL_ID`

**The push was blocked.** Committing real secrets to a public repo would expose them permanently.

### Question
> "Yes - we don't push that - put placeholders yes."

### Resolution
`.env.example` was sanitized — all real values replaced with descriptive placeholders:

```env
META_ACCESS_TOKEN=your_meta_access_token_here
META_AD_ACCOUNT_ID=act_your_ad_account_id_here
META_APP_SECRET=your_app_secret_here
META_PAGE_ID=your_page_id_here
META_PIXEL_ID=your_pixel_id_here
META_API_VERSION=v24.0
```

### Output
- Initial commit created with 21 source files
- Public repo created: **https://github.com/joncameronj/ads-client**
- Recommendation: rotate the exposed Meta credentials in Meta Business Manager

---

## Step 2 — Multi-Client Account Management

### Question
> "To add multiple different accounts: what I want to do is create an ability to select — for example, if I load in 10 clients' required access tokens and the required things needed — can we have some sort of variable or some sort of file that allows me to select between different ones? For example, if I want to choose between 10 different clients, could we say, 'Okay, great — you want to launch these ads. Which ad account do you want to take a look at?' Can you go ahead and build that? And create a slash command for switching between accounts — we will need all of their variables. We will also need to create a workflow to install new client accounts as well all the requisite things."

### What Was Built

#### Architecture Decision
All client credentials are stored in a local `clients.json` file (gitignored — never committed). The active client is tracked in `.active-client` (also gitignored). The system falls back to `.env` if no `clients.json` exists, preserving backward compatibility.

---

#### File: `clients.json` (gitignored — you create this locally)

Stores all client credentials. Format:

```json
{
  "clients": {
    "acme-corp": {
      "name": "Acme Corporation",
      "accessToken": "EAA...",
      "adAccountId": "act_123456",
      "appSecret": "abc123",
      "pageId": "optional",
      "pixelId": "optional",
      "apiVersion": "v24.0"
    },
    "another-client": { ... }
  }
}
```

Use `clients.example.json` (committed to the repo) as your template.

---

#### New MCP Tools (5 tools added)

| Tool | Purpose |
|---|---|
| `list_accounts` | Show all configured clients, with `▶ [ACTIVE]` marker |
| `current_account` | Show which account is currently live |
| `switch_account` | Activate a client by its ID |
| `add_account` | Onboard a new client via tool call |
| `remove_account` | Delete a client from the config |

---

#### Onboarding Workflow — Two Options

**Option A: Via MCP tool (recommended for Claude Code)**

Call `add_account` with:
```
client_id   → short slug, e.g. "acme-corp"
name        → display name, e.g. "Acme Corporation"
access_token → Meta system user token
ad_account_id → ad account ID (act_ prefix optional)
app_secret  → Meta app secret
page_id     → Facebook Page ID (optional)
pixel_id    → Meta Pixel ID (optional)
api_version → default v24.0 (optional)
```

First client added is **auto-activated**. If only one client exists, it's always selected without needing to switch.

**Option B: Edit `clients.json` directly**

Copy `clients.example.json` → `clients.json`, fill in credentials for each client.

---

#### Slash Command: `/switch-account`

Run `/switch-account` in Claude Code to get an interactive account switcher:
1. Calls `list_accounts` — shows all configured clients
2. Asks which one to activate
3. Calls `switch_account` to apply the selection
4. Confirms the new active account name and ad account ID

---

#### Smart Defaults
- **Single client** — auto-selected, no switching required
- **First client added** — auto-activated
- **Env var fallback** — if `clients.json` doesn't exist, reads from `.env` as before

---

### Files Created / Modified

| File | Change |
|---|---|
| `src/lib/client-manager.ts` | New — loads/saves/switches clients |
| `src/tools/accounts.ts` | New — 5 MCP account management tools |
| `src/config.ts` | Updated — delegates to client manager, falls back to env vars |
| `src/index.ts` | Updated — registers account tools, softened startup |
| `.gitignore` | Updated — added `clients.json`, `.active-client` |
| `clients.example.json` | New — onboarding template |
| `.claude/commands/switch-account.md` | New — `/switch-account` slash command |

### Output
- All changes committed and pushed to **https://github.com/joncameronj/ads-client**
- TypeScript type check: clean (no errors)

---

## Quick Reference — Typical Workflow

```
1. Copy clients.example.json → clients.json
2. Fill in credentials for each client
3. Run /switch-account to pick the active client
4. Run list_campaigns to confirm you're in the right account
5. Proceed with ad management as normal
```

To add a new client at any time:
```
add_account → fill in their credentials → switch_account to activate
```
