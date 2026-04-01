import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  listClients,
  switchClient,
  addClient,
  getActiveClient,
  getActiveClientId,
  removeClient,
} from '../lib/client-manager.js';

export function registerAccountTools(server: McpServer): void {

  // ── list_accounts ──

  server.tool(
    'list_accounts',
    'List all configured client ad accounts. Shows which one is currently active.',
    {},
    async () => {
      const clients = listClients();

      if (clients.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No client accounts configured yet.\n\nUse add_account to add your first client.',
          }],
        };
      }

      const lines = clients.map(({ id, config, isActive }) => {
        const marker = isActive ? '▶ [ACTIVE]' : '  ';
        const optional = [
          config.pageId ? `Page: ${config.pageId}` : null,
          config.pixelId ? `Pixel: ${config.pixelId}` : null,
        ].filter(Boolean).join(' | ');

        return [
          `${marker} ${config.name} (id: ${id})`,
          `  Ad Account: ${config.adAccountId}`,
          optional ? `  ${optional}` : null,
          `  API Version: ${config.apiVersion}`,
        ].filter(Boolean).join('\n');
      });

      return {
        content: [{
          type: 'text',
          text: `Configured accounts (${clients.length}):\n\n${lines.join('\n\n')}`,
        }],
      };
    }
  );

  // ── current_account ──

  server.tool(
    'current_account',
    'Show which client account is currently active.',
    {},
    async () => {
      const client = getActiveClient();
      const activeId = getActiveClientId();

      if (!client) {
        return {
          content: [{
            type: 'text',
            text: 'No active account. Use list_accounts to see available clients, then switch_account to select one.',
          }],
        };
      }

      const lines = [
        `Active account: ${client.name} (id: ${activeId})`,
        `Ad Account ID: ${client.adAccountId}`,
        client.pageId ? `Page ID: ${client.pageId}` : null,
        client.pixelId ? `Pixel ID: ${client.pixelId}` : null,
        `API Version: ${client.apiVersion}`,
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    }
  );

  // ── switch_account ──

  server.tool(
    'switch_account',
    'Switch the active client account. All subsequent API calls will use this account\'s credentials.',
    {
      client_id: z.string().describe('The client ID to switch to (use list_accounts to see available IDs)'),
    },
    async ({ client_id }) => {
      const client = switchClient(client_id);
      return {
        content: [{
          type: 'text',
          text: `Switched to: ${client.name}\nAd Account: ${client.adAccountId}${client.pageId ? `\nPage: ${client.pageId}` : ''}${client.pixelId ? `\nPixel: ${client.pixelId}` : ''}`,
        }],
      };
    }
  );

  // ── add_account ──

  server.tool(
    'add_account',
    'Add a new client account. The client ID is a short slug you choose (e.g. "acme-corp"). If this is the first account it will be auto-activated.',
    {
      client_id: z.string().min(1).describe('Short unique slug for this client (e.g. "acme-corp", "client-123")'),
      name: z.string().min(1).describe('Human-readable client name (e.g. "Acme Corporation")'),
      access_token: z.string().min(1).describe('Meta system user access token'),
      ad_account_id: z.string().min(1).describe('Meta ad account ID (with or without act_ prefix)'),
      app_secret: z.string().min(1).describe('Meta app secret for appsecret_proof signing'),
      page_id: z.string().optional().describe('Default Facebook Page ID (optional)'),
      pixel_id: z.string().optional().describe('Default Meta Pixel ID (optional)'),
      api_version: z.string().optional().describe('Meta API version (default: v24.0)'),
    },
    async ({ client_id, name, access_token, ad_account_id, app_secret, page_id, pixel_id, api_version }) => {
      addClient(client_id, {
        name,
        accessToken: access_token,
        adAccountId: ad_account_id,
        appSecret: app_secret,
        pageId: page_id,
        pixelId: pixel_id,
        apiVersion: api_version ?? 'v24.0',
      });

      return {
        content: [{
          type: 'text',
          text: `Added client: ${name} (id: ${client_id})\n\nUse switch_account with client_id="${client_id}" to activate it.`,
        }],
      };
    }
  );

  // ── remove_account ──

  server.tool(
    'remove_account',
    'Remove a client account from the configuration.',
    {
      client_id: z.string().describe('The client ID to remove'),
    },
    async ({ client_id }) => {
      removeClient(client_id);
      return {
        content: [{
          type: 'text',
          text: `Removed client: ${client_id}`,
        }],
      };
    }
  );
}
