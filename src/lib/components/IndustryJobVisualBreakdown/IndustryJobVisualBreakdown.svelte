<script lang="ts">
import type { IndustryJobStore } from "$lib/IndustryJob";
import EveTypes, { EveTypeId } from "$lib/eve-data/EveTypes";

import { scaleLinear } from 'd3-scale';
import { afterUpdate } from "svelte";
import type { IskAmount } from "$lib/eve-data/EveMarkets";
import BreakdownMaterial from "./BreakdownMaterial.svelte";


    export let job: IndustryJobStore;

    let height = 32;

    let topMargin = 8;
    let bottomMargin = 0;

    $: extents = [0, $job.totalCost * 1.1]

    let xScale = scaleLinear()
        .range([0, 100]);
    $: {
        xScale.domain(extents);
        xScale = xScale;
    }
    $: x = (value: IskAmount)=>{
        return `${xScale(value)}%`
    }
    
    let y = scaleLinear()
        .range([topMargin, height -bottomMargin])
    $: {
        y.domain([0,1]);
        y = y;
    }

    $: fillGraphHeight = {
        y: Math.min(y.range()[0],y.range()[1]),
        height: Math.abs(y.range()[0]-y.range()[1])
    }


    let prices: {[index:EveTypeId]: IskAmount} = {};
    $: { 
        // for(let type_id in prices) {
        //     prices[type_id] = prices[type_id];
        // }
        // prices = prices;
        job.update({prices});
    }

    let xOffsets: {[index:EveTypeId]: IskAmount} = {};
    let materialOrder: Array<EveTypeId> = [];
    $: {
        materialOrder = Object.keys($job.activity.materials).map(id=>parseInt(id));
        materialOrder.sort((a,b)=>$job.materialCost(b) - $job.materialCost(a))

        let cumulativeOffset = $job.jobCost + ($job.blueprintCostPerRun ?? 0) * $job.runs;
        for(let materialId of materialOrder) {
            xOffsets[materialId] = cumulativeOffset;
            cumulativeOffset += $job.materialCost(materialId);
        }
    }

    const graphPaddingLeft = 0;

    const markWidth = 1;
</script>

<style lang="scss">
    svg {
        width: 100%;

        svg.graph {
            overflow: visible;
        }

        .graphArea {
            fill: #2a2a2a;
            stroke: none;
        }

        :global(.breakdown) {
            fill: #fff;
            stroke: none;
            opacity: 20%;

            cursor: pointer;

            &:hover {
                opacity: 30%;
            }
        }

        :global(.mark) {
            fill: #fff;
            stroke: none;
        }
    }

    ul.itemList {
        margin: 0;
        padding: 0;
        list-style-type: none;
        
        display: block;
        overflow-x: scroll;
        white-space: nowrap;

        font-size: 12px;

        button {
            font-size: 12px;
            
            padding: 0;
            margin: 0;
            background: none;
            border: none;

            color: white;

            cursor: pointer;

            &:hover {
                background: #333;
            }
        }

        li {
            display: inline;
            margin-inline-end: 8px;
        }

        &::-webkit-scrollbar {
            height: 4px;
        }

        &::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 2px;
        }
    }
</style>

{$EveTypes.get($job.selectedProduct).name}<br/>

<svg {height}>
    <rect class="graphArea" x={graphPaddingLeft} width={`calc(100% - ${graphPaddingLeft}px)`} {...fillGraphHeight} />
    <svg class="graph" x={graphPaddingLeft} width={`calc(100% - ${graphPaddingLeft}px)`} {...fillGraphHeight}>

    <rect class="breakdown" x={0} width={x($job.jobCost)} height="100%" />
    <rect class="mark" x={`calc(${x($job.jobCost)} - ${markWidth/2}px)`} width={markWidth} height="100%" />

    {#each Object.keys($job.activity.materials).map(id=>parseInt(id)) as materialId (materialId)}
        <BreakdownMaterial xOffset={xOffsets[materialId]} {materialId} {x} {job} bind:price={prices[materialId]} />
    {/each}

    </svg>
</svg>

<ul class="itemList">
    <li><button>Job</button></li>
    <li><button>Blueprint</button></li>
    {#each materialOrder as materialId}
        <li><button>{$EveTypes.get(materialId).name}</button></li>
    {/each}
</ul>