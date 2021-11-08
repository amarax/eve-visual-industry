<script lang="ts">
    import { EntityCollection, Location_Id, Universe } from "$lib/eve-data/EveData";
    import { CanBeProduced, GetReactionActivity, Industry, ProductToActivity, REACTION_ACTIVITY_ID } from "$lib/eve-data/EveIndustry";
    import { CreateProductionJobStore } from "$lib/IndustryJob";
    import { MarketPrices } from "./eve-data/EveMarkets";
    import { CharacterSkills } from "$lib/eve-data/EveCharacter";

    import type { Type_Id, EveLocation } from "$lib/eve-data/EveData";
    import type { IskAmount, Quantity } from "./eve-data/EveMarkets";
    import { Readable, writable, Writable } from "svelte/store";
    import type { Character_Id } from "$lib/eve-data/EveCharacter";

    import { FormatDuration, FormatIskAmount, FormatIskChange } from "./Format";
    import MarketOrdersBar from "./MarketOrdersBar.svelte";
    import LocationSelector from "./LocationSelector.svelte";
    import { getContext, setContext } from "svelte";
    import { ApplyEffects, IndustryDogmaAttributes } from "./eve-data/EveDogma";


    export let productTypeId: Type_Id = null;

    $: job = CreateProductionJobStore(productTypeId, $ProductToActivity);

    export let requiredQuantity: Quantity = null; 
    let runs: number = 1;
    let overrideRequiredQuantity: boolean = false;
    $: if(requiredQuantity === null || overrideRequiredQuantity) { 
        job.update({runs});
    } else {
        job.update({requiredQuantity});
        runs = $job.runs;
    }

    type ItemPickedList = {
        [id: Type_Id]: boolean
    }

    let prices: EntityCollection<IskAmount> = {};

    export let producedItems: ItemPickedList = {};
    let producedPrices: EntityCollection<IskAmount> = {};

    // #region Character-related

    let currentCharacter = getContext('currentCharacter') as Readable<Character_Id>;
    $: characterSkills = CharacterSkills[$currentCharacter];
    
    const REACTION_TIME_ATTRIBUTE_ID = 2660;
    $: {
        let affectingSkills = Object.values( $job.activity?.requiredSkills ?? {} )
            .map(s=>s.type_id)
            .filter((s: Type_Id)=>$IndustryDogmaAttributes.types[s] != undefined)
            .filter((s: Type_Id)=>$IndustryDogmaAttributes.types[s][REACTION_TIME_ATTRIBUTE_ID] != undefined)

        let skillModifiers = affectingSkills
            .map( (s:Type_Id) => ({value:$IndustryDogmaAttributes.types[s][REACTION_TIME_ATTRIBUTE_ID].value
                * ($characterSkills?.skills.find(c=>c.skill_id==s)?.active_skill_level ?? 0)}) )

        let skill_jobDuration = ApplyEffects(1, skillModifiers)*100 -100;

        job.update({characterModifiers:{
            skill_jobDuration
        }})
    }

    // #endregion

    // #region Facility-related

    let locations: Writable<EntityCollection<EveLocation>> = getContext('locations');   // This should be a collection of all locations
    let _filteredLocations: Writable<EntityCollection<EveLocation>> = writable({});
    setContext('locations', _filteredLocations);
    $: if($locations) {
        // For now we're just going to filter for Athanors
        const ATHANOR_TYPE_ID = 35835;
        
        let entries = Object.values($locations)
            .filter((location: EveLocation)=>location?.type_id == ATHANOR_TYPE_ID)
            .map((location: EveLocation)=>[location?.type_id, location]);
        
        _filteredLocations.set( Object.fromEntries(entries) );
    }

    export let defaultLocationId: Location_Id = null;
    let locationId: Location_Id = defaultLocationId;
    let activitySystemCostIndex = 0.05, activityTax = 10;
    $: job.update({
        facilityModifiers: {
            systemCostIndex: activitySystemCostIndex,
            taxRate: activityTax,
        }
    });

    let structureRoleBonuses, structureRigBonuses;
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

    // #endregion

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

    // #region Appearance-related

    export let compact = false;

    export let extents: Array<number> = null;
    let lowestSellPrice: IskAmount;
    let highestBuyPrice: IskAmount;
    let _extents = [0,1000];
    $: {
        if(extents === null) {
            _extents[1] = 1.1*Math.max(prices[productTypeId] ?? 0, unitCost ?? 0, lowestSellPrice ?? 0, highestBuyPrice ?? 0)*$job.producedQuantity;
            if(_extents[1] == 0 || isNaN(_extents[1])) _extents[1] = 1000;
        } else {
            _extents = extents;
        }
    }

    // #endregion
</script>

<div class={`breakdown ${!compact?"summary":""}`}>
    {#if compact}
        <div/>
    {:else}
        <div class="itemName" title={`${$Universe.types[productTypeId]?.name} [${productTypeId}]`}>{$Universe.types[productTypeId]?.name}</div>
    {/if}
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

<div class="combinedInput">
    Runs <input type="range" bind:value={runs} min={1} disabled={requiredQuantity !== null && !overrideRequiredQuantity} /> <input type="number" bind:value={runs} disabled={requiredQuantity !== null && !overrideRequiredQuantity} /> 
    {#if requiredQuantity !== null}
        <label><input type="checkbox" bind:checked={overrideRequiredQuantity} /> Override</label> 
    {/if}
</div>

<p>
    <b>Facility</b>
    <LocationSelector bind:value={locationId} activity={REACTION_ACTIVITY_ID}
        bind:activitySystemCostIndex bind:activityTax bind:structureRoleBonuses bind:structureRigBonuses />
</p>

<b>Production</b>
<dl>
    <dt>Time</dt>
    <dd title={`${$job.jobDuration}s`}>{FormatDuration($job.jobDuration)}</dd>
</dl>

<div class="breakdown">
    <div>Job cost</div><div></div>
    <div class="graph">
        <MarketOrdersBar compact extents={_extents} quantity={$job.producedQuantity} totalCost={$job.jobCost} />
    </div>

    {#each Object.keys($job.activity?.materials || {}).map(id=>parseInt(id)) as type_id}
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
                    bind:unitCost={producedPrices[type_id]} bind:producedItems
                    defaultLocationId={locationId}
                    compact
                />
            {:else}
                Could not find industry details for {$Universe.types[type_id]?.name}
            {/if}
        </div>
    {/if}
    {/each}

</div>