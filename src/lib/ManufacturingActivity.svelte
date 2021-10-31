<script lang="ts">
    import { EveLocation, GetLocationStore, Location_Id, Universe } from "$lib/EveData";
    import { MANUFACTURING_ACTIVITY_ID, Industry, GetBlueprintToManufacture, GetInventableBlueprint, ADVANCED_INDUSTRY_SKILL_ID, IndustrySystems } from "$lib/EveIndustry";
    import { getMarketType, IskAmount, MarketOrder, MarketPrices } from "$lib/EveMarkets";

    import type { EntityCollection, Type_Id } from "$lib/EveData";
    import type { IndustryActivity } from "$lib/EveIndustry";
    import type { MarketType, Quantity } from "$lib/EveMarkets";

    import MarketOrdersBar from "./MarketOrdersBar.svelte";
    import { FormatDuration, FormatIskAmount, FormatIskChange } from "./Format";
    import InventionActivity from "./InventionActivity.svelte";
    import { IndustryDogmaAttributes } from "./EveDogma";
    import { CharacterSkills } from "./EveCharacter";
    import LocationSelector from "./LocationSelector.svelte";
    import type { ESIStore } from "./ESIStore";



    $: blueprint = GetBlueprintToManufacture($Industry, selectedProductId);
    let blueprintCostPerRun: IskAmount = 0;

    $: inventable = GetInventableBlueprint($Industry, blueprint?.type_id);

    let relatedTypeStores = [];
    let relatedTypes: EntityCollection<MarketType> = {};

    export let selectedProductId: Type_Id = null;


    export let salesTaxRate = 0.036;
    export let brokerFeeRate = 0.0113709973928; // Selene's broker fee

    function subscribeToTypeStore( type_id: Type_Id ) {
        relatedTypeStores.push( getMarketType(type_id).subscribe(value=>{
            relatedTypes[type_id] = value;
        }) );
    }

    export let quantity: Quantity = null;

    let runs: number = 1;

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
        let nextManufacturing = blueprint?.activities[MANUFACTURING_ACTIVITY_ID];

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

                // Initialise runs to default to the amount required to produce the quantity
                if(quantity)
                    runs = Math.ceil( quantity / manufacturing.products[selectedProductId].quantity );
            }
        }
    }

    // Currently it's safer to just have the runs defined by quantity,
    // if not I'll forget it's a bug
    $: if(quantity) {
        //runs = Math.ceil( quantity / manufacturing?.products[selectedProductId].quantity );
    }
    


    export let selectedLocationId: Location_Id = null;

    let systemCostIndex = 0.01;
    let selectedLocation: ESIStore<EveLocation> = null;
    $: {
        if(selectedLocationId) selectedLocation = GetLocationStore(selectedLocationId);
        if($selectedLocation) {
            systemCostIndex = $IndustrySystems?.find(system=>system.solar_system_id === ($selectedLocation.solar_system_id ?? $selectedLocation.system_id)).cost_indices.find(value=>value.activity=="manufacturing").cost_index;
        } else {
            systemCostIndex = 0.01;
        }
    }


    let materialQty = (baseQuantity: Quantity): Quantity => baseQuantity;
    $: {
        materialQty = (qty) => Math.max( runs, Math.ceil( qty * runs * (1-materialEfficiency/100) * (1+($selectedLocation?.modifiers?.materialConsumptionModifier ?? 0)/100)) );
    }

    let manufacturedUnitCostPrices: EntityCollection<IskAmount> = {};

    function getFirstOrder(orders: Array<MarketOrder>, marketFilterLocation: Location_Id): MarketOrder {
        if(!orders) return null;

        if(marketFilterLocation) {
            return orders.filter(order=>order.location_id === marketFilterLocation)[0];
        }
        return orders[0];
    }

    let totalCost = 0;
    $: {
        totalCost = 0;
        if(manufacturing) {

            for(let type_id in manufacturing.materials) {
                let materialQuantity = materialQty(manufacturing.materials[type_id].quantity);

                totalCost += materialQuantity * (
                    manufacturedUnitCostPrices[type_id] || 
                    getFirstOrder(relatedTypes[type_id].orders.sell, marketFilterLocation)?.price ||
                    0
                );
            }

            totalCost += manufacturingJobCost;
            totalCost += blueprintCostPerRun * runs;
        }
    }

    $: {
        // Reset items that are not marked as manufactured
        for(let type_id in manufacturedUnitCostPrices) {
            if(!manufacturedItems[type_id]) manufacturedUnitCostPrices[type_id] = undefined;
        }
    }

    export let marketFilterLocation: Location_Id = null;

    export let extents: Array<number> = null;
    let _extents = [0,1000];
    $: {
        if(extents === null) {
            if(manufacturing) {
                let prices = [];

                if(relatedTypes[selectedProductId].orders.lastUpdated !== null) {
                    let {buy, sell} = relatedTypes[selectedProductId].orders;
                    if(marketFilterLocation) {
                        buy = buy.filter(order=>order.location_id === marketFilterLocation);
                        sell = sell.filter(order=>order.location_id === marketFilterLocation);
                    }

                    let productQuantity = manufacturing.products[selectedProductId].quantity * runs;
                    if(buy.length > 0) prices.push( productQuantity * buy[0].price );
                    if(sell.length > 0) prices.push( productQuantity * sell[0].price );
                }

                _extents[1] = 1.1*Math.max(...prices, totalCost);
            }
        } else {
            _extents = extents;
        }
    }

    let totalAdjustedCostPrice = 0;
    $: {
        totalAdjustedCostPrice = 0;
        if(manufacturing) {
            for(let type_id in manufacturing.materials) {
                totalAdjustedCostPrice += manufacturing.materials[type_id].quantity * $MarketPrices[type_id].adjusted_price;
            }
        }
    }


    $: manufacturingJobCost = totalAdjustedCostPrice * systemCostIndex * (1+($selectedLocation?.modifiers?.jobCostModifier ?? 0)/100) * (1+($selectedLocation?.modifiers?.facilityTax ?? 0)/100) * runs;

    $: characterSkills = CharacterSkills[selectedCharacterId];

    // TODO list all contributing skills
    $: skillTimeModifier = manufacturing ? [...Object.values(manufacturing.requiredSkills).map(s=>s.type_id), ADVANCED_INDUSTRY_SKILL_ID]
        .reduce((modifier: number, skill_id)=>{
            if($IndustryDogmaAttributes.types[skill_id] === undefined) {return modifier;}   // Skill does not contribute to modifier

            // let contributingSkill = $Universe.types[skill_id];

            let factor = $IndustryDogmaAttributes.types[skill_id][440]?.value ?? $IndustryDogmaAttributes.types[skill_id][1982]?.value ??  $IndustryDogmaAttributes.types[skill_id][1961]?.value ?? 0;
            factor *= $characterSkills?.skills.find(s=>s.skill_id==skill_id)?.active_skill_level ?? 0;

            return modifier*(1+factor*0.01)
        },1) : 1

    $: manufacturingTime = manufacturing?.time * (1-timeEfficiency/100) * skillTimeModifier * (1+($selectedLocation?.modifiers?.jobDurationModifier ?? 0)/100) * runs;

    $: sellingPrice = getFirstOrder(relatedTypes[selectedProductId]?.orders.sell, marketFilterLocation)?.price*(1-brokerFeeRate-salesTaxRate);

    $: profit = sellingPrice*runs - totalCost

    export let unitCost = null;
    $: {
        unitCost = manufacturing ? totalCost/(manufacturing.products[selectedProductId].quantity * runs) : null;
    }

    export let compact = false;

    let inventing = false;
    let inventedRuns: number = 10;

    $: {
        if(!inventable) inventing = false;
    }

    $: {
        if(inventing) {
            runs = inventedRuns;
        }
    }

    export let selectedCharacterId;
</script>

<style lang="scss">
    dl {
        display: grid;
        grid-template-columns: 150px 1fr;

        margin-top: 0px;
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
        grid-template-columns: 1fr 80px 500px;

        max-width: 800px;

        .itemName {
            overflow-x: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;

        }

        .qty {
            text-align: right;
            margin-right: 10px;
        }

    }

    .subItem {
        grid-column: span 3;

        $divider: 1px solid #ccc;

        border-top: $divider;
        border-bottom: $divider;

        margin-bottom: 4px;
        margin-left:24px;
    }

    .combinedInput input[type='text'] {
        width: 30px;
        text-align: right;
    }
</style>

{#if !blueprint}
No blueprint selected yet
{:else}

<div class="combinedInput">Runs <input type="range" bind:value={runs} min={1} max={inventing ? inventedRuns : blueprint?.maxProductionLimit} /> <input type="text" bind:value={runs} /></div>
<p>
    <b>Blueprint</b> <br/>

    {#if inventable}
        <label><input type="checkbox" bind:checked={inventing} /> Invent</label>        <br/>

        {#if inventing}
            <div class="subItem">
                <InventionActivity {selectedCharacterId} blueprintToInvent={blueprint} extents={_extents} 
                    bind:expectedCostPerRun={blueprintCostPerRun} bind:productME={materialEfficiency} bind:productTE={timeEfficiency} bind:productRuns={inventedRuns}
                />
            </div>
        {/if}
    {/if}

    <label>ME <input type="range" bind:value={materialEfficiency} min={0} max={10} disabled={inventing} /> {materialEfficiency}</label>
    <label>TE <input type="range" bind:value={timeEfficiency} min={0} max={20} step={2} disabled={inventing} /> {timeEfficiency}</label>
    <br/>
    
    <label>Cost per run <input type="text" bind:value={blueprintCostPerRun} disabled={inventing} /></label>
</p>

{#if !compact}
<b>Facility</b>
<LocationSelector bind:value={selectedLocationId} />
<dl>
    <dt>System cost index</dt> <dd>{systemCostIndex}</dd>
</dl>

<b>Manufacturing</b>
<dl>
    <dt>Time</dt>
    <dd title={`${manufacturingTime}s`}>{FormatDuration(manufacturingTime)}</dd>
    <dt>Job Cost</dt>
    <dd>{FormatIskAmount(manufacturingJobCost)}</dd>
</dl>
{/if}

<div class="breakdown">
    {#each Object.keys(manufacturing.products) as type_id}
        <div class="itemName" title={`${$Universe.types[type_id]?.name} [${type_id}]`}>{$Universe.types[type_id]?.name}</div>
        <div class="qty">{manufacturing.products[type_id].quantity * runs}</div>
        <div>
            Unit price
            {FormatIskAmount(sellingPrice)}
            Total Profit 
            {FormatIskChange(profit)} 
            <br/>

            <MarketOrdersBar extents={_extents} quantity={manufacturing.products[type_id].quantity * runs} 
                type_id={parseInt(type_id)} {marketFilterLocation}
                buyOverheadRate={-salesTaxRate} sellOverheadRate={-brokerFeeRate-salesTaxRate}
                {totalCost}
            />
            <br/>

            Unit cost {FormatIskAmount(unitCost)} Total cost {FormatIskAmount(totalCost)}

        </div>
    {/each}
    <div>Job cost</div><div></div>
    <div>
        <MarketOrdersBar height={20} extents={_extents} quantity={manufacturing.products[selectedProductId].quantity * runs} totalCost={manufacturingJobCost} />
    </div>
    {#each Object.keys(manufacturing.materials) as type_id}
        <div class="itemName">
            <label>
                <input type="checkbox" bind:checked={manufacturedItems[type_id]} disabled={GetBlueprintToManufacture($Industry, parseInt(type_id)) == null} /> 
                <span title={`${$Universe.types[type_id]?.name} [${type_id}]`}>{$Universe.types[type_id]?.name}</span>
            </label>
        </div>
        <div class="qty">{materialQty(manufacturing.materials[type_id].quantity)}</div>
        <div>
            <MarketOrdersBar height={20} extents={_extents} quantity={materialQty(manufacturing.materials[type_id].quantity)} 
                type_id={parseInt(type_id)} {marketFilterLocation}
                buyOverheadRate={brokerFeeRate}
                totalCost={manufacturedUnitCostPrices[type_id] ? manufacturedUnitCostPrices[type_id]*materialQty(manufacturing.materials[type_id].quantity) : null}
            />
        </div>
        {#if manufacturedItems[type_id]}
            <div class="subItem">
                <svelte:self selectedProductId={type_id} quantity={materialQty(manufacturing.materials[type_id].quantity)} {manufacturedItems}
                    bind:unitCost={manufacturedUnitCostPrices[type_id]} 
                    materialEfficiency={10} timeEfficiency={20}
                    {selectedCharacterId} {selectedLocationId} {marketFilterLocation}
                    compact />
            </div>
        {/if}
    {/each}
</div>

{/if}