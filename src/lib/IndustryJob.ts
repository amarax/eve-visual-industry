import type { EntityCollection, Type, Type_Id } from "./EveData";
import type { DurationSeconds, IskAmount, MarketType, Quantity } from "./EveMarkets";


export interface Activity {
    materialEfficiency?: number;
    timeEfficiency?: number;

    probability?: number;

    costIndexModifier?: number;

    duration: DurationSeconds;  // Duration per run
}

export interface Facility {
    materialConsumptionModifier?: number,
    durationModifier?: number,

    locationActivityCostIndex?: number;
    taxRate: number,
}

export interface Input {
    type: Type,

    quantity: Quantity,

    indexPrice: IskAmount,
    unitCost: IskAmount,

    from: MarketType | IndustryJob
}

export interface Output {
    type: Type,
    unitPrice: IskAmount,

    quantity: Quantity,

}

export interface SkillModifier {
    type: Type,
    durationModifier?: number,
    probabilityModifier?: number,
}

type CostItem = {
    input: Input,
    requiredQuantity: Quantity,
}

function sum(array: Array<any>, accessor: (element: any)=>number) {
    return array.reduce( (runningTotal, element)=> runningTotal + accessor(element), 0);
}


// For now this will be a purely functional object that is a central place for all calculations related to industry jobs
// This will remove the need for it to subscribe to anything etc.
export default class IndustryJob {
    activity: Activity;

    runs: number;

    facility: Facility;

    inputs: EntityCollection<Input>;
    output: Output;

    affectingSkills: EntityCollection<SkillModifier>;

    constructor(activity: Activity, inputs: EntityCollection<Input>, output: Output, facility: Facility, runs: number, affectingSkills: EntityCollection<SkillModifier>) {
        this.activity = activity;
        this.inputs = inputs;
        this.output = output;
        this.facility = facility;
        this.affectingSkills = affectingSkills;
        this.runs = runs;
    }

    get billOfMaterials(): Array<{input: Input, quantity: Quantity}> {
        let bom = [];

        Object.values(this.inputs).map( (input: Input)=>({
            input, 
            quantity: Math.max( this.runs, Math.ceil( input.quantity * this.runs * (1-this.activity.materialEfficiency/100) * (1+this.facility.materialConsumptionModifier/100) ) ) 
        }) );

        return bom;
    }

    get jobCost(): IskAmount {
        let totalCostIndexPrice = sum( Object.values(this.inputs), input=>input.quantity*input.indexPrice );

        return totalCostIndexPrice * (this.activity.costIndexModifier || 1) * this.facility.locationActivityCostIndex;
    }

    get totalCost(): IskAmount {
        return sum(this.billOfMaterials, bomItem=>bomItem.quantity*bomItem.input.unitCost ) + this.jobCost;
    }

    get duration(): DurationSeconds {
        return this.activity.duration * (1-this.activity.timeEfficiency/100); // todo include skills
    }
}


// Todo include helper functions to select a blueprint its manufacturing activity from a requested product

// Todo helper function to generate PI chain