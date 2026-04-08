import { cmd } from "./cmd"

export const ByeCommand = cmd({
  command: "bye",
  describe: "say goodbye",
  // builder 负责定义这个命令自己的参数。
  builder: (yargs) =>
    yargs.option("name", {
      describe: "name to say goodbye",
      type: "string",
      demandOption: true,
    }),
  // handler 里才是真正执行命令逻辑的地方。
  handler: async (args) => {
    console.log(`goodbye, ${args.name}`)
  },
})