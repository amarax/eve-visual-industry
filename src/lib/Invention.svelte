<script lang="ts">
    import { Universe } from '$lib/EveData';

    let scienceSkills = [];
    $: {
        scienceSkills = $Universe.markets.groups[375].types.map(type_id=>$Universe.types[type_id]).sort((a,b)=>a.name.localeCompare(b.name));
    }
</script>


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
    Science skill 2
    <input type="range" min={0} max={5} />
</label>
<br />
<label>
    Racial encryption skill
    <input type="range" min={0} max={5} />
</label>