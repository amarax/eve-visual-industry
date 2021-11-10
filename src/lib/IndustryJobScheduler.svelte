<script lang="ts">
    import CharacterSelector from "$lib/components/CharacterSelector.svelte";
import type { EveCharacterId } from "./eve-data/EveCharacter";

    let selectedCharacterId: EveCharacterId

</script>

<CharacterSelector bind:value={selectedCharacterId} />