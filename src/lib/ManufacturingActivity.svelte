<script lang="ts">
    import { Universe, Industry, MANUFACTURING_ACTIVITY_ID  } from "$lib/EveData";
    import type { IndustryType, IndustryActivity } from "$lib/EveData";
    import { getMarketType, MarketType } from "$lib/EveMarkets";



    export let blueprint: IndustryType = null;

    let materialStores = [];
    let materials: EntityCollection<MarketType> = {};

    let manufacturing: IndustryActivity = null;
    $: {
        let nextManufacturing = blueprint && blueprint.activities[MANUFACTURING_ACTIVITY_ID];

        if(nextManufacturing != manufacturing) {
            // Unsubscribe from current material stores
            materialStores.forEach(unsubscribe=>unsubscribe());

            manufacturing = nextManufacturing;
            materialStores = [];
            materials = {};

            // Request for new materials
            for(let type_id in manufacturing.materials) {
                materialStores.push( getMarketType(parseInt(type_id)).subscribe(value=>{
                    materials[type_id] = value;
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
            Highest buy: {materials[type_id].orders.buy[0]&&materials[type_id].orders.buy[0].price}
            Lowest sell: {materials[type_id].orders.sell[0]&&materials[type_id].orders.sell[0].price}
        </dd>
    {/each}
</dl>

{/if}