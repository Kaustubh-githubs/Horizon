import { afterEach, describe, expect, it } from "vitest"

import { sessionQueryKey } from "@/features/auth/session"
import { ApiError } from "@/lib/api"
import { queryClient } from "@/lib/query-client"

const signedIn = {
  id: 1,
  name: "Asha Rao",
  email_address: "hr@acme.test",
  persona: { key: "hr_manager", name: "HR Manager" },
}

async function failSave(error: Error) {
  const mutation = queryClient.getMutationCache().build(queryClient, {
    mutationFn: () => Promise.reject(error),
  })
  await mutation.execute(undefined).catch(() => {})
}

afterEach(() => queryClient.clear())

// A 401 means the session has ended (ADR 0009): the route guard then sends the user to sign in.
describe("queryClient", () => {
  it("signs the user out when a save answers 401", async () => {
    queryClient.setQueryData(sessionQueryKey, signedIn)

    await failSave(new ApiError(401, { base: ["You need to sign in first"] }))

    expect(queryClient.getQueryData(sessionQueryKey)).toBeNull()
  })

  it("keeps the user signed in when a save fails for another reason", async () => {
    queryClient.setQueryData(sessionQueryKey, signedIn)

    await failSave(new ApiError(422, { amount: ["must be greater than 0"] }))

    expect(queryClient.getQueryData(sessionQueryKey)).toEqual(signedIn)
  })

  it("signs the user out when a read answers 401", async () => {
    queryClient.setQueryData(sessionQueryKey, signedIn)

    await queryClient
      .fetchQuery({
        queryKey: ["employees"],
        queryFn: () =>
          Promise.reject(
            new ApiError(401, { base: ["You need to sign in first"] }),
          ),
      })
      .catch(() => {})

    expect(queryClient.getQueryData(sessionQueryKey)).toBeNull()
  })
})
