<script lang="ts">
    import { Universe, Industry, loadType, RAMActivity, EntityCollection } from "$lib/EveData";
    import { INVENTION_ACTIVITY_ID, REVERSE_ENGINEERING_ACTIVITY_ID, MANUFACTURING_ACTIVITY_ID } from '$lib/EveData';
    import type { Type, IndustryType, Type_Id } from '$lib/EveData';

    import TypeSelector from '$lib/TypeSelector.svelte';
    import ManufacturingActivity from "./ManufacturingActivity.svelte";

    let scienceSkills = [];
    let encryptionSkills = [];

    let selectedTypeId:number = null;
    let selectedType:Type = null;

    let selectableTypes: Array<Type> = null;

    $: if($Universe.types && $Industry.types) {
        let selectableTypeIDs = [];

        Object.values($Industry.types).forEach(t=>{
            if(t.activities[INVENTION_ACTIVITY_ID]) {
                for(let blueprint_id in t.activities[INVENTION_ACTIVITY_ID].products) {
                    selectableTypeIDs.push(...Object.keys( $Industry.types[blueprint_id].activities[MANUFACTURING_ACTIVITY_ID].products ));
                }
            }

            if(t.activities[REVERSE_ENGINEERING_ACTIVITY_ID]) {
                for(let blueprint_id in Object.keys(t.activities[REVERSE_ENGINEERING_ACTIVITY_ID].products)) {
                    selectableTypeIDs.push(...Object.keys( $Industry.types[blueprint_id].activities[MANUFACTURING_ACTIVITY_ID].products ));
                }
            }
        })

        let missingTypes = selectableTypeIDs.filter(id=>$Universe.types[id]===undefined);

        selectableTypes = selectableTypeIDs.filter(id=>$Universe.types[id]!==undefined).map(id=>$Universe.types[id]);

        console.log("Recalculated selectable types");
    }

    console.log($Industry);

    let selectedBlueprint:IndustryType;

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
        selectedBlueprint = Object.values($Industry.types)
            .find(type=>type.activities[MANUFACTURING_ACTIVITY_ID]&&type.activities[MANUFACTURING_ACTIVITY_ID].products[selectedTypeId]);
    }
</script>

{#if !INVENTION_ACTIVITY_ID === null}
    Loading...
{/if}

<TypeSelector bind:selectedTypeId {selectableTypes} />

<p><ManufacturingActivity blueprint={selectedBlueprint} /></p>


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