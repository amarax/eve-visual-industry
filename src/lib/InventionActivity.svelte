<script lang="ts">
    import { loadType, Universe } from "./EveData";
    import { Decryptors, Industry, INVENTION_ACTIVITY_ID,  } from "./EveIndustry";
    
    import type { EntityCollection, Type_Id } from "./EveData";
    import type { IndustryType } from "./EveIndustry";

    import { getMarketType, IskAmount, MarketType } from "./EveMarkets";
    import MarketOrdersBar from "./MarketOrdersBar.svelte";
    import { sum } from "./Utilities";
    import { FormatIskAmount } from "./Format";
    
    import { Characters, CharacterSkills } from "./EveCharacter";
    import type { ESIStore } from "./ESIStore";


    export let selectedCharacterId = null;

    
    let characterSkills: ESIStore<CharacterSkills>;
    $: {
    }
    


    export let blueprintToInvent: IndustryType = null;

    let inputIndustryTypes: Array<IndustryType> = [];
    $: inputIndustryTypes = Object.values( $Industry.types ).filter(type=>type.activities[INVENTION_ACTIVITY_ID]?.products[blueprintToInvent?.type_id])

    let selectedIndustryType = inputIndustryTypes[0];
    $: {
        if(inputIndustryTypes.length >= 1 && inputIndustryTypes.indexOf(selectedIndustryType) === -1) selectedIndustryType = inputIndustryTypes[0];
    }

    $: inventionActivity = selectedIndustryType?.activities[INVENTION_ACTIVITY_ID];

    function isBlueprint(type_id: Type_Id): boolean {
        return $Universe.categories[9].groups[$Universe.types[type_id]?.group_id] != undefined;
    }

    let _relatedTypeStores: Array<Function> = [];   // Unsubscribe functions
    let relatedTypes: EntityCollection<MarketType> = {};
    $: {
        if(inventionActivity) {
            _relatedTypeStores.forEach(unsubscribe=>unsubscribe());

            _relatedTypeStores = [];

            Object.values(inventionActivity.materials).forEach(material=>{
                let unsubscribe = getMarketType(material.materialTypeID).subscribe(
                    value=>relatedTypes[value.type_id] = value
                );
                if(unsubscribe) _relatedTypeStores.push( unsubscribe );
            })

            if(selectedIndustryType && !isBlueprint(selectedIndustryType.type_id)) {
                let unsubscribe = getMarketType(selectedIndustryType.type_id).subscribe(
                    value=>relatedTypes[value.type_id] = value
                );
                if(unsubscribe) _relatedTypeStores.push( unsubscribe );
            }

            if(selectedDecryptor) {
                let unsubscribe = getMarketType(selectedDecryptor).subscribe(
                    value=>relatedTypes[value.type_id] = value
                );
                if(unsubscribe) _relatedTypeStores.push( unsubscribe );
            }
        }
    }



    export let brokerFeeRate = 0.0151114234532; // Aqua Silentium's broker fee


    let scienceSkills = [];
    let encryptionSkills = [];
    $: {
        if($Universe.markets && $Universe.types) {
            scienceSkills = $Universe.markets.groups[375].types.map(type_id=>$Universe.types[type_id]).sort((a,b)=>a.name.localeCompare(b.name));
            encryptionSkills = scienceSkills.filter(type=>type.name.indexOf("Encryption") >=0);
        }
    }

    let selectedDecryptor: Type_Id;

    let breakdownItems: Array<Type_Id> = [];
    $: {
        breakdownItems = [];
        if(inventionActivity) {
            if(selectedIndustryType && !isBlueprint(selectedIndustryType.type_id)) breakdownItems.push(selectedIndustryType.type_id);
            breakdownItems.push( ...Object.keys(inventionActivity.materials).map(string=>parseInt(string)) );
            if(selectedDecryptor) breakdownItems.push(selectedDecryptor);
        }
    }


    let selectedIndustryTypeCost = 0;
    $: { 
        selectedIndustryTypeCost = 0;
        if(selectedIndustryType && !isBlueprint(selectedIndustryType.type_id)) {
            selectedIndustryTypeCost = relatedTypes[selectedIndustryType.type_id].orders.sell[0]?.price;
        }
    }

    let totalCost = 0;
    $: {
        totalCost = 0;
        if(inventionActivity) {
            totalCost += selectedIndustryTypeCost;
            totalCost += sum( Object.values(inventionActivity.materials), material=>relatedTypes[material.materialTypeID].orders.sell[0]?.price*material.quantity );
            if(selectedDecryptor) totalCost += relatedTypes[selectedDecryptor].orders.sell[0]?.price;
        }
    }

    let skill1, skill2, encryptionSkill;
    let skill1Level = 3, skill2Level =3, encryptionSkillLevel =3;
    $: {
        let characterChanged = false;
        if(characterSkills !== CharacterSkills[selectedCharacterId]) {
            characterSkills = CharacterSkills[selectedCharacterId];
            characterChanged = true;
        }


        function getSkillLevel(skill_id: Type_Id): number {
            return $characterSkills?.skills.find(skill=>skill.skill_id===skill_id)?.active_skill_level || 0;
        }

        // if the skills didn't change then don't update the skill level

        let skill1Found = false;
        for(let skill of Object.values(inventionActivity?.requiredSkills)) {
            let skillType = $Universe.types[skill.type_id];
            if(skillType.name.indexOf("Encryption") >=0) {
                if(characterChanged || encryptionSkill?.type_id !== skillType.type_id) {
                    encryptionSkill = skillType;
                    encryptionSkillLevel = getSkillLevel(encryptionSkill.type_id);
                }
                continue;
            }
            if(!skill1Found) {
                if(characterChanged || skill1?.type_id !== skillType.type_id) {
                    skill1 = skillType;
                    skill1Level = getSkillLevel(skill1.type_id);
                }

                skill1Found = true;
            } else {
                if(characterChanged || skill2?.type_id !== skillType.type_id) {
                    skill2 = skillType;
                    skill2Level = getSkillLevel(skill2.type_id);
                }
            }
        }
    }

    let inventionProbability: number = 0.3;
    $: inventionProbability = inventionActivity?.products[blueprintToInvent.type_id]?.probability * (1 + (skill1Level + skill2Level)/30 + encryptionSkillLevel/40) * decryptorProbabilityModifier;

    const DECRYPTOR_RUN_MODIFIER_ATTRIBUTE_ID = 1124;
    const DECRYPTOR_PROBABILITY_MODIFIER_ATTRIBUTE_ID = 1112;
    const DECRYPTOR_ME_MODIFIER_ATTRIBUTE_ID = 1113;
    const DECRYPTOR_TE_MODIFIER_ATTRIBUTE_ID = 1114;


    let decrpytorRunModifier: number;
    let decryptorProbabilityModifier: number;
    let decryptorMEModifier: number;
    let decryptorTEModifier: number;
    $: {
        if(selectedDecryptor) {
            loadType(selectedDecryptor).then(type=>{
                decrpytorRunModifier = type.dogma_attributes.find(attribute=>attribute.attribute_id==DECRYPTOR_RUN_MODIFIER_ATTRIBUTE_ID).value;
                decryptorProbabilityModifier = type.dogma_attributes.find(attribute=>attribute.attribute_id==DECRYPTOR_PROBABILITY_MODIFIER_ATTRIBUTE_ID).value;
                decryptorMEModifier = type.dogma_attributes.find(attribute=>attribute.attribute_id==DECRYPTOR_ME_MODIFIER_ATTRIBUTE_ID).value;
                decryptorTEModifier = type.dogma_attributes.find(attribute=>attribute.attribute_id==DECRYPTOR_TE_MODIFIER_ATTRIBUTE_ID).value;

            })
        } else {
            decrpytorRunModifier = 0;
            decryptorProbabilityModifier = 1;
            decryptorMEModifier = 0;
            decryptorTEModifier = 0;
        }
    }

    let baseME = 2;
    let baseTE = 4;

    export let productME: number = baseME;
    export let productTE: number = baseTE;
    $: {
        productME = baseME + decryptorMEModifier;
        productTE = baseTE + decryptorTEModifier;
    }

    export let productRuns: number = 1;
    $: {
        productRuns = inventionActivity?.products[blueprintToInvent.type_id]?.quantity + decrpytorRunModifier;
        if(isNaN(productRuns)) productRuns = 1;
    }


    $: expectedRuns = productRuns * inventionProbability;

    export let expectedCostPerRun: IskAmount = 0;
    $: {
        expectedCostPerRun = totalCost / expectedRuns;
        if(isNaN(expectedCostPerRun)) expectedCostPerRun = 0;
    }

    export let extents: Array<IskAmount> = null;
    let _extents = [0,1000000];
    $:{
        _extents = extents || [0,totalCost*1.1];
    }

</script>

<style lang="scss">
    div.breakdown {
        display: grid;
        grid-template-columns: 1fr 80px 500px;

        max-width: 800px;

        .itemName {
            overflow-x: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;

        }

        .qty {
            text-align: right;
            margin-right: 10px;
        }

    }
</style>

<div>
    <select bind:value={selectedIndustryType}>
        {#each inputIndustryTypes as blueprint }
            <option value={blueprint}>{$Universe.types[blueprint?.type_id]?.name}</option>
        {/each}
    </select>

    <select bind:value={selectedDecryptor}>
        <option value={null}>No decryptor</option>
        {#each Object.values($Decryptors) as decryptorType }
            <option value={decryptorType.type_id}>{decryptorType.name}</option>
        {/each}
    </select>
    Runs +{decrpytorRunModifier} ME {decryptorMEModifier} TE {decryptorTEModifier} Probability {100-decryptorProbabilityModifier*100}%
    <br/>

    <label>
        {skill1?.name} 
        <input bind:value={skill1Level} type="range" min={0} max={5} />
    </label>
    <br />
    <label>
        {skill2?.name}
        <input bind:value={skill2Level} type="range" min={0} max={5} />
    </label>
    <br />
    <label>
        {encryptionSkill?.name}
        <input bind:value={encryptionSkillLevel} type="range" min={0} max={5} />
    </label>

    <div class="breakdown">
        {#each breakdownItems as type_id}
            <div class="itemName" title={`${$Universe.types[type_id].name} [${type_id}]`}>{$Universe.types[type_id].name}</div>
            <div class="qty">{inventionActivity.materials[type_id]?.quantity || 1}</div>
            <div>
                <MarketOrdersBar height={20} extents={_extents} quantity={inventionActivity.materials[type_id]?.quantity || 1} 
                    highestBuyOrder={relatedTypes[type_id].orders.buy[0]} lowestSellOrder={relatedTypes[type_id].orders.sell[0]} 
                    buyOverheadRate={-brokerFeeRate}
                />
                <br/>
            </div>
        {/each}
        {#if !selectedDecryptor}
            <div class="itemName">No decryptor</div>
            <div style={`height:${24}px`}></div>
        {/if}
    </div>

    Total Invention Cost {FormatIskAmount(totalCost)} Chance of success {inventionProbability*100}% <br/>
    Expected Runs {expectedRuns}  Expected cost per run {FormatIskAmount(expectedCostPerRun)}
    
</div>