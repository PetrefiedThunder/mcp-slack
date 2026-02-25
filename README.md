# mcp-slack

Send messages, search, list channels, and manage reactions in Slack.

## Tools

| Tool | Description |
|------|-------------|
| `send_message` | Send a message to a Slack channel. |
| `list_channels` | List Slack channels. |
| `get_messages` | Get recent messages from a channel. |
| `search_messages` | Search messages across Slack. |
| `get_user` | Get user profile info. |
| `add_reaction` | Add an emoji reaction to a message. |

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_BOT_TOKEN` | Yes | Slack bot token (xoxb-...) |

## Installation

```bash
git clone https://github.com/PetrefiedThunder/mcp-slack.git
cd mcp-slack
npm install
npm run build
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "slack": {
      "command": "node",
      "args": ["/path/to/mcp-slack/dist/index.js"],
      "env": {
        "SLACK_BOT_TOKEN": "your-slack-bot-token"
      }
    }
  }
}
```

## Usage with npx

```bash
npx mcp-slack
```

## License

MIT
