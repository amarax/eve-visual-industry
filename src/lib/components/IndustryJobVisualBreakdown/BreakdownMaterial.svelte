<script lang="ts">
import type { EveLocationId } from "$lib/eve-data/ESI";

import { getMarketType, IskAmount } from "$lib/eve-data/EveMarkets";

import type { EveTypeId } from "$lib/eve-data/EveTypes";
import type { IndustryJobStore } from "$lib/IndustryJob";
import { getContext } from "svelte";
import type { Readable } from "svelte/store";


    export let job: IndustryJobStore;
    export let materialId: EveTypeId;

    export let price: IskAmount = 0;

    let marketFilterLocation = getContext('marketFilterLocation') as Readable<EveLocationId>;

    let market = getMarketType(materialId);
    $: { 
        price = price;
        price = $market?.orders.sell?.filter(o=>$marketFilterLocation ? o.location_id===$marketFilterLocation : true)[0]?.price ?? 0;
    }

    export let x: (value:number)=>number|string;
    export let xOffset: IskAmount = 0;

    $: valid = !isNaN($job.materialQuantity(materialId)*price)

    $: if(!valid) {
        console.log(materialId, price, $market)
    }

    let nudge = 0;

    let markWidth = 1;
</script>


<g style={`transform: translate(${x(xOffset)})`}>
    {#if valid}
        <rect class="breakdown" width={x($job.materialQuantity(materialId)*price)} height="100%" />
        <rect class="mark" x={`calc(${x($job.materialQuantity(materialId)*price)} - ${markWidth/2}px)`} width={markWidth} height="100%" />
    {/if}
</g>