import type { RequestHandler } from "@sveltejs/kit";

import jwt from 'jsonwebtoken';
import type {JwtPayload} from 'jsonwebtoken'
import { StoreToken } from "$lib/eve-sso/Tokens";
import { base } from "$app/paths";

interface EveSSOJWT extends JwtPayload {
    name: string,
    owner: string
}

export const get: RequestHandler = async ({query, locals})=> {
    
    const code = query.get('code');
    if(code) {
        let headers = {
            'Authorization': `Basic ${
                Buffer.from(`${import.meta.env.VITE_EVE_APP_CLIENT_ID}:${import.meta.env.VITE_EVE_APP_SECRET_KEY}`, 'utf-8').toString('base64')
            }`,
            'Content-Type': "application/x-www-form-urlencoded",
            'Host': "login.eveonline.com"
        }
        
        let body = new URLSearchParams({
            'grant_type': "authorization_code",
            'code': code
        })

        const response = await fetch(
            "https://login.eveonline.com/v2/oauth/token",
            { method: 'POST', headers, body }
        );

        if(response.ok) {
            const token = await response.json();

            const accessToken = token['access_token'];
            const refreshToken = token['refresh_token']

            // TODO validate access token
            let {sub, name, owner} = jwt.decode(accessToken) as EveSSOJWT;
            let characterId = parseInt( sub.split(':')[2] );
            
            StoreToken(locals.userId, characterId, token);

            return {
                headers: {
                    Location: `${base}/`,

                },
                status: 302,
            }
        } else {
            console.error(response);
        }
    } else {
        
    }



    return {
        headers: {
            Location: `${base}/`,

        },
        status: 302,
        body: "This page should redirect you to index instead"
    }
}

