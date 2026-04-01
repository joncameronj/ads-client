import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

const CLIENTS_FILE = join(process.cwd(), 'clients.json');
const ACTIVE_CLIENT_FILE = join(process.cwd(), '.active-client');

// ── Schemas ──

export const ClientConfigSchema = z.object({
  name: z.string().min(1),
  accessToken: z.string().min(1),
  adAccountId: z.string().min(1),
  appSecret: z.string().min(1),
  pageId: z.string().optional(),
  pixelId: z.string().optional(),
  apiVersion: z.string().default('v24.0'),
});

export type ClientConfig = z.infer<typeof ClientConfigSchema>;

const ClientsFileSchema = z.object({
  clients: z.record(z.string(), ClientConfigSchema),
});

// ── Helpers ──

function normalizeAdAccountId(id: string): string {
  return id.startsWith('act_') ? id : `act_${id}`;
}

function normalizeClient(client: ClientConfig): ClientConfig {
  return { ...client, adAccountId: normalizeAdAccountId(client.adAccountId) };
}

// ── File I/O ──

export function loadClientsFile(): Record<string, ClientConfig> {
  if (!existsSync(CLIENTS_FILE)) return {};
  const raw = readFileSync(CLIENTS_FILE, 'utf-8');
  const parsed = ClientsFileSchema.parse(JSON.parse(raw));
  return parsed.clients;
}

function saveClientsFile(clients: Record<string, ClientConfig>): void {
  writeFileSync(CLIENTS_FILE, JSON.stringify({ clients }, null, 2));
}

export function getActiveClientId(): string | null {
  if (!existsSync(ACTIVE_CLIENT_FILE)) return null;
  return readFileSync(ACTIVE_CLIENT_FILE, 'utf-8').trim() || null;
}

export function setActiveClientId(id: string): void {
  writeFileSync(ACTIVE_CLIENT_FILE, id);
}

// ── Public API ──

export function getActiveClient(): ClientConfig | null {
  const clients = loadClientsFile();
  const keys = Object.keys(clients);
  if (keys.length === 0) return null;

  const activeId = getActiveClientId();

  // Auto-select if only one client exists
  if (!activeId && keys.length === 1) {
    return normalizeClient(clients[keys[0]]);
  }

  if (!activeId) return null;
  const client = clients[activeId];
  return client ? normalizeClient(client) : null;
}

export function addClient(id: string, config: Omit<ClientConfig, 'apiVersion'> & { apiVersion?: string }): void {
  const clients = loadClientsFile();
  const parsed = ClientConfigSchema.parse(config);
  clients[id] = parsed;
  saveClientsFile(clients);

  // Auto-activate if this is the first client
  const keys = Object.keys(clients);
  if (keys.length === 1) {
    setActiveClientId(id);
  }
}

export function switchClient(id: string): ClientConfig {
  const clients = loadClientsFile();
  const client = clients[id];
  if (!client) {
    const available = Object.keys(clients).join(', ') || '(none)';
    throw new Error(`Client "${id}" not found. Available: ${available}`);
  }
  setActiveClientId(id);
  return normalizeClient(client);
}

export function listClients(): Array<{ id: string; config: ClientConfig; isActive: boolean }> {
  const clients = loadClientsFile();
  const activeId = getActiveClientId();
  return Object.entries(clients).map(([id, config]) => ({
    id,
    config: normalizeClient(config),
    isActive: id === activeId,
  }));
}

export function removeClient(id: string): void {
  const clients = loadClientsFile();
  if (!clients[id]) throw new Error(`Client "${id}" not found`);
  const { [id]: _removed, ...remaining } = clients;
  saveClientsFile(remaining);

  // Clear active if it was the removed client
  if (getActiveClientId() === id) {
    const remainingKeys = Object.keys(remaining);
    if (remainingKeys.length > 0) {
      setActiveClientId(remainingKeys[0]);
    } else {
      writeFileSync(ACTIVE_CLIENT_FILE, '');
    }
  }
}
