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
    import { DescendantGroups, EveMarketGroupId, GetProducibleTypes } from "$lib/eve-data/EveMarketGroups";
    import MarketGroupSelector from "$lib/MarketGroupSelector.svelte";
    import EveTypes, { EveType, EveTypeId, MarketGroupToTypes } from "$lib/eve-data/EveTypes";
    
    $: selectedProductId = parseInt( $page.params['type'] ) || null;

    let selectedGroup: EveMarketGroupId;
    let _prevSelectedProductId;
    $: {
        // Only update selectedGroup if there is a change,
        // so the user can select the group freely without being affected
        if(selectedProductId !== _prevSelectedProductId) {
            // Only change the group if the type is not producible in the current group,
            // so that the list of types doesn't change 
            if(!GetProducibleTypes(selectedGroup, $DescendantGroups, $MarketGroupToTypes, $ProductToActivity).includes(selectedProductId)) {
                selectedGroup = $EveTypes.get(selectedProductId)?.market_group_id;
            }
        }
        _prevSelectedProductId = selectedProductId;
    }

    // Only pick types that can be manufactured
    $: selectableTypes = GetProducibleTypes(selectedGroup, $DescendantGroups, $MarketGroupToTypes, $ProductToActivity);

    $: selectedActivityId = $ProductToActivity.get(selectedProductId)?.activity.activity.activityID;
</script>


<svelte:head>
	<title>{$EveTypes.get(selectedProductId) ? `${$EveTypes.get(selectedProductId).name} - ` : "" }EVE Online Visual Industry Calculator</title>
</svelte:head>

<p>
<MarketGroupSelector value={selectedGroup} on:change={event=>{selectedGroup = event.detail}} /><br/>
<TypeSelector selectedTypeId={selectedProductId} {selectableTypes}
    on:change={event=>{goto(`${event.detail}`, {keepfocus:true})}} />
</p>


{#if selectedActivityId === REACTION_ACTIVITY_ID}
<ReactionActivity productTypeId={selectedProductId} />
{:else if selectedActivityId === MANUFACTURING_ACTIVITY_ID}
<ManufacturingActivity {selectedProductId} />
{/if}
    