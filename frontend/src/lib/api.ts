// The one place the app talks to the Rails API. Requests go to /api on the same origin
// (the Vite proxy in development, the reverse proxy in production), so the session
// cookie is sent automatically and no CORS setup is needed (ADR 0001, 0009).

/** The API's error shape: `{ "errors": { "field": ["message"] } }`. */
export type ApiErrors = Record<string, string[]>

export class ApiError extends Error {
  readonly status: number
  readonly errors: ApiErrors

  constructor(status: number, errors: ApiErrors) {
    super(Object.values(errors).flat()[0] ?? `Request failed (${status})`)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
}

export async function apiRequest<T>(
  path: string,
  { method = "GET", body }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const errors =
      payload && typeof payload === "object" && "errors" in payload
        ? (payload as { errors: ApiErrors }).errors
        : { base: [`Request failed (${response.status})`] }
    throw new ApiError(response.status, errors)
  }

  return payload as T
}

/** Query-string from filters, leaving out empty ones: { q: "rao", page: undefined } → "q=rao". */
export function toQueryString(
  params: Record<string, string | undefined>,
): string {
  return new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  ).toString()
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

// "department_id" → "Department", "lock_version" → "Lock version".
const fieldName = (field: string) => {
  const words = field.replace(/_id$/, "").replaceAll("_", " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * An API error's messages as sentences, for errors that can't be shown next to a field: the API
 * says "is required" under `lock_version`, which on its own reads as a fragment, so it becomes
 * "Lock version is required." `base` messages are sentences already. `names` words a field the
 * way the page does, e.g. { terminated_on: "The last working day" }.
 */
export function errorSentences(
  errors: ApiErrors,
  names: Record<string, string> = {},
): string[] {
  return Object.entries(errors).flatMap(([field, messages]) =>
    messages.map((message) => {
      const sentence =
        field === "base"
          ? message
          : `${names[field] ?? fieldName(field)} ${message}`
      return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`
    }),
  )
}
