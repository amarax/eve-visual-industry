<script lang="ts">


    import { EntityCollection, Universe } from "$lib/eve-data/EveData";
    import type { Type_Id } from "$lib/eve-data/EveData";

    import { Industry, ProductToActivity } from "$lib/eve-data/EveIndustry";
    import { CreateProductionJobStore, IndustryFacilityModifiers } from "$lib/IndustryJob";
    import { IskAmount, MarketPrices } from "$lib/eve-data/EveMarkets";
    import MarketOrdersBar from "$lib/components/MarketOrdersBar.svelte";

    import { FormatIskChange, FormatPercentageChange } from "$lib/Format";
    import { base as basePath } from '$app/paths';



    export let productTypeId: Type_Id = null;
    $: job = CreateProductionJobStore(productTypeId, $ProductToActivity);
    $: job.update({indexPrices:$MarketPrices});

    export let prices: EntityCollection<IskAmount>;
    $: job.update({prices});

    export let facilityModifiers: IndustryFacilityModifiers;
    $: if(facilityModifiers) job.update({facilityModifiers})

    export let salesTaxRate = 0.036;
    export let brokerFeeRate = 0.0113709973928; // Selene's broker fee

    export let profitRatio: number = 0;
    $: profitRatio = $job?.profit / $job?.totalCost;
    
    export let profitPerDay: number = 0;
    $: profitPerDay = $job?.profit * (24*60*60)/$job?.jobDuration;

    export let extents: Array<number> = [0,1000]

    export let priceUpperBound: IskAmount = 0;
    let lowestSellPrice: IskAmount;
    $: priceUpperBound = Math.max( $job?.totalCost, prices[productTypeId] * $job?.producedQuantity ?? 0, lowestSellPrice )

    // TODO factor in character skills
</script>

<style lang="scss">
    .itemName { 
		overflow-x: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
    }

    .metric {
        text-align: end;
    }
</style>

<div class="itemName" title={`${$Universe.types[productTypeId]?.name} [${productTypeId}]`}><a href={`${basePath}/breakdown/${productTypeId}`}>{$Universe.types[productTypeId]?.name}</a></div>
<div class="metric">{FormatPercentageChange(profitRatio)}</div>
<div class="metric">{FormatIskChange(profitPerDay)}</div>
<div class="graph">
    <MarketOrdersBar type_id={productTypeId} 
        quantity={$job.producedQuantity} totalCost={$job.totalCost} 
        bind:price={prices[productTypeId]}
        buyOverheadRate={-salesTaxRate} sellOverheadRate={-brokerFeeRate-salesTaxRate}
        bind:lowestSellPrice
        {extents} />
</div>