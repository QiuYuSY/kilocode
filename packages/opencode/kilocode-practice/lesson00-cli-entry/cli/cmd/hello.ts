import { cmd } from "./cmd"

export const HelloCommand = cmd({
  command: "hello",
  describe: "print a greeting and show startup context",
  // builder 负责定义这个命令自己的参数。
  builder: (yargs) =>
    yargs.option("name", {
      describe: "name to greet",
      type: "string",
      demandOption: true,
    }),
  // handler 里才是真正执行命令逻辑的地方。
  handler: async (args) => {
    console.log(`hello, ${args.name}`)
    // 这几行故意把启动期准备好的环境直接打印出来，方便你观察 middleware 的效果。
    console.log(`feature=${process.env.LESSON00_FEATURE}`)
    console.log(`pid=${process.env.LESSON00_PID}`)
    console.log(`logs=${process.env.LESSON00 === "1" ? "ready" : "missing"}`)
  },
})
