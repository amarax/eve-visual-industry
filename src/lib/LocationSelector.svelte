<script lang="ts">
    import type { EveLocation, Location_Id } from "$lib/eve-data/EveData";
    import { getContext } from "svelte";
    import type { Readable } from "svelte/store";

    export let value: Location_Id = null;

    $: locations = getContext('locations') as Readable<{[index:Location_Id]: EveLocation }>;
    export let allowUnselected: boolean = false;

    export let selectedLocation: {} = null;
</script>


<select bind:value={value}>
    {#if allowUnselected}
        <option value={null}></option>
    {/if}
    {#each Object.keys($locations) as location_id}
        <option value={parseInt( location_id )}>{$locations[location_id]?.name ?? location_id}</option>
    {/each}
</select>