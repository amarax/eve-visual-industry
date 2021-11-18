import { get, writable } from "svelte/store";

import { ADVANCED_INDUSTRY_SKILL_ID, MANUFACTURING_ACTIVITY_ID, REACTION_ACTIVITY_ID } from "$lib/eve-data/EveIndustry"
import { ApplyEffects, IndustryDogmaAttributes } from "$lib/eve-data/EveDogma";

import type { Readable } from "svelte/store";
import type { EntityCollection, Type_Id } from "$lib/eve-data/EveData"
import type { IndustryActivity, ProductToIndustryTypeMap } from "$lib/eve-data/EveIndustry"
import type { DurationSeconds, IskAmount, MarketPrices, Quantity } from "$lib/eve-data/EveMarkets"
import type { CharacterSkills } from "./eve-data/EveCharacter";
import type { EveTypeId } from "./eve-data/EveTypes";
import { debug } from "svelte/internal";

// Get all the computed details for a facility that affect this job
export type IndustryFacilityModifiers = {
    roleModifiers?: {
        jobDuration: number,
        materialConsumption: number,
        jobCost: number
    },
    rigModifiers?: {
        materialReduction: number,
        timeReduction: number,
        costReduction: number,
    },
    taxRate?: number,
    systemCostIndex?: number,
}

export type IndustryCharacterModifiers = {
    skill_jobDuration: number,
    implant_jobDuration: number,
}


// Purely functional class that has all the calculations
export class IndustryJob {
    activity: IndustryActivity
    selectedProduct: Type_Id

    characterModifiers: IndustryCharacterModifiers
    facilityModifiers: IndustryFacilityModifiers
    blueprintModifiers: {
        materialEfficiency: number,
        timeEfficiency: number,
    }
    blueprintCostPerRun: number

    prices: EntityCollection<IskAmount>
    indexPrices: EntityCollection<MarketPrices>

    runs: number

    // Permissive constructor that really only requires an activity
    constructor(activity: IndustryActivity, selectedProduct?: Type_Id) {
        this.activity = activity;
        this.selectedProduct = this.activity?.products[selectedProduct]?.type_id ?? Object.values(this.activity?.products ?? {})[0]?.type_id ?? null;

        this.facilityModifiers = {taxRate:10, systemCostIndex:0.05};
        this.prices = {};
        this.indexPrices = {};
        this.blueprintCostPerRun = 0;

        this.runs = 1;
    }

    get producedQuantity(): Quantity {
        return this.activity?.products[this.selectedProduct].quantity * this.runs;
    }

    set requiredQuantity(value: Quantity) {
        if(value === null || isNaN(value)) return;

        this.runs = Math.ceil( value / this.activity?.products[this.selectedProduct]?.quantity );
    }

    // #region Cost metrics

    qty(baseQuantity: Quantity) : Quantity {
        if(baseQuantity == undefined) return 0;

        let qty = ApplyEffects(
            baseQuantity * this.runs,
            [
                {value: -this.blueprintModifiers?.materialEfficiency},
                {value: this.facilityModifiers.roleModifiers?.materialConsumption},
                {value: this.facilityModifiers.rigModifiers?.materialReduction},
            ]
        )

        return Math.max(this.runs, Math.ceil(qty));
    }

    materialQuantity(type_id: Type_Id): Quantity {
        return this.qty(this.activity?.materials[type_id]?.quantity);
    }

    get estimatedItemValue(): IskAmount {
        let total = 0;
        for(let type_id in (this.activity?.materials ?? [])) {
            // If the adjusted price is not available, treat the price as 0
            // Verified behaviour on Tranquility on 1 Nov 2021
            total += this.activity.materials[type_id].quantity * (this.indexPrices[type_id]?.adjusted_price ?? 0);
        }

        return total;
    }

    get jobCost(): IskAmount {
        let cost = ApplyEffects(
            this.estimatedItemValue * this.facilityModifiers.systemCostIndex * this.runs,
            [
                {value: this.facilityModifiers.roleModifiers?.jobCost},
                {value: this.facilityModifiers.taxRate}
            ]
        )

        return cost; 
    }

    get totalCost(): IskAmount {
        let totalCost = 0;
        for(let type_id in (this.activity?.materials ?? [])) {
            let materialQuantity = this.qty(this.activity.materials[type_id].quantity);

            totalCost += materialQuantity * (this.prices[type_id] ?? 0);
        }
        totalCost += this.jobCost;
        totalCost += (this.blueprintCostPerRun ?? 0) * this.runs;

        return totalCost;
    }

    get unitCost(): IskAmount {
        return this.totalCost / this.producedQuantity;
    }
    // #endregion

    // #region Duration metrics

    get jobDuration(): DurationSeconds {
        return Math.round(ApplyEffects(
            this.activity?.time * this.runs,
            [
                {value: -this.blueprintModifiers?.timeEfficiency},
                {value: this.characterModifiers?.skill_jobDuration},
                {value: this.characterModifiers?.implant_jobDuration},
                {value: this.facilityModifiers.roleModifiers?.jobDuration},
                {value: this.facilityModifiers.rigModifiers?.timeReduction},
            ]
        ))
    }

    // #endregion


    // #region Profit metrics
    
    // Removing profit because it may cause infinite loops as it may indirectly affect price
    get profit(): IskAmount {
        return this.prices[this.selectedProduct] * this.producedQuantity - this.totalCost;
    }

    // #endregion
}


export interface IndustryJobStore extends Readable<IndustryJob> {
    update(changes: {
        activity?: IndustryActivity
        selectedProduct?: Type_Id
    
        characterModifiers?: {
            skill_jobDuration?: number,
            implant_jobDuration?: number,
        }
        facilityModifiers?: IndustryFacilityModifiers
        blueprintModifiers?: {
            materialEfficiency: number,
            timeEfficiency: number,
        }
        blueprintCostPerRun?: number
    
        prices?: EntityCollection<IskAmount>
        indexPrices?: EntityCollection<MarketPrices>
    
        runs?: number
        requiredQuantity?: number
    })
}

export function CreateIndustryJobStore(activity: IndustryActivity, selectedProduct?: Type_Id): IndustryJobStore {
    if(!activity)
        debugger;

    // If no product is selected, we will take the first product from the activity
    selectedProduct = selectedProduct ?? Object.values( activity.products )[0]?.type_id;
    
    let job = new IndustryJob(activity, selectedProduct);

    let { subscribe, set } = writable(job);

    return {
        subscribe,
        update: (changes)=>{
            for(let change in changes) {
                if(change=="indexPrices") {
                    job[change] = changes[change];
                    continue;
                }


                if(!job[change] || typeof changes[change] !== 'object') {
                    job[change] = changes[change];
                } else {
                    // For now we only update one level because that's what we have so far
                    for(let c in changes[change]) {
                        job[change][c] = changes[change][c]   
                    }
                }
            }
            set(job);
        }
    }
}

export function CreateProductionJobStore(selectedProduct: Type_Id, productToActivity: ProductToIndustryTypeMap): IndustryJobStore {
    let activity = productToActivity.get(selectedProduct)?.activity;

    return CreateIndustryJobStore(activity, selectedProduct);
}


interface EveLocationInfo {
    activitySystemCostIndex?,
    activityTax?,
    structureRoleBonuses?: {
        jobDurationModifier: number,
        materialConsumptionModifier: number,
        jobCostModifier: number
    },
    structureRigBonuses?: {
        materialReductionBonus: number,
        timeReductionBonus: number,
        costReductionBonus: number,
    },
}

// TODO this should be the place that handles activity-related details
export function ModifiersFromLocationInfo(locationInfo: EveLocationInfo): IndustryFacilityModifiers {
    let modifiers: IndustryFacilityModifiers = {
        systemCostIndex: locationInfo.activitySystemCostIndex,
        taxRate: locationInfo.activityTax,

    }

    if(locationInfo.structureRoleBonuses) {
        let structureRoleBonuses = locationInfo.structureRoleBonuses;
        modifiers.roleModifiers = {
            jobDuration: structureRoleBonuses.jobDurationModifier,
            materialConsumption: structureRoleBonuses.materialConsumptionModifier,
            jobCost: structureRoleBonuses.jobCostModifier,

        }
    }

    if(locationInfo.structureRigBonuses) {
        let structureRigBonuses = locationInfo.structureRigBonuses;
        modifiers.rigModifiers = {
            materialReduction: structureRigBonuses.materialReductionBonus,
            timeReduction: structureRigBonuses.timeReductionBonus,
            costReduction: structureRigBonuses.costReductionBonus,
        }
    }

    return modifiers;
}

type AffectingSkillModifier = {
    skillId: EveTypeId, 
    activeLevel: number, 
    valuePerLevel: number
}
export function GetAffectingSkillModifiers(activity: IndustryActivity, characterSkills: CharacterSkills): Array<AffectingSkillModifier> {
    if(!activity || !characterSkills) return [];
    
    const dogmaAttributes = get(IndustryDogmaAttributes);
    console.assert(Object.keys(dogmaAttributes.attributes).length > 0 && Object.keys(dogmaAttributes.types).length > 0), "IndustryDogmaAttributes not yet loaded";

    const REACTION_TIME_ATTRIBUTE_ID = 2660;
    let relevantAttributes: Array<number> = [];
    switch(activity.activity.activityID) {
        case 9:
            relevantAttributes = [REACTION_TIME_ATTRIBUTE_ID];
            break;
        case REACTION_ACTIVITY_ID:
            relevantAttributes = [REACTION_TIME_ATTRIBUTE_ID];
            break;
        case MANUFACTURING_ACTIVITY_ID:
            relevantAttributes = [440,1982,1961];   // Need to label what attributes these are
        break;
    }

    let affectingSkillIds = [...Object.values( activity.requiredSkills ?? {} ), {type_id:ADVANCED_INDUSTRY_SKILL_ID}]
        .map(s=>s.type_id)
        .filter((s: Type_Id)=>dogmaAttributes.types[s] != undefined)
    
    let skillModifiers = affectingSkillIds
        .map((skillId:Type_Id) => {
            let valuePerLevel = 0;
            for(let attributeId of relevantAttributes) {
                valuePerLevel = dogmaAttributes.types[skillId][attributeId]?.value ?? 0;
                if(valuePerLevel !== 0) break;
            }
            let activeLevel = characterSkills?.skills.find(c=>c.skill_id==skillId)?.active_skill_level ?? 0;
            return {skillId, activeLevel, valuePerLevel}
        })
        .filter(mod=>mod.valuePerLevel !== 0)

    return skillModifiers;
}

type AffectingImplantModifier = {
    typeId: EveTypeId,
    value: number,
}
export function GetAffectingImplantModifiers(activity: IndustryActivity, characterImplants?: Array<EveTypeId>): Array<AffectingImplantModifier> {
    const dogmaAttributes = get(IndustryDogmaAttributes);
    console.assert(Object.keys(dogmaAttributes.attributes).length > 0 && Object.keys(dogmaAttributes.types).length > 0), "IndustryDogmaAttributes not yet loaded";

    let relevantAttributes: Array<number> = [];
    switch(activity.activity.activityID) {
        case MANUFACTURING_ACTIVITY_ID:
            relevantAttributes = [440];   // Need to label what attributes these are
        break;
    }

    let implantModifiers = (characterImplants ?? [])
        .map((typeId:EveTypeId)=>{
            let value = 0;
            for(let attributeId of relevantAttributes) {
                if(!dogmaAttributes.types[typeId]) continue;
                value = dogmaAttributes.types[typeId][attributeId]?.value ?? 0;
                if(value != 0)
                    break;
            }
            return {typeId, value};
        })
        .filter(mod=>mod.value !== 0)

    return implantModifiers;
}

export function ModifiersFromCharacter(activity: IndustryActivity, characterSkills: CharacterSkills, characterImplants: Array<EveTypeId>): IndustryCharacterModifiers {
    let skill_jobDuration = ApplyEffects(1, GetAffectingSkillModifiers(activity, characterSkills).map(asm=>({value:asm.activeLevel*asm.valuePerLevel})) )*100 -100;

    let implant_jobDuration = ApplyEffects(1, GetAffectingImplantModifiers(activity, characterImplants).map(aim=>({value:aim.value})) )*100 -100;

    return {
        skill_jobDuration,
        implant_jobDuration,
    }
}