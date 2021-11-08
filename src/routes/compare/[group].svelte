<script lang="ts">

    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    import EveMarketGroups, { EveMarketGroupId } from "$lib/eve-data/EveMarketGroups";
    import { Universe } from "$lib/eve-data/EveData";
    import { Activity_Id, GetProductionActivity, Industry, IndustryActivity } from "$lib/eve-data/EveIndustry";

    import type { Type_Id, Location_Id, Type } from "$lib/eve-data/EveData";
    import type { EntityCollection } from "$lib/eve-data/EveData";

    import ComparedActivity from "$lib/ComparedActivity.svelte";
    import FacilitySelector from "$lib/FacilitySelector.svelte";
    import type { IndustryFacilityModifiers } from "$lib/IndustryJob";
    import { getMarketType, IskAmount } from "$lib/eve-data/EveMarkets";



    $: selectedGroup = parseInt($page.params['group']) || null as EveMarketGroupId;

    $: selectibleMarketGroups = Object.values($EveMarketGroups ?? {})
        .filter(group=>group.hasTypes)
        .sort((a,b)=>a.name.localeCompare(b.name));

    $: selectedTypes = Object.values($Universe.types ?? {})
        .filter((type: Type)=>type.market_group_id===selectedGroup)
        .sort((a,b)=>metrics[currentMetric][b.type_id]-metrics[currentMetric][a.type_id])

    let locationId: Location_Id = null;

    let facilityModifiers: IndustryFacilityModifiers;

    let prices: EntityCollection<IskAmount> = {};
    
    let selectedActivityId: Activity_Id = null;

    let relatedMarketTypes = {}
    $: {
        relatedMarketTypes = Object.fromEntries(selectedTypes.map((type:Type)=>[type.type_id]));

        selectedTypes.map((type:Type)=>GetProductionActivity(type.type_id, $Industry).activity)
            .filter(activity=>activity!==undefined)
            .forEach((activity:IndustryActivity)=>{
                Object.assign(relatedMarketTypes, Object.fromEntries( Object.keys(activity.materials).map(typeId=>[typeId]) ));
                selectedActivityId = activity.activity.activityID;
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

    let metrics = {
        profitRatio: {} as EntityCollection<number>,
        profitPerDay: {} as EntityCollection<number>,
    }
    let currentMetric = 'profitRatio';
    

    // $: extents = [0, max(selectedTypes, (type:Type)=>prices[type.type_id])]
    let extents = [0, 2e7]
</script>

<svelte:head>
	<title>{($EveMarketGroups && $EveMarketGroups[selectedGroup]) ? `${$EveMarketGroups[selectedGroup].name} - ` : "" }EVE Online Visual Industry Calculator</title>
</svelte:head>


<select value={selectedGroup} on:change={(event)=>goto(`${event.currentTarget.value}`, {keepfocus:true})}>
    <option value={null}></option>
    {#each selectibleMarketGroups as marketGroup}
        <option value={marketGroup.market_group_id}>{marketGroup.name}</option>
    {/each}
</select>

<FacilitySelector bind:value={locationId} activity={selectedActivityId} bind:facilityModifiers />


<style lang="scss">
    .compare {
        display: grid;
        grid-template-columns: auto min-content min-content 500px;
        column-gap: 8px;
     
        .metricSelector {
            grid-column: span 2;
        }

        @media screen and (max-width: 800px) {
            grid-template-columns: auto min-content min-content;

            max-width: 100%;

            :global(.graph), :global(.subItem) {
                grid-column: span 3;
            }
        }
    }
</style>

<div class="compare">
    <div class="itemName"></div>
    <div class="metricSelector">
        <select bind:value={currentMetric}>
            <option value="profitRatio">Profit Ratio</option>
            <option value="profitPerDay">Profit per Day</option>
        </select>
    </div>
    <div class="graph"> </div>


{#each selectedTypes as type (type.type_id)}
    <!-- <ReactionActivity productTypeId={type.type_id} defaultLocationId={locationId} /> -->
    <ComparedActivity productTypeId={type.type_id} {facilityModifiers} {prices} 
        bind:profitRatio={metrics.profitRatio[type.type_id]}
        bind:profitPerDay={metrics.profitPerDay[type.type_id]}
        {extents} />
{/each}
</div>

<slot />