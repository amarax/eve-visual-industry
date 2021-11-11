<script lang="ts">
import type { EveBlueprint } from "./eve-data/ESI";

import type { IndustryJobStore } from "./IndustryJob";
import ReactionActivity from "./ReactionActivity.svelte";

    export let blueprint: EveBlueprint;
    export let job: IndustryJobStore;

</script>

{#if job}
    <ReactionActivity {job} {blueprint} defaultLocationId={blueprint?.location_id} />
{/if}