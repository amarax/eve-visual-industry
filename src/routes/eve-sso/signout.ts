import { base } from "$app/paths"
import { ClearTokensFor } from "$lib/eve-sso/Tokens"
import type { RequestHandler } from "@sveltejs/kit"

export const get: RequestHandler = async ({query, locals})=> {
    ClearTokensFor(locals.userId);

    return {
        headers: {
            Location: `${base}/`,

        },
        status: 302,
    }
}