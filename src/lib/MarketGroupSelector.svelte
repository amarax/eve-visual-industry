<script lang="ts">

import { DescendantGroups, EveMarketGroup, EveMarketGroupId, ProducableMarketGroups } from "$lib/eve-data/EveMarketGroups";


    let groupTreeBranches:Array<Array<EveMarketGroup>>;
    let selectedGroupTreeBranches = [null];

    function getChildren(groupId:EveMarketGroupId, groups:Map<EveMarketGroupId, EveMarketGroup>) {
        return [...groups.values()].filter(g=>g.parent_group_id === groupId)
    }

    let hasChildren: (groupId:EveMarketGroupId) => boolean;
    $: hasChildren = (groupId) => $DescendantGroups.get(groupId)?.size > 0;

    $: {
        groupTreeBranches = [ [...$ProducableMarketGroups.values()].filter(group=>group.parent_group_id == undefined) ]
        for(const selectedBranch of selectedGroupTreeBranches) {
            if(hasChildren(selectedBranch)) {
                groupTreeBranches = [...groupTreeBranches, getChildren(selectedBranch, $ProducableMarketGroups) ]
            }   
        }
    }

    export let value: EveMarketGroupId;

</script>

<p>
    {#each groupTreeBranches as marketGroup, i}
        <select name={i.toString()} bind:value={selectedGroupTreeBranches[i]} on:change={(event)=>{
            selectedGroupTreeBranches = selectedGroupTreeBranches.slice(0, i+1);
            if(hasChildren(parseInt(event.currentTarget.value))) {
                selectedGroupTreeBranches = [...selectedGroupTreeBranches, null];
            }
        }}>
            <option value={null}></option>
            {#each [...marketGroup] as {market_group_id, name} }
                <option value={market_group_id}>{name}</option>
            {/each}
        </select>
    {/each}
</p>