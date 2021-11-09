

export async function get({params}) {
    console.log("params", params)

    if(params['code']) {
        let body = new URLSearchParams({
            'grant_type': "authorization_code",
            'code': params['code']
        })
    
        console.log("body", body.toString())
    
        const response = await fetch("https://login.eveonline.com/v2/oauth/token",
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${
                        Buffer.from(`${import.meta.env.VITE_EVE_APP_CLIENT_ID}:${import.meta.env.VITE_EVE_APP_SECRET_KEY}`,'base64url').toString()
                    }`,
                    'Content-Type': "application/x-www-form-urlencoded",
                    'Host': "login.eveonline.com"
                },
                body,
            }
        );

        if(response.ok) {
            const access = await response.json();
            console.log(access);
        } else {
            console.error(response.status, response.statusText, response);
        }
    }



    return {
        body: "This is a test response."
    }
}