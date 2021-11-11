import CreateESIStore, { CreateESIStoreFromCache } from "./ESIStore";

import type { ESIStore } from "./ESIStore";
import type { Location_Id, Type_Id } from "./EveData";
import type { Quantity } from "./EveMarkets";
import { browser } from "$app/env";

import { base as basePath } from '$app/paths';


export type EveCharacterId = number;

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
    [index: EveCharacterId]: ESIStore<Character>
} = {}

export const CharacterSkills: {
    [index: EveCharacterId]: ESIStore<CharacterSkills>
} = {}

export const CharacterBlueprints: {
    [index: EveCharacterId]: ESIStore<CharacterBlueprints>
} = {}


export function GetCharacterInfo(id:EveCharacterId): ESIStore<Character> {
    if(!Characters[id]) {
        Characters[id] = CreateESIStore(`/characters/${id}/`);
        CharacterSkills[id] = CreateESIStoreFromCache(`/characters/${id}/skills/`);
        CharacterBlueprints[id] = CreateESIStoreFromCache(`/characters/${id}/blueprints/`);
    }

    return Characters[id];
}

