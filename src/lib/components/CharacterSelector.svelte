<script lang="ts">
    import { GetCharacterInfo } from "$lib/eve-data/EveCharacter";
    import type { Character, EveCharacterId } from "$lib/eve-data/EveCharacter";
    import { getContext } from "svelte";
    import type { Readable } from "svelte/store";

    export let value: EveCharacterId = null;

    $: availableEveCharacters = getContext('availableEveCharacters') as Readable<Array<EveCharacterId>>;
    $: characterIds = $availableEveCharacters;
    let characters = new Map<EveCharacterId, Character>();
    $: {
        for(const id of characterIds) {
            GetCharacterInfo(id).subscribe(char=>{
                characters.set(id, char);
                characters = characters;

                if(value === null) {
                    value = id;
                }
            })
        }
    }
   
</script>

<select bind:value={value}>
    {#each characterIds as id}
        <option value={id}>{characters.get(id)?.name || id}</option>
    {/each}
</select>