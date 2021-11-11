<script lang="ts">
import type { EveBlueprint } from "./eve-data/ESI";
import { Activity_Id, Industry, IndustryActivity, MANUFACTURING_ACTIVITY_ID, REACTION_ACTIVITY_ID } from "./eve-data/EveIndustry";
import type { EveTypeId } from "./eve-data/EveTypes";
import type { IndustryJobStore } from "./IndustryJob";
import ManufacturingActivity from "./ManufacturingActivity.svelte";
import ReactionActivity from "./ReactionActivity.svelte";


    export let blueprint: EveBlueprint;
    export let job: IndustryJobStore;

</script>

{#if blueprint}
    <ReactionActivity {job} defaultLocationId={blueprint.location_id} />
{/if}