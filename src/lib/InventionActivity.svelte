<script lang="ts">
    import { Decryptors, Industry, INVENTION_ACTIVITY_ID, Universe } from "./EveData";
    import type { EntityCollection, IndustryType, Type_Id } from "./EveData";
    import { getMarketType, MarketType } from "./EveMarkets";

    export let blueprintToInvent: IndustryType = null;
    

    let inputIndustryTypes: Array<IndustryType> = [];
    $: inputIndustryTypes = Object.values( $Industry.types ).filter(type=>type.activities[INVENTION_ACTIVITY_ID]?.products[blueprintToInvent.type_id])

    $: inventionActivity = inputIndustryTypes[0].activities[INVENTION_ACTIVITY_ID];

    let selectedIndustryType = inputIndustryTypes[0];

    $: {
        if(inputIndustryTypes.length === 1) selectedIndustryType = inputIndustryTypes[0];
    }

    $: console.log($Universe.types[selectedIndustryType.type_id]);

    function isBlueprint(type_id: Type_Id): boolean {
        return $Universe.categories[9].groups[$Universe.types[type_id].group_id] != undefined;
    }

    let _relatedTypeStores: Array<Function> = [];   // Unsubscribe functions
    let relatedTypes: EntityCollection<MarketType> = {};
    $: {
        if(inventionActivity) {
            _relatedTypeStores.forEach(unsubscribe=>unsubscribe());

            Object.values(inventionActivity.materials).forEach(material=>{
                _relatedTypeStores.push( getMarketType(material.materialTypeID).subscribe(
                    value=>relatedTypes[value.type_id] = value
                ) );
            })

            if(!isBlueprint(selectedIndustryType.type_id)) {
                _relatedTypeStores.push( getMarketType(selectedIndustryType.type_id).subscribe(
                    value=>relatedTypes[value.type_id] = value
                ) );
            }
        }
    }




    let scienceSkills = [];
    let encryptionSkills = [];
    $: {
        if($Universe.markets && $Universe.types) {
            scienceSkills = $Universe.markets.groups[375].types.map(type_id=>$Universe.types[type_id]).sort((a,b)=>a.name.localeCompare(b.name));
            encryptionSkills = scienceSkills.filter(type=>type.name.indexOf("Encryption") >=0);
        }
    }


</script>

<div>
    <select bind:value={selectedIndustryType}>
        {#each inputIndustryTypes as blueprint }
            <option value={blueprint}>{$Universe.types[blueprint?.type_id]?.name}</option>
        {/each}
    </select>

    <select>
        <option>No decryptor</option>
        {#each Object.values($Decryptors) as decryptorType }
            <option value={decryptorType.type_id}>{decryptorType.name}</option>
        {/each}
    </select>
    <br/>

    <label>
        <select>
            {#each scienceSkills as {id,name} }
                <option value={id}>{name}</option>
            {/each}
        </select>
        <input type="range" min={0} max={5} />
    </label>
    <br />
    <label>
        <select>
            {#each scienceSkills as {id,name} }
                <option value={id}>{name}</option>
            {/each}
        </select>
        <input type="range" min={0} max={5} />
    </label>
    <br />
    <label>
        <select>
            {#each encryptionSkills as {id,name} }
                <option value={id}>{name}</option>
            {/each}
        </select>
        <input type="range" min={0} max={5} />
    </label>
</div>