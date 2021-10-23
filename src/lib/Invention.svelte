<script lang="ts">
    import { Universe, Industry, loadType, RAMActivity, EntityCollection } from '$lib/EveData';
    import type { Type, IndustryType, Type_Id } from '$lib/EveData';
    import TypeSelector from '$lib/TypeSelector.svelte';

    let scienceSkills = [];
    let encryptionSkills = [];

    let selectedTypeId:number = null;
    let selectedType:Type = null;

    let selectableTypes: Array<Type> = null;

    function getActivity(activityName:string, activities:EntityCollection<RAMActivity>): number {
        return parseInt( Object.keys(activities).find(activityID=>activities[activityID].activityName==activityName) );
    }

    let INVENTION_ACTIVITY_ID = null;
    $: INVENTION_ACTIVITY_ID = getActivity('Invention', $Industry.activities);

    let REVERSE_ENGINEERING_ACTIVITY_ID = null;
    $: REVERSE_ENGINEERING_ACTIVITY_ID = getActivity("Reverse Engineering", $Industry.activities);

    let MANUFACTURING_ACTIVITY_ID = null;
    $: MANUFACTURING_ACTIVITY_ID = getActivity("Manufacturing", $Industry.activities);


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
        selectedIndustryType = Object.values($Industry.types).map(type=>type.activities[MANUFACTURING_ACTIVITY_ID]).find(manufacturing=>manufacturing&&manufacturing.products[selectedTypeId]);

        selectedIndustryType && console.log(selectedIndustryType);
    }
</script>

{#if !INVENTION_ACTIVITY_ID === null}
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