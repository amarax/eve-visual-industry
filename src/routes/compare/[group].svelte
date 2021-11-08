<script lang="ts">

    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    import EveMarketGroups, { DescendantGroups, EveMarketGroupId, GetProducibleTypes } from "$lib/eve-data/EveMarketGroups";
    import { Universe } from "$lib/eve-data/EveData";
    import { Activity_Id, GetProductionActivity, Industry, IndustryActivity, ProductToActivity } from "$lib/eve-data/EveIndustry";

    import type { Location_Id, Type } from "$lib/eve-data/EveData";
    import type { EntityCollection } from "$lib/eve-data/EveData";

    import ComparedActivity from "$lib/ComparedActivity.svelte";
    import FacilitySelector from "$lib/FacilitySelector.svelte";
    import type { IndustryFacilityModifiers } from "$lib/IndustryJob";
    import { getMarketType, IskAmount, MarketType } from "$lib/eve-data/EveMarkets";
    import MarketGroupSelector from "$lib/MarketGroupSelector.svelte";
    import EveTypes, { EveTypeId, MarketGroupToTypes } from "$lib/eve-data/EveTypes";

    import { max } from "d3-array";



    let currentGroup: EveMarketGroupId;
    $: { 
        currentGroup = parseInt($page.params['group']) || null as EveMarketGroupId;

        if(!selectedGroup && currentGroup)
            selectedGroup = currentGroup;
    }

    $: selectedTypeIds = GetProducibleTypes(currentGroup, $DescendantGroups, $MarketGroupToTypes, $ProductToActivity)
        .sort((a,b)=>metrics[currentMetric][b]-metrics[currentMetric][a])

    let locationId: Location_Id = null;

    let facilityModifiers: IndustryFacilityModifiers;

    let prices: EntityCollection<IskAmount> = {};
    
    let selectedActivityId: Activity_Id = null;

    let relatedMarketTypes: Map<EveTypeId, MarketType> = new Map()
    $: {
        relatedMarketTypes.clear();
        selectedTypeIds.forEach(typeId=>relatedMarketTypes.set(typeId,null));

        selectedTypeIds.map(typeId=>$ProductToActivity.get(typeId).activity)
            .filter(activity=>activity!==undefined)
            .forEach((activity:IndustryActivity)=>{
                for(const materialId in activity.materials) {
                    relatedMarketTypes.set(parseInt(materialId), null);
                }

                // Assume that selection is homogeneous and we just pick the last activity type
                selectedActivityId = activity.activity.activityID;
            })

        relatedMarketTypes.forEach((value,typeId)=>{
            getMarketType(typeId).subscribe(marketType=>{
                relatedMarketTypes.set(typeId, marketType);

                if(prices[typeId] === undefined) {
                    prices[typeId] = marketType?.orders.sell[0]?.price
                }
            })
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
    

    let bounds = {};
    $: extents = [0, max(Object.values(bounds)) * 1.1]
    // let extents = [0, 2e7]

    let selectedGroup: EveMarketGroupId = currentGroup;
</script>

<svelte:head>
	<title>{($EveMarketGroups && $EveMarketGroups[currentGroup]) ? `${$EveMarketGroups[currentGroup].name} - ` : "" }EVE Online Visual Industry Calculator</title>
</svelte:head>


<p><MarketGroupSelector bind:value={selectedGroup} /><br/>
<button on:click={event=>goto(`${selectedGroup}`, {keepfocus:true})}>Compare</button></p>

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


{#each selectedTypeIds as typeId (typeId)}
    <ComparedActivity productTypeId={typeId} {facilityModifiers} {prices} 
        bind:profitRatio={metrics.profitRatio[typeId]}
        bind:profitPerDay={metrics.profitPerDay[typeId]}
        {extents} bind:priceUpperBound={bounds[typeId]} />
{/each}
</div>

<slot />