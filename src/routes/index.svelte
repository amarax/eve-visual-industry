<script lang="ts">
    import CharacterSelector from "$lib/CharacterSelector.svelte";

    import Invention from "$lib/Invention.svelte";

    let selectedCharacterId;
</script>

<svelte:head>
	<title>EVE Online Visual Industry Calculator</title>
</svelte:head>

<h1>EVE Online Visual Industry Calculator</h1>

<CharacterSelector bind:value={selectedCharacterId} />
<Invention {selectedCharacterId} />
