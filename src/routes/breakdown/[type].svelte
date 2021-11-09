<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";

    import { Universe } from "$lib/eve-data/EveData";
    import { Industry, ProductToActivity, REACTION_ACTIVITY_ID } from "$lib/eve-data/EveIndustry";
    import { MANUFACTURING_ACTIVITY_ID } from "$lib/eve-data/EveIndustry";

    import type { Type_Id, Type } from "$lib/eve-data/EveData";

    import TypeSelector from "$lib/TypeSelector.svelte";
    import ManufacturingActivity from "$lib/ManufacturingActivity.svelte";
    import ReactionActivity from "$lib/ReactionActivity.svelte";
    

    $: selectedProductId = parseInt( $page.params['type'] ) || null;


    // Only pick types that can be manufactured
    let selectableTypes: Array<Type> = null;

    $: if($Industry.types && $Universe.types) {
        function getManufacturedProducts(blueprint_id:Type_Id|string): Array<Type_Id> {
            return Object.keys( $Industry.types[blueprint_id].activities[REACTION_ACTIVITY_ID]?.products ?? $Industry.types[blueprint_id].activities[MANUFACTURING_ACTIVITY_ID]?.products ?? {} )
                .map(id=>parseInt(id));
        }

        let selectableTypeIDs = [];

        Object.values($Industry.types).forEach(t=>{
            selectableTypeIDs = [...selectableTypeIDs, ...getManufacturedProducts(t.type_id)]
        })

        selectableTypes = selectableTypeIDs.filter(id=>$Universe.types[id]!==undefined).map(id=>$Universe.types[id]);
    }

    $: selectedActivityId = $ProductToActivity.get(selectedProductId)?.activity.activity.activityID;
</script>


<svelte:head>
	<title>{($Universe?.types && $Universe?.types[selectedProductId]) ? `${$Universe?.types[selectedProductId]?.name} - ` : "" }EVE Online Visual Industry Calculator</title>
</svelte:head>


<TypeSelector selectedTypeId={selectedProductId} on:change={event=>{goto(`${event.detail}`, {keepfocus:true})}} {selectableTypes} />


<p/>

{#if selectedActivityId === REACTION_ACTIVITY_ID}
<ReactionActivity productTypeId={selectedProductId} />
{:else if selectedActivityId === MANUFACTURING_ACTIVITY_ID}
<ManufacturingActivity {selectedProductId} />
{/if}
    