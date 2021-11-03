<script lang="ts">
    import { Characters, LoadAuthorisedCharacters } from "$lib/eve-data/EveCharacter";
    import type { Character_Id } from "$lib/eve-data/EveCharacter";
    import { onDestroy } from "svelte";
    import type { EntityCollection } from "$lib/eve-data/EveData";

    export let value: Character_Id = null;

    let characterNames: EntityCollection<string> = {};

    let _unsubscribes = [];

    LoadAuthorisedCharacters()
        .then(()=>{
            for(let character_id in Characters ) {
                _unsubscribes.push( Characters[character_id].subscribe(character=>{characterNames[character_id]=character?.name}) );
            }
            value = parseInt( Object.keys(Characters)[0] );
        })

    onDestroy(()=>{
        _unsubscribes.forEach(unsubscribe=>unsubscribe());
    });
</script>

<select bind:value={value}>
    {#each Object.keys(characterNames) as character_id}
        <option value={parseInt(character_id)}>{characterNames[character_id] || character_id}</option>
    {/each}
</select>