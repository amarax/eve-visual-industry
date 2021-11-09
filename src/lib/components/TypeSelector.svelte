<script lang="ts">
    import type { EveTypeId } from '$lib/eve-data/EveTypes';
    import EveTypes from '$lib/eve-data/EveTypes';

    import { createEventDispatcher } from 'svelte';

    export let selectableTypes: Array<EveTypeId> = [];
    export let selectedTypeId:number = null;

    const dispatch = createEventDispatcher();
    function onSelectionChange(event) {
        dispatch('change', parseInt(event.target.value));
    }

</script>

Item 
<select value={selectedTypeId} on:change={onSelectionChange}>
    {#each selectableTypes as typeId }
        <option value={typeId}>{$EveTypes.get(typeId)?.name ?? typeId}</option>
    {/each}
</select>

<style lang="scss">
    select {
        max-width: 100%;
    }
</style>