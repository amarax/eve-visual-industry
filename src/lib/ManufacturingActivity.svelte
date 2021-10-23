<script lang="ts">
    import { Universe, Industry, MANUFACTURING_ACTIVITY_ID  } from "$lib/EveData";
    import type { IndustryType, IndustryActivity, EntityCollection } from "$lib/EveData";
    import { getMarketType, MarketType } from "$lib/EveMarkets";



    export let blueprint: IndustryType = null;

    let materialStores = [];
    let relatedTypes: EntityCollection<MarketType> = {};

    let manufacturing: IndustryActivity = null;
    $: {
        let nextManufacturing = blueprint && blueprint.activities[MANUFACTURING_ACTIVITY_ID];

        if(nextManufacturing != manufacturing) {
            // Unsubscribe from current material stores
            materialStores.forEach(unsubscribe=>unsubscribe());

            manufacturing = nextManufacturing;
            materialStores = [];
            relatedTypes = {};

            // Request for new materials
            for(let type_id in manufacturing.materials) {
                materialStores.push( getMarketType(parseInt(type_id)).subscribe(value=>{
                    relatedTypes[type_id] = value;
                }) );
            }
        }
    }
</script>

{#if !blueprint}
No blueprint selected yet
{:else}
<dl>
    <dt>Time</dt>
    <dd>{manufacturing.time}</dd>
</dl>

Materials
<dl>
    {#each Object.keys(manufacturing.materials) as type_id}
        <dt>{$Universe.types[type_id].name} [{type_id}]</dt>
        <dd>
            {manufacturing.materials[type_id].quantity} 
            Highest buy: {relatedTypes[type_id].orders.buy[0] && relatedTypes[type_id].orders.buy[0].price}
            Lowest sell: {relatedTypes[type_id].orders.sell[0] && relatedTypes[type_id].orders.sell[0].price}
        </dd>
    {/each}
</dl>

{/if}