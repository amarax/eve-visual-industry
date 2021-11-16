<script lang="ts">

    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    import EveMarketGroups, { DescendantGroups, EveMarketGroupId, GetProducibleTypes } from "$lib/eve-data/EveMarketGroups";
    import { Activity_Id, IndustryActivity, ProductToActivity } from "$lib/eve-data/EveIndustry";
    import { getMarketType, IskAmount, MarketType } from "$lib/eve-data/EveMarkets";
    import { EveTypeId, MarketGroupToTypes } from "$lib/eve-data/EveTypes";

    import type { Location_Id, EntityCollection } from "$lib/eve-data/EveData";
    import type { IndustryFacilityModifiers } from "$lib/IndustryJob";

    import ComparedActivity from "$lib/ComparedActivity.svelte";
    import FacilitySelector from "$lib/components/FacilitySelector.svelte";
    import MarketGroupSelector from "$lib/components/MarketGroupSelector.svelte";

    import { extent, max } from "d3-array";
import { getContext } from "svelte";
import type { EveLocationId } from "$lib/eve-data/ESI";
import type { Readable } from "svelte/store";


    let currentGroup: EveMarketGroupId;
    $: { 
        currentGroup = parseInt($page.params['group']) || null as EveMarketGroupId;

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
                relatedMarketTypes = relatedMarketTypes;
            })
        })
    }

    let marketFilterLocation: Readable<EveLocationId> = getContext('marketFilterLocation');
    $: {
        relatedMarketTypes.forEach((marketType,typeId)=>{
            if(!selectedTypeIds.includes(typeId)) {
                prices[typeId] = marketType?.orders.sell?.filter(o=>$marketFilterLocation ? o.location_id===$marketFilterLocation : true)[0]?.price;
            }
        });
    }

    let metrics = {
        profitRatio: {} as EntityCollection<number>,
        profitPerDay: {} as EntityCollection<number>,
    }
    let currentMetric = 'profitRatio';
    

    let bounds = {};
    $: {
        for(let typeId in bounds) {
            if(!selectedTypeIds.includes(parseInt(typeId))) {
                delete bounds[typeId];
            }
        }
        bounds = bounds;
    }

    $: extents = {
        profitRatio: extent(Object.values(metrics['profitRatio'])),
        profitPerDay: extent(Object.values(metrics['profitPerDay'])),
        graph: [0, max(Object.values(bounds)) * 1.1]
    } 


    let selectedGroup: EveMarketGroupId = currentGroup;
</script>

<svelte:head>
	<title>{($EveMarketGroups.has(currentGroup)) ? `${$EveMarketGroups.get(currentGroup).name} - ` : "" }EVE Online Visual Industry Calculator</title>
</svelte:head>


<p><MarketGroupSelector value={selectedGroup} on:change={event=>selectedGroup = event.detail} /><br/>
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