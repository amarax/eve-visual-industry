
<script lang="ts">
import type { EveCharacterId } from "$lib/eve-data/EveCharacter";


import IndustryJobScheduler from "$lib/IndustryJobScheduler.svelte";
import { getContext } from "svelte";

import type { Readable } from "svelte/store";





let availableEveCharacters = getContext('availableEveCharacters') as Readable<Array<EveCharacterId>>;

</script>


{#each $availableEveCharacters as characterId (characterId) }
<IndustryJobScheduler {characterId} />
    
{/each}