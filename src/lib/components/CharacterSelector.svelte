<script lang="ts">
    import { GetCharacterInfo } from "$lib/eve-data/EveCharacter";
    import type { Character, Character_Id } from "$lib/eve-data/EveCharacter";
    import { session } from "$app/stores";

    export let value: Character_Id = null;

    let characterIds = ($session.authenticatedESICharacters || []) as Array<Character_Id>;
    let characters = new Map<Character_Id, Character>();
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