<script lang="ts">
    import { GetCharacterInfo } from "$lib/eve-data/EveCharacter";
    import type { Character, EveCharacterId } from "$lib/eve-data/EveCharacter";
    import { session } from "$app/stores";

    export let value: EveCharacterId = null;

    let characterIds = ($session.authenticatedESICharacters || []) as Array<EveCharacterId>;
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