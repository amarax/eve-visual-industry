import { LoadFromESI } from "$lib/eve-data/EveData";
import { GetAccessToken } from "$lib/eve-sso/Tokens";
import type { RequestHandler } from "@sveltejs/kit";


export const get: RequestHandler = async ({query, locals, params}) => {
    let characterId = parseInt(query.get("char"));


    let body;
    try {
        body = await LoadFromESI(`/${params.endpoint}?${query.toString()}`, {characterId});
    } catch(response) {
        if(response.status == 403) {
            // try refreshing the token
            console.log("Should try refreshing token")
        }

        console.error(response);
    }
    
    return {
        body
    };
}