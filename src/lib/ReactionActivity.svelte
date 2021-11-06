<script lang="ts">
    import { Universe } from "$lib/eve-data/EveData";
    import type { Type_Id } from "$lib/eve-data/EveData";
import { Industry } from "$lib/eve-data/EveIndustry";
import { CreateReactionJobStore } from "$lib/IndustryJob";



    export let productTypeId: Type_Id = null;

    $: job = CreateReactionJobStore(productTypeId, $Industry);



    export let compact = false;

</script>

<div class={`breakdown ${!compact?"summary":""}`}>
    <div class="itemName" title={`${$Universe.types[productTypeId]?.name} [${productTypeId}]`}>{$Universe.types[productTypeId]?.name}</div>
    <div class="qty">{$job.producedQuantity}</div>

</div>