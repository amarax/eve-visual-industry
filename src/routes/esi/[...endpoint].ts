import { LoadFromESI } from "$lib/eve-data/EveData";
import { GetAccessToken, RefreshToken } from "$lib/eve-sso/Tokens";
import type { RequestHandler } from "@sveltejs/kit";


export const get: RequestHandler = async ({query, locals, params}) => {
    let characterId = parseInt(query.get("char"));


    let body;
    while(!body) {
        try {
            body = await LoadFromESI(`/${params.endpoint}?${query.toString()}`, {characterId});
        } catch(response) {
            if(response.status == 403) {
                // try refreshing the token
                try {
                    await RefreshToken(locals.userId, characterId);
                    continue;
                } catch(error) {
                    console.log(error);
                    break;
                }
            }
    
            console.error(response);
            break;
        }
    }
    
    return {
        body
    };
}