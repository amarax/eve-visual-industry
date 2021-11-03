<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";

    import CharacterSelector from "$lib/CharacterSelector.svelte";
    import { Location_Id, Universe } from "$lib/EveData";
    import { Industry } from "$lib/EveIndustry";
    import ManufacturingActivity from "$lib/ManufacturingActivity.svelte";
    import TypeSelector from "$lib/TypeSelector.svelte";

    import { MANUFACTURING_ACTIVITY_ID } from '$lib/EveIndustry';

    import type { Type_Id, Type } from "$lib/EveData";
    import LocationSelector from "$lib/LocationSelector.svelte";

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

    let marketFilterLocation: Location_Id;
</script>

<svelte:head>
	<title>{($Universe?.types && $Universe?.types[selectedTypeId]) ? `${$Universe?.types[selectedTypeId]?.name} - ` : "" }EVE Online Visual Industry Calculator</title>
</svelte:head>


<CharacterSelector bind:value={selectedCharacterId} /><br/>
Filter market <LocationSelector allowUnselected bind:value={marketFilterLocation} />


<TypeSelector {selectedTypeId} on:change={event=>{goto(`breakdown/${event.detail}`, {keepfocus:true})}} {selectableTypes} />

<p/><ManufacturingActivity selectedProductId={selectedTypeId} {selectedCharacterId} {marketFilterLocation} />
    