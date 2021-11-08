<script lang="ts">

import type { EveMarketGroup, EveMarketGroupId } from "$lib/eve-data/EveMarketGroups";
import EveMarketGroups from "$lib/eve-data/EveMarketGroups";
import { derived } from "svelte/store";
import { GetProductionActivity, Industry, ProductToActivity } from "./eve-data/EveIndustry";
import EveTypes, { MarketGroupToTypes } from "./eve-data/EveTypes";



    function getChildGroupIds(groupId: EveMarketGroupId, marketGroups): Set<EveMarketGroupId> {
        let childGroups: Array<EveMarketGroupId> = [...marketGroups.keys()]
            .filter(id=>marketGroups.get(id).parent_group_id==groupId);

        let grandChildGroups = [];
        for(const id of childGroups) {
            grandChildGroups = [...grandChildGroups, ...getChildGroupIds(id, marketGroups)];
        }

        return new Set([...childGroups, ...grandChildGroups]);
    }
    let descendantGroups = derived(EveMarketGroups, $EveMarketGroups=>{
        let map: Map<EveMarketGroupId, Set<EveMarketGroupId>> = new Map();
        for(const [groupId, group] of $EveMarketGroups) {
            map.set(groupId, getChildGroupIds(groupId, $EveMarketGroups))
        }
        return map;
    })

    let selectableMarketGroupIds = derived([EveMarketGroups, descendantGroups],
        ([$EveMarketGroups, $descendantGroups])=>{
            let map = new Map<EveMarketGroupId, EveMarketGroup>();
            for(const [groupId, group] of $EveMarketGroups) {
                let proudcibleTypes = [];

                $descendantGroups.get(groupId).forEach(groupId=>{
                    
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

    let groupTreeBranches:Array<Array<EveMarketGroup>>;
    let selectedGroupTreeBranches = [null];

    $: {
        groupTreeBranches = [ [...$selectableMarketGroupIds.values()].filter(group=>group.parent_group_id == undefined) ]
        for(const selectedBranch of selectedGroupTreeBranches) {
            if(selectedBranch !== null && $descendantGroups.has(selectedBranch)) {
                groupTreeBranches = [...groupTreeBranches, [...$selectableMarketGroupIds.values()].filter(group=>group.parent_group_id == selectedBranch) ]
            }   
        }
    }

    export let value: EveMarketGroupId;

</script>

<p>
    {#each groupTreeBranches as marketGroup, i}
        <select name={i.toString()} bind:value={selectedGroupTreeBranches[i]} on:change={(event)=>{
            if($descendantGroups.has(parseInt(event.currentTarget.value))) {
                selectedGroupTreeBranches = [...selectedGroupTreeBranches.slice(0, i+1), null];
            }
        }}>
            <option value={null}></option>
            {#each [...marketGroup] as {market_group_id, name} }
                <option value={market_group_id}>{name}</option>
            {/each}
        </select>
    {/each}
</p>