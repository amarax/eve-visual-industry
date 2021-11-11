import { GetCharacters } from "$lib/eve-sso/Tokens"
import type { GetSession, Handle } from "@sveltejs/kit"

import cookie from 'cookie';

export const getSession: GetSession = ({headers, locals}) => {
    
    let authenticatedESICharacters = GetCharacters(locals.userId)

    return {
        authenticatedESICharacters
    }
}

export const handle: Handle = async ({request, resolve}) =>{
    const {userid} = cookie.parse(request.headers.cookie ?? "");
    if(!userid) {
        // Todo generate a random number as a userid and store it
        console.error("No userid in cookies for request", request.path);
    } else {
        request.locals.userId = userid;
    }

    const response = await resolve(request);

    return response;
}