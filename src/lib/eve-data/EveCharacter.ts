import CreateESIStore, { CreateESIStoreFromCache } from "./ESIStore";

import type { ESIStore } from "./ESIStore";
import type { Location_Id, Type_Id } from "./EveData";
import type { Quantity } from "./EveMarkets";
import { browser } from "$app/env";

import { base as basePath } from '$app/paths';


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

export type CharacterBlueprints = Array<{
    item_id: number,
    location_flag: "Hangar",
    location_id: Location_Id,
    material_efficiency: number,
    quantity: Quantity,
    runs: number,
    time_efficiency: number,
    type_id: Type_Id
}>

export const Characters: {
    [index: Character_Id]: ESIStore<Character>
} = {}

export const CharacterSkills: {
    [index: Character_Id]: ESIStore<CharacterSkills>
} = {}

export const CharacterBlueprints: {
    [index: Character_Id]: ESIStore<CharacterBlueprints>
} = {}

export async function LoadAuthorisedCharacters() {
    if(!browser) return;

    try{
        let authorisedCharacterIds: Array<Character_Id> = await (await fetch(`${basePath}/esi-cache/authorisedCharacters.json`)).json();

        for(let character_id of authorisedCharacterIds) {
            Characters[character_id] = CreateESIStore(`/characters/${character_id}/`);
            CharacterSkills[character_id] = CreateESIStoreFromCache(`/characters/${character_id}/skills/`);
            CharacterBlueprints[character_id] = CreateESIStoreFromCache(`/characters/${character_id}/blueprints/`);
            
        }
    }
    catch(error) {
        console.error(error);
    }
}

export function GetCharacterInfo(id:Character_Id): ESIStore<Character> {
    if(!Characters[id]) {
        Characters[id] = CreateESIStore(`/characters/${id}/`);
    }

    return Characters[id];
}