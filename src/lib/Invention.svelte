<script lang="ts">
    import { Universe, loadType } from '$lib/EveData';
    import type { Type } from '$lib/EveData';
    import TypeSelector from '$lib/TypeSelector.svelte';

    let scienceSkills = [];
    let encryptionSkills = [];

    let selectedTypeId:number = null;
    let selectedType:Type = null;

    $: {
        if($Universe.markets && $Universe.types) {
            scienceSkills = $Universe.markets.groups[375].types.map(type_id=>$Universe.types[type_id]).sort((a,b)=>a.name.localeCompare(b.name));
            encryptionSkills = scienceSkills.filter(type=>type.name.indexOf("Encryption") >=0);
        }
    }

    $: {
        if(selectedTypeId)
            loadType(selectedTypeId).then((type:Type)=>{
                selectedType=type;
            });
    }
</script>

<TypeSelector bind:selectedTypeId />

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