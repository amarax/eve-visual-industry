import { derived, readable } from "svelte/store";
import { LoadFromSDE } from "$lib/eve-data/EveData";
import { MarketGroupToTypes } from "./EveTypes";
import { ProductToActivity } from "./EveIndustry";

let marketGroups = new Map<EveMarketGroupId, EveMarketGroup>();

export type EveMarketGroupId = number;

export type EveMarketGroup = {
    market_group_id: EveMarketGroupId,
    parent_group_id?: EveMarketGroupId,
    name: string,
    description: string,
    icon_id: number,
    hasTypes: boolean
}

let store = readable<Map<EveMarketGroupId, EveMarketGroup>>(marketGroups, (set)=>{
    if(marketGroups.size === 0) {
        LoadFromSDE("invMarketGroups")
            .then((data:Array<{
                market_group_id,parent_group_id,name,description,icon_id,hasTypes
            }>)=>{
                marketGroups.clear();
                for(let group of data) {
                    if(group.parent_group_id == 'None')
                        delete group.parent_group_id;
                        
                    marketGroups.set(group.market_group_id, group);
                }
                set(marketGroups);
            })
            .catch(error=>console.error(error));
    }

});
export default store;


function getChildGroupIds(groupId: EveMarketGroupId, marketGroups): Set<EveMarketGroupId> {
    let childGroups: Array<EveMarketGroupId> = [...marketGroups.keys()]
        .filter(id=>marketGroups.get(id).parent_group_id==groupId);

    let grandChildGroups = [];
    for(const id of childGroups) {
        grandChildGroups = [...grandChildGroups, ...getChildGroupIds(id, marketGroups)];
    }

    return new Set([...childGroups, ...grandChildGroups]);
}
export const DescendantGroups = derived(store, $EveMarketGroups=>{
    let map: Map<EveMarketGroupId, Set<EveMarketGroupId>> = new Map();
    for(const [groupId, group] of $EveMarketGroups) {
        map.set(groupId, getChildGroupIds(groupId, $EveMarketGroups))
    }
    return map;
})

function getProducibleTypes(groupId: EveMarketGroupId, $DescendantGroups, $MarketGroupToTypes, $ProductToActivity) {
    let proudcibleTypes = [];

    [groupId, ...($DescendantGroups.get(groupId) ?? [])].forEach(groupId=>{
        
        proudcibleTypes = [...proudcibleTypes, 
            ...($MarketGroupToTypes.get(groupId)?.filter(id=>$ProductToActivity.has(id)) ?? [])
        ]
    })
}

export const ProducableMarketGroups = derived([store, DescendantGroups, MarketGroupToTypes, ProductToActivity],
    ([$EveMarketGroups, $DescendantGroups, $MarketGroupToTypes, $ProductToActivity])=>{
        let map = new Map<EveMarketGroupId, EveMarketGroup>();
        for(const [groupId, group] of $EveMarketGroups) {
            let proudcibleTypes = [];

            [groupId, ...($DescendantGroups.get(groupId) ?? [])].forEach(groupId=>{
                
                proudcibleTypes = [...proudcibleTypes, 
                    ...($MarketGroupToTypes.get(groupId)?.filter(id=>$ProductToActivity.has(id)) ?? [])
                ]
            })

            if(proudcibleTypes?.length > 0) {
                map.set(groupId, group);
            }
        }
        return map;
    }
)