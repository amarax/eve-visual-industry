import { derived, get, readable } from "svelte/store";
import { LoadFromESI, LoadFromSDE, Universe } from "./EveData";
import type { Readable } from "svelte/store";
import type { EveLocation, EntityCollection, Type, Type_Id, UniverseStore } from "./EveData";
import CreateESIStore  from "./ESIStore";
import type { ESIStore } from "./ESIStore";
import EveTypes from "./EveTypes";

export type Activity_Id = number;

export type RAMActivity = {
    activityID:Activity_Id,
    activityName:string,
    iconNo:number,
    description:string,
    published:boolean
};

export type IndustryType = {
    type_id: Type_Id,
    activities: EntityCollection<IndustryActivity>,
    maxProductionLimit?: number,
}

export type IndustryActivity = { 
    activity: RAMActivity,
    time: number,
    materials: EntityCollection<{
        materialTypeID: Type_Id,
        quantity: number,
    }>,
    products: EntityCollection<{
        type_id: Type_Id,
        quantity: number,
        probability?: number,
    }>,
    requiredSkills?: EntityCollection<{
        type_id: Type_Id,
        level: number,
    }>,
}

export type IndustryStore = {
    activities:EntityCollection<RAMActivity>, 
    types:EntityCollection<IndustryType>
}


export const MANUFACTURING_ACTIVITY_ID = 1;
export const INVENTION_ACTIVITY_ID = 8;
export const REVERSE_ENGINEERING_ACTIVITY_ID = 7;
export const REACTION_ACTIVITY_ID = 9;


let industryPopulated = false;
function setupIndustry( set:(value:any)=>void ) {
    if(industryPopulated) return ()=>{};
    
    let industry: IndustryStore = {
        activities: {},
        types: {},

    }

    LoadFromSDE("ramActivities")
        .then((data: Array<RAMActivity>)=>{
            data.filter(activity=>activity.activityID).forEach(activity=>industry.activities[activity.activityID]=activity);
        })
        .then(()=>LoadFromSDE("industryActivity"))
        .then((data: Array<{
            type_id:Type_Id,
            activityID:Activity_Id,
            time:number
        }>)=>{
            data.forEach(typeActivity=>{
                if(typeActivity.type_id === null) return;

                let type = industry.types[typeActivity.type_id];
                if(type === undefined) {
                    type = {type_id:typeActivity.type_id, activities:{}};
                    industry.types[typeActivity.type_id] = type;
                }
                
                type.activities[typeActivity.activityID] = {
                    activity: industry.activities[typeActivity.activityID],
                    time: typeActivity.time,
                    materials: {},
                    products: {},
                }

            });
        })
        .then(()=>LoadFromSDE("industryActivityMaterials"))
        .then((data: Array<{
            typeID: Type_Id,
            activityID: Activity_Id,
            materialTypeID: Type_Id,
            quantity: number
        }>)=>{
            data.forEach(typeActivityMaterial=>{
                if(typeActivityMaterial.typeID === null) return;

                let type = industry.types[typeActivityMaterial.typeID];

                console.assert(type !== undefined, typeActivityMaterial);

                let materials = type.activities[typeActivityMaterial.activityID].materials;
                console.assert(materials instanceof Object);

                materials[typeActivityMaterial.materialTypeID] = {
                    materialTypeID: typeActivityMaterial.materialTypeID,
                    quantity: typeActivityMaterial.quantity
                }
            })
        })
        .then(()=>LoadFromSDE("industryActivityProducts"))
        .then((data:Array<{
            type_id: Type_Id,
            activityID: Activity_Id,
            productTypeID: Type_Id,
            quantity: number
        }>)=>{
            data.forEach(activityProduct=>{
                if(activityProduct.type_id === null) return;

                let activity = industry.types[activityProduct.type_id].activities[activityProduct.activityID];
                activity.products[activityProduct.productTypeID] = {
                    type_id: activityProduct.productTypeID,
                    quantity: activityProduct.quantity
                };
            });
        })
        .then(()=>LoadFromSDE("industryActivityProbabilities"))
        .then((data:Array<{
            typeID: Type_Id,
            activityID: Activity_Id,
            productTypeID: Type_Id, 
            probability: number
        }>)=>{
            data.forEach(activityProbability=>{
                if(activityProbability.typeID === null) return;

                let activity = industry.types[activityProbability.typeID].activities[activityProbability.activityID];
                activity.products[activityProbability.productTypeID].probability = activityProbability.probability;
            })
        })
        .then(()=>LoadFromSDE("industryActivitySkills"))
        .then((data:Array<{
            typeID: Type_Id,
            activityID: Activity_Id,
            skillID: Type_Id,
            level: number
        }>)=>{
            data.forEach(activitySkill=>{
                if(activitySkill.typeID === null) return;

                let activity = industry.types[activitySkill.typeID].activities[activitySkill.activityID];
                if(activity.requiredSkills === undefined) activity.requiredSkills = {};
                activity.requiredSkills[activitySkill.skillID] = {
                    type_id: activitySkill.skillID,
                    level: activitySkill.level
                };
            })
        })
        .then(()=>LoadFromSDE("industryBlueprints"))
        .then((data:Array<{
            type_id:Type_Id, 
            maxProductionLimit:number
        }>)=>{
            //TODO check if industry type exists

            data.forEach(blueprint=>industry.types[blueprint.type_id].maxProductionLimit = blueprint.maxProductionLimit);

            set(industry);
            industryPopulated = true;
        })
        .catch(reason=>console.error(reason));

    // Initialise to empty
    set(industry);


    return () => {}
}

export const Industry: Readable<IndustryStore> = readable(null, setupIndustry);

export function GetBlueprintToManufacture(store: IndustryStore, type_id: Type_Id): IndustryType {
    return Object.values(store.types)
        .find(type=>type.activities[MANUFACTURING_ACTIVITY_ID]?.products[type_id]);
}

export function GetInventableBlueprint(store: IndustryStore, type_id: Type_Id): IndustryType {
    return Object.values(store.types)
        .find(type=>type.activities[INVENTION_ACTIVITY_ID]?.products[type_id]);
}


export const Decryptors: Readable< EntityCollection<Type> > = derived(Universe, ($Universe, set)=>{
    LoadDecryptorTypes( $Universe )
        .then( decryptorTypes=>set(decryptorTypes) )

    return ()=>{};
}, {});

export async function LoadDecryptorTypes(universe: UniverseStore): Promise< EntityCollection<Type> > {
    const DECRYPTOR_MARKET_GROUP_ID = 1873;
    let type_ids = Object.keys(universe.types).filter(type_id=>universe.types[type_id].market_group_id == DECRYPTOR_MARKET_GROUP_ID);

    let decryptorTypes = {};
    try {
        for(let type_id of type_ids) {
            decryptorTypes[type_id] = await LoadFromESI(`/universe/types/${type_id}/`);
        }
    } catch(error) {
        console.error(error);
    }

    return decryptorTypes;
}


export const ADVANCED_INDUSTRY_SKILL_ID: Type_Id = 3388;


type IndustrySystem = {
    cost_indices: Array<
      {
        activity: "manufacturing"|"researching_time_efficiency"|"researching_material_efficiency"|"copying"|"invention"|"reaction"
        cost_index: number
      }>,
    solar_system_id: number
  }

export const IndustrySystems: ESIStore<Array<IndustrySystem>> = CreateESIStore("/industry/systems/")


const ActivityIdMapToCostIndexActivity = {
    "manufacturing": 1,  // Manufacturing,18_02,Manufacturing,1
    "researching_time_efficiency": 3,  // Researching Time Efficiency,33_02,Researching time efficiency,1
    "researching_material_efficiency": 4,  // Researching Material Efficiency,33_02,Researching material efficiency,1
    "copying": 5,  // Copying,33_02,Copying,1
    "invention": 8,  // Invention,33_02,The process of creating a more advanced item based on an existing item,1
    "reaction": 11, // Reactions,18_02,The process of combining raw and intermediate materials to create advanced components,1

}
export function GetCostIndex(industrySystems:Array<IndustrySystem>, location: EveLocation, activity_id: Activity_Id) {
    return industrySystems
        ?.find(system=>system.solar_system_id === (location?.solar_system_id ?? location?.system_id))   // Need to accommodate for both stations and structures
        ?.cost_indices.find(value=>ActivityIdMapToCostIndexActivity[value.activity]==activity_id )?.cost_index
}

export function GetReactionActivity(type_id: Type_Id, industry: IndustryStore): {type:IndustryType | undefined, activity:IndustryActivity | undefined} {
    let type = Object.values(industry.types)
        .find(type=>type.activities[REACTION_ACTIVITY_ID]?.products[type_id]);

    // Always return an object so we can deconstruct easily
    return {
        type,
        activity: type?.activities[REACTION_ACTIVITY_ID],
    }
}


export function CanBeProduced(type_id: Type_Id, industry: IndustryStore): boolean {
    return GetBlueprintToManufacture(industry, type_id) != null 
        || GetReactionActivity(type_id, industry).activity != undefined;
}


export type ProductToIndustryTypeMap = Map<Type_Id, {type:IndustryType, activity:IndustryActivity}>;

const PRODUCTION_ACTIVITIES = [MANUFACTURING_ACTIVITY_ID, REACTION_ACTIVITY_ID];
export const ProductToActivity = derived([Industry, EveTypes],([$Industry, $EveTypes])=>{
    let productMap: ProductToIndustryTypeMap = new Map();

    for(const typeId in $Industry.types) {
        if(!$EveTypes.get(parseInt(typeId))?.published) continue;

        Object.keys($Industry.types[typeId].activities)
            .filter(activityId=>PRODUCTION_ACTIVITIES.includes(parseInt(activityId)))
            .forEach(activityId=>{
                for(const productId in $Industry.types[typeId].activities[activityId].products) {
                    if(productMap.has(parseInt(productId))) 
                        console.warn("Product already produced in activity", productId, $Industry.types[typeId], activityId)

                    productMap.set(parseInt(productId), {
                        type:$Industry.types[typeId], 
                        activity:$Industry.types[typeId].activities[activityId]
                    })
                }
        
            })
    }

    return productMap;
})