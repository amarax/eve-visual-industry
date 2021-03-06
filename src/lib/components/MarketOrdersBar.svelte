<script lang="ts">
    import type { Location_Id, Type_Id } from "$lib/eve-data/EveData";

    import { getMarketType } from "$lib/eve-data/EveMarkets";
    import type { IskAmount, MarketOrder } from "$lib/eve-data/EveMarkets";

    import { FormatIskAmount } from "$lib/Format";

    import { scaleLinear } from "d3-scale";
    import { sum, minIndex } from "d3-array";
    import { line, curveStepAfter } from "d3-shape";
    import { ESIStoreStatus } from "$lib/eve-data/ESIStore";
import { afterUpdate, getContext, onDestroy, onMount } from "svelte";
import type { Writable } from "svelte/store";



    export let compact = false;

    export let height = compact? 24 : 40;
    export let width = 500;

    export let extents: Array<number> = [0,1000];

    export let type_id: Type_Id = null;

    let marketFilterLocation: Writable<Location_Id> = getContext('marketFilterLocation');

    $: marketType = type_id && getMarketType(type_id);

    let isOrderInFilteredLocation: (order: MarketOrder)=>boolean = ()=>true;
    $: isOrderInFilteredLocation = o=>$marketFilterLocation?o.location_id===$marketFilterLocation:true


    function getFirstOrder(orders: Array<MarketOrder>, locationFilter: Location_Id): MarketOrder {
        if(!orders) return null;

        if(locationFilter) {
            return orders.filter(isOrderInFilteredLocation)[0];
        }
        return orders[0];
    }

    export let buyOverheadRate: number = 0;
    export let sellOverheadRate: number = 0;

    let highestBuyOrder: MarketOrder = null;
    let lowestSellOrder: MarketOrder = null;
    $:{
        highestBuyOrder = getFirstOrder( $marketType?.orders.buy, $marketFilterLocation );
        lowestSellOrder = getFirstOrder( $marketType?.orders.sell, $marketFilterLocation );
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
        .domain([extents[0], extents[1]])
        .range([0,width]);

    let topBottomMargin = 8;
    let yExtents = compact ? [0,height-topBottomMargin] : [0,height-2*topBottomMargin]
    $: y = scaleLinear()
        .domain([quantity*4,0])
        .range(yExtents)

        
    $: ordersGraph = line()
        .curve(curveStepAfter)
        .x(d=>x(d.price*quantity))

    $: cumulativeVolumeY = ()=>{
        let sum = 0;
        return d=>{
            sum+=d.volume_remain;
            return y(sum);
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
        y: Math.min(y.range()[0],y.range()[1]),
        height: Math.abs(y.range()[0]-y.range()[1])
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
        hoverIndex = minIndex( prices, p=>Math.abs(p.price*quantity-x.invert(mouseX))/quantity );
        hoverPrice = prices[hoverIndex]?.price;
    }

    function onClickGraph(e: MouseEvent) {
        if(prices[hoverIndex]?.is_buy_order !== undefined) {
            marketPrice = hoverPrice;
            marketPrice *= 1 + (prices[hoverIndex].is_buy_order ? buyOverheadRate : sellOverheadRate )
        }
    }

    function onWindowResize(event) {
        width = bar.getBoundingClientRect().width;
    }

    let bar: SVGElement;
    onMount(()=>{
        width = bar.getBoundingClientRect().width;
        window.addEventListener('resize', onWindowResize);
    })

    onDestroy(()=>{
        window.removeEventListener('resize', onWindowResize);
    })

    let hoverText: SVGTextElement;
    afterUpdate(()=>{
        if(hoverText) {
            let halfWidth = hoverText.getBBox().width/2;
            let xPos = x(hoverPrice*quantity);

            // Originally we set the text anchors, but we don't want to do that here because it will affect the tween
            if(xPos - halfWidth < 0)
                hoverText.setAttribute('style', `transform: translateX(${xPos+halfWidth}px)`);
            else if(xPos + halfWidth > width)
                hoverText.setAttribute('style', `transform: translateX(${xPos-halfWidth}px)`);
        }
    })
</script>

<svg bind:this={bar} {height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
    <rect class="graphArea" width={width} {...fillGraphHeight} />
    {#if validExtents}
        {#each scaleMarks as mark, i}
            <rect class="mark scale" style={translateX(mark)} width={1} {...fillGraphHeight} />
        {/each}

        {#if highestBuyOrder && highestBuyOrder.price !== null}
            <path class="graph buy" d={ordersGraph.y(cumulativeVolumeY())( [{price:highestBuyOrder.price, volume_remain:0}, ...$marketType?.orders.buy.filter(isOrderInFilteredLocation)] )} />
            {#if buyOverheadRate != 0}
                <rect class="overhead buy" x={x(highestBuyOrder.price*Math.min(1,1+buyOverheadRate)*quantity)} width={x(Math.abs(buyOverheadRate*highestBuyOrder.price*quantity))} {...fillGraphHeight} />
            {/if}
        {/if}
        {#if lowestSellOrder && lowestSellOrder.price !== null}
            <path class="graph sell" d={ordersGraph.y(cumulativeVolumeY())( [{price:lowestSellOrder.price, volume_remain:0}, ...$marketType?.orders.sell.filter(isOrderInFilteredLocation)] )} />
            {#if sellOverheadRate != 0}
                <rect class="overhead sell" x={x(lowestSellOrder.price*Math.min(1,1+sellOverheadRate)*quantity)} width={x(Math.abs(sellOverheadRate*lowestSellOrder.price*quantity))} {...fillGraphHeight} />
            {/if}
        {/if}
        {#if !isNaN(totalCost) && totalCost !== null}
            <rect class="mark cost" x={x(totalCost)} width={1} height={height} />
            {#if price != 0}
                <rect class={`difference profit ${unitCost>price?"negative":"positive"}`} x={Math.min(x(totalCost), x(price*quantity))} width={Math.abs(x(totalCost)-x(price*quantity))} y={y(quantity)} height={1} />
            {/if}
        {/if}
        {#if type_id}
            <circle class="mark price" cx={x(price*quantity)} cy={y(quantity)} r={2} />
        {/if}
    {/if}

    {#if hover}
        <text bind:this={hoverText} class="hover" style={translateX(hoverPrice*quantity)} y={y(0)} dy={8} text-anchor="middle">{FormatIskAmount(hoverPrice*quantity)} @{FormatIskAmount(hoverPrice)}</text>
        <circle class="hover" style={translateX(hoverPrice*quantity)} cx={0} cy={y(quantity)} r={4} />
    {/if}

    <rect class="hitArea" width={width} {...fillGraphHeight} 
        on:mouseenter={event=>{hover=true; onHoverGraph(event)}} on:mouseleave={event=>hover=false} on:mousemove={onHoverGraph} 
        on:click={onClickGraph}
    />
</svg>

<style lang="scss">
    svg {
        width: 100%;
        // max-width: 500px;
    }

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

        transition: 100ms ease-out;
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

    .hover {
        transition: transform 50ms ease-out;
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