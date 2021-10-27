<script lang="ts">
    import { Universe, Industry, GetBlueprintToManufacture  } from "$lib/EveData";
    import { MANUFACTURING_ACTIVITY_ID  } from "$lib/EveData";
    import type { IndustryType, IndustryActivity, EntityCollection, Type_Id } from "$lib/EveData";
    import { getMarketType, IskAmount, MarketPrices } from "$lib/EveMarkets";
    import type { DurationSeconds, MarketType, Quantity } from "$lib/EveMarkets";
    import MarketOrdersBar from "./MarketOrdersBar.svelte";
    import { FormatDuration, FormatIskAmount, FormatIskChange } from "./Format";



    $: blueprint = GetBlueprintToManufacture($Industry, selectedProductId);

    let relatedTypeStores = [];
    let relatedTypes: EntityCollection<MarketType> = {};

    export let selectedProductId: Type_Id = null;


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

    type ItemPickedList = {
        [id: Type_Id]: boolean
    }
    export let manufacturedItems: ItemPickedList = {};

    function arrayToEntityCollection(array: Array<any>, indexAccessor: (item)=>number) : EntityCollection<any> {
        let collection = {};

        for(let item of array) {
            let index = indexAccessor(item);
            if(index) collection[index] = item;
        }

        return collection;
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

            if(manufacturing) {
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
    }



    let materialQty = (baseQuantity: Quantity): Quantity => baseQuantity;

    export let facilityMaterialConsumptionModifier: number = -1;
    $: {
        materialQty = (qty) => Math.max( runs, Math.ceil( qty * runs * (1-materialEfficiency/100) * (1+facilityMaterialConsumptionModifier/100) ) );
    }

    function getBuySellInJita() {
        let jita_tradehub_location_id = 60003760;
        let jita_system_id = 30000142;

        let perimeter_system_id = 30000144;
        let tq_trading_location_id = 1028858195912;
    }

    let manufacturedUnitCostPrices: EntityCollection<IskAmount> = {};

    let totalCost = 0;
    $: {
        totalCost = 0;
        if(manufacturing) {

            for(let type_id in manufacturing.materials) {
                let materialQuantity = materialQty(manufacturing.materials[type_id].quantity);

                totalCost += materialQuantity * (
                    manufacturedUnitCostPrices[type_id] || 
                    (relatedTypes[type_id].orders.sell[0] && relatedTypes[type_id].orders.sell[0].price) ||
                    0
                );
            }

            totalCost += manufacturingJobCost;
        }
    }

    $: {
        // Reset items that are not marked as manufactured
        for(let type_id in manufacturedUnitCostPrices) {
            if(!manufacturedItems[type_id]) manufacturedUnitCostPrices[type_id] = undefined;
        }
    }

    export let extents: Array<number> = null;
    let _extents = [0,1000];
    $: {
        if(extents === null) {
            if(manufacturing) {
                let prices = [];

                for(let type_id in manufacturing.products) {
                    if(relatedTypes[type_id] && relatedTypes[type_id].orders.lastUpdated !== null) {
                        let productQuantity = manufacturing.products[type_id].quantity * runs;
                        if(relatedTypes[type_id].orders.buy.length > 0) prices.push( productQuantity * relatedTypes[type_id].orders.buy[0].price );
                        if(relatedTypes[type_id].orders.sell.length > 0) prices.push( productQuantity * relatedTypes[type_id].orders.sell[0].price );
                    }
                }

                _extents[1] = 1.1*Math.max(...prices, totalCost);
            }
        } else {
            _extents = extents;
        }
    }

    export let systemCostIndex = 0.03;

    let totalAdjustedCostPrice = 0;
    $: {
        totalAdjustedCostPrice = 0;
        if(manufacturing) {
            for(let type_id in manufacturing.materials) {
                totalAdjustedCostPrice += manufacturing.materials[type_id].quantity * $MarketPrices[type_id].adjusted_price;
            }
        }
    }

    $: manufacturingJobCost = totalAdjustedCostPrice * systemCostIndex;

    $: manufacturingTime = manufacturing && (manufacturing.time * (1-timeEfficiency/100) * runs);

    $: sellingPrice = relatedTypes[selectedProductId] && (
        (relatedTypes[selectedProductId].orders.sell[0] && relatedTypes[selectedProductId].orders.sell[0].price)*(1-brokerFeeRate-salesTaxRate)
    );

    $: profit = sellingPrice*runs - totalCost

    export let unitCost = null;
    $: {
        unitCost = manufacturing ? totalCost/(manufacturing.products[selectedProductId].quantity * runs) : null;
    }

    export let compact = false;

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


    div.breakdown {
        display: grid;
        grid-template-columns: 1fr 80px 350px;

        max-width: 700px;

        .itemName {
            overflow-x: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;

        }

        .qty {
            text-align: right;
            margin-right: 10px;
        }

        .subItem {
            grid-column: span 3;

            $divider: 1px solid #ccc;

            border-top: $divider;
            border-bottom: $divider;

            margin-bottom: 4px;
        }
    }

    .combinedInput input[type='text'] {
        width: 20px;
    }
</style>

{#if !blueprint}
No blueprint selected yet
{:else}

<div class="combinedInput">Runs <input type="range" bind:value={runs} min={1} max={blueprint?blueprint.maxProductionLimit+9 : 20} /> <input type="text" bind:value={runs} /></div>
<p>
    Blueprint <br/>
    <label>ME <input type="range" bind:value={materialEfficiency} min={0} max={10} /> {materialEfficiency}</label>
    <label>TE <input type="range" bind:value={timeEfficiency} min={0} max={20} step={2} /> {timeEfficiency}</label>
</p>

{#if !compact}
Facility
<dl>
    <dt><label for="systemCostIndex">System cost index</label></dt> <dd><input id="systemCostIndex" bind:value={systemCostIndex} /></dd>
</dl>

Manufacturing
<dl>
    <dt>Time</dt>
    <dd title={`${manufacturingTime}s`}>{FormatDuration(manufacturingTime)}</dd>
    <dt>Job Cost</dt>
    <dd>{FormatIskAmount(manufacturingJobCost)}</dd>
</dl>
{/if}

<div class="breakdown">
    {#each Object.keys(manufacturing.products) as type_id}
        <div class="itemName" title={`${$Universe.types[type_id].name} [${type_id}]`}>{$Universe.types[type_id].name}</div>
        <div class="qty">{manufacturing.products[type_id].quantity * runs}</div>
        <div>
            Unit price
            {FormatIskAmount(sellingPrice)}
            Total Profit 
            {FormatIskChange(profit)} 
            <br/>

            <MarketOrdersBar extents={_extents} quantity={manufacturing.products[type_id].quantity * runs} 
                highestBuyOrder={relatedTypes[type_id].orders.buy[0]} lowestSellOrder={relatedTypes[type_id].orders.sell[0]} 
                buyOverheadRate={-salesTaxRate} sellOverheadRate={-brokerFeeRate-salesTaxRate}
                {totalCost}
            />
            <br/>

            Unit cost {FormatIskAmount(unitCost)}

        </div>
    {/each}
    <div>Job cost</div><div></div>
    <div>
        <MarketOrdersBar height={20} extents={_extents} quantity={manufacturing.products[selectedProductId].quantity * runs} totalCost={manufacturingJobCost} />
    </div>
    {#each Object.keys(manufacturing.materials) as type_id}
        {#if !manufacturedItems[type_id]}
            <div class="itemName">
                <label><input type="checkbox" bind:checked={manufacturedItems[type_id]} disabled={GetBlueprintToManufacture($Industry, parseInt(type_id)) == null} /> {$Universe.types[type_id].name}</label>
            </div>
            <div class="qty">{materialQty(manufacturing.materials[type_id].quantity)}</div>
            <div>
                <MarketOrdersBar height={20} extents={_extents} quantity={materialQty(manufacturing.materials[type_id].quantity)} 
                    highestBuyOrder={relatedTypes[type_id].orders.buy[0]} lowestSellOrder={relatedTypes[type_id].orders.sell[0]} 
                    buyOverheadRate={brokerFeeRate}
                />
            </div>
        {:else}
            <div class="subItem">
                <div class="itemName">
                    <label><input type="checkbox" bind:checked={manufacturedItems[type_id]} disabled={GetBlueprintToManufacture($Industry, parseInt(type_id)) == null} /> {$Universe.types[type_id].name} [{type_id}]</label>
                </div>
                <svelte:self selectedProductId={type_id} runs={materialQty(manufacturing.materials[type_id].quantity)} {manufacturedItems} bind:unitCost={manufacturedUnitCostPrices[type_id]} 
                    {systemCostIndex} {facilityMaterialConsumptionModifier}
                    compact extents={_extents} />
            </div>
        {/if}
    {/each}
</div>

{/if}