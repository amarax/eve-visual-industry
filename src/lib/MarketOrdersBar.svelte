<script lang="ts">
    import type { MarketOrder } from "./EveMarkets";




    export let height = 30;
    export let width = 300;

    export let extents: Array<number> = [0,1000];

    export let highestBuyOrder: MarketOrder = null;
    export let lowestSellOrder: MarketOrder = null;

    export let totalCost: number = null;

    export let buyOverheadRate: number = 0;
    export let sellOverheadRate: number = 0;

    $: if(isNaN(totalCost)) console.error(totalCost);

    export let quantity: number = 1;

    let scale = (value: number): number => {return 1}
    
    $:{
        scale = (value) => {
            return 0 + width*(value-extents[0])/(extents[1]-extents[0]);
        }
    }

    let validExtents = false;
    $: {
        validExtents = extents[1] > extents[0];
    }
</script>

<svg style="background: #ccc" {width} {height} viewBox={`0 0 ${300} ${height}`} xmlns="http://www.w3.org/2000/svg">
    {#if validExtents}
        {#if highestBuyOrder && highestBuyOrder.price !== null}
            <rect class="mark" x={scale(highestBuyOrder.price*quantity*(1+buyOverheadRate))} fill="red" stroke="none" width={1} height={height} />
            {#if buyOverheadRate != 0}
                <rect class="overhead" x={scale(highestBuyOrder.price*quantity*Math.min(1,1+buyOverheadRate))} width={scale(Math.abs(buyOverheadRate*highestBuyOrder.price*quantity))} fill="rgba(255,0,0,0.3)" stroke="none" height={height} />
            {/if}
        {/if}
        {#if lowestSellOrder && lowestSellOrder.price !== null}
            <rect class="mark" x={scale(lowestSellOrder.price*quantity*(1+sellOverheadRate))} fill="green" stroke="none" width={1} height={height} />
            {#if sellOverheadRate != 0}
                <rect class="overhead" x={scale(lowestSellOrder.price*quantity*Math.min(1,1+sellOverheadRate))} width={scale(Math.abs(sellOverheadRate*lowestSellOrder.price*quantity))} fill="rgba(0,255,0,0.3)" stroke="none" height={height} />
            {/if}
        {/if}
        {#if totalCost !== null}
            <rect class="mark" x={scale(totalCost)} fill="#333" stroke="none" width={1} height={height} />
        {/if}
    {/if}
</svg>

<style lang="scss">
    .mark, .overhead {
        transition: x 100ms ease-out 0ms;
    }
</style>