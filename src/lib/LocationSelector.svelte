<script lang="ts">
import { onDestroy } from "svelte";

    import { CharacterBlueprints, Characters } from "./EveCharacter";

    import { GetLocationStore, Location_Id } from "./EveData";


    // For now just get locations from list of blueprints
    $: blueprints = CharacterBlueprints[ Object.keys(Characters)[0] ];
    

    let _unsubscribes=[];
    let locations = {};
    $: {
        _unsubscribes.forEach(u=>u());
        locations = {};

        $blueprints?.forEach(b=>{ 
            locations[b.location_id] = null;
        });

        let ids = Object.keys(locations);
        if(value === null && ids.length >=1) {
            value = parseInt( ids[ids.length-1] );
        }

        ids.forEach(location_id=>{
            let unsubscribe = GetLocationStore(parseInt(location_id)).subscribe(value=>{
                locations[location_id] = value;
            });
            if(typeof unsubscribe == 'function') _unsubscribes.push(unsubscribe);

        })
    }

    onDestroy(()=>{_unsubscribes.forEach(u=>u&&u())})


    export let value: Location_Id = null;
</script>


<select bind:value={value}>
    {#each Object.keys(locations) as location_id}
        <option value={parseInt( location_id )}>{locations[location_id]?.name ?? location_id}</option>
    {/each}
</select>