
<script lang="ts">
    import type { EveCharacterId } from "$lib/eve-data/EveCharacter";
import type { Quantity } from "$lib/eve-data/EveMarkets";
import type { EveTypeId } from "$lib/eve-data/EveTypes";
import EveTypes from "$lib/eve-data/EveTypes";



    import IndustryJobScheduler from "$lib/IndustryJobScheduler.svelte";
    import { getContext } from "svelte";

    import type { Readable } from "svelte/store";





    let availableEveCharacters = getContext('availableEveCharacters') as Readable<Array<EveCharacterId>>;

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


    function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    let copied = false;
    async function copyBOMToClipboard() {
        let bom = "";
        for(let [materialTypeId, quantity] of materialsList.entries()) {
            let requiredQuantity = quantity - (materialsInventory[materialTypeId]??0)
            if(requiredQuantity > 0)
                bom += `${$EveTypes.get(materialTypeId).name} ${requiredQuantity}\n`;
        }
        await navigator.clipboard.writeText(bom);
        copied = true;
        await timeout(1000);
        copied = false;
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
<IndustryJobScheduler {characterId} {xOffset} {scale} {groupBy} bind:materialsList={characterMaterialsList[characterId]} />
{/each}

<p>
<b>Bill of Materials</b> <button class="fixedWidth" on:click={copyBOMToClipboard} disabled={copied}>{copied?"Copied!":"Copy to clipboard"}</button><br/>
{#each [...materialsList.entries()].sort((a,b)=>$EveTypes.get(a[0]).name.localeCompare($EveTypes.get(b[0]).name)) as [materialTypeId, quantity]}
    <span class="itemName">{$EveTypes.get(materialTypeId).name}</span>
    <span class="qty">{quantity - (materialsInventory[materialTypeId]??0)}</span>
    <span class="inventory"><input type="number" bind:value={materialsInventory[materialTypeId]} /></span>
    <br/>
{/each}
</p>