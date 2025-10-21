<div align="center" width="150px">
  <img style="width: 150px; height: auto;" src="https://www.sensinum.com/img/open-source/strapi-plugin-mcp/logo.png" alt="Logo - Strapi Plugin MCP" />
</div>
<div align="center">
  <h1>Strapi - MCP Plugin</h1>
  <p>AI models access to the Strapi Context via the Model Context Protocol (MCP)</p>
  <a href="https://www.npmjs.org/package/@sensinum/strapi-plugin-mcp">
    <img alt="GitHub package.json version" src="https://img.shields.io/github/package-json/v/VirtusLab-Open-Source/strapi-plugin-mcp?label=npm&logo=npm">
  </a>
  <a href="https://www.npmjs.org/package/@sensinum/strapi-plugin-mcp">
    <img src="https://img.shields.io/npm/dm/@sensinum/strapi-plugin-mcp.svg" alt="Monthly download on NPM" />
  </a>
  <a href="https://circleci.com/gh/VirtusLab-Open-Source/strapi-plugin-mcp">
    <img src="https://circleci.com/gh/VirtusLab-Open-Source/strapi-plugin-mcp.svg?style=shield" alt="CircleCI" />
  </a>
</div>

---

A Strapi v5 plugin that integrates Model Context Protocol (MCP) functionality, enabling AI models to interact with your Strapi content and system information through a standardized protocol.

> ⚠️ **SECURITY WARNING**: This plugin exposes internal Strapi functionality and should **NEVER** be enabled in production environments. It is designed for development and local use only. Always disable this plugin before deploying to production.

1. [📖 Overview](#-overview)
2. [📋 Prerequisites](#-prerequisites)
3. [⏳ Installation](#-installation)
4. [🔌 Integration Guide](#-integration-guide)
5. [🔧 Configuration](#-configuration)
   - [Memory Session Management](#memory-session-management)
   - [Redis Session Management](#redis-session-management)
6. [🚀 Usage](#-usage)
7. [🛠️ Available MCP Tools](#%EF%B8%8F-available-mcp-tools)
8. [💡 Usage Examples](#-usage-examples)
   - [Content Type Exploration](#content-type-exploration)
   - [System Information](#system-information)
   - [Service Interaction](#service-interaction)
   - [Common Workflows](#common-workflows)
9. [👨‍💻 Development](#-development)
10. [📝 License](#-license)

## 📖 Overview

This plugin provides MCP (Model Context Protocol) integration for Strapi, allowing AI assistants and other MCP clients to:

- **Access Content Types**: Query and introspect your Strapi content type schemas and relationships
- **Retrieve System Information**: Get Strapi version, configuration details, and plugin status
- **Interact with Services**: Access Strapi service methods and functionality
- **Session Management**: Support for both in-memory and Redis-based session storage

The plugin exposes MCP tools through a streamable HTTP transport, making it easy to integrate with Claude Desktop, Cursor, and other MCP-compatible clients.

## 📋 Prerequisites

Before installing this plugin, ensure your environment meets the following requirements:

- **Strapi**: v5.0.0 or higher
- **Node.js**: v18.0.0 or higher (recommended: v20 LTS)
- **Package Manager**: npm, yarn, or pnpm
- **Redis** (optional): v6.0.0 or higher (only required if using Redis session management)

**Note**: After installation, you may need to restart your Strapi server for the plugin to be fully initialized.

### Table of Contents

1. [📖 Overview](#-overview)
2. [📋 Prerequisites](#-prerequisites)
3. [⏳ Installation](#-installation)
4. [🔌 Integration Guide](#-integration-guide)
5. [🔧 Configuration](#-configuration)
6. [🚀 Usage](#-usage)
7. [🛠️ Available MCP Tools](#%EF%B8%8F-available-mcp-tools)
8. [💡 Usage Examples](#-usage-examples)
9. [👨‍💻 Development](#-development)
10. [📝 License](#-license)

## ⏳ Installation

Install the plugin using your preferred package manager:

```bash
# Using npm
npm install @sensinum/strapi-plugin-mcp

# Using yarn
yarn add @sensinum/strapi-plugin-mcp

# Using pnpm
pnpm add @sensinum/strapi-plugin-mcp
```

After installation, the plugin will be automatically discovered by Strapi v5. No additional registration steps are required.

## 🔌 Integration Guide

### MCP Client Configuration

The plugin exposes a streamable HTTP endpoint for MCP communication:

```
http://localhost:1337/api/mcp/streamable
```

#### Claude Desktop Configuration

Add the following to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "strapi": {
      "type": "streamable-http",
      "url": "http://localhost:1337/api/mcp/streamable",
      "note": "For Streamable HTTP connections, add this URL directly in your MCP Client"
    }
  }
}
```

#### Cursor Configuration

For Cursor, create or update your `.cursor/mcp.json` file:

```json
{
  "mcpServers": {
    "strapi": {
      "type": "streamable-http",
      "url": "http://localhost:1337/api/mcp/streamable",
      "note": "For Streamable HTTP connections, add this URL directly in your MCP Client"
    }
  }
}
```

### Endpoint Details

The plugin provides the following HTTP endpoints:

- **GET** `/api/mcp/streamable` - Initialize MCP connection
- **POST** `/api/mcp/streamable` - Handle MCP requests  
- **DELETE** `/api/mcp/streamable` - Close MCP session

All endpoints support session-based communication with automatic session management.

## 🔧 Configuration

The plugin supports flexible session management through Strapi's configuration system. Add configuration to your `config/plugins.js` (or `config/plugins.ts`) file:

### Memory Session Management

For development or single-instance deployments, use in-memory session storage:

```javascript
// config/plugins.js
module.exports = {
  // ... other plugins
  mcp: {
    enabled: true,
    config: {
      session: {
        type: "memory"
      }
    }
  }
};
```

```typescript
// config/plugins.ts
export default {
  // ... other plugins
  mcp: {
    enabled: true,
    config: {
      session: {
        type: "memory"
      }
    }
  }
};
```

**Memory session options:**
- `type`: Must be `"memory"`
- `max`: Maximum number of sessions to keep in memory (default: 20)
- `ttlMs`: Session timeout in milliseconds (default: 600000 - 10 minutes)
- `updateAgeOnGet`: Whether to reset TTL on session access (default: true)

### Redis Session Management

For production or multi-instance deployments, use Redis for session persistence:

#### Option 1: Redis Connection Object

```javascript
// config/plugins.js
module.exports = {
  // ... other plugins
  mcp: {
    enabled: true,
    config: {
      session: {
        type: "redis",
        connection: {
          host: "localhost",
          port: 6379,
          // Optional Redis auth
          username: "default",
          password: "your-redis-password",
          db: 0
        },
        ttlMs: 600000, // 10 minutes
        keyPrefix: "mcp:session"
      }
    }
  }
};
```

#### Option 2: Redis Connection URL

```javascript
// config/plugins.js
module.exports = {
  // ... other plugins
  mcp: {
    enabled: true,
    config: {
      session: {
        type: "redis",
        connection: "redis://localhost:6379"
      }
    }
  }
};
```

#### Option 3: Redis with Custom Port

```javascript
// config/plugins.js
module.exports = {
  // ... other plugins
  mcp: {
    enabled: true,
    config: {
      session: {
        type: "redis",
        connection: {
          host: "localhost",
          port: 8899
        }
      }
    }
  }
};
```

Or using connection URL format:

```javascript
// config/plugins.js
module.exports = {
  // ... other plugins
  mcp: {
    enabled: true,
    config: {
      session: {
        type: "redis",
        connection: "redis://localhost:8899"
      }
    }
  }
};
```

**Redis session options:**
- `type`: Must be `"redis"`
- `connection`: Redis connection configuration (object or URL string)
- `ttlMs`: Session timeout in milliseconds (default: 600000 - 10 minutes)
- `keyPrefix`: Redis key prefix for sessions (default: "mcp:session")

### IP Allowlist

For enhanced security, you can restrict access to the MCP endpoints by IP address. Add the `allowedIPs` array to your configuration:

```javascript
// config/plugins.js
module.exports = {
  // ... other plugins
  mcp: {
    enabled: true,
    config: {
      session: {
        type: "memory"
      },
      allowedIPs: ["127.0.0.1", "::1", "192.168.1.100"]
    }
  }
};
```

```typescript
// config/plugins.ts
export default {
  // ... other plugins
  mcp: {
    enabled: true,
    config: {
      session: {
        type: "memory"
      },
      allowedIPs: ["127.0.0.1", "::1", "192.168.1.100"]
    }
  }
};
```

**IP Allowlist options:**
- `allowedIPs`: Array of IP addresses allowed to access the MCP endpoints (default: `["127.0.0.1", "::1"]`)
- Supports both IPv4 and IPv6 addresses
- If not configured, only localhost connections are allowed by default
- Requests from IPs not in the allowlist will receive a 403 Forbidden response

### Environment Variables

You can also use environment variables in your configuration:

```javascript
// config/plugins.js
module.exports = {
  mcp: {
    enabled: true,
    config: {
      session: {
        type: "redis",
        connection: {
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD,
        }
      }
    }
  }
};
```

## 🚀 Usage

Once configured, the plugin automatically exposes MCP tools that clients can discover and use. The plugin provides tools for:

1. **Content Type Introspection** - Query available content types and their schemas
2. **Strapi System Information** - Access instance details, version info, and configuration
3. **Service Methods** - Interact with Strapi services and their methods

MCP clients can discover available tools through the standard MCP protocol and invoke them as needed.

## 🛠️ Available MCP Tools

The plugin exposes several categories of tools:

### Content Types Tools
- `content-types` - List all available content types
- `content-type-by-name` - Get detailed information about a specific content type
- `components` - List all available components
- `component-by-name` - Get detailed information about a specific component

### Strapi Info Tools  
- `instance-info` - Get Strapi instance information including version and configuration

### Services Tools
- `services` - List all available services
- `service-methods` - Get methods available on a specific service

All tools follow MCP protocol standards and provide comprehensive error handling and validation.

### Custom Tools

The plugin supports registering custom MCP tools through the custom service. This allows developers to extend the plugin's functionality by adding domain-specific tools that integrate with their Strapi application. Custom tools are registered using the `registerTool` method and become available to MCP clients alongside the built-in tools.

The `registerTool` method accepts a `McpToolDefinition` object with the following TypeScript interface: `name` (string) for the tool identifier, `callback` (ToolCallback) for the execution function that returns MCP-formatted content, optional `argsSchema` (ZodRawShape) for argument validation, optional `description` (string) for tool documentation, and optional `annotations` (ToolAnnotations) for additional metadata. The callback function receives validated arguments and must return content in MCP format with a `content` array containing text, image, or other supported content types.

```ts
const mcpCustomService = strapi.plugin("mcp").service("custom");

mcpCustomService.registerTool({
  name: "custom-mango",
  description: "Mango tool",
  argsSchema: {},
  callback: async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          message: "Mango tool",
        }),
      },
    ],
  }),
});
```

## 💡 Usage Examples

Once your MCP client is connected, you can interact with your Strapi instance using natural language. Here are comprehensive examples of how to use the plugin's capabilities:

### Content Type Exploration

#### Discovering Available Content Types
Ask your AI assistant to explore what content types are available:

**Example Prompts:**
- *"What content types are available in this Strapi instance?"*
- *"Show me all the content types and their basic information"*
- *"List the content types with their API IDs"*

**What happens:** The AI will use the `content-types` tool to retrieve all content types, showing you their display names, API IDs, and basic metadata.

#### Examining Specific Content Type Schemas
Get detailed information about a particular content type:

**Example Prompts:**
- *"Show me the schema for the Article content type"*
- *"What fields does the User content type have?"*
- *"Describe the Product content type structure and its relationships"*

**What happens:** The AI uses the `content-type-by-name` tool to fetch the complete schema including fields, attributes, relations, and validation rules.

#### Working with Components
Explore reusable components in your Strapi setup:

**Example Prompts:**
- *"What components are available in this Strapi instance?"*
- *"Show me the structure of the SEO component"*
- *"List all components and their usage in content types"*

### System Information

#### Instance Overview
Get comprehensive information about your Strapi setup:

**Example Prompts:**
- *"Describe the current Strapi instance"*
- *"What version of Strapi am I running and what plugins are installed?"*
- *"Give me a summary of this Strapi installation"*

**What happens:** The AI uses the `instance-info` tool to provide details about Strapi version, Node.js version, installed plugins, and system configuration.

#### Configuration Analysis
Understand your Strapi configuration:

**Example Prompts:**
- *"What database am I using for this Strapi instance?"*
- *"Show me the environment configuration"*
- *"What plugins are enabled and what are their versions?"*

### Service Interaction

#### Service Discovery
Explore available services and their capabilities:

**Example Prompts:**
- *"What services are available in this Strapi instance?"*
- *"List all services from the content-manager plugin"*
- *"Show me services that handle user management"*

**What happens:** The AI uses the `services` tool to list all available services across your Strapi instance and plugins.

#### Service Method Exploration
Dive deep into specific service capabilities:

**Example Prompts:**
- *"What methods are available on the user service?"*
- *"Show me all methods for the content-manager service"*
- *"Describe the client service from the navigation plugin"*

**What happens:** The AI uses the `service-methods` tool to retrieve detailed information about service methods, their parameters, and return types.

### Common Workflows

#### Content Management Setup
Plan and understand your content architecture:

**Example Prompts:**
- *"Help me understand how to structure a blog with Articles, Authors, and Categories"*
- *"What's the best way to set up a product catalog based on my current content types?"*
- *"Analyze my current content structure and suggest improvements"*

#### Development Planning
Use MCP tools for development planning:

**Example Prompts:**
- *"Prepare an article page component based on my Article content type"*
- *"Generate TypeScript interfaces for my content types"*
- *"Create a data fetching strategy for my Product listing page"*

#### Plugin Integration
Understand how plugins work together:

**Example Prompts:**
- *"How does the i18n plugin affect my content types?"*
- *"Show me how the upload plugin integrates with my Media content type"*
- *"What services does the users-permissions plugin provide?"*

#### API Planning
Plan your API usage:

**Example Prompts:**
- *"What API endpoints are available for my Article content type?"*
- *"Help me plan the API calls needed for a user dashboard"*
- *"Show me how to structure GraphQL queries for my content"*

### Advanced Usage Examples

#### Schema Analysis
Perform complex schema analysis:

**Example Prompts:**
- *"Find all content types that reference the User content type"*
- *"Show me all many-to-many relationships in my schema"*
- *"Identify content types that might have circular dependencies"*

### Tips for Effective Usage

1. **Be Specific**: Instead of "show me content", ask "show me the Article content type schema"
2. **Ask Follow-ups**: After getting basic info, ask for deeper analysis or specific aspects
3. **Use Context**: Reference specific content types, services, or plugins by name
4. **Combine Tools**: Ask questions that might require multiple tools to get comprehensive answers
5. **Plan Workflows**: Use the information to plan development tasks and content strategies

The MCP integration makes it easy to explore and understand your Strapi instance through natural conversation, enabling better development planning and content management decisions.

## 👨‍💻 Development

For development and testing:

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Watch for changes during development
pnpm watch

# Run tests
pnpm test:run

# Type checking
pnpm test:ts:front && pnpm test:ts:back

# Verify plugin structure
pnpm verify
```

The plugin follows Strapi v5 plugin architecture with separate admin and server components, built using TypeScript and the Model Context Protocol SDK.

## 📝 License

[MIT License](LICENSE.md) Copyright (c) [VirtusLab Sp. z o.o.](https://virtuslab.com/) &amp; [Strapi Solutions](https://strapi.io/).