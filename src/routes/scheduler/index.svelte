
<script lang="ts">
import type { EveAsset } from "$lib/eve-data/ESI";

    import type { EveCharacterId } from "$lib/eve-data/EveCharacter";
import type { Quantity } from "$lib/eve-data/EveMarkets";
import type { EveType, EveTypeId } from "$lib/eve-data/EveTypes";
import EveTypes from "$lib/eve-data/EveTypes";



    import IndustryJobScheduler from "$lib/IndustryJobScheduler.svelte";
    import { getContext } from "svelte";

    import type { Readable } from "svelte/store";

    import { sum } from "d3-array";
import type { JobDetails } from "$lib/IndustryJobScheduler";
import { Industry } from "$lib/eve-data/EveIndustry";
import RelativeValueDisplay from "$lib/components/RelativeValueDisplay.svelte";




    let availableEveCharacters = getContext('availableEveCharacters') as Readable<Array<EveCharacterId>>;
    $: {
        // Cleanup if available characters change
        for(let characterId in characterMaterialsList) {
            if(!$availableEveCharacters.includes(parseInt(characterId))) {
                delete characterMaterialsList[characterId];
            }
        }
        for(let characterId in characterAssetsList) {
            if(!$availableEveCharacters.includes(parseInt(characterId))) {
                delete characterAssetsList[characterId];
            }
        }
    }


    let xOffset: number = 7;
    let scale: number = 100;
    let groupBy = "activity_id";


    let materialsList = new Map<EveTypeId, Quantity>();
    let characterMaterialsList: {[index: EveCharacterId]: Map<EveTypeId, Quantity>} = {};
    $: {
        materialsList.clear();
        for(let characterId in characterMaterialsList) {
            for(let [materialTypeId, quantity] of characterMaterialsList[characterId]) {
                materialsList.set(materialTypeId, (materialsList.get(materialTypeId) ?? 0) + quantity);
            }
        }
        materialsList = materialsList;
    }

    let materialsInventory: {[index: EveTypeId]: Quantity} = {}

    interface Asset extends EveAsset {
        characterId: EveCharacterId
    }
    let assetsList = new Map<EveTypeId, Array<Asset>>();
    let characterAssetsList: {[index: EveCharacterId]: Map<EveTypeId, Array<EveAsset>>} = {};
    $: {
        assetsList.clear();
        for(let characterId in characterAssetsList) {
            for(let [materialTypeId, assets] of characterAssetsList[characterId]) {
                if(!assetsList.has(materialTypeId))
                    assetsList.set(materialTypeId, []);

                assets.forEach(asset=>{
                    assetsList.get(materialTypeId).push({...asset, characterId:parseInt(characterId)})
                })
            }
        }
        assetsList = assetsList;
    }

    let characterIncompleteJobs: {[index:EveCharacterId]:Array<JobDetails>} = {};
    let incompleteJobs: Array<JobDetails> = [];
    $: {
        incompleteJobs = [];
        for(let characterId in characterIncompleteJobs) {
            incompleteJobs = [...incompleteJobs, ...characterIncompleteJobs[characterId]]
        }
    }


    $: requiredQuantity = (materialTypeId: EveTypeId): Quantity => {
        return materialsList.get(materialTypeId) -getAssetQuantity(materialTypeId) -getJobOutputQuantity(materialTypeId) -(materialsInventory[materialTypeId]??0);
    }


    function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    let copied = false;
    async function copyBOMToClipboard() {
        let bom = "";
        for(let [materialTypeId, quantity] of materialsList.entries()) {
            let qty = requiredQuantity(materialTypeId)
            if(qty > 0)
                bom += `${$EveTypes.get(materialTypeId).name} ${qty}\n`;
        }
        await navigator.clipboard.writeText(bom);
        copied = true;
        await timeout(1000);
        copied = false;
    }

    $: getAssetQuantity = (materialTypeId: EveTypeId): Quantity => {
        return sum(assetsList.get(materialTypeId)??[], (a)=>a.quantity);
    }

    function getJobOutputQuantity(materialTypeId: EveTypeId): Quantity {
        return sum(incompleteJobs.filter(j=>j.product_type_id === materialTypeId),
            (job: JobDetails)=>{
                let activityId = job.activity_id === 9 ? 11 : job.activity_id;
                let productPerRun = $Industry.types[job.blueprint_type_id]?.activities[activityId].products[job.product_type_id].quantity ?? 0;
                return productPerRun * job.runs
            }
        );
    }
</script>


<style lang="scss">
    .controls {
        position: sticky;
        top: 0px;

        input[type="range"] {
            width: 30%;
        }
    }

    button.fixedWidth {
        width: 150px;
    }


    .itemName {
        display: inline-block;
        width: 200px;
        overflow-x: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
    }

    .qty {
        display: inline-block;
		text-align: right;
		margin-right: 10px;
        width: 70px;
	}

    .inventory {
        input[type=number] {
            width: 70px;
            text-align: right;
        }
    }
</style>

<svelte:head>
	<title>Job Scheduler - EVE Online Visual Industry Calculator</title>
</svelte:head>

<div class="controls">
    <select bind:value={groupBy}>
        <option value=""></option>
        <option value="activity_id">Activity</option>
        <option value="facility_id">Facility</option>
        <option value="blueprint_type_id">Blueprint</option>
        <option value="product_type_id">Product</option>
    </select>
    <input type="range" bind:value={xOffset} min={-7} max={90} />
    <input type="range" bind:value={scale} min={10} max={300} />

</div>

{#each $availableEveCharacters as characterId (characterId) }
<IndustryJobScheduler {characterId} {xOffset} {scale} {groupBy} 
    bind:materialsList={characterMaterialsList[characterId]} 
    bind:materialsInAssets={characterAssetsList[characterId]}
    bind:incompleteJobs={characterIncompleteJobs[characterId]}
/>
{/each}

<p>
<b>Bill of Materials</b> <button class="fixedWidth" on:click={copyBOMToClipboard} disabled={copied}>{copied?"Copied!":"Copy to clipboard"}</button><br/>
<b>
<span class="itemName">Material</span>
<span class="qty">Required</span>
<span class="qty">Requested</span>
<span class="qty">Assets</span>
<span class="qty">Jobs</span>
<span class="inventory">Adjustment</span>
</b>
<br/>

{#each [...materialsList.entries()].sort((a,b)=>$EveTypes.get(a[0]).name.localeCompare($EveTypes.get(b[0]).name)) as [materialTypeId, quantity]}
    <span class="itemName">{$EveTypes.get(materialTypeId).name}</span>
    <span class="qty"><RelativeValueDisplay value={-requiredQuantity(materialTypeId)} extents={[-quantity,getAssetQuantity(materialTypeId) +getJobOutputQuantity(materialTypeId) +(materialsInventory[materialTypeId]??0)]}>{requiredQuantity(materialTypeId)}</RelativeValueDisplay></span>
    <span class="qty">{quantity}</span>
    <span class="qty">{getAssetQuantity(materialTypeId)}</span>
    <span class="qty">{getJobOutputQuantity(materialTypeId)}</span>
    <span class="inventory"><input type="number" bind:value={materialsInventory[materialTypeId]} /></span>
    <br/>
{/each}

Total volume: {sum(materialsList.entries(), ([materialTypeId, quantity])=>{
    let qty = requiredQuantity(materialTypeId);
    return $EveTypes.get(materialTypeId).packaged_volume * Math.max(qty,0);
})}m3
</p>