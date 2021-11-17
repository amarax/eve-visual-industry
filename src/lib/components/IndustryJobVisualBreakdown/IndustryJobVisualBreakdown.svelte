<script lang="ts">
import type { IndustryJobStore } from "$lib/IndustryJob";
import EveTypes, { EveTypeId } from "$lib/eve-data/EveTypes";

import { scaleLinear } from 'd3-scale';
import { afterUpdate } from "svelte";
import type { IskAmount } from "$lib/eve-data/EveMarkets";
import BreakdownMaterial from "./BreakdownMaterial.svelte";


    export let job: IndustryJobStore;

    let height = 64;

    let topMargin = 8;
    let bottomMargin = 16;

    $: extents = [0, $job.totalCost * 1.1]
    $: console.log($job.totalCost, $job.jobCost);

    let xScale = scaleLinear()
        .range([0, 100]);
    $: {
        xScale.domain(extents);
        xScale = xScale;
    }
    $: x = (value: number)=>`${xScale(value)}%`
    
    let y = scaleLinear()
        .range([topMargin, height -topMargin -bottomMargin])
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
        for(let type_id in prices) {
            prices[type_id] = prices[type_id];
        }
        prices = prices;
        job.update({prices});
    }

    let xOffsets: {[index:EveTypeId]: IskAmount} = {};
    $: {
        let cumulativeOffset = 0;
        for(let materialId in $job.activity.materials) {
            xOffsets[materialId] = cumulativeOffset;
            cumulativeOffset += $job.materialQuantity(parseInt(materialId)) * prices[materialId];
        }
    }

</script>

<style lang="scss">
    svg {
        width: 100%;

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
</style>

{$EveTypes.get($job.selectedProduct).name}<br/>

<svg {height}>
    <rect class="graphArea" width="100%" {...fillGraphHeight} />
    <svg class="graph" {...fillGraphHeight}>
    {#each Object.keys($job.activity.materials).map(id=>parseInt(id)) as materialId (materialId)}
        <BreakdownMaterial xOffset={xOffsets[materialId]} {materialId} {x} {job} bind:price={prices[materialId]} />
    {/each}

    <rect class="breakdown" x={x($job.totalCost - $job.jobCost)} width={x($job.jobCost)} height="100%" />
    </svg>
</svg>