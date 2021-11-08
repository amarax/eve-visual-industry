import { derived, readable } from "svelte/store";
import { LoadFromSDE } from "./EveData";

import type { Readable } from "svelte/store";
import type { EveMarketGroupId } from "./EveMarketGroups";

type EveTypes = Map<EveTypeId, EveType>;

export type EveTypeId = number;
export type EveGroupId = number;

export type EveAttributeId = number;

export type EveType = {
    type_id: EveTypeId;
    name: string;

    group_id: EveGroupId;
    market_group_id: EveMarketGroupId;

    dogma_attributes?: Array<{
        attribute_id: EveAttributeId,
        value: number
    }>
}

let types: EveTypes = new Map<EveTypeId, EveType>()

let store = readable<EveTypes>(types, (set)=>{
    if(types.size === 0) {
        LoadFromSDE("types")
            .then((data: Array<{
                type_id,group_id,name,description,mass,packaged_volume,capacity,portion_size,raceID,basePrice,published,market_group_id,icon_id,soundID,graphic_id
            }>)=>{
                data = data.filter(d=>d.type_id);
                types = new Map(data.map(d=>[d.type_id,d]))
                
                set(types);
            })
    }
})
export default store;

type MarketGroupToTypesMap = Map<EveMarketGroupId, Array<EveTypeId>>;

let marketGroupToTypes: MarketGroupToTypesMap = new Map();

export const MarketGroupToTypes = derived<Readable<EveTypes>, MarketGroupToTypesMap>(store, ($types,set)=>{
    marketGroupToTypes.clear();

    $types.forEach((type,typeId)=>{
        if(!marketGroupToTypes.has(type.market_group_id)) {
            marketGroupToTypes.set(type.market_group_id, []);
        }
        marketGroupToTypes.get(type.market_group_id).push(typeId);
    })
    
    set(marketGroupToTypes);
})