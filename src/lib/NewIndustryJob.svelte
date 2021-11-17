<script lang="ts">
import { getContext } from "svelte";
import type { Readable } from "svelte/store";

import FacilitySelector from "./components/FacilitySelector.svelte";

import LocationSelector from "./components/LocationSelector.svelte";
import type { EveBlueprint, EveLocationId } from "./eve-data/ESI";
import { CharacterImplants, CharacterSkills, EveCharacterId } from "./eve-data/EveCharacter";
import { Industry } from "./eve-data/EveIndustry";
import EveTypes from "./eve-data/EveTypes";

import { IndustryFacilityModifiers, IndustryJobStore, ModifiersFromCharacter } from "./IndustryJob";
import IndustryJobBreakdown from "./IndustryJobBreakdown.svelte";

    export let blueprint: EveBlueprint;
    export let job: IndustryJobStore;

    let location: EveLocationId = blueprint.location_id;

    let collapsed = true;

    $: job.update({
        blueprintModifiers: {
            materialEfficiency: blueprint.material_efficiency,
            timeEfficiency: blueprint.time_efficiency
        }
    })
    let facilityModifiers: IndustryFacilityModifiers;
    $: if(facilityModifiers && collapsed) job.update({facilityModifiers})

    // #region Character-related

    let currentCharacter = getContext('currentCharacter') as Readable<EveCharacterId>;
    $: characterSkills = CharacterSkills[$currentCharacter];
    $: characterImplants = CharacterImplants[$currentCharacter]
    
    $: if(collapsed) job.update({characterModifiers:ModifiersFromCharacter($job.activity, $characterSkills, $characterImplants)});

    // #endregion

    let maxRuns: number;
    $: {
        maxRuns = blueprint?.runs;
        if(maxRuns == -1) {
            maxRuns = $Industry.types[blueprint.type_id].maxProductionLimit;
        }
    }
</script>

<style lang="scss">
    input[type=number] {
        width: 60px;
        text-align: right;
    }

    .itemName {
        display:inline-block;
        
        overflow-x: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;

        width: 200px;
    }
</style>

{#if job}
    {#if collapsed}
        <button on:click={()=>collapsed=false}>+</button> 
        <span class="itemName" title={$EveTypes.get($job.selectedProduct).name}>{$EveTypes.get($job.selectedProduct).name}</span>
        <input type="number" value={$job.runs} on:input={event=>!isNaN(parseInt(event.currentTarget.value)) && job.update({runs:parseInt(event.currentTarget.value)})} />
        <FacilitySelector activity={$job.activity.activity.activityID} bind:value={location} bind:facilityModifiers />
    {:else}
        <button on:click={()=>collapsed=true}>&ndash;</button> <IndustryJobBreakdown bind:location {job} {blueprint} />
    {/if}
{/if}