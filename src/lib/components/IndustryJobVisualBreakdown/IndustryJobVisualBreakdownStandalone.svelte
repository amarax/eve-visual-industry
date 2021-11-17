<script lang="ts">
import { CharacterImplants, EveCharacterId } from "$lib/eve-data/EveCharacter";
import { CharacterSkills } from "$lib/eve-data/EveCharacter";

import { ProductToActivity } from "$lib/eve-data/EveIndustry";
import { MarketPrices } from "$lib/eve-data/EveMarkets";

import type { EveTypeId } from "$lib/eve-data/EveTypes";
import { CreateIndustryJobStore, ModifiersFromCharacter } from "$lib/IndustryJob";
import { getContext } from "svelte";
import type { Readable } from "svelte/store";
import IndustryJobVisualBreakdown from "./IndustryJobVisualBreakdown.svelte";

export let productTypeId: EveTypeId;

let job;
$: {
    let activity = $ProductToActivity.get(productTypeId)?.activity;
    if(activity) job = CreateIndustryJobStore( activity );
}

let currentCharacter = getContext('currentCharacter') as Readable<EveCharacterId>;
$: characterSkills = CharacterSkills[$currentCharacter];
$: characterImplants = CharacterImplants[$currentCharacter]

$: if(job) {
    let indexPrices = $MarketPrices;

    let characterModifiers = ModifiersFromCharacter($job.activity, $characterSkills, $characterImplants);

    job.update({indexPrices, characterModifiers})
}

</script>

{#if job}
<IndustryJobVisualBreakdown {job} />
{:else}
Waiting for valid product...
{/if}