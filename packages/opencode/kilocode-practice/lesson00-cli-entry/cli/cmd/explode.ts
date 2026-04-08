import { NamedError } from "../../error"
import { cmd } from "./cmd"

export const ExplodeCommand = cmd({
  command: "explode",
  describe: "throw a structured error to exercise catch/finally",
  handler: async () => {
    // 故意抛错，用来练 catch/finally 这条退出链。
    throw new NamedError("DemoExplode", "Intentional demo error", {
      tip: "Check demo.log and telemetry.log after this command exits.",
    })
  },
})
