<script lang="ts">
    import { Universe, loadType } from "$lib/EveData";
    import { Industry, GetBlueprintToManufacture } from "$lib/EveIndustry";

    import { INVENTION_ACTIVITY_ID, REVERSE_ENGINEERING_ACTIVITY_ID, MANUFACTURING_ACTIVITY_ID } from '$lib/EveIndustry';
    import type { Type, Type_Id } from '$lib/EveData';
    import type { IndustryType } from '$lib/EveIndustry';

    import TypeSelector from '$lib/TypeSelector.svelte';
    import ManufacturingActivity from "./ManufacturingActivity.svelte";
import { page } from "$app/stores";
import { goto } from "$app/navigation";

    $: selectedTypeId = parseInt( $page.params['type'] ) || null;
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

            if(t.activities[MANUFACTURING_ACTIVITY_ID]) {
                selectableTypeIDs.push(...Object.keys( $Industry.types[t.type_id].activities[MANUFACTURING_ACTIVITY_ID].products ));            
            }
        })

        let missingTypes = selectableTypeIDs.filter(id=>$Universe.types[id]===undefined);

        selectableTypes = selectableTypeIDs.filter(id=>$Universe.types[id]!==undefined).map(id=>$Universe.types[id]);

        console.log("Recalculated selectable types");
    }

    console.log($Industry);

    $: {
        if(selectedTypeId)
            loadType(selectedTypeId).then((type:Type)=>{
                selectedType=type;
            });
    }

    $: selectedBlueprint = GetBlueprintToManufacture($Industry, selectedTypeId);

    export let selectedCharacterId;
</script>

{#if !INVENTION_ACTIVITY_ID === null}
    Loading...
{/if}

<TypeSelector {selectedTypeId} on:change={event=>{goto(`/breakdown/${event.detail}`, {keepfocus:true})}} {selectableTypes} />

<p><ManufacturingActivity selectedProductId={selectedTypeId} {selectedCharacterId} /></p>


