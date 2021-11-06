<script lang="ts">
    import { EntityCollection, Location_Id, Universe } from "$lib/eve-data/EveData";
    import { CanBeProduced, GetReactionActivity, Industry, REACTION_ACTIVITY_ID } from "$lib/eve-data/EveIndustry";
    import { CreateReactionJobStore } from "$lib/IndustryJob";
    import { MarketPrices } from "./eve-data/EveMarkets";

    import type { Type_Id } from "$lib/eve-data/EveData";
    import type { IskAmount, Quantity } from "./eve-data/EveMarkets";

    import { FormatIskAmount, FormatIskChange } from "./Format";
    import MarketOrdersBar from "./MarketOrdersBar.svelte";
import LocationSelector from "./LocationSelector.svelte";


    export let productTypeId: Type_Id = null;

    $: job = CreateReactionJobStore(productTypeId, $Industry);

    export let requiredQuantity: Quantity = null; 
    $: job.update({requiredQuantity});

    type ItemPickedList = {
        [id: Type_Id]: boolean
    }

    let prices: EntityCollection<IskAmount> = {};

    export let producedItems: ItemPickedList = {};
    let producedPrices: EntityCollection<IskAmount> = {};


    export let locationId: Location_Id = null;
    let activitySystemCostIndex, activityTax, structureRoleBonuses, structureRigBonuses;
    $: job.update({
        facilityModifiers: {
            systemCostIndex: activitySystemCostIndex,
            taxRate: activityTax,
        }
    });
    $: if(structureRoleBonuses) {
        job.update({
            facilityModifiers: {
                roleModifiers: {
                    jobDuration: structureRoleBonuses.jobDurationModifier,
                    materialConsumption: structureRoleBonuses.materialConsumptionModifier,
                    jobCost: structureRoleBonuses.jobCostModifier,
                }
            }
        });
    }
    $: if(structureRigBonuses) {
        job.update({
            facilityModifiers: {
                rigModifiers: {
                    materialReduction: structureRigBonuses.materialReductionBonus,
                    timeReduction: structureRigBonuses.timeReductionBonus,
                    costReduction: structureRigBonuses.costReductionBonus,
                }
            }
        });
    }

    // HACK to force prices to re-evaluate after a binding
    $: {
        for(let type_id in prices) {
            prices[type_id] = prices[type_id];
        }
        prices = prices;
        job.update({prices});
    }

    // Force recalculation of job when any changes happen
    $: job.update({indexPrices:$MarketPrices});

    export let unitCost: IskAmount = 0;
    $: unitCost = $job.unitCost;


    export let salesTaxRate = 0.036;
    export let brokerFeeRate = 0.0113709973928; // Selene's broker fee

    // #region Appearance-related script

    export let compact = false;

    export let extents: Array<number> = null;
    let lowestSellPrice: IskAmount;
    let highestBuyPrice: IskAmount;
    let _extents = [0,1000];
    $: {
        if(extents === null) {
            _extents[1] = 1.1*Math.max(prices[productTypeId] ?? 0, unitCost ?? 0, lowestSellPrice ?? 0, highestBuyPrice ?? 0)*$job.producedQuantity;
            if(_extents[1] == 0) _extents[1] = 1000;
        } else {
            _extents = extents;
        }
    }


    // #endregion
</script>

<div class={`breakdown ${!compact?"summary":""}`}>
    <div class="itemName" title={`${$Universe.types[productTypeId]?.name} [${productTypeId}]`}>{$Universe.types[productTypeId]?.name}</div>
    <div class="qty">{$job.producedQuantity}</div>
    <div class="graph">
        Unit price
        {FormatIskAmount(prices[productTypeId])}
        Total Profit 
        {FormatIskChange($job.profit)} 
        <br/>

        <MarketOrdersBar extents={_extents} quantity={$job.producedQuantity} 
            type_id={productTypeId}
            bind:price={prices[productTypeId]}
            buyOverheadRate={-salesTaxRate} sellOverheadRate={-brokerFeeRate-salesTaxRate}
            totalCost={$job.totalCost}
            bind:lowestSellPrice bind:highestBuyPrice
        />
        <br/>

        Unit cost {FormatIskAmount(unitCost)} Total cost {FormatIskAmount($job.totalCost)}

    </div>
</div>

<p>
    <b>Facility</b>
    <LocationSelector value={locationId} activity={REACTION_ACTIVITY_ID}
        bind:activitySystemCostIndex bind:activityTax bind:structureRoleBonuses bind:structureRigBonuses />
</p>

<div class="breakdown">
    <div>Job cost</div><div></div>
    <div class="graph">
        <MarketOrdersBar compact extents={_extents} quantity={$job.producedQuantity} totalCost={$job.totalCost} />
    </div>

    {#each Object.keys($job.activity.materials).map(id=>parseInt(id)) as type_id}
        <div class="itemName">
            <label>
                <input type="checkbox" bind:checked={producedItems[type_id]} disabled={!CanBeProduced(type_id, $Industry)} /> 
                <span title={`${$Universe.types[type_id]?.name} [${type_id}]`}>{$Universe.types[type_id]?.name}</span>
            </label>
        </div>
        <div class="qty">{$job.materialQuantity(type_id)}</div>
        <div class="graph">
            <MarketOrdersBar extents={_extents} quantity={$job.materialQuantity(type_id)} 
                {type_id} 
                bind:price={prices[type_id]} overridePrice={producedItems[type_id] ? producedPrices[type_id] : undefined}
                buyOverheadRate={brokerFeeRate}
                totalCost={producedItems[type_id] ? producedPrices[type_id]*$job.materialQuantity(type_id) : null}
                compact
            />
        </div>

        {#if producedItems[type_id]}
        <div class="subItem">
            {#if GetReactionActivity(type_id, $Industry).activity}
                <svelte:self productTypeId={type_id} requiredQuantity={$job.materialQuantity(type_id)} 
                    bind:unitCost={producedPrices[type_id]}
                />
            {:else}
                Could not find industry details for {$Universe.types[type_id]?.name}
            {/if}
        </div>
    {/if}
    {/each}

</div>