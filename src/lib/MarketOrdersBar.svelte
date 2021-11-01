<script lang="ts">
    import type { Location_Id, Type_Id } from "./EveData";

    import { getMarketType } from "./EveMarkets";
    import type { IskAmount, MarketOrder } from "./EveMarkets";

    import { FormatIskAmount } from "./Format";

    import { scaleLinear } from "d3-scale";
    import { minIndex } from "d3-array";



    export let compact = false;

    export let height = compact? 24 : 40;
    export let width = 500;

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
    }

    export let price: IskAmount = null;
    export let overridePrice: IskAmount = null;
    let marketPrice: IskAmount = null;
    $: defaultMarketPrice = lowestSellOrder?.price * (1+sellOverheadRate);
    $: {
        price = overridePrice ?? marketPrice ?? defaultMarketPrice;
        if(isNaN(price)) price = 0;
    }

    let _prevTypeId = null;
    $: if(_prevTypeId !== type_id) {
        // reset the market price
        marketPrice = null;
        _prevTypeId = type_id;
    }


    export let totalCost: number = null;

    export let quantity: number = 1;

    $: x = scaleLinear()
        .domain(extents)
        .range([0,width]);

    let topBottomMargin = 8;
    let yExtents = compact ? [0,height-topBottomMargin] : [topBottomMargin,height-2*topBottomMargin]
    $: y = scaleLinear()
        .domain([1,0])
        .range(yExtents)

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


    $: fillGraphHeight = {
        y: y(1),
        height: Math.abs(y(0)-y(1))
    }

    $: translateX = (value)=>{
        return `transform: translateX(${x(value)}px)`
    }

    let hover = false;
    
    let prices: Array<{price:IskAmount, is_buy_order?:boolean}> = [];
    $: if($marketType && $marketType.orders) {
        prices = [
            ...$marketType?.orders?.buy.concat($marketType?.orders?.sell)
                .filter(o=>marketFilterLocation?o.location_id===marketFilterLocation:true), 
            {price:totalCost/quantity}
        ]
    } else if(type_id === null && totalCost) {
        prices = [{price:totalCost/quantity}]
    }

    let hoverPrice = 0;
    let hoverIndex = 0;
    function onHoverGraph(e: MouseEvent) {
        let mouseX = e.clientX - e.target.getBoundingClientRect().left;

        // Snap the hover value to the closest related price
        hoverIndex = minIndex(prices, p=>Math.abs(p.price*quantity-x.invert(mouseX)));
        hoverPrice = prices[hoverIndex]?.price;
    }

    function onClickGraph(e: MouseEvent) {
        if(prices[hoverIndex]?.is_buy_order !== undefined) {
            marketPrice = hoverPrice;
            marketPrice *= 1 + (prices[hoverIndex].is_buy_order ? buyOverheadRate : sellOverheadRate )
        }
    }
</script>

<svg {width} {height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
    <rect class="graphArea" width={width} {...fillGraphHeight} />
    {#if validExtents}
        {#each scaleMarks as mark, i}
            <rect class="mark scale" style={translateX(mark)} width={1} {...fillGraphHeight} />
        {/each}

        {#if highestBuyOrder && highestBuyOrder.price !== null}
            <rect class="mark buy" x={x(highestBuyOrder.price*quantity)} fill="red" width={1} {...fillGraphHeight} />
            {#if buyOverheadRate != 0}
                <rect class="overhead buy" x={x(highestBuyOrder.price*quantity*Math.min(1,1+buyOverheadRate))} width={x(Math.abs(buyOverheadRate*highestBuyOrder.price*quantity))} {...fillGraphHeight} />
            {/if}
        {/if}
        {#if lowestSellOrder && lowestSellOrder.price !== null}
            <rect class="mark sell" x={x(lowestSellOrder.price*quantity)} fill="green" width={1} {...fillGraphHeight} />
            {#if sellOverheadRate != 0}
                <rect class="overhead sell" x={x(lowestSellOrder.price*quantity*Math.min(1,1+sellOverheadRate))} width={x(Math.abs(sellOverheadRate*lowestSellOrder.price*quantity))} {...fillGraphHeight} />
            {/if}
        {/if}
        {#if totalCost !== null}
            <rect class="mark cost" x={x(totalCost)} width={1} height={height} />
            {#if price != 0}
                <rect class={`difference profit ${totalCost>price*quantity?"negative":"positive"}`} x={Math.min(x(totalCost), x(price*quantity))} width={Math.abs(x(totalCost)-x(price*quantity))} y={y(0.5)} height={1} />
            {/if}
        {/if}
        {#if type_id}
            <circle class="mark price" cx={x(price*quantity)} cy={y(0.5)} r={2} />
        {/if}
    {/if}

    {#if hover}
        <text class="hover" style={translateX(hoverPrice*quantity)} y={y(0)} dy={8} text-anchor="end">{FormatIskAmount(hoverPrice)}</text>
        <circle class="hover" style={translateX(hoverPrice*quantity)} cx={0} cy={y(0.5)} r={4} />
    {/if}

    <rect class="hitArea" width={width} y={y(1)} height={y(0)-y(1)} 
        on:mouseenter={event=>hover=true} on:mouseleave={event=>hover=false} on:mousemove={onHoverGraph} 
        on:click={onClickGraph}
    />
</svg>

<style lang="scss">
    .mark, .overhead, .difference {
        transition: x 100ms ease-out, transform 100ms ease-out, width 100ms ease-out;
    }

    circle.mark {
        fill: white;
        transition: cx 100ms ease-out;
    }

    rect.mark {
        stroke: none;

        &.scale {
            fill: #444;
        }

        &.cost {
            fill: #fff;
        }

        &.buy {
            fill: red;
        }

        &.sell {
            fill: #0f0;
        }
    }

    rect.difference {
        &.profit {
            fill: #fff;
        }
    }

    rect.overhead {
        &.buy {
            fill: red;
            opacity: 0.2;
        }

        &.sell {
            fill: #0f0;
            opacity: 0.2;
        }
    }

    rect.graphArea {
        fill: #2a2a2a;
        stroke: none;

        cursor:crosshair;
    }

    rect.hitArea {
        fill: transparent;
        stroke: none;

        cursor:crosshair;
    }

    text.hover {
        fill: white;
        font-size: 8px;
        text-align: right;
    }

    circle.hover {
        fill: none;
        stroke: white;
        stroke-width: 1px;
    }

</style>