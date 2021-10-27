<script lang="ts">
    import { Universe, MANUFACTURING_ACTIVITY_ID  } from "$lib/EveData";
    import type { IndustryType, IndustryActivity, EntityCollection, Type_Id } from "$lib/EveData";
    import { DurationSeconds, getMarketType, MarketPrices } from "$lib/EveMarkets";
    import type { MarketType, Quantity } from "$lib/EveMarkets";
    import MarketOrdersBar from "./MarketOrdersBar.svelte";
    import IndustryJob from "./IndustryJob";
    import { FormatIskAmount } from "./Format";



    export let blueprint: IndustryType = null;

    let relatedTypeStores = [];
    let relatedTypes: EntityCollection<MarketType> = {};

    let selectedProductId: Type_Id = null;


    export let salesTaxRate = 0.036;
    export let brokerFeeRate = 0.0151114234532; // Aqua Silentium's broker fee


    function subscribeToTypeStore( type_id: Type_Id ) {
        relatedTypeStores.push( getMarketType(type_id).subscribe(value=>{
            relatedTypes[type_id] = value;

            if(mainJob) mainJob.updateUnitPrice(type_id, value.orders.sell[0] && value.orders.sell[0].price);
        }) );
    }

    export let runs: number = 1;
    export let materialEfficiency: number = 0;
    export let timeEfficiency: number = 0;


    function arrayToEntityCollection(array: Array<any>, indexAccessor: (item)=>number) : EntityCollection<any> {
        let collection = {};

        for(let item of array) {
            let index = indexAccessor(item);
            if(index) collection[index] = item;
        }

        return collection;
    }

    let manufacturing: IndustryActivity = null;
    let mainJob: IndustryJob = null;
    $: {
        let nextManufacturing = blueprint && blueprint.activities[MANUFACTURING_ACTIVITY_ID];

        if(nextManufacturing != manufacturing) {
            // Unsubscribe from current material stores
            relatedTypeStores.forEach(unsubscribe=>unsubscribe());

            manufacturing = nextManufacturing;
            relatedTypeStores = [];
            relatedTypes = {};
            selectedProductId = null;
            mainJob = null;

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

                let activity = blueprint.activities[MANUFACTURING_ACTIVITY_ID];
                mainJob = new IndustryJob(
                    {
                        materialEfficiency: 2,
                        timeEfficiency: 4,
                        duration: activity.time
                    },
                    arrayToEntityCollection(
                        Object.values( activity.materials )
                            .map(material=>({
                                type: $Universe.types[material.materialTypeID],

                                quantity: material.quantity,

                                indexPrice: $MarketPrices[material.materialTypeID].adjusted_price,
                                unitCost: relatedTypes[material.materialTypeID].orders.sell[0] && relatedTypes[material.materialTypeID].orders.sell[0].price,
                            })),
                        material=>material.type.type_id
                    ),
                    {
                        type: $Universe.types[selectedProductId],
                        unitPrice: (relatedTypes[selectedProductId].orders.sell[0] && relatedTypes[selectedProductId].orders.sell[0].price) * (1 - brokerFeeRate - salesTaxRate),
                        quantity: activity.products[selectedProductId].quantity,
                    },
                    {
                        materialConsumptionModifier: -1,

                        locationActivityCostIndex: 0.0373,
                        taxRate: 0.5,
                    },
                    runs,
                    {}
                );
            }
        }
    }

    $: {
        if(mainJob) {
            mainJob.runs = runs;
            mainJob.facility.locationActivityCostIndex = systemCostIndex;
            mainJob.activity.materialEfficiency = materialEfficiency;
            mainJob.activity.timeEfficiency = timeEfficiency;
        }
    }


    let materialQty = (baseQuantity: Quantity): Quantity => baseQuantity;

    export let facilityMaterialConsumptionModifier: number = -1;
    $: {
        materialQty = (qty) => Math.max( runs, Math.ceil( qty * runs * (1-materialEfficiency/100) * (1+facilityMaterialConsumptionModifier/100) ) );
    }

    let manufacturingTime = (baseTime: DurationSeconds): DurationSeconds => baseTime;
    $: {
        manufacturingTime = (base) => base * (1-timeEfficiency/100) * runs;
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
        if(manufacturing) {
            let prices = [];
            totalCost = 0;

            for(let type_id in manufacturing.materials) {
                if(relatedTypes[type_id] && relatedTypes[type_id].orders.lastUpdated !== null) {
                    let materialQuantity = materialQty(manufacturing.materials[type_id].quantity);
                    // if(relatedTypes[type_id].orders.buy.length > 0) prices.push( materialQuantity * relatedTypes[type_id].orders.buy[0].price );
                    // if(relatedTypes[type_id].orders.sell.length > 0) prices.push( materialQuantity * relatedTypes[type_id].orders.sell[0].price );

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

            totalCost += manufacturingJobCost;

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

<style lang="scss">
    dl {
        display: grid;
        grid-template-columns: 150px 1fr;
    }

    dt {

        overflow-x: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    dd {
        margin-inline-start: 10px;
    }
</style>

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
    <dd>{manufacturingTime(manufacturing.time)} {mainJob && mainJob.duration}</dd>
    <dt>Job Cost</dt>
    <dd>{FormatIskAmount(manufacturingJobCost)} {FormatIskAmount(mainJob && mainJob.jobCost)}</dd>
</dl>


Products
<dl>
    {#each Object.keys(manufacturing.products) as type_id}
        <dt title={`${$Universe.types[type_id].name} [${type_id}]`}>{$Universe.types[type_id].name}</dt>
        <dd>
            <MarketOrdersBar {extents} quantity={manufacturing.products[type_id].quantity * runs} 
                highestBuyOrder={relatedTypes[type_id].orders.buy[0]} lowestSellOrder={relatedTypes[type_id].orders.sell[0]} 
                buyOverheadRate={-salesTaxRate} sellOverheadRate={-brokerFeeRate-salesTaxRate}
                {totalCost}
            />
            Unit price
            {(relatedTypes[type_id].orders.sell[0] && relatedTypes[type_id].orders.sell[0].price)*(1-brokerFeeRate-salesTaxRate)}

            Unit Cost
            {totalCost/runs}
            {FormatIskAmount(mainJob.totalCost/mainJob.runs)}

            <br/>

            Profit 
            {(relatedTypes[type_id].orders.sell[0] && relatedTypes[type_id].orders.sell[0].price)*(1-brokerFeeRate-salesTaxRate)*runs - totalCost} 
            {FormatIskAmount(mainJob.profit)}
        </dd>
    {/each}
</dl>

Materials
<dl>
    <dt>Total</dt>
    <dd>
        <MarketOrdersBar {extents} quantity={manufacturing.products[selectedProductId].quantity * runs} {totalCost} />
        Cost per item {totalCost / (manufacturing.products[selectedProductId].quantity * runs)}
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