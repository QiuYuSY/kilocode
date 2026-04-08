const list: Array<() => Promise<void> | void> = []

export namespace Instance {
  export function add(fn: () => Promise<void> | void) {
    list.push(fn)
  }

  export async function disposeAll() {
    const items = list.splice(0)
    for (const item of items) {
      await item()
    }
  }
}
