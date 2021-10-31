<script lang="ts">
    import CharacterSelector from "$lib/CharacterSelector.svelte";
    import Invention from "$lib/Invention.svelte";

    let selectedCharacterId;
</script>


<CharacterSelector bind:value={selectedCharacterId} />
<Invention {selectedCharacterId} />