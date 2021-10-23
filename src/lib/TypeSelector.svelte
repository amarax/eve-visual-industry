<script lang="ts">
    import { Universe } from '$lib/EveData';

    import type { MarketGroup_Id, Type_Id, MarketGroup, Type, EntityCollection } from '$lib/EveData';
    
    let selectableMarketGroupIds: Set<MarketGroup_Id> = new Set();

    let groupTreeBranches:Array<EntityCollection<MarketGroup>> = [];
    let selectedGroupTreeBranches = [];

    let types: Array<Type> = [];
    let filteredTypes: Array<Type> = [];

    export let selectableTypes: Array<Type> = undefined;
    export let selectedTypeId:number = null;

    $: {
        if($Universe.types) {
            types = selectableTypes || Object.values($Universe.types);
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
            let filteredTypeIDs: Set<Type> = new Set();
            let selectableTypeIDs: Set<Type> = new Set(types);

            let group_ids = getChildGroupIds( $Universe.markets.groups[smallestSelectedBranch] );

            for(let market_group_id of group_ids) {
                filteredTypes = filteredTypes.concat( $Universe.markets.groups[market_group_id].types.map(type_id=>$Universe.types[type_id]) );

                $Universe.markets.groups[market_group_id].types.forEach( type_id=>{
                    if(selectableTypeIDs.has($Universe.types[type_id])) filteredTypeIDs.add($Universe.types[type_id])
                } );
            }

            filteredTypes = Array.from(filteredTypeIDs);
        } else {
            filteredTypes = types;
        }

        // Return first 1000 results for performance reasons
        filteredTypes.sort((a,b)=>a.name.localeCompare(b.name)).splice(1000);   
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

            console.log(selectableMarketGroupIds);

            if(groupTreeBranches.length==0 && $Universe.markets.groupTree) {
                groupTreeBranches[0] = $Universe.markets.groupTree;
                selectedGroupTreeBranches[0] = null;
            }
        }
    }

    console.log(groupTreeBranches);
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

                console.log(groupTreeBranches);

            }
        }}>
            {#each Object.values(marketGroup).filter(group=>selectableMarketGroupIds.has(group.market_group_id)) as {market_group_id, name} }
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
