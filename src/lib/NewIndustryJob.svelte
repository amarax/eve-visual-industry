<script lang="ts">
import type { IndustryJobStore } from "./IndustryJob";
import ReactionActivity from "./ReactionActivity.svelte";

    export let blueprintLocation: number;
    export let job: IndustryJobStore;

</script>

{#if job}
    <ReactionActivity {job} defaultLocationId={blueprintLocation} />
{/if}