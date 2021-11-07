<script lang="ts">


    import { Universe } from "$lib/eve-data/EveData";
    import type { Type_Id } from "$lib/eve-data/EveData";

    import { Industry } from "$lib/eve-data/EveIndustry";
    import { CreateReactionJobStore } from "$lib/IndustryJob";



    export let productTypeId: Type_Id = null;
    $: job = CreateReactionJobStore(productTypeId, $Industry);

</script>

<div>
    <div>{$Universe.types[productTypeId]?.name}</div>
    <div>{$job.profit}</div>
</div>