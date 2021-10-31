<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";

    import CharacterSelector from "$lib/CharacterSelector.svelte";
    import { Universe } from "$lib/EveData";
    import { Industry } from "$lib/EveIndustry";
    import ManufacturingActivity from "$lib/ManufacturingActivity.svelte";
    import TypeSelector from "$lib/TypeSelector.svelte";

    import { INVENTION_ACTIVITY_ID, REVERSE_ENGINEERING_ACTIVITY_ID, MANUFACTURING_ACTIVITY_ID } from '$lib/EveIndustry';

    import type { Type_Id, Type } from "$lib/EveData";

    let selectedCharacterId;

    $: selectedTypeId = parseInt( $page.params['type'] ) || null;


    // Only pick types that can be manufactured
    let selectableTypes: Array<Type> = null;

    $: if($Industry.types && $Universe.types) {
        function getManufacturedProducts(blueprint_id:Type_Id|string): Array<Type_Id> {
            return Object.keys( $Industry.types[blueprint_id].activities[MANUFACTURING_ACTIVITY_ID]?.products ?? {} ).map(id=>parseInt(id));
        }

        let selectableTypeIDs = [];

        Object.values($Industry.types).forEach(t=>{
            selectableTypeIDs = [...selectableTypeIDs, ...getManufacturedProducts(t.type_id)]
        })

        selectableTypes = selectableTypeIDs.filter(id=>$Universe.types[id]!==undefined).map(id=>$Universe.types[id]);
    }

</script>


<CharacterSelector bind:value={selectedCharacterId} />

<TypeSelector {selectedTypeId} on:change={event=>{goto(`/breakdown/${event.detail}`, {keepfocus:true})}} {selectableTypes} />

<p/><ManufacturingActivity selectedProductId={selectedTypeId} {selectedCharacterId} />
    