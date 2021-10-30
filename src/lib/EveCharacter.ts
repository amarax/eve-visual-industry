import CreateESIStore, { CreateESIStoreFromCache } from "./ESIStore";

import type { ESIStore } from "./ESIStore";
import type { Type_Id } from "./EveData";


export type Character_Id = number;

export type Character = {
    name: string,
}

export type CharacterSkills = {
    skills: Array<{
        active_skill_level: number,
        skill_id: Type_Id
        skillpoints_in_skill: number,
        trained_skill_level: number,
    }>,
    total_sp: number,
    unallocated_sp: number,
}

export const Characters: {
    [index: Character_Id]: ESIStore<Character>
} = {}

export const CharacterSkills: {
    [index: Character_Id]: ESIStore<CharacterSkills>
} = {}

export async function LoadAuthorisedCharacters() {
    try{
        let authorisedCharacterIds: Array<Character_Id> = await (await fetch("/esi-cache/authorisedCharacters.json")).json();

        for(let character_id of authorisedCharacterIds) {
            Characters[character_id] = CreateESIStore(`/characters/${character_id}/`);
            CharacterSkills[character_id] = CreateESIStoreFromCache(`/characters/${character_id}/skills/`);
        }
    }
    catch(error) {
        console.error(error);
    }
}

