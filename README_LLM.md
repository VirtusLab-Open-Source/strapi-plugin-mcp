## Strapi MCP Plugin — Technical & Conventions Summary

- **Stack**: Strapi v5 plugin (admin React + server Node/TS), TypeScript, Zod, Vitest.
- **MCP integration**: Tools built with `@modelcontextprotocol/sdk`. Tool builders follow `McpToolDefinitionBuilder` from `server/src/common` and are registered via `registerTool`.
- **Key paths**:
  - `server/src/` — controllers, services, routes, types, MCP tools
  - `admin/src/` — React UI, plugin registration, translations
  - `.cursor/rules/` — project rules and conventions for LLMs

### Coding conventions
- **TypeScript**: strict; import types using `import type`. Prefer named exports; use default for React components.
- **Naming**:
  - Files/dirs: kebab-case
  - React components/classes/interfaces: PascalCase
  - Functions/vars: camelCase; constants: UPPER_SNAKE_CASE
  - Services end with `.service.ts`; controllers with `.controller.ts`.
- **Formatting**: Prettier with sorted imports (`.prettierrc`). Max line width 100.
- **Structure**: Keep controllers thin; put business logic in services. Use Zod for input/args validation.
- **Error handling**: Guard clauses, clear error payloads, avoid swallowing errors.

### MCP tools
- Implement tools as builders `(strapi) => ({ name, description, argsSchema, callback })`.
- Validate args with Zod schemas. Return `CallToolResult` with `content: [{ type: 'text', text: JSON.stringify(payload) }]`.
- Use `registerTool` to register with the MCP server; include annotations if needed.

### Testing
- **Framework**: Vitest. Run: `pnpm test` or `pnpm coverage`.
- **Style**: Given/When/Then sections in tests. Prefer behavior-focused test names.
- **Strapi mocks**: Use helpers from `server/test/strapi.mock.ts` or inline factory fakes per tool/service needs.
- **Tools testing**: Build tool with a mock `strapi`, call `callback(args, ctx)`, parse JSON payload from returned text content, and assert shape/values.

### Common tasks for LLMs
- Add MCP tool: create in appropriate `tools/` folder, export from `index.ts`, validate with Zod, add unit tests.
- Extend service: update service file, export from `index.ts`, keep logic pure/testable.
- Update controller: delegate to services; ensure route matches and response schema consistent.

See `.cursor/rules/` for detailed conventions and examples.


### Conventional Commits

- **Enforced**: A Husky `commit-msg` hook runs Commitlint using `@commitlint/config-conventional`.
- **Format**: `type(scope)!: subject`
  - **type**: one of `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style`, `revert`.
  - **scope**: optional; use one of `admin`, `server`, `common`, `services`, `content-types`, `strapi-info`, `controllers`, `routes`, `tooling`, `repo`.
  - **!**: optional; indicates a breaking change.
  - **subject**: imperative, lower case, no trailing period. Keep header ≤ 72 chars.
- **Body** (optional): use wrapped lines; explain the motivation and contrast with previous behavior.
- **Footer** (optional): for breaking changes and issue references.
  - Breaking changes may also be expressed via footer: `BREAKING CHANGE: describe impact and migration`.

Examples:

```
feat(server): expose services list via MCP tool

fix(admin): handle empty i18n messages without crashing

refactor(common)!: rename registerTool to registerMcpTool

docs(repo): add Conventional Commits rules
```
