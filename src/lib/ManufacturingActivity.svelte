<script lang="ts">
    import { Universe } from "$lib/eve-data/EveData";
    import { MANUFACTURING_ACTIVITY_ID, Industry, GetBlueprintToManufacture, GetInventableBlueprint, ADVANCED_INDUSTRY_SKILL_ID, IndustrySystems } from "$lib/eve-data/EveIndustry";
    import { IskAmount, MarketPrices } from "$lib/eve-data/EveMarkets";
    import { IndustryDogmaAttributes } from "$lib/eve-data/EveDogma";
    import { CharacterSkills } from "$lib/eve-data/EveCharacter";

    import type { Location_Id, EntityCollection, Type_Id } from "$lib/eve-data/EveData";
    import type { IndustryActivity } from "$lib/eve-data/EveIndustry";
    import type { Quantity } from "$lib/eve-data/EveMarkets";

    import MarketOrdersBar from "./MarketOrdersBar.svelte";
    import { FormatDuration, FormatIskAmount, FormatIskChange } from "$lib/Format";
    import InventionActivity from "./InventionActivity.svelte";
    import LocationSelector from "./LocationSelector.svelte";



    $: blueprint = GetBlueprintToManufacture($Industry, selectedProductId);
    let blueprintCostPerRun: IskAmount = 0;

    $: inventable = GetInventableBlueprint($Industry, blueprint?.type_id);

    export let selectedProductId: Type_Id = null;


    export let salesTaxRate = 0.036;
    export let brokerFeeRate = 0.0113709973928; // Selene's broker fee

    export let requiredQuantity: Quantity = null;

    let runs: number = 1;

    export let materialEfficiency: number = 0;
    export let timeEfficiency: number = 0;

    type ItemPickedList = {
        [id: Type_Id]: boolean
    }
    export let manufacturedItems: ItemPickedList = {};


    let manufacturing: IndustryActivity = null;
    $: {
        let nextManufacturing = blueprint?.activities[MANUFACTURING_ACTIVITY_ID];

        if(nextManufacturing != manufacturing) {
            manufacturing = nextManufacturing;

            if(manufacturing) {
                // Initialise runs to default to the amount required to produce the quantity
                if(requiredQuantity)
                    runs = Math.ceil( requiredQuantity / manufacturing.products[selectedProductId].quantity );
            }
        }
    }

    // Currently it's safer to just have the runs defined by quantity,
    // if not I'll forget it's a bug
    $: if(requiredQuantity) {
        //runs = Math.ceil( requiredQuantity / manufacturing?.products[selectedProductId].quantity );
    }
    


    export let selectedLocationId: Location_Id = null;

    let activitySystemCostIndex, activityTax, structureRoleBonuses, structureRigBonuses;
    let materialQty = (baseQuantity: Quantity): Quantity => baseQuantity;
    $: {
        materialQty = (qty) => Math.max( runs, Math.ceil( qty * runs * (1-materialEfficiency/100) * (1+(structureRoleBonuses?.materialConsumptionModifier ?? 0)/100) * (1+(structureRigBonuses?.materialReductionBonus ?? 0)/100)) );
    }

    let manufacturedUnitCostPrices: EntityCollection<IskAmount> = {};

    let itemPrices: EntityCollection<number> = {};
    let totalCost = 0;
    $: {
        totalCost = 0;
        if(manufacturing) {
            for(let type_id in manufacturing.materials) {
                let materialQuantity = materialQty(manufacturing.materials[type_id].quantity);

                totalCost += materialQuantity * itemPrices[type_id];
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

    let totalAdjustedCostPrice = 0;
    $: {
        totalAdjustedCostPrice = 0;
        if(manufacturing) {
            for(let type_id in manufacturing.materials) {
                // If the adjusted price is not available, treat the price as 0
                // Verified behaviour on Tranquility on 1 Nov 2021
                totalAdjustedCostPrice += manufacturing.materials[type_id].quantity * ($MarketPrices[type_id]?.adjusted_price ?? 0);
            }
        }
    }

    $: manufacturingJobCost = totalAdjustedCostPrice * activitySystemCostIndex * (1+(structureRoleBonuses?.jobCostModifier ?? 0)/100) * (1+activityTax/100) * runs;

    $: characterSkills = CharacterSkills[selectedCharacterId];

    // TODO list all contributing skills
    $: skillTimeModifier = manufacturing ? [...Object.values(manufacturing.requiredSkills || {}).map(s=>s.type_id), ADVANCED_INDUSTRY_SKILL_ID]
        .reduce((modifier: number, skill_id)=>{
            if($IndustryDogmaAttributes.types[skill_id] === undefined) {return modifier;}   // Skill does not contribute to modifier

            // let contributingSkill = $Universe.types[skill_id];

            let factor = $IndustryDogmaAttributes.types[skill_id][440]?.value ?? $IndustryDogmaAttributes.types[skill_id][1982]?.value ??  $IndustryDogmaAttributes.types[skill_id][1961]?.value ?? 0;
            factor *= $characterSkills?.skills.find(s=>s.skill_id==skill_id)?.active_skill_level ?? 0;

            return modifier*(1+factor*0.01)
        },1) : 1

    $: manufacturingTime = manufacturing?.time * (1-timeEfficiency/100) * skillTimeModifier * (1+(structureRoleBonuses?.jobDurationModifier ?? 0)/100) * (1+(structureRigBonuses?.timeReductionBonus ?? 0)/100) * runs;

    $: sellingPrice = itemPrices[selectedProductId];
    $: producedQty = manufacturing?.products[selectedProductId].quantity*runs;
    $: profit = sellingPrice*producedQty - totalCost

    export let unitCost = null;
    $: {
        unitCost = manufacturing ? totalCost/producedQty : null;
    }

    // export let compact: boolean = false;

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


    export let extents: Array<number> = null;
    let lowestSellPrice: IskAmount;
    let highestBuyPrice: IskAmount;
    let _extents = [0,1000];
    $: {
        if(extents === null) {
            if(manufacturing) {
                _extents[1] = 1.1*Math.max(itemPrices[selectedProductId], unitCost, lowestSellPrice ?? 0, highestBuyPrice ?? 0)*producedQty;
            }
        } else {
            _extents = extents;
        }
    }


</script>

<style lang="scss">
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

    .combinedInput input[type='number'] {
        width: 60px;
        text-align: right;
    }
</style>

{#if !blueprint}
No blueprint selected yet
{:else}

<div class="combinedInput">Runs <input type="range" bind:value={runs} min={1} max={inventing ? inventedRuns : blueprint?.maxProductionLimit} /> <input type="number" bind:value={runs} /></div>
<p>
    <b>Blueprint</b> <br/>

    <label><input type="checkbox" bind:checked={inventing} disabled={!inventable} /> Invent</label>        <br/>

    {#if inventing}
        <div class="subItem">
            <InventionActivity {selectedCharacterId} blueprintToInvent={blueprint} 
                {marketFilterLocation}
                bind:expectedCostPerRun={blueprintCostPerRun} bind:productME={materialEfficiency} bind:productTE={timeEfficiency} bind:productRuns={inventedRuns}
            />
        </div>
    {/if}

    <label>ME <input type="range" bind:value={materialEfficiency} min={0} max={10} disabled={inventing} /> {materialEfficiency}</label>
    <label>TE <input type="range" bind:value={timeEfficiency} min={0} max={20} step={2} disabled={inventing} /> {timeEfficiency}</label>
    <br/>
    
    <label>Cost per run <input type="number" bind:value={blueprintCostPerRun} disabled={inventing} /></label>
</p>

<b>Facility</b>
<LocationSelector bind:value={selectedLocationId} activity={MANUFACTURING_ACTIVITY_ID}
    bind:activitySystemCostIndex bind:activityTax bind:structureRoleBonuses bind:structureRigBonuses />

<b>Manufacturing</b>
<dl>
    <dt>Time</dt>
    <dd title={`${manufacturingTime}s`}>{FormatDuration(manufacturingTime)}</dd>
    <dt>Job Cost</dt>
    <dd>{FormatIskAmount(manufacturingJobCost)}</dd>
</dl>

<div class="breakdown">
    <div class="itemName" title={`${$Universe.types[selectedProductId]?.name} [${selectedProductId}]`}>{$Universe.types[selectedProductId]?.name}</div>
    <div class="qty">{producedQty}</div>
    <div>
        Unit price
        {FormatIskAmount(sellingPrice)}
        Total Profit 
        {FormatIskChange(profit)} 
        <br/>

        <MarketOrdersBar extents={_extents} quantity={producedQty} 
            type_id={selectedProductId} {marketFilterLocation}
            bind:price={itemPrices[selectedProductId]}
            buyOverheadRate={-salesTaxRate} sellOverheadRate={-brokerFeeRate-salesTaxRate}
            {totalCost}
            bind:lowestSellPrice bind:highestBuyPrice
        />
        <br/>

        Unit cost {FormatIskAmount(unitCost)} Total cost {FormatIskAmount(totalCost)}

    </div>

    <div>Job cost</div><div></div>
    <div>
        <MarketOrdersBar compact extents={_extents} quantity={producedQty} totalCost={manufacturingJobCost} />
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
            <MarketOrdersBar extents={_extents} quantity={materialQty(manufacturing.materials[type_id].quantity)} 
                type_id={parseInt(type_id)} {marketFilterLocation} 
                bind:price={itemPrices[type_id]} overridePrice={manufacturedUnitCostPrices[type_id]}
                buyOverheadRate={brokerFeeRate}
                totalCost={manufacturedUnitCostPrices[type_id] ? manufacturedUnitCostPrices[type_id]*materialQty(manufacturing.materials[type_id].quantity) : null}
                compact
            />
        </div>
        {#if manufacturedItems[type_id]}
            <div class="subItem">
                <svelte:self selectedProductId={type_id} requiredQuantity={materialQty(manufacturing.materials[type_id].quantity)} {manufacturedItems}
                    bind:unitCost={manufacturedUnitCostPrices[type_id]} 
                    materialEfficiency={10} timeEfficiency={20}
                    {selectedCharacterId} {selectedLocationId} {marketFilterLocation}
                    compact />
            </div>
        {/if}
    {/each}
</div>

{/if}