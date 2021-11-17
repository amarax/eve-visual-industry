<script lang="ts">
import { getContext, onDestroy, onMount } from "svelte";
import type { Readable } from "svelte/store";
import { CharacterBlueprints, EveCharacterId } from "./eve-data/EveCharacter";

import { Activity_Id, Industry, INVENTION_ACTIVITY_ID, MANUFACTURING_ACTIVITY_ID, REACTION_ACTIVITY_ID } from "./eve-data/EveIndustry";
import type { Quantity } from "./eve-data/EveMarkets";
import EveTypes from "./eve-data/EveTypes";
import type { IndustryJobStore } from "./IndustryJob";
import type { JobDetails } from "./IndustryJobScheduler";


    export let row: number;
    export let job: JobDetails

    export let x: (datetime: number|string)=>number;
    export let y: (row: number)=>number;

    let margin = 2;

    function activityToClass(activityId: Activity_Id) {
        switch(activityId) {
            case MANUFACTURING_ACTIVITY_ID:
                return "manufacturing";
            case REACTION_ACTIVITY_ID: // Keep this so that the rest of the SDE stuff works (when we schedule new jobs)
                return "reaction";
            case 9: // Somehow on TQ the reaction activity id is different from the SDE
                return "reaction";
            case INVENTION_ACTIVITY_ID:
                return "invention";
            default:
                return "";
        }
    }

    let industryJob: IndustryJobStore;
    $: if(job.industryJob) {
        industryJob = job.industryJob;
    }

    // NOTE this line has the hack for REACTION_ACTIVITY_ID that addresses the discrepancy between TQ reaction id and SDE reaction id
    $: producedItems = industryJob ? $industryJob.producedQuantity : $Industry.types[job.blueprint_type_id].activities[job.activity_id == 9?REACTION_ACTIVITY_ID:job.activity_id]?.products[job.product_type_id]?.quantity * job.runs;

    let textLabel: string;
    $: {
        textLabel = $EveTypes.get(job.product_type_id)?.name;
        if(!isNaN(producedItems)) textLabel += ` x${producedItems}` // There is no quantity for research activities
    }

    let currentCharacter = getContext('currentCharacter') as Readable<EveCharacterId>;
    $: blueprints = CharacterBlueprints[$currentCharacter] as Readable<CharacterBlueprints>;
    $: blueprintItem = $blueprints?.find(b=>b.item_id === job.blueprint_id);
    $: blueprintExhausted = blueprintItem == null || blueprintItem.runs == job.runs;
</script>

<style lang="scss">
    g {
        --manufacturing-color: rgb(182, 119, 0);
        --reaction-color: rgb(0, 189, 145);
        --invention-color: rgb(48, 148, 191);
        --blueprint-color: rgb(0, 84, 187);


        transition: transform 300ms;

        rect.job {
            fill: var(--blueprint-color);
            stroke: rgb(0, 115, 255);
            stroke-width: 0;

            opacity: 70%;

            &.manufacturing {
                fill: var(--manufacturing-color);
                stroke: rgb(255, 166, 0);
            }
            &.reaction {
                fill: var(--reaction-color);
                stroke: rgb(0, 255, 195);
            }
            &.invention {
                fill: var(--invention-color);
                stroke: rgb(104, 210, 255);
            }

            &.scheduled {
                opacity: 50%;
                stroke-width: 1px;
            }

            &.delivered {
                opacity: 30%;
            }
        }

        &:hover {
            rect.job {
                opacity: 100%;
            }
        }
    }

    text {
            fill: #fff;

            font-size: 10px;

            pointer-events: none;
    }
</style>

<g transform={`translate(0 ${y(row)})`}>
    <clipPath id={`job-${job.job_id}`}>
        <rect x={x(job.start_date)} width={x(job.end_date)-x(job.start_date)} y={margin} height={y(row+1)-y(row) - margin*2} />
    </clipPath>
    <rect x={x(job.start_date)} class={`job ${activityToClass(job.activity_id)} ${job.status}`} width={Math.max(x(job.end_date)-x(job.start_date) -(blueprintExhausted?2:0), 1)} y={margin} height={y(row+1)-y(row) - margin*2} 
        on:click={event=>console.log(job)}
    >
        <title>{textLabel}</title>
    </rect>
    <text clip-path={`url(#job-${job.job_id})`} y={13} x={x(job.start_date)+4}>{textLabel}</text>
    {#if blueprintExhausted}
        <rect x={x(job.end_date)-1} width={1} class={`job ${activityToClass(job.activity_id)}`} y={margin} height={y(row+1)-y(row) - margin*2} />
    {/if}
</g>
