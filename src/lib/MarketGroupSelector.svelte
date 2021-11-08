<script lang="ts">

import { DescendantGroups, EveMarketGroup, EveMarketGroupId, ProducableMarketGroups } from "$lib/eve-data/EveMarketGroups";


    let groupTreeBranches:Array<Array<EveMarketGroup>>;
    let selectedGroupTreeBranches = [null];

    function getChildren(groupId:EveMarketGroupId, groups:Map<EveMarketGroupId, EveMarketGroup>) {
        return [...groups.values()].filter(g=>g.parent_group_id === groupId)
    }

    let hasChildren: (groupId:EveMarketGroupId) => boolean;
    $: hasChildren = (groupId) => $DescendantGroups.get(groupId)?.size > 0;

    export let value: EveMarketGroupId;

    $: {
        let branches = [];

        let branch = $ProducableMarketGroups.get(value);
        while(branch) {
            branches = [branch.market_group_id, ...branches];
            branch = $ProducableMarketGroups.get( branch.parent_group_id );
        }
        selectedGroupTreeBranches = branches;
    }

    $: {
        groupTreeBranches = [ [...$ProducableMarketGroups.values()].filter(group=>group.parent_group_id == undefined) ]
        for(const selectedBranch of selectedGroupTreeBranches) {
            if(hasChildren(selectedBranch)) {
                groupTreeBranches = [...groupTreeBranches, getChildren(selectedBranch, $ProducableMarketGroups) ]
            }   
        }
    }

</script>

{#each groupTreeBranches as marketGroup, i}
    <select name={i.toString()} value={selectedGroupTreeBranches[i]} on:change={(event)=>{
        if(event.currentTarget.value !== 'null')
            value = parseInt(event.currentTarget.value)
        else {
            value = selectedGroupTreeBranches[i-1] ?? null;
        }
    }}>
        <option value={null}></option>
        {#each [...marketGroup] as {market_group_id, name} }
            <option value={market_group_id}>{name}</option>
        {/each}
    </select>
{/each}
