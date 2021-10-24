<script lang="ts">
    import { Universe, MANUFACTURING_ACTIVITY_ID  } from "$lib/EveData";
    import type { IndustryType, IndustryActivity, EntityCollection, Type_Id } from "$lib/EveData";
    import { DurationSeconds, getMarketType, MarketPrices } from "$lib/EveMarkets";
    import type { MarketType, Quantity } from "$lib/EveMarkets";
    import MarketOrdersBar from "./MarketOrdersBar.svelte";



    export let blueprint: IndustryType = null;

    let relatedTypeStores = [];
    let relatedTypes: EntityCollection<MarketType> = {};

    let selectedProductId: Type_Id = null;


    export let salesTaxRate = 0.036;
    export let brokerFeeRate = 0.0151114234532; // Aqua Silentium's broker fee


    function subscribeToTypeStore( type_id: Type_Id ) {
        relatedTypeStores.push( getMarketType(type_id).subscribe(value=>{
            relatedTypes[type_id] = value;
        }) );
    }

    export let runs: number = 1;
    export let materialEfficiency: number = 0;
    export let timeEfficiency: number = 0;



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


    let materialQty = (baseQuantity: Quantity): Quantity => baseQuantity;

    $: {
        materialQty = (qty) => Math.max( runs, Math.ceil( qty * runs * (1-materialEfficiency/100) ) );
    }

    let manufacturingTime = (baseTime: DurationSeconds): DurationSeconds => baseTime;
    $: {
        manufacturingTime = (base) => base * (1-timeEfficiency/100);
    }

    function getBuySellInJita() {
        let jita_tradehub_location_id = 60003760;
        let jita_system_id = 30000142;

        let perimeter_system_id = 30000144;
        let tq_trading_location_id = 1028858195912;
    }

    let totalCost = 0;
    let extents = [0,1000]
    $: {
        totalCost = 0;

        if(manufacturing) {
            let prices = [];

            totalCost += manufacturingJobCost;

            for(let type_id in manufacturing.materials) {
                if(relatedTypes[type_id] && relatedTypes[type_id].orders.lastUpdated !== null) {
                    let materialQuantity = materialQty(manufacturing.materials[type_id].quantity);
                    if(relatedTypes[type_id].orders.buy.length > 0) prices.push( materialQuantity * relatedTypes[type_id].orders.buy[0].price );
                    if(relatedTypes[type_id].orders.sell.length > 0) prices.push( materialQuantity * relatedTypes[type_id].orders.sell[0].price );

                    if(relatedTypes[type_id].orders.sell.length > 0) totalCost += materialQuantity * relatedTypes[type_id].orders.sell[0].price;
                }
            }
            for(let type_id in manufacturing.products) {
                if(relatedTypes[type_id] && relatedTypes[type_id].orders.lastUpdated !== null) {
                    let productQuantity = manufacturing.products[type_id].quantity * runs;
                    if(relatedTypes[type_id].orders.buy.length > 0) prices.push( productQuantity * relatedTypes[type_id].orders.buy[0].price );
                    if(relatedTypes[type_id].orders.sell.length > 0) prices.push( productQuantity * relatedTypes[type_id].orders.sell[0].price );
                }
            }

            extents[1] = 1.1*Math.max(...prices, totalCost);

        }
    }

    export let systemCostIndex = 0.03;

    let manufacturingJobCost = 0;
    $: {
        manufacturingJobCost = 0;
        let totalAdjustedCostPrice = 0;

        if(manufacturing) {
            for(let type_id in manufacturing.materials) {
                totalAdjustedCostPrice += manufacturing.materials[type_id].quantity * ($MarketPrices[type_id].adjusted_price || $MarketPrices[type_id].average_price);
            }

            manufacturingJobCost = totalAdjustedCostPrice * systemCostIndex;

        }
    }
</script>

{#if !blueprint}
No blueprint selected yet
{:else}

Blueprint
<p>
    <label>Runs <input type="range" bind:value={runs} min={1} max={blueprint?blueprint.maxProductionLimit+9 : 20} /> {runs}</label>
    <label>ME <input type="range" bind:value={materialEfficiency} min={0} max={10} /> {materialEfficiency}</label>
    <label>TE <input type="range" bind:value={timeEfficiency} min={0} max={20} step={2} /> {timeEfficiency}</label>
</p>

Facility
<dl>
    <label>System cost index <input bind:value={systemCostIndex} /></label>
</dl>

Manufacturing
<dl>
    <dt>Time</dt>
    <dd>{manufacturingTime(manufacturing.time)}</dd>
    <dt>Job Cost</dt>
    <dd>{manufacturingJobCost}</dd>
</dl>


Products
<dl>
    {#each Object.keys(manufacturing.products) as type_id}
        <dt>{$Universe.types[type_id].name} [{type_id}]</dt>
        <dd>
            <MarketOrdersBar {extents} quantity={manufacturing.products[type_id].quantity * runs} 
                highestBuyOrder={relatedTypes[type_id].orders.buy[0]} lowestSellOrder={relatedTypes[type_id].orders.sell[0]} 
                buyOverheadRate={-salesTaxRate} sellOverheadRate={-brokerFeeRate-salesTaxRate}
                {totalCost}
            />
            Profit {(relatedTypes[type_id].orders.sell[0] && relatedTypes[type_id].orders.sell[0].price)*(1-brokerFeeRate-salesTaxRate)*runs - totalCost}
        </dd>
    {/each}
</dl>

Materials
<dl>
    <dt>Total</dt>
    <dd>
        <MarketOrdersBar {extents} quantity={manufacturing.products[selectedProductId].quantity * runs} {totalCost} />
    </dd>
    {#each Object.keys(manufacturing.materials) as type_id}
        <dt>{$Universe.types[type_id].name} [{type_id}]</dt>
        <dd>
            <MarketOrdersBar height={20} {extents} quantity={materialQty(manufacturing.materials[type_id].quantity)} 
                highestBuyOrder={relatedTypes[type_id].orders.buy[0]} lowestSellOrder={relatedTypes[type_id].orders.sell[0]} 
                buyOverheadRate={brokerFeeRate}
            />
            {materialQty(manufacturing.materials[type_id].quantity)}
        </dd>
    {/each}
</dl>

{/if}