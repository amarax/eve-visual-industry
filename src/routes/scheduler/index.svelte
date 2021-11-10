
<script lang="ts">
import type { EveCharacterId } from "$lib/eve-data/EveCharacter";


import IndustryJobScheduler from "$lib/IndustryJobScheduler.svelte";
import { getContext } from "svelte";

import type { Readable } from "svelte/store";





let availableEveCharacters = getContext('availableEveCharacters') as Readable<Array<EveCharacterId>>;

let xOffset: number = 7;
let scale: number = 100;
let groupBy = "activity_id";
</script>


<style lang="scss">
    .controls {
        position: sticky;
        top: 0px;

        input[type="range"] {
            width: 30%;
        }
    }
</style>

<div class="controls">
    <select bind:value={groupBy}>
        <option value=""></option>
        <option value="activity_id">Activity</option>
        <option value="facility_id">Facility</option>
        <option value="blueprint_type_id">Blueprint</option>
        <option value="product_type_id">Product</option>
    </select>
    <input type="range" bind:value={xOffset} min={-7} max={90} />
    <input type="range" bind:value={scale} min={10} max={300} />

</div>

{#each $availableEveCharacters as characterId (characterId) }
<IndustryJobScheduler {characterId} {xOffset} {scale} {groupBy} />
{/each}