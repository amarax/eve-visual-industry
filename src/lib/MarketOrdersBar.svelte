<script lang="ts">
    import type { MarketOrder } from "./EveMarkets";




    export let height = 30;
    export let width = 300;

    export let extents: Array<number> = [0,1000];

    export let highestBuyOrder: MarketOrder = null;
    export let lowestSellOrder: MarketOrder = null;

    export let totalCost: number = null;

    $: if(isNaN(totalCost)) console.error(totalCost);

    export let quantity: number = 1;

    function scale(value: number): number {
        return 0 + width*(value-extents[0])/(extents[1]-extents[0]);
    }

    let validExtents = false;
    $: {
        validExtents = extents[1] > extents[0];
    }
</script>

<svg style="background: #ccc" {width} {height} viewBox={`0 0 ${300} ${height}`} xmlns="http://www.w3.org/2000/svg">
    {#if validExtents}
        {#if highestBuyOrder && highestBuyOrder.price !== null}
            <rect x={scale(highestBuyOrder.price*quantity)} fill="red" stroke="none" width={1} height={height} />
        {/if}
        {#if lowestSellOrder && lowestSellOrder.price !== null}
            <rect x={scale(lowestSellOrder.price*quantity)} fill="green" stroke="none" width={1} height={height} />
        {/if}
        {#if totalCost !== null}
            <rect x={scale(totalCost)} fill="#333" stroke="none" width={1} height={height} />
        {/if}
    {/if}
</svg>