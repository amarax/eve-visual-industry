<script lang="ts">
    import { Universe, Industry, loadType, IndustryType } from '$lib/EveData';
    import type { Type } from '$lib/EveData';
    import TypeSelector from '$lib/TypeSelector.svelte';

    let scienceSkills = [];
    let encryptionSkills = [];

    let selectedTypeId:number = null;
    let selectedType:Type = null;

    let selectableTypes: Array<Type> = null;

    let INVENTION_ACTIVITY_ID = null;
    $: INVENTION_ACTIVITY_ID = Object.keys($Industry.activities).find(activityID=>$Industry.activities[activityID].activityName=="Invention");

    let REVERSE_ENGINEERING_ACTIVITY_ID = null;
    $: REVERSE_ENGINEERING_ACTIVITY_ID = Object.keys($Industry.activities).find(activityID=>$Industry.activities[activityID].activityName=="Reverse Engineering");

    $: if($Universe.types && $Industry.types) {
        selectableTypes = [];

        Object.values($Industry.types).forEach(t=>{
            if(t.activities[INVENTION_ACTIVITY_ID]) {
                selectableTypes.push(...Object.keys(t.activities[INVENTION_ACTIVITY_ID].products))
            }

            if(t.activities[REVERSE_ENGINEERING_ACTIVITY_ID]) {
                selectableTypes.push(...Object.keys(t.activities[REVERSE_ENGINEERING_ACTIVITY_ID].products))
            }
        })

        selectableTypes = selectableTypes.map(id=>$Universe.types[id]);
        console.log("Recalculated selectable types");
    }

    console.log($Industry);

    let selectedIndustryType:IndustryType;

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

    $: {
        selectedIndustryType = $Industry.types[selectedTypeId];

        selectedIndustryType && console.log(selectedIndustryType);
    }
</script>

{#if !INVENTION_ACTIVITY_ID}
    Loading...
{/if}

<TypeSelector bind:selectedTypeId {selectableTypes} />

{#if selectedIndustryType}
<dl>
    {#each Object.entries(selectedIndustryType) as property }
        <dt>{property[0]}</dt>
        <dd>{property[1] instanceof Object?Object.entries(property[1]):property[1]}</dd>
    {/each}
</dl>
{/if}

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