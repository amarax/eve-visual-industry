<script lang="ts">
    import type { Location_Id, Type_Id } from "$lib/eve-data/EveData";

    import { getMarketType } from "$lib/eve-data/EveMarkets";
    import type { IskAmount, MarketOrder } from "$lib/eve-data/EveMarkets";

    import { FormatIskAmount } from "./Format";

    import { scaleLinear } from "d3-scale";
    import { sum, minIndex } from "d3-array";
    import { line, curveStepAfter } from "d3-shape";
    import { ESIStoreStatus } from "$lib/eve-data/ESIStore";



    export let compact = false;

    export let height = compact? 24 : 40;
    export let width = 500;

    export let extents: Array<number> = [0,1000];

    export let type_id: Type_Id = null;
    export let marketFilterLocation: Location_Id = null;

    $: marketType = type_id && getMarketType(type_id);

    $: isOrderInFilteredLocation = o=>marketFilterLocation?o.location_id===marketFilterLocation:true


    function getFirstOrder(orders: Array<MarketOrder>, marketFilterLocation: Location_Id): MarketOrder {
        if(!orders) return null;

        if(marketFilterLocation) {
            return orders.filter(isOrderInFilteredLocation)[0];
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

    // Expose key market prices for extents calculation
    export let lowestSellPrice: IskAmount = 0;
    export let highestBuyPrice: IskAmount = 0;
    $: {
        lowestSellPrice = lowestSellOrder?.price;
        highestBuyPrice = highestBuyOrder?.price;
    }

    $: status = $marketType?.orders ? marketType?.status : ESIStoreStatus.loading;

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
    $: unitCost = totalCost/quantity;

    export let quantity: number = 1;

    $: x = scaleLinear()
        .domain([extents[0]/quantity, extents[1]/quantity])
        .range([0,width]);

    let topBottomMargin = 8;
    let yExtents = compact ? [0,height-topBottomMargin] : [topBottomMargin,height-2*topBottomMargin]
    $: y = scaleLinear()
        .domain([1,0])
        .range(yExtents)

    $: volumeY = scaleLinear()
        // .domain([sum($marketType?.orders.sell ?? [],o=>o.volume_remain) ,0])
        .domain([quantity*2,0])
        .range(yExtents)

        
    $: ordersGraph = line()
        .curve(curveStepAfter)
        .x(d=>x(d.price))

    $: cumulativeVolumeY = ()=>{
        let sum = 0;
        return d=>{
            sum+=d.volume_remain;
            return volumeY(sum);
        }
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


    $: fillGraphHeight = {
        y: y(1),
        height: Math.abs(y(0)-y(1))
    }

    $: translateX = (value)=>{
        return `transform: translateX(${x(value)}px)`
    }

    let hover = false;
    
    let prices: Array<{price:IskAmount, is_buy_order?:boolean}> = [];
    $: {
        if($marketType && $marketType.orders) {
            prices = $marketType?.orders?.buy.concat($marketType?.orders?.sell)
                    .filter(isOrderInFilteredLocation);
        } else {
            prices = []
        }

        if(totalCost) {
            prices = [...prices, {price:unitCost}]
        }
    }

    let hoverPrice = 0;
    let hoverIndex = 0;
    function onHoverGraph(e: MouseEvent) {
        let mouseX = e.clientX - (e.target as SVGElement).getBoundingClientRect().left;

        // Snap the hover value to the closest related price
        hoverIndex = minIndex(prices, p=>Math.abs(p.price-x.invert(mouseX)));
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
            <!-- <rect class="mark buy" x={x(highestBuyOrder.price)} fill="red" width={1} {...fillGraphHeight} /> -->
            <path class="graph buy" d={ordersGraph.y(cumulativeVolumeY())( [{price:highestBuyOrder.price, volume_remain:0}, ...$marketType?.orders.buy.filter(isOrderInFilteredLocation)] )} />
            {#if buyOverheadRate != 0}
                <rect class="overhead buy" x={x(highestBuyOrder.price*Math.min(1,1+buyOverheadRate))} width={x(Math.abs(buyOverheadRate*highestBuyOrder.price))} {...fillGraphHeight} />
            {/if}
        {/if}
        {#if lowestSellOrder && lowestSellOrder.price !== null}
            <!-- <rect class="mark sell" x={x(lowestSellOrder.price)} fill="green" width={1} {...fillGraphHeight} /> -->
            <path class="graph sell" d={ordersGraph.y(cumulativeVolumeY())( [{price:lowestSellOrder.price, volume_remain:0}, ...$marketType?.orders.sell.filter(isOrderInFilteredLocation)] )} />
            {#if sellOverheadRate != 0}
                <rect class="overhead sell" x={x(lowestSellOrder.price*Math.min(1,1+sellOverheadRate))} width={x(Math.abs(sellOverheadRate*lowestSellOrder.price))} {...fillGraphHeight} />
            {/if}
        {/if}
        {#if totalCost !== null}
            <rect class="mark cost" x={x(unitCost)} width={1} height={height} />
            {#if price != 0}
                <rect class={`difference profit ${unitCost>price?"negative":"positive"}`} x={Math.min(x(unitCost), x(price))} width={Math.abs(x(unitCost)-x(price))} y={y(0.5)} height={1} />
            {/if}
        {/if}
        {#if type_id}
            <circle class="mark price" cx={x(price)} cy={y(0.5)} r={2} />
        {/if}
    {/if}

    {#if hover}
        <text class="hover" style={translateX(hoverPrice)} y={y(0)} dy={8} text-anchor="middle">{FormatIskAmount(hoverPrice*quantity)} @{FormatIskAmount(hoverPrice)}</text>
        <circle class="hover" style={translateX(hoverPrice)} cx={0} cy={y(0.5)} r={4} />
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

    path.graph {
        fill: none;
        stroke-width: 1px;

        &.buy {
            stroke: red;
        }

        &.sell {
            stroke: #0f0;
        }
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

            &.negative {
                opacity: 0.3;
            }
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