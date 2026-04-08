export class NamedError extends Error {
  data: Record<string, unknown>

  constructor(name: string, message: string, data: Record<string, unknown> = {}) {
    super(message)
    this.name = name
    this.data = data
  }

  toObject() {
    return {
      name: this.name,
      message: this.message,
      data: this.data,
    }
  }
}
