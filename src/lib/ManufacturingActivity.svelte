<script lang="ts">
    import { Universe, Industry, MANUFACTURING_ACTIVITY_ID, Type_Id  } from "$lib/EveData";
    import type { IndustryType, IndustryActivity, EntityCollection } from "$lib/EveData";
    import { getMarketType, MarketType } from "$lib/EveMarkets";
    import MarketOrdersBar from "./MarketOrdersBar.svelte";



    export let blueprint: IndustryType = null;

    let relatedTypeStores = [];
    let relatedTypes: EntityCollection<MarketType> = {};

    let selectedProductId: Type_Id = null;


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
            selectedProductId = null;

            if(manufacturing) {
                // Request for new materials
                for(let type_id in manufacturing.materials) {
                    subscribeToTypeStore( parseInt(type_id) );
                }
                // And the manufactured product(s)
                for(let type_id in manufacturing.products) {
                    subscribeToTypeStore( parseInt(type_id) );
                }

                selectedProductId = parseInt( Object.keys(manufacturing.products)[0] );
            }
        }
    }

    let totalCost = 0;
    $: {
        if(manufacturing) {
            totalCost = 0;
            for(let type_id in manufacturing.materials) {
                if(relatedTypes[type_id] && relatedTypes[type_id].orders.sell[0]) totalCost += manufacturing.materials[type_id].quantity * relatedTypes[type_id].orders.sell[0].price;
            }
        } else {
            totalCost = 0;
        }
    }



    let extents = [0,1000]
    $: {
        if(manufacturing) {
            let prices = [];

            for(let type_id in manufacturing.materials) {
                if(relatedTypes[type_id] && relatedTypes[type_id].lastUpdated !== null) {
                    if(relatedTypes[type_id].orders.buy.length > 0) prices.push( manufacturing.materials[type_id].quantity * relatedTypes[type_id].orders.buy[0].price );
                    if(relatedTypes[type_id].orders.sell.length > 0) prices.push( manufacturing.materials[type_id].quantity * relatedTypes[type_id].orders.sell[0].price );
                }
            }
            for(let type_id in manufacturing.products) {
                if(relatedTypes[type_id] && relatedTypes[type_id].lastUpdated !== null) {
                    if(relatedTypes[type_id].orders.buy.length > 0) prices.push( manufacturing.products[type_id].quantity * relatedTypes[type_id].orders.buy[0].price );
                    if(relatedTypes[type_id].orders.sell.length > 0) prices.push( manufacturing.products[type_id].quantity * relatedTypes[type_id].orders.sell[0].price );
                }
            }

            extents[1] = 1.1*Math.max(...prices, totalCost);

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
            <MarketOrdersBar {extents} quantity={manufacturing.products[type_id].quantity} highestBuyOrder={relatedTypes[type_id].orders.buy[0]} lowestSellOrder={relatedTypes[type_id].orders.sell[0]} />
            {manufacturing.products[type_id].quantity}
        </dd>
    {/each}
</dl>

Materials
<dl>
    <dt>Total</dt>
    <dd>
        <MarketOrdersBar {extents} quantity={manufacturing.products[selectedProductId].quantity} {totalCost} />
    </dd>
    {#each Object.keys(manufacturing.materials) as type_id}
        <dt>{$Universe.types[type_id].name} [{type_id}]</dt>
        <dd>
            <MarketOrdersBar height={20} {extents} quantity={manufacturing.materials[type_id].quantity} highestBuyOrder={relatedTypes[type_id].orders.buy[0]} lowestSellOrder={relatedTypes[type_id].orders.sell[0]} />
            {manufacturing.materials[type_id].quantity}
        </dd>
    {/each}
</dl>

{/if}