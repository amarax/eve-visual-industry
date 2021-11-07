<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";

    import CharacterSelector from "$lib/CharacterSelector.svelte";
    import { GetLocationStore, Location_Id, Universe } from "$lib/eve-data/EveData";
    import { Industry } from "$lib/eve-data/EveIndustry";
    import ManufacturingActivity from "$lib/ManufacturingActivity.svelte";
    import TypeSelector from "$lib/TypeSelector.svelte";

    import { MANUFACTURING_ACTIVITY_ID } from "$lib/eve-data/EveIndustry";

    import type { Type_Id, Type } from "$lib/eve-data/EveData";
    import LocationSelector from "$lib/LocationSelector.svelte";

    import { getContext, onDestroy, onMount, setContext } from "svelte";
    import { CharacterBlueprints, Character_Id } from "$lib/eve-data/EveCharacter";
    import { Unsubscriber, writable } from "svelte/store";

    

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


<svelte:head>
	<title>{($Universe?.types && $Universe?.types[selectedTypeId]) ? `${$Universe?.types[selectedTypeId]?.name} - ` : "" }EVE Online Visual Industry Calculator</title>
</svelte:head>


<TypeSelector {selectedTypeId} on:change={event=>{goto(`${event.detail}`, {keepfocus:true})}} {selectableTypes} />

<p/><ManufacturingActivity selectedProductId={selectedTypeId} />
    