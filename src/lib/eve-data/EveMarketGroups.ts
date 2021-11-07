import { readable } from "svelte/store";
import { LoadFromSDE } from "$lib/eve-data/EveData";
import type { Type_Id } from "$lib/eve-data/EveData";

let marketGroups = null;

export type EveMarketGroupId = number;

export type EveMarketGroup = {
    market_group_id: EveMarketGroupId,
    parent_group_id: EveMarketGroupId,
    name: string,
    description: string,
    icon_id: number,
    hasTypes: boolean
}

export default readable<{[index:EveMarketGroupId]:EveMarketGroup}>(marketGroups, (set)=>{
    if(marketGroups == null) {
        LoadFromSDE("invMarketGroups")
            .then((data:Array<EveMarketGroup>)=>{
                marketGroups = {};
                for(let group of data) {
                    marketGroups[group.market_group_id] = group;
                }
                set(marketGroups);
            })
            .catch(error=>console.error(error));
    }
})

