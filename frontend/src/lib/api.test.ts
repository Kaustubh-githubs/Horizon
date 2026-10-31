import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError, apiRequest, toQueryString } from "@/lib/api"

const respond = (
  status: number,
  body?: unknown,
  contentType = "application/json",
) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      body === undefined
        ? null
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
      {
        status,
        headers: { "Content-Type": contentType },
      },
    ),
  )

afterEach(() => {
  vi.restoreAllMocks()
})

describe("apiRequest", () => {
  it("sends JSON to /api/v1 with the session cookie", async () => {
    const fetch = respond(200, { ok: true })

    await apiRequest("/employees/1", {
      method: "PATCH",
      body: { full_name: "Asha" },
    })

    expect(fetch).toHaveBeenCalledWith("/api/v1/employees/1", {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ full_name: "Asha" }),
    })
  })

  it("turns the API's error shape into an ApiError with the field errors", async () => {
    respond(422, { errors: { amount: ["must be greater than 0"] } })

    const error = await apiRequest("/budgets/1").catch(
      (failure: unknown) => failure,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      errors: { amount: ["must be greater than 0"] },
      message: "must be greater than 0",
    })
  })

  // A proxy's error page, for example, isn't the API's JSON.
  it("still gives an ApiError when the error isn't JSON", async () => {
    respond(502, "<html>Bad gateway</html>", "text/html")

    const error = await apiRequest("/employees").catch(
      (failure: unknown) => failure,
    )

    expect(error).toMatchObject({
      status: 502,
      errors: { base: ["Request failed (502)"] },
    })
  })

  it("answers nothing for 204 No Content", async () => {
    respond(204)

    await expect(
      apiRequest("/session", { method: "DELETE" }),
    ).resolves.toBeUndefined()
  })
})

describe("toQueryString", () => {
  it("leaves out empty filters", () => {
    expect(toQueryString({ q: "rao", country: undefined, page: "" })).toBe(
      "q=rao",
    )
  })
})
