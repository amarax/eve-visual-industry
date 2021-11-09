import type { IncomingRequest } from "@sveltejs/kit";

export async function get(request: IncomingRequest ) {
    const code = request.query.get('code');
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

        const response = await fetch("https://login.eveonline.com/v2/oauth/token",
            {
                method: 'POST',
                headers,
                body,
            }
        );

        if(response.ok) {
            const access = await response.json();

            return {
                body: access,
            }
        } else {
            console.error(response);
        }
    }



    return {
        body: "Verifying with EVE SSO..."
    }
}