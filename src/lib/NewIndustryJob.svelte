<script lang="ts">
import FacilitySelector from "./components/FacilitySelector.svelte";

import LocationSelector from "./components/LocationSelector.svelte";
import type { EveBlueprint, EveLocationId } from "./eve-data/ESI";
import { Industry } from "./eve-data/EveIndustry";
import EveTypes from "./eve-data/EveTypes";

import type { IndustryJobStore } from "./IndustryJob";
import ReactionActivity from "./ReactionActivity.svelte";

    export let blueprint: EveBlueprint;
    export let job: IndustryJobStore;

    let location: EveLocationId = blueprint.location_id;

    let collapsed = true;

    let maxRuns: number;
    $: {
        maxRuns = blueprint?.runs;
        if(maxRuns == -1) {
            maxRuns = $Industry.types[blueprint.type_id].maxProductionLimit;
        }
    }    
</script>

{#if job}
    {#if collapsed}
        <button on:click={()=>collapsed=false}>+</button> 
        {$EveTypes.get($job.selectedProduct).name} 
        <input type="range" value={$job.runs} on:input={event=>job.update({runs:parseInt(event.currentTarget.value)})} min={1} max={maxRuns} />
        <FacilitySelector activity={$job.activity.activity.activityID} bind:value={location} on:change={event=>job.update({facilityModifiers:event.detail})} />
    {:else}
        <button on:click={()=>collapsed=true}>&ndash;</button> <ReactionActivity bind:location {job} {blueprint} />
    {/if}
{/if}