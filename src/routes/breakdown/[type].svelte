<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { base as basePath } from '$app/paths';

    import { ProductToActivity } from "$lib/eve-data/EveIndustry";
    import { MANUFACTURING_ACTIVITY_ID, REACTION_ACTIVITY_ID } from "$lib/eve-data/EveIndustry";
    import { DescendantGroups, EveMarketGroupId, GetProducibleTypes } from "$lib/eve-data/EveMarketGroups";
    import EveTypes, { MarketGroupToTypes } from "$lib/eve-data/EveTypes";

    import TypeSelector from "$lib/components/TypeSelector.svelte";
    import MarketGroupSelector from "$lib/components/MarketGroupSelector.svelte";
    import ManufacturingActivity from "$lib/ManufacturingActivity.svelte";
    import ReactionActivity from "$lib/ReactionActivity.svelte";
    
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
<MarketGroupSelector value={selectedGroup} on:change={event=>{selectedGroup = event.detail}} /> 
<a href={`${basePath}/compare/${selectedGroup}`}>Compare group</a><br/>
<TypeSelector selectedTypeId={selectedProductId} {selectableTypes}
    on:change={event=>{goto(`${event.detail}`, {keepfocus:true})}} />
</p>


{#if selectedActivityId === REACTION_ACTIVITY_ID}
<ReactionActivity productTypeId={selectedProductId} />
{:else if selectedActivityId === MANUFACTURING_ACTIVITY_ID}
<ManufacturingActivity {selectedProductId} />
{/if}
    