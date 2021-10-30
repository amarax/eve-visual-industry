import CreateESIStore, { CreateESIStoreFromCache } from "./ESIStore";

import type { ESIStore } from "./ESIStore";


export type Character_Id = number;

type Character = {
    name: string,
}

type CharacterSkills = Array<{}>

export const Characters: {
    [index: Character_Id]: ESIStore<Character>
} = {}

export const CharacterSkills: {
    [index: Character_Id]: ESIStore<CharacterSkills>
} = {}

export async function LoadAuthorisedCharacters() {
    let authorisedCharacterIds: Array<Character_Id> = await (await fetch("/esi-cache/authorisedCharacters.json")).json();

    for(let character_id of authorisedCharacterIds) {
        Characters[character_id] = CreateESIStore(`/characters/${character_id}/`);
        CharacterSkills[character_id] = CreateESIStoreFromCache(`/characters/${character_id}/skills/`);
    }
}

