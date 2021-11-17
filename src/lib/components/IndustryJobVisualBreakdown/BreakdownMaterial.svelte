<script lang="ts">
import { getMarketType, IskAmount } from "$lib/eve-data/EveMarkets";

import type { EveTypeId } from "$lib/eve-data/EveTypes";
import type { IndustryJobStore } from "$lib/IndustryJob";


    export let job: IndustryJobStore;
    export let materialId: EveTypeId;

    export let price: IskAmount = 0;

    let market = getMarketType(materialId);
    $: { 
        price = price;
        price = $market?.orders.sell[0]?.price ?? 0;
    }

    export let x;
    export let xOffset: IskAmount = 0;

    $: valid = !isNaN($job.materialQuantity(materialId)*price)

    $: if(!valid) {
        console.log(materialId, price, $market)
    }

    let nudge = 1;
</script>


<g>
    {#if valid}
        <rect class="breakdown" x={x(xOffset)} width={`calc(${x($job.materialQuantity(materialId)*price)} - ${nudge}px)`} height="100%" />
        <rect class="mark" x={`calc(${x(xOffset+$job.materialQuantity(materialId)*price)} - ${nudge+1}px)`} width={1} height="100%" />
    {/if}
</g>