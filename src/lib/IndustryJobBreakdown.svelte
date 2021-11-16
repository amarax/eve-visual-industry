<script lang="ts">
    import { EntityCollection, Location_Id, Universe } from "$lib/eve-data/EveData";
    import { CanBeProduced, GetInventableBlueprint, Industry, MANUFACTURING_ACTIVITY_ID, ProductToActivity } from "$lib/eve-data/EveIndustry";
    import { CreateProductionJobStore, GetAffectingSkillModifiers, ModifiersFromCharacter, ModifiersFromLocationInfo } from "$lib/IndustryJob";
    import type { IndustryJobStore } from "$lib/IndustryJob";
    import { MarketPrices } from "./eve-data/EveMarkets";
    import { CharacterImplants, CharacterSkills } from "$lib/eve-data/EveCharacter";

    import type { Type_Id, EveLocation } from "$lib/eve-data/EveData";
    import type { IskAmount, Quantity } from "$lib/eve-data/EveMarkets";
    import type { Readable } from "svelte/store";
    import type { EveCharacterId } from "$lib/eve-data/EveCharacter";
    import type { EveBlueprint } from "./eve-data/ESI";

    import { FormatDuration, FormatIskAmount, FormatIskChange } from "$lib/Format";
    import MarketOrdersBar from "$lib/components/MarketOrdersBar.svelte";
    import { getContext } from "svelte";
    import FacilitySelector from "./components/FacilitySelector.svelte";
    import InventionActivity from "./InventionActivity.svelte";


    export let productTypeId: Type_Id = null;
    export let job: IndustryJobStore = null;
    let _job: IndustryJobStore;
    $: if(!job) {
        if(productTypeId && $ProductToActivity.size !== 0)
            _job = CreateProductionJobStore(productTypeId, $ProductToActivity);
    } else {
        _job = job;
    }
    $: _productTypeId = $_job?.selectedProduct;

    export let blueprint: EveBlueprint = null;
    $: if(blueprint) {
        _job.update({blueprintModifiers:{
            materialEfficiency: blueprint.material_efficiency,
            timeEfficiency: blueprint.time_efficiency
        }})
    }

    $: inventable = GetInventableBlueprint($Industry, $ProductToActivity.get(productTypeId)?.type.type_id);
    let inventing: boolean = false;
    let inventedRuns = 1;
    $: if(inventing) {
        _job.update({runs: inventedRuns})
    }

    let blueprintCostPerRun: IskAmount = 0;
    $: _job?.update({blueprintCostPerRun});

    export let requiredQuantity: Quantity = null; 
    let overrideRequiredQuantity: boolean = false;
    $: if(requiredQuantity !== null && !overrideRequiredQuantity) { 
        _job.update({requiredQuantity});
    }

    type ItemPickedList = {
        [id: Type_Id]: boolean
    }

    let prices: EntityCollection<IskAmount> = {};

    export let producedItems: ItemPickedList = {};
    let producedPrices: EntityCollection<IskAmount> = {};

    // #region Character-related

    let currentCharacter = getContext('currentCharacter') as Readable<EveCharacterId>;
    $: characterSkills = CharacterSkills[$currentCharacter];
    $: characterImplants = CharacterImplants[$currentCharacter]
    
    $: affectingSkills = _job && GetAffectingSkillModifiers($_job.activity, $characterSkills);
    $: _job?.update({characterModifiers:ModifiersFromCharacter($_job.activity, $characterSkills, $characterImplants)})

    // #endregion

    // #region Facility-related

    export let location: Location_Id = null;

    // #endregion

    // HACK to force prices to re-evaluate after a binding
    $: {
        for(let type_id in prices) {
            prices[type_id] = prices[type_id];
        }
        prices = prices;
        _job?.update({prices});
    }

    // Force recalculation of _job when any changes happen
    $: _job?.update({indexPrices:$MarketPrices});

    export let unitCost: IskAmount = 0;
    $: unitCost = $_job?.unitCost;

    export let salesTaxRate = 0.036;
    export let brokerFeeRate = 0.0113709973928; // Selene's broker fee

    // #region Appearance-related

    export let compact = false;

    export let extents: Array<number> = null;
    let lowestSellPrice: IskAmount;
    let highestBuyPrice: IskAmount;
    let _extents = [0,1000];
    $: {
        if(extents === null) {
            _extents[1] = 1.1*Math.max(prices[_productTypeId] ?? 0, unitCost ?? 0, lowestSellPrice ?? 0, highestBuyPrice ?? 0)*$_job?.producedQuantity;
            if(_extents[1] == 0 || isNaN(_extents[1])) _extents[1] = 1000;
        } else {
            _extents = extents;
        }
    }

    // #endregion

    let maxRuns: number;
    $: {
        maxRuns = blueprint?.runs;
        if(maxRuns == -1) {
            maxRuns = $Industry.types[blueprint.type_id].maxProductionLimit;
        }
    }

    let materialEfficiency: number = blueprint?.material_efficiency ?? 0;
    let timeEfficiency: number = blueprint?.time_efficiency ?? 0;
    $: if(!blueprint) {
        _job?.update({blueprintModifiers:{
            materialEfficiency,
            timeEfficiency
        }})
    }
</script>

<style lang="scss">
    .combinedInput {
        input[type=number] {
            width: 60px;
            text-align: right;
        }
    }
</style>

{#if !_job}
No product selected
{:else}
<div class={`breakdown ${!compact?"summary":""}`}>
    {#if compact}
        <div/>
    {:else}
        <div class="itemName" title={`${$Universe.types[_productTypeId]?.name} [${_productTypeId}]`}>{$Universe.types[_productTypeId]?.name}</div>
    {/if}
    <div class="qty">{$_job.producedQuantity}</div>
    <div class="graph">
        Unit price
        {FormatIskAmount(prices[_productTypeId])}
        Total Profit 
        {FormatIskChange($_job.profit)} 
        <br/>

        <MarketOrdersBar extents={_extents} quantity={$_job.producedQuantity} 
            type_id={_productTypeId}
            bind:price={prices[_productTypeId]}
            buyOverheadRate={-salesTaxRate} sellOverheadRate={-brokerFeeRate-salesTaxRate}
            totalCost={$_job.totalCost}
            bind:lowestSellPrice bind:highestBuyPrice
        />
        <br/>

        Unit cost {FormatIskAmount(unitCost)} Total cost {FormatIskAmount($_job.totalCost)}

    </div>
</div>

<div class="combinedInput">
    Runs <input type="range" value={$_job.runs} on:input={event=>!isNaN(parseInt(event.currentTarget.value)) && _job.update({runs:parseInt(event.currentTarget.value)})} min={1} max={maxRuns} disabled={requiredQuantity !== null && !overrideRequiredQuantity} /> 
    <input type="number" value={$_job.runs} on:input={event=>!isNaN(parseInt(event.currentTarget.value)) && _job.update({runs:parseInt(event.currentTarget.value)})} disabled={requiredQuantity !== null && !overrideRequiredQuantity} /> 
    {#if requiredQuantity !== null}
        <label><input type="checkbox" bind:checked={overrideRequiredQuantity} /> Override</label> 
    {/if}
</div>

<p>
    <b>Blueprint</b> <br/>

    {#if $_job.activity.activity.activityID === MANUFACTURING_ACTIVITY_ID}
        <label><input type="checkbox" bind:checked={inventing} disabled={!inventable || blueprint != null} /> Invent</label>        <br/>

        {#if inventing}
            <div class="subItem">
                <InventionActivity blueprintToInvent={$ProductToActivity.get(productTypeId).type} 
                    bind:expectedCostPerRun={blueprintCostPerRun} bind:productME={materialEfficiency} bind:productTE={timeEfficiency} bind:productRuns={inventedRuns}
                />
            </div>
        {/if}

        <label>ME <input type="range" bind:value={materialEfficiency} min={0} max={10} disabled={inventing || blueprint!=null} /> {materialEfficiency}</label>
        <label>TE <input type="range" bind:value={timeEfficiency} min={0} max={20} step={2} disabled={inventing || blueprint!=null} /> {timeEfficiency}</label>
        <br/>
    {/if}
    
    <label>Cost per run <input type="number" bind:value={blueprintCostPerRun} disabled={inventing} /></label>
</p>

<p>
    <b>Facility</b>
    <FacilitySelector activity={$_job.activity.activity.activityID} bind:value={location} on:change={event=>_job.update({facilityModifiers:event.detail})} />
</p>

<b>Production</b>
<dl>
    <dt>Time</dt>
    <dd title={`${$_job.jobDuration}s`}>{FormatDuration($_job.jobDuration)}</dd>
</dl>

<div class="breakdown">
    <div>Job cost</div><div></div>
    <div class="graph">
        <MarketOrdersBar compact extents={_extents} quantity={$_job.producedQuantity} totalCost={$_job.jobCost} />
    </div>

    {#each Object.keys($_job.activity?.materials || {}).map(id=>parseInt(id)) as type_id}
        <div class="itemName">
            <label>
                <input type="checkbox" bind:checked={producedItems[type_id]} disabled={!CanBeProduced(type_id, $Industry)} /> 
                <span title={`${$Universe.types[type_id]?.name} [${type_id}]`}>{$Universe.types[type_id]?.name}</span>
            </label>
        </div>
        <div class="qty">{$_job.materialQuantity(type_id)}</div>
        <div class="graph">
            <MarketOrdersBar extents={_extents} quantity={$_job.materialQuantity(type_id)} 
                {type_id} 
                bind:price={prices[type_id]} overridePrice={producedItems[type_id] ? producedPrices[type_id] : undefined}
                buyOverheadRate={brokerFeeRate}
                totalCost={producedItems[type_id] ? producedPrices[type_id]*$_job.materialQuantity(type_id) : null}
                compact
            />
        </div>

        {#if producedItems[type_id]}
        <div class="subItem">
            {#if CanBeProduced(type_id, $Industry)}
                <svelte:self productTypeId={type_id} requiredQuantity={$_job.materialQuantity(type_id)} 
                    bind:unitCost={producedPrices[type_id]} bind:producedItems
                    {location}
                    compact
                />
            {:else}
                {$Universe.types[type_id]?.name} cannot be produced
            {/if}
        </div>
    {/if}
    {/each}

</div>
{/if}