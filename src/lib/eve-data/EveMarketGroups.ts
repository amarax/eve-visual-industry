import { readable } from "svelte/store";
import { LoadFromSDE } from "$lib/eve-data/EveData";

let marketGroups = new Map<EveMarketGroupId, EveMarketGroup>();

export type EveMarketGroupId = number;

export type EveMarketGroup = {
    market_group_id: EveMarketGroupId,
    parent_group_id: EveMarketGroupId,
    name: string,
    description: string,
    icon_id: number,
    hasTypes: boolean
}

export default readable<Map<EveMarketGroupId, EveMarketGroup>>(marketGroups, (set)=>{
    if(marketGroups.size === 0) {
        LoadFromSDE("invMarketGroups")
            .then((data:Array<EveMarketGroup>)=>{
                marketGroups.clear();
                for(let group of data) {
                    marketGroups.set(group.market_group_id, group);
                }
                set(marketGroups);
            })
            .catch(error=>console.error(error));
    }
})

