<script lang="ts">
import { createEventDispatcher, getContext, setContext } from "svelte";
import { Readable, writable } from "svelte/store";
import type { Writable } from "svelte/store";

import { REACTION_ACTIVITY_ID } from "$lib/eve-data/EveIndustry";
import { IndustryFacilityModifiers, ModifiersFromLocationInfo } from "$lib/IndustryJob";

import LocationSelector from "$lib/components/LocationSelector.svelte";
import type { EveLocationsContext } from "src/contexts";
import type { EveLocationId } from "$lib/eve-data/ESI";

    export let value: EveLocationId;

    export let activity;
    
    let locations: Readable<EveLocationsContext> = getContext('EveLocations');   // This should be a collection of all locations
    let _filteredLocations: Writable<EveLocationsContext> = writable($locations);
    setContext('EveLocations', _filteredLocations);
    $: if($locations) {
        switch(activity) {
            case REACTION_ACTIVITY_ID:
                // For now we're just going to filter for Athanors
                const ATHANOR_TYPE_ID = 35835;
                
                let _locations: EveLocationsContext = new Map();
                for(let [id, location] of $locations.entries()) {
                    if(location.type_id == ATHANOR_TYPE_ID) {
                        _locations.set(id, location);
                    }
                }
               
                _filteredLocations.set(_locations);
            break;
            default:
                _filteredLocations.set($locations)
        }
    }

    // TODO transfer more facility-related functionality out of LocationSelector

    const dispatch = createEventDispatcher();

    let locationInfo;
    export let facilityModifiers: IndustryFacilityModifiers = {};
    $: if(locationInfo) facilityModifiers = ModifiersFromLocationInfo(locationInfo);
</script>

<LocationSelector bind:value {activity} bind:locationInfo on:change={event=>dispatch('change',ModifiersFromLocationInfo(event.detail))} />
