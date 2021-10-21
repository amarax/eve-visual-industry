<script lang="ts">
    import { Universe } from '$lib/EveData';

    import type { MarketGroup, Type } from '$lib/EveData';
    
    let groupTreeBranches:Array<MarketGroup> = [];
    let selectedGroupTreeBranches = [];

    let types:Array<Type> = [];
    let filteredTypes:Array<Type> = [];

    export let selectedTypeId:number = null;

    $: {
        if($Universe.types) {
            types = Object.keys($Universe.types).map(type_id=>$Universe.types[type_id]);
        }
    }

    function getChildGroupIds(group:MarketGroup) : Array<string> {
        if(group.child_groups === undefined) return [];

        let childGroups = Object.keys(group.child_groups);

        for(let childGroupId in group.child_groups) {
            childGroups = childGroups.concat( getChildGroupIds(group.child_groups[childGroupId]) )
        }

        return childGroups;
    }

    $: {
        let smallestSelectedBranch = selectedGroupTreeBranches[selectedGroupTreeBranches.length-1] || selectedGroupTreeBranches[selectedGroupTreeBranches.length-2];
        
        if(smallestSelectedBranch) {
            // Find all sub types under the branch
            filteredTypes = [];

            let group_ids = getChildGroupIds( $Universe.markets.groups[smallestSelectedBranch] );

            for(let market_group_id of group_ids) {
                filteredTypes = filteredTypes.concat( $Universe.markets.groups[market_group_id].types.map(type_id=>$Universe.types[type_id]) );
            }
        } else {
            filteredTypes = types.filter(()=>true);
        }

        filteredTypes.sort((a,b)=>a.name.localeCompare(b.name));
    }

    $: {
        if($Universe.markets && $Universe.types) {
            if(groupTreeBranches.length==0 && $Universe.markets.groupTree) {
                groupTreeBranches[0] = $Universe.markets.groupTree;
                selectedGroupTreeBranches[0] = null;
            }
        }
    }
</script>

<p>
    Item to invent
    {#each groupTreeBranches as marketGroup, i}
        <select name={i.toString()} bind:value={selectedGroupTreeBranches[i]} on:change={(event)=>{
            let selectedMarketGroup = marketGroup[event.target.value];
            if(selectedMarketGroup.child_groups) {
                groupTreeBranches = groupTreeBranches.slice(0, i+1);
                groupTreeBranches.push(selectedMarketGroup.child_groups);
                
                selectedGroupTreeBranches = selectedGroupTreeBranches.slice(0, i+1);
                selectedGroupTreeBranches.push(null);
            }
        }}>
            {#each Object.values(marketGroup) as {market_group_id, name} }
                <option value={market_group_id}>{name}</option>
            {/each}
        </select>
    {/each}
    <br />
    <select bind:value={selectedTypeId}>
        {#each filteredTypes as {type_id,name} }
            <option value={type_id}>{name}</option>
        {/each}
    </select>
</p>
