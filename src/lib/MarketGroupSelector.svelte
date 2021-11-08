<script lang="ts">

import type { EveMarketGroup, EveMarketGroupId } from "$lib/eve-data/EveMarketGroups";
import EveMarketGroups from "$lib/eve-data/EveMarketGroups";
import { GetProductionActivity, Industry, ProductToActivity } from "./eve-data/EveIndustry";
import EveTypes, { MarketGroupToTypes } from "./eve-data/EveTypes";



    function getChildGroupIds(groupId: EveMarketGroupId): Set<EveMarketGroupId> {
        let childGroups: Array<EveMarketGroupId> = [...$EveMarketGroups.keys()]
            .filter(id=>$EveMarketGroups.get(id).parent_group_id==groupId);

        let grandChildGroups = [];
        for(const id of childGroups) {
            grandChildGroups = [...grandChildGroups, ...getChildGroupIds(id)];
        }

        return new Set([...childGroups, ...grandChildGroups]);
    }

    function hasChildGroups(groupId: EveMarketGroupId): boolean {
        return [...$EveMarketGroups.keys()]
            .filter(id=>$EveMarketGroups.get(id).parent_group_id==groupId)
            .length > 0;
    }

    let selectableMarketGroupIds = new Map<EveMarketGroupId, EveMarketGroup>();
    $: {
        for(const [groupId, group] of $EveMarketGroups) {
            let proudcibleTypes = $MarketGroupToTypes.get(groupId)
                ?.filter(id=>$ProductToActivity.has(id))

            if(proudcibleTypes?.length > 0) {
                selectableMarketGroupIds.set(groupId, group);
            }
        }
    }

    let groupTreeBranches:Array<Array<EveMarketGroup>> = [];
    let selectedGroupTreeBranches = [null];

    export let value: EveMarketGroupId;

</script>

<p>
    {#each groupTreeBranches as marketGroup, i}
        <select name={i.toString()} bind:value={selectedGroupTreeBranches[i]} on:change={(event)=>{
            let selectedMarketGroup = marketGroup[event.currentTarget.value];
            if(hasChildGroups(selectedMarketGroup)) {
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