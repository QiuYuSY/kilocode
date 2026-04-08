import { NamedError } from "../error"

export function FormatError(err: unknown) {
  if (err instanceof NamedError) {
    return `[${err.name}] ${err.message}`
  }

  if (err instanceof Error) {
    return err.message
  }

  return undefined
}
