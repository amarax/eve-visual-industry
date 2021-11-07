<script lang="ts">

    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    import EveMarketGroups, { EveMarketGroupId } from "$lib/eve-data/EveMarketGroups";
    import { Universe } from "$lib/eve-data/EveData";
    import { REACTION_ACTIVITY_ID } from "$lib/eve-data/EveIndustry";

    import type { Location_Id, Type } from "$lib/eve-data/EveData";

    import ComparedActivity from "$lib/ComparedActivity.svelte";
    import ReactionActivity from "$lib/ReactionActivity.svelte";
    import LocationSelector from "$lib/LocationSelector.svelte";

    $: selectedGroup = parseInt($page.params['group']) || null as EveMarketGroupId;

    $: selectibleMarketGroups = Object.values($EveMarketGroups ?? {})
        .filter(group=>group.hasTypes)
        .sort((a,b)=>a.name.localeCompare(b.name));

    $: selectedTypes = Object.values($Universe.types ?? {}).filter((type: Type)=>type.market_group_id===selectedGroup)

    let locationId: Location_Id;
</script>

<select value={selectedGroup} on:change={(event)=>goto(`${event.currentTarget.value}`, {keepfocus:true})}>
    <option value={null}></option>
    {#each selectibleMarketGroups as marketGroup}
        <option value={marketGroup.market_group_id}>{marketGroup.name}</option>
    {/each}
</select>

<LocationSelector bind:value={locationId} activity={REACTION_ACTIVITY_ID} />


{#each selectedTypes as type}
    <ReactionActivity productTypeId={type.type_id} defaultLocationId={locationId} />
    <!-- <ComparedActivity productTypeId={type.type_id} /> -->
{/each}

<slot />