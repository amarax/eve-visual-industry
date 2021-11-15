import cookie from 'cookie';

type UserId = string;

type EveUserHash = string;
type EveCharacterId = number;
type ESIToken = {
    access_token: string,
    refresh_token: string,
};

const UserCharacters = new Map<UserId, Array<EveCharacterId>>();
const CharacterTokens = new Map<EveCharacterId, ESIToken>();

export function StoreToken(userId, characterId, token) {
    UserCharacters.set(userId, [...(UserCharacters.get(userId) || []), characterId]);
    CharacterTokens.set(characterId, token);

    console.log("Stored token",characterId);
}

export function GetAccessToken(characterId) {
    return CharacterTokens.get(characterId)?.access_token;
}

export function GetCharacters(userId) {
    return UserCharacters.get(userId);
}

export function ClearTokensFor(userId) {
    // Todo should revoke the tokens
    UserCharacters.get(userId).forEach(characterId=>{
        CharacterTokens.delete(characterId)
    })

    UserCharacters.delete(userId);
}

const tokenRefreshRequests: Array<{
        userId: UserId, 
        characterId: EveCharacterId,
        promise: Promise<void>
    }> = [];

async function _refreshToken(userId, characterId) {

    console.log("Refreshing token", characterId);
    let headers = {
        'Authorization': `Basic ${
            Buffer.from(`${import.meta.env.VITE_EVE_APP_CLIENT_ID}:${import.meta.env.VITE_EVE_APP_SECRET_KEY}`, 'utf-8').toString('base64')
        }`,
        'Content-Type': "application/x-www-form-urlencoded",
        'Host': "login.eveonline.com"
    }

    let {refresh_token} = CharacterTokens.get(characterId)    
    let body = new URLSearchParams({
        'grant_type': "refresh_token",
        refresh_token,
        // scopes
    })    

    let response = await fetch(
        "https://login.eveonline.com/v2/oauth/token",
        { method: 'POST', headers, body }
    )

    if(response.ok) {
        const token = await response.json();

        CharacterTokens.set(characterId, token);

        console.log("Token refreshed", characterId);
    } else {
        console.error(response);
        throw response;
    }
}

export async function RefreshToken(userId: UserId, characterId: EveCharacterId) {
    console.log("request token refresh")

    let existingRequest = tokenRefreshRequests.find(req=>req.userId===userId && req.characterId===characterId);
    if(existingRequest) {
        await existingRequest.promise;
        return;
    }

    let promise = _refreshToken(userId, characterId);
    let refreshRequest = {userId, characterId, promise};
    tokenRefreshRequests.push(refreshRequest);
    await promise;
    tokenRefreshRequests.splice( tokenRefreshRequests.indexOf(refreshRequest), 1 );
}