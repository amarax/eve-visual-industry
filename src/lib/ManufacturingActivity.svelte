<script lang="ts">
    import { Universe, Industry, MANUFACTURING_ACTIVITY_ID } from "$lib/EveData";

    import type { IndustryType, IndustryActivity } from "$lib/EveData";



    export let blueprint: IndustryType = null;

    let manufacturing: IndustryActivity = null;
    $: {
        manufacturing = blueprint && blueprint.activities[MANUFACTURING_ACTIVITY_ID]
    }
</script>

{#if !blueprint}
No blueprint selected yet
{:else}
<dl>
    <dt>Time</dt>
    <dd>{manufacturing.time}</dd>
</dl>

Materials
<dl>
    {#each Object.values(manufacturing.materials) as material}
        <dt>{$Universe.types[material.materialTypeID].name} [{material.materialTypeID}]</dt>
        <dd>{material.quantity}</dd>
    {/each}
</dl>

{/if}