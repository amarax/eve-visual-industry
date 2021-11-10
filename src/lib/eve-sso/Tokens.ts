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
    return CharacterTokens.get(characterId).access_token;
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