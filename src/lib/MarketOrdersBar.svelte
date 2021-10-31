<script lang="ts">
import type { Location_Id, Type_Id } from "./EveData";

    import { getMarketType } from "./EveMarkets";
    import type { IskAmount, MarketOrder } from "./EveMarkets";

    import { FormatIskAmount } from "./Format";




    export let height = 30;
    export let width = 400;

    export let extents: Array<number> = [0,1000];

    export let type_id: Type_Id = null;
    export let marketFilterLocation: Location_Id = null;

    $: marketType = type_id && getMarketType(type_id);

    function getFirstOrder(orders: Array<MarketOrder>, marketFilterLocation: Location_Id): MarketOrder {
        if(!orders) return null;

        if(marketFilterLocation) {
            return orders.filter(order=>order.location_id === marketFilterLocation)[0];
        }
        return orders[0];
    }

    export let buyOverheadRate: number = 0;
    export let sellOverheadRate: number = 0;

    let highestBuyOrder: MarketOrder = null;
    let lowestSellOrder: MarketOrder = null;
    $:{
        highestBuyOrder = getFirstOrder( $marketType?.orders.buy, marketFilterLocation );
        lowestSellOrder = getFirstOrder( $marketType?.orders.sell, marketFilterLocation );

        if(price === null) {
            price = lowestSellOrder?.price * (1-sellOverheadRate)
        }
    }

    export let price: IskAmount = null;

    export let totalCost: number = null;

    $: if(isNaN(totalCost)) console.error(totalCost);

    export let quantity: number = 1;

    $: scale = (value: number) => {
        return 0 + width*(value-extents[0])/(extents[1]-extents[0]);
    }

    let validExtents = false;
    let scaleMarks = [];
    $: {
        validExtents = extents[1] > extents[0];

        scaleMarks = [];
        let step = 10;
        for(let mark = 1000000; mark < extents[1]; mark*=step) {
            scaleMarks.push(mark);
        }
    }

</script>

<svg style="background: #ccc" {width} {height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
    {#if validExtents}
        {#each scaleMarks as mark, i}
            <rect class="mark" x={scale(mark)} fill="#bbb" stroke="none" width={1} height={height} />
        {/each}

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