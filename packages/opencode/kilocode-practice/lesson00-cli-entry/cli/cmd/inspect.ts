import { Auth } from "../../auth"
import { Global } from "../../global"
import { Migration } from "../../storage/migration"
import { cmd } from "./cmd"

export const InspectCommand = cmd({
  command: "inspect",
  describe: "print runtime files created by startup initialization",
  handler: async () => {
    // 这个命令不做初始化，它只是把启动期已经准备好的结果展示出来。
    const auth = await Auth.get()
    const db = await Migration.get()

    console.log(
      JSON.stringify(
        {
          path: Global.Path,
          auth,
          db,
        },
        null,
        2,
      ),
    )
  },
})
