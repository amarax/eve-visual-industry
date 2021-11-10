<script lang="ts">
    import CharacterSelector from "$lib/components/CharacterSelector.svelte";
    import type { EveCharacterId } from "$lib/eve-data/EveCharacter";
import CreateESIStore from "./eve-data/ESIStore";
import type {ESIStore} from "./eve-data/ESIStore";
import EveTypes from "$lib/eve-data/EveTypes";

    export let characterId: EveCharacterId

    type JobDetails = {
        activity_id,
        blueprint_id,
        blueprint_location_id,
        blueprint_type_id,
        cost,
        duration,
        end_date,
        facility_id,
        installer_id,
        job_id,
        licensed_runs,
        output_location_id,
        probability,
        product_type_id,
        runs,
        start_date,
        station_id,
        status,
    }

    let characterJobs: ESIStore<Array<JobDetails>>;
    $: if(characterId) characterJobs = CreateESIStore<Array<JobDetails>>(`/characters/${characterId}/industry/jobs/`, null, characterId)
</script>

<p>
{#each $characterJobs ?? [] as jobDetails}
    {$EveTypes.get(jobDetails.blueprint_type_id).name} <br/>
{/each}
</p>