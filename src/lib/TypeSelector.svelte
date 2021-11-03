<script lang="ts">
    import { Universe } from '$lib/eve-data/EveData';

    import type { MarketGroup_Id, Type_Id, MarketGroup, Type, EntityCollection } from '$lib/eve-data/EveData';
import { createEventDispatcher } from 'svelte';
    
    let selectableMarketGroupIds: Set<MarketGroup_Id> = new Set();

    let groupTreeBranches:Array<EntityCollection<MarketGroup>> = [];
    let selectedGroupTreeBranches = [null];

    let types: Array<Type> = [];
    let filteredTypes: Array<Type> = [];

    export let selectableTypes: Array<Type> = undefined;
    export let selectedTypeId:number = null;

    const dispatch = createEventDispatcher();
    function onSelectionChange(event) {
        dispatch('change', parseInt(event.target.value));
    }

    $: {
        if($Universe.types) {
            types = selectableTypes || Object.values($Universe.types);
        }
    }

    function getChildGroupIds(group:MarketGroup) : Array<MarketGroup_Id> {
        if(group.child_groups === undefined) return [group.market_group_id];

        let childGroups = Object.keys(group.child_groups).map(id=>parseInt(id));

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
            let filteredTypeIDs: Set<Type_Id> = new Set();
            let selectableTypeIDs: Set<Type_Id> = new Set(types.map(type=>type.type_id));

            let group_ids = getChildGroupIds( $Universe.markets.groups[smallestSelectedBranch] );

            for(let market_group_id of group_ids) {
                $Universe.markets.groups[market_group_id].types.forEach( type_id=>{
                    if(selectableTypeIDs.has(type_id)) 
                        filteredTypeIDs.add(type_id)
                } );
            }

            filteredTypes = Array.from(filteredTypeIDs).map(id=>$Universe.types[id]);
        } else {
            filteredTypes = types;
        }

        // Return first 1000 results for performance reasons
        filteredTypes.sort((a,b)=>a.name.localeCompare(b.name));   
    }

    $: {
        if($Universe.markets && $Universe.types && $Universe.markets.groups) {
            let selectableTypeIDs: Set<Type_Id> = new Set(types.map(type=>type.type_id));

            selectableMarketGroupIds.clear();
            for(let group_id in $Universe.markets.groups) {
                let group = $Universe.markets.groups[group_id];

                for(let type_id of group.types) {
                    if(selectableTypeIDs.has(type_id)) {
                        let g = parseInt(group_id);
                        do {
                            selectableMarketGroupIds.add(g);
                            g = $Universe.markets.groups[g].parent_group_id;
                        } while(g !== undefined)
                    }
                }
            }
            selectableMarketGroupIds = selectableMarketGroupIds;
        }
    }

    $: {
        if($Universe.markets)
        {
            groupTreeBranches = [$Universe.markets.groupTree];
            for(let selectedBranch of selectedGroupTreeBranches) {
                if(selectedBranch != null && $Universe.markets.groups[selectedBranch].child_groups)
                    groupTreeBranches.push($Universe.markets.groups[selectedBranch].child_groups)
            }
        }
    }
</script>

<p>
    {#each groupTreeBranches as marketGroup, i}
        <select name={i.toString()} bind:value={selectedGroupTreeBranches[i]} on:change={(event)=>{
            let selectedMarketGroup = marketGroup[event.target.value];
            if(selectedMarketGroup.child_groups) {
                selectedGroupTreeBranches = [...selectedGroupTreeBranches.slice(0, i+1), null];
            }
        }}>
            {#each Object.values(marketGroup).filter(group=>selectableMarketGroupIds.has(group.market_group_id)) as {market_group_id, name} }
                <option value={market_group_id}>{name}</option>
            {/each}
        </select>
    {/each}
    <br />
    Item 
    <select value={selectedTypeId} on:change={onSelectionChange}>
        {#each filteredTypes as {type_id,name} }
            <option value={type_id}>{name}</option>
        {/each}
    </select>
</p>
