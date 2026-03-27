// kilocode_change - new file
// Test that aborting during a retry backoff properly stops the processor
// instead of continuing to retry with the same model.

// Match the env set by session-processor-retry-limit.test.ts so that when bun
// runs both files in the same process, shared Flag singletons stay consistent.
process.env.KILO_SESSION_RETRY_LIMIT = "2"

import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"

mock.module("@/kilo-sessions/remote-sender", () => ({
  RemoteSender: {
    create() {
      return {
        queue() {},
        flush: async () => undefined,
      }
    },
  },
}))

import { APICallError } from "ai"
import type { Provider } from "../../src/provider/provider"
import type { LLM as LLMType } from "../../src/session/llm"
import type { MessageV2 } from "../../src/session/message-v2"
import { Log } from "../../src/util/log"
import { tmpdir } from "../fixture/fixture"

Log.init({ print: false })

afterEach(() => {
  delete process.env.KILO_SESSION_RETRY_LIMIT
})

function createModel(): Provider.Model {
  return {
    id: "gpt-4",
    providerID: "openai",
    name: "GPT-4",
    limit: {
      context: 128000,
      input: 0,
      output: 4096,
    },
    cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    capabilities: {
      toolcall: true,
      attachment: false,
      reasoning: false,
      temperature: true,
      input: { text: true, image: false, audio: false, video: false },
      output: { text: true, image: false, audio: false, video: false },
    },
    api: { id: "openai", url: "https://api.openai.com/v1", npm: "@ai-sdk/openai" },
    options: {},
    headers: {},
  } as Provider.Model
}

function retryable429() {
  return new APICallError({
    message: "429 status code (no body)",
    url: "https://api.openai.com/v1/chat/completions",
    requestBodyValues: {},
    statusCode: 429,
    responseHeaders: { "content-type": "application/json" },
    isRetryable: true,
  })
}

describe("session processor abort during retry", () => {
  test("abort during retry sleep stops the processor without further retries", async () => {
    const { Bus } = await import("../../src/bus")
    const { Identifier } = await import("../../src/id/id")
    const { Instance } = await import("../../src/project/instance")
    const { LLM } = await import("../../src/session/llm")
    const { SessionRetry } = await import("../../src/session/retry")
    const { SessionStatus } = await import("../../src/session/status")

    await using tmp = await tmpdir({ git: true })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const { Session } = await import("../../src/session")
        const { SessionProcessor } = await import("../../src/session/processor")
        const model = createModel()
        const session = await Session.create({})
        const user = (await Session.updateMessage({
          id: Identifier.ascending("message"),
          role: "user",
          sessionID: session.id,
          time: { created: Date.now() },
          agent: "code",
          model: { providerID: model.providerID, modelID: model.id },
          tools: {},
        })) as MessageV2.User
        const assistant = (await Session.updateMessage({
          id: Identifier.ascending("message"),
          parentID: user.id,
          role: "assistant",
          mode: "code",
          agent: "code",
          path: {
            cwd: Instance.directory,
            root: Instance.worktree,
          },
          cost: 0,
          tokens: {
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          modelID: model.id,
          providerID: model.providerID,
          time: { created: Date.now() },
          sessionID: session.id,
        })) as MessageV2.Assistant

        const controller = new AbortController()
        const llm = spyOn(LLM, "stream")
          .mockRejectedValueOnce(retryable429())
          .mockRejectedValue(new Error("should not be called after abort"))

        // Mock sleep to simulate abort happening during the backoff sleep.
        // When sleep is called, abort the controller then reject like the real
        // sleep does on abort.
        const sleep = spyOn(SessionRetry, "sleep").mockImplementation(async (_ms, signal) => {
          controller.abort()
          throw new DOMException("Aborted", "AbortError")
        })

        const processor = SessionProcessor.create({
          assistantMessage: assistant,
          sessionID: session.id,
          model,
          abort: controller.signal,
        })

        const inp: LLMType.StreamInput = {
          user,
          sessionID: session.id,
          model,
          agent: { name: "code", mode: "primary", permission: [], options: {} } as any,
          system: [],
          abort: controller.signal,
          messages: [],
          tools: {},
        }

        try {
          const result = await processor.process(inp)

          // The processor breaks out of the while loop when aborted, returning
          // undefined. The outer prompt loop checks abort.aborted separately.
          expect(result).toBeUndefined()
          // LLM.stream should only have been called once — the first 429 error.
          // After abort, no further calls should be made.
          expect(llm).toHaveBeenCalledTimes(1)
          expect(sleep).toHaveBeenCalledTimes(1)
          // No error should be set on the message since this was an intentional abort
          expect(processor.message.error).toBeUndefined()
        } finally {
          llm.mockRestore()
          sleep.mockRestore()
        }
      },
    })
  })
})
