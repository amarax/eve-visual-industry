<script lang="ts">
import { getContext, setContext } from "svelte";
import { writable } from "svelte/store";
import type { Writable } from "svelte/store";

import type { EntityCollection, EveLocation, Location_Id } from "$lib/eve-data/EveData";
import { REACTION_ACTIVITY_ID } from "$lib/eve-data/EveIndustry";
import type { IndustryFacilityModifiers } from "$lib/IndustryJob";

import LocationSelector from "./LocationSelector.svelte";

    export let facilityModifiers: IndustryFacilityModifiers = {
        systemCostIndex: 0.05,
        taxRate: 10
    }

    let structureRoleBonuses, structureRigBonuses;
    $: if(structureRoleBonuses) {
        facilityModifiers.roleModifiers = {
            jobDuration: structureRoleBonuses.jobDurationModifier,
            materialConsumption: structureRoleBonuses.materialConsumptionModifier,
            jobCost: structureRoleBonuses.jobCostModifier,
        }
    } else {
        delete facilityModifiers.roleModifiers;
    }
    $: if(structureRigBonuses) {
        facilityModifiers.rigModifiers = {
            materialReduction: structureRigBonuses.materialReductionBonus,
            timeReduction: structureRigBonuses.timeReductionBonus,
            costReduction: structureRigBonuses.costReductionBonus,
        }
    } else {
        delete facilityModifiers.rigModifiers;
    }
    export let value: Location_Id;

    export let activity;
    
    let locations: Writable<EntityCollection<EveLocation>> = getContext('locations');   // This should be a collection of all locations
    let _filteredLocations: Writable<EntityCollection<EveLocation>> = writable($locations);
    setContext('locations', _filteredLocations);
    $: if($locations) {
        switch(activity) {
            case REACTION_ACTIVITY_ID:
                // For now we're just going to filter for Athanors
                const ATHANOR_TYPE_ID = 35835;
                
                let entries = Object.values($locations)
                    .filter((location: EveLocation)=>location?.type_id == ATHANOR_TYPE_ID)
                    .map((location: EveLocation)=>[location?.type_id, location]);
                
                _filteredLocations.set( Object.fromEntries(entries) );
            break;
            default:
                _filteredLocations.set($locations)
        }
    }

    // TODO transfer more facility-related functionality out of LocationSelector
</script>

<LocationSelector bind:value {activity}
    bind:activitySystemCostIndex={facilityModifiers.systemCostIndex} 
    bind:activityTax={facilityModifiers.taxRate} 
    bind:structureRoleBonuses 
    bind:structureRigBonuses />
