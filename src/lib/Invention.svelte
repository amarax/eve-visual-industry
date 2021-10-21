<script lang="ts">
    import { Universe } from '$lib/EveData';

    import type { MarketGroup } from '$lib/EveData';
    
    let groupTreeBranches:Array<MarketGroup> = [];
    let selectedGroupTreeBranches = [];

    let types = [];

    let scienceSkills = [];
    let encryptionSkills = [];

    $: {
        if($Universe.types && groupTreeBranches[groupTreeBranches.length-1].types) {
            types = Object.keys($Universe.types).map(type_id=>$Universe.types[type_id]);
            
        }
    }

    $: {
        if($Universe.markets && $Universe.types) {
            scienceSkills = $Universe.markets.groups[375].types.map(type_id=>$Universe.types[type_id]).sort((a,b)=>a.name.localeCompare(b.name));
            encryptionSkills = scienceSkills.filter(type=>type.name.indexOf("Encryption") >=0);

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

            if(selectedMarketGroup.types) {
                types = selectedMarketGroup.types.map(type_id=>$Universe.types[type_id]);
            }

            console.log(selectedGroupTreeBranches);
        }}>
            {#each Object.values(marketGroup) as {market_group_id, name} }
                <option value={market_group_id}>{name}</option>
            {/each}
        </select>
    {/each}
    <br />
    <select>
        {#each types as {type_id,name} }
            <option value={type_id}>{name}</option>
        {/each}
    </select>
</p>


<label>
    <select>
        {#each scienceSkills as {id,name} }
            <option value={id}>{name}</option>
        {/each}
    </select>
    <input type="range" min={0} max={5} />
</label>
<br />
<label>
    <select>
        {#each scienceSkills as {id,name} }
            <option value={id}>{name}</option>
        {/each}
    </select>
    <input type="range" min={0} max={5} />
</label>
<br />
<label>
    <select>
        {#each encryptionSkills as {id,name} }
            <option value={id}>{name}</option>
        {/each}
    </select>
    <input type="range" min={0} max={5} />
</label>