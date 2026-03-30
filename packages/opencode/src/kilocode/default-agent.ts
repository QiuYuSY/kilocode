// kilocode_change - new file
import { Agent } from "../agent/agent"
import { Session } from "../session"
import { Bus } from "../bus"
import { NamedError } from "@opencode-ai/util/error"

export async function defaultAgent(sessionID: string) {
  return Agent.defaultAgent().catch((e) => {
    const message = e instanceof Error ? e.message : String(e)
    Bus.publish(Session.Event.Error, {
      sessionID,
      error: new NamedError.Unknown({ message }).toObject(),
    })
    throw e
  })
}
