<script lang="ts">

    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    import EveMarketGroups, { EveMarketGroupId } from "$lib/eve-data/EveMarketGroups";
    import { Universe } from "$lib/eve-data/EveData";
    import { GetReactionActivity, Industry, IndustryActivity, REACTION_ACTIVITY_ID } from "$lib/eve-data/EveIndustry";

    import type { Type_Id, Location_Id, Type } from "$lib/eve-data/EveData";
    import type { EntityCollection } from "$lib/eve-data/EveData";

    import ComparedActivity from "$lib/ComparedActivity.svelte";
    import ReactionActivity from "$lib/ReactionActivity.svelte";
    import FacilitySelector from "$lib/FacilitySelector.svelte";
    import type { IndustryFacilityModifiers } from "$lib/IndustryJob";
    import { getMarketType, IskAmount } from "$lib/eve-data/EveMarkets";

    import { max } from "d3-array";


    $: selectedGroup = parseInt($page.params['group']) || null as EveMarketGroupId;

    $: selectibleMarketGroups = Object.values($EveMarketGroups ?? {})
        .filter(group=>group.hasTypes)
        .sort((a,b)=>a.name.localeCompare(b.name));

    $: selectedTypes = Object.values($Universe.types ?? {}).filter((type: Type)=>type.market_group_id===selectedGroup)

    let locationId: Location_Id;

    let facilityModifiers: IndustryFacilityModifiers;

    let prices: EntityCollection<IskAmount> = {};
    
    let relatedMarketTypes = {}
    $: {
        relatedMarketTypes = Object.fromEntries(selectedTypes.map((type:Type)=>[type.type_id]));

        selectedTypes.map((type:Type)=>GetReactionActivity(type.type_id, $Industry).activity)
            .filter(activity=>activity!==undefined)
            .forEach((activity:IndustryActivity)=>{
                Object.assign(relatedMarketTypes, Object.fromEntries( Object.keys(activity.materials).map(typeId=>[typeId]) ));
            })

        for(let typeId in relatedMarketTypes) {
            getMarketType(parseInt(typeId)).subscribe(value=>{
                relatedMarketTypes[typeId]=value;
                if(prices[typeId] === undefined) {
                    prices[typeId] = value?.orders.sell[0]?.price
                }
            })
        }
    }

    // $: extents = [0, max(selectedTypes, (type:Type)=>prices[type.type_id])]
    let extents = [0, 10000000]
</script>

<select value={selectedGroup} on:change={(event)=>goto(`${event.currentTarget.value}`, {keepfocus:true})}>
    <option value={null}></option>
    {#each selectibleMarketGroups as marketGroup}
        <option value={marketGroup.market_group_id}>{marketGroup.name}</option>
    {/each}
</select>

<FacilitySelector bind:value={locationId} activity={REACTION_ACTIVITY_ID} bind:facilityModifiers />


{#each selectedTypes as type}
    <!-- <ReactionActivity productTypeId={type.type_id} defaultLocationId={locationId} /> -->
    <ComparedActivity productTypeId={type.type_id} {facilityModifiers} {prices} 
        {extents} />
{/each}

<slot />