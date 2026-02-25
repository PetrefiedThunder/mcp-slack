#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = "https://slack.com/api";
const RATE_LIMIT_MS = 200;
let last = 0;

function getToken(): string {
  const t = process.env.SLACK_BOT_TOKEN;
  if (!t) throw new Error("SLACK_BOT_TOKEN required (xoxb-...)");
  return t;
}

async function slackFetch(method: string, params?: Record<string, string>, body?: any): Promise<any> {
  const now = Date.now(); if (now - last < RATE_LIMIT_MS) await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - (now - last)));
  last = Date.now();
  const headers: Record<string, string> = { Authorization: `Bearer ${getToken()}` };
  let res: Response;
  if (body) {
    headers["Content-Type"] = "application/json; charset=utf-8";
    res = await fetch(`${BASE}/${method}`, { method: "POST", headers, body: JSON.stringify(body) });
  } else {
    const p = params ? `?${new URLSearchParams(params)}` : "";
    res = await fetch(`${BASE}/${method}${p}`, { headers });
  }
  const d = await res.json();
  if (!d.ok) throw new Error(`Slack error: ${d.error}`);
  return d;
}

const server = new McpServer({ name: "mcp-slack", version: "1.0.0" });

server.tool("send_message", "Send a message to a Slack channel.", {
  channel: z.string().describe("Channel ID or name"),
  text: z.string(), threadTs: z.string().optional().describe("Thread timestamp to reply in"),
}, async ({ channel, text, threadTs }) => {
  const body: any = { channel, text };
  if (threadTs) body.thread_ts = threadTs;
  const d = await slackFetch("chat.postMessage", undefined, body);
  return { content: [{ type: "text" as const, text: JSON.stringify({ ok: d.ok, ts: d.ts, channel: d.channel }, null, 2) }] };
});

server.tool("list_channels", "List Slack channels.", {
  limit: z.number().min(1).max(1000).default(100),
  types: z.string().default("public_channel,private_channel"),
}, async ({ limit, types }) => {
  const d = await slackFetch("conversations.list", { limit: String(limit), types });
  const channels = d.channels?.map((c: any) => ({
    id: c.id, name: c.name, topic: c.topic?.value, memberCount: c.num_members, isPrivate: c.is_private,
  }));
  return { content: [{ type: "text" as const, text: JSON.stringify(channels, null, 2) }] };
});

server.tool("get_messages", "Get recent messages from a channel.", {
  channel: z.string(), limit: z.number().min(1).max(100).default(20),
}, async ({ channel, limit }) => {
  const d = await slackFetch("conversations.history", { channel, limit: String(limit) });
  const msgs = d.messages?.map((m: any) => ({
    user: m.user, text: m.text?.slice(0, 500), ts: m.ts, threadTs: m.thread_ts, replyCount: m.reply_count,
  }));
  return { content: [{ type: "text" as const, text: JSON.stringify(msgs, null, 2) }] };
});

server.tool("search_messages", "Search messages across Slack.", {
  query: z.string(), count: z.number().min(1).max(100).default(10),
}, async ({ query, count }) => {
  const d = await slackFetch("search.messages", { query, count: String(count) });
  const matches = d.messages?.matches?.map((m: any) => ({
    text: m.text?.slice(0, 300), user: m.user, channel: m.channel?.name, ts: m.ts, permalink: m.permalink,
  }));
  return { content: [{ type: "text" as const, text: JSON.stringify({ total: d.messages?.total, matches }, null, 2) }] };
});

server.tool("get_user", "Get user profile info.", {
  userId: z.string(),
}, async ({ userId }) => {
  const d = await slackFetch("users.info", { user: userId });
  const u = d.user;
  return { content: [{ type: "text" as const, text: JSON.stringify({
    id: u.id, name: u.name, realName: u.real_name, email: u.profile?.email,
    title: u.profile?.title, status: u.profile?.status_text, isAdmin: u.is_admin,
  }, null, 2) }] };
});

server.tool("add_reaction", "Add an emoji reaction to a message.", {
  channel: z.string(), timestamp: z.string(), emoji: z.string().describe("Emoji name without colons (e.g. 'thumbsup')"),
}, async ({ channel, timestamp, emoji }) => {
  await slackFetch("reactions.add", undefined, { channel, timestamp, name: emoji });
  return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, emoji }) }] };
});

async function main() { const t = new StdioServerTransport(); await server.connect(t); }
main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
