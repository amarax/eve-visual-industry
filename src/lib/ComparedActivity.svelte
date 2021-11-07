<script lang="ts">


    import { EntityCollection, Universe } from "$lib/eve-data/EveData";
    import type { Type_Id } from "$lib/eve-data/EveData";

    import { Industry } from "$lib/eve-data/EveIndustry";
    import { CreateReactionJobStore, IndustryFacilityModifiers } from "$lib/IndustryJob";
    import { IskAmount, MarketPrices } from "$lib/eve-data/EveMarkets";
    import MarketOrdersBar from "./MarketOrdersBar.svelte";
import { FormatPercentageChange } from "./Format";



    export let productTypeId: Type_Id = null;
    $: job = CreateReactionJobStore(productTypeId, $Industry);
    $: job.update({indexPrices:$MarketPrices});

    export let prices: EntityCollection<IskAmount>;
    $: job.update({prices});

    export let facilityModifiers: IndustryFacilityModifiers;
    $: if(facilityModifiers) job.update({facilityModifiers})

    export let salesTaxRate = 0.036;
    export let brokerFeeRate = 0.0113709973928; // Selene's broker fee

    export let profitRatio: number;
    $: profitRatio = $job?.profit / $job?.totalCost;
    

    export let extents: Array<number> = [0,1000]
</script>

<div class="breakdown">
    <div class="itemName" title={`${$Universe.types[productTypeId]?.name} [${productTypeId}]`}>{$Universe.types[productTypeId]?.name}</div>
    <div class="qty">{FormatPercentageChange(profitRatio)}</div>
    <div class="graph">
        <MarketOrdersBar type_id={productTypeId} 
            quantity={$job.producedQuantity} totalCost={$job.totalCost} 
            bind:price={prices[productTypeId]}
            buyOverheadRate={-salesTaxRate} sellOverheadRate={-brokerFeeRate-salesTaxRate}
            {extents} />
    </div>
</div>