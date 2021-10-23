<script lang="ts">
    import { Universe, Industry, MANUFACTURING_ACTIVITY_ID, Type_Id  } from "$lib/EveData";
    import type { IndustryType, IndustryActivity, EntityCollection } from "$lib/EveData";
    import { getMarketType, MarketType } from "$lib/EveMarkets";



    export let blueprint: IndustryType = null;

    let relatedTypeStores = [];
    let relatedTypes: EntityCollection<MarketType> = {};

    function subscribeToTypeStore( type_id: Type_Id ) {
        relatedTypeStores.push( getMarketType(type_id).subscribe(value=>{
            relatedTypes[type_id] = value;
        }) );
    }


    let manufacturing: IndustryActivity = null;
    $: {
        let nextManufacturing = blueprint && blueprint.activities[MANUFACTURING_ACTIVITY_ID];

        if(nextManufacturing != manufacturing) {
            // Unsubscribe from current material stores
            relatedTypeStores.forEach(unsubscribe=>unsubscribe());

            manufacturing = nextManufacturing;
            relatedTypeStores = [];
            relatedTypes = {};

            // Request for new materials
            for(let type_id in manufacturing.materials) {
                subscribeToTypeStore( parseInt(type_id) );
            }
            // And the manufactured product(s)
            for(let type_id in manufacturing.products) {
                subscribeToTypeStore( parseInt(type_id) );
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

Products
<dl>
    {#each Object.keys(manufacturing.products) as type_id}
        <dt>{$Universe.types[type_id].name} [{type_id}]</dt>
        <dd>
            {manufacturing.products[type_id].quantity}x
            Highest buy: {relatedTypes[type_id].orders.buy[0] && relatedTypes[type_id].orders.buy[0].price}
            Lowest sell: {relatedTypes[type_id].orders.sell[0] && relatedTypes[type_id].orders.sell[0].price}
        </dd>
    {/each}
</dl>

Materials
<dl>
    {#each Object.keys(manufacturing.materials) as type_id}
        <dt>{$Universe.types[type_id].name} [{type_id}]</dt>
        <dd>
            {manufacturing.materials[type_id].quantity}x
            Highest buy: {relatedTypes[type_id].orders.buy[0] && relatedTypes[type_id].orders.buy[0].price}
            Lowest sell: {relatedTypes[type_id].orders.sell[0] && relatedTypes[type_id].orders.sell[0].price}
        </dd>
    {/each}
</dl>

{/if}