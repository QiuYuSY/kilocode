// kilocode_change - new file
// Kilo-specific routes that live in the CLI package (direct access to internals).
// All future kilo-specific endpoints should be added here.
import { Hono } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import z from "zod"
import { Skill } from "../../skill/skill"
import { Agent } from "../../agent/agent"
import { MCP } from "../../mcp"
import { lazy } from "../../util/lazy"
import { errors } from "../error"

export const KilocodeRoutes = lazy(() =>
  new Hono()
    .post(
      "/skill/remove",
      describeRoute({
        summary: "Remove a skill",
        description: "Remove a skill by deleting its directory from disk and clearing it from cache.",
        operationId: "kilocode.removeSkill",
        responses: {
          200: {
            description: "Skill removed",
            content: {
              "application/json": {
                schema: resolver(z.boolean()),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "json",
        z.object({
          location: z.string(),
        }),
      ),
      async (c) => {
        const { location } = c.req.valid("json")
        await Skill.remove(location)
        return c.json(true)
      },
    )
    .post(
      "/agent/remove",
      describeRoute({
        summary: "Remove a custom agent",
        description: "Remove a custom (non-native) agent by deleting its markdown file from disk and refreshing state.",
        operationId: "kilocode.removeAgent",
        responses: {
          200: {
            description: "Agent removed",
            content: {
              "application/json": {
                schema: resolver(z.boolean()),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "json",
        z.object({
          name: z.string(),
        }),
      ),
      async (c) => {
        const { name } = c.req.valid("json")
        await Agent.remove(name)
        return c.json(true)
      },
    )
    .post(
      "/mcp/remove",
      describeRoute({
        summary: "Remove MCP server",
        description: "Remove an MCP server from config by name. Removes from both project and global scopes.",
        operationId: "kilocode.removeMcp",
        responses: {
          200: {
            description: "MCP server removed",
            content: {
              "application/json": {
                schema: resolver(z.object({ project: z.boolean(), global: z.boolean() })),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "json",
        z.object({
          name: z.string(),
        }),
      ),
      async (c) => {
        const { name } = c.req.valid("json")
        const result = await MCP.remove(name)
        return c.json(result)
      },
    ),
)
