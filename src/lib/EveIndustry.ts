import { derived, readable } from "svelte/store";
import { LoadFromEveSwaggerInterface, LoadFromStaticDataExport, Universe } from "./EveData";
import type { Readable } from "svelte/store";
import type { EntityCollection, Type, Type_Id, UniverseStore } from "./EveData";

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
    }>
}

export type IndustryStore = {
    activities:EntityCollection<RAMActivity>, 
    types:EntityCollection<IndustryType>
}


export const MANUFACTURING_ACTIVITY_ID = 1;
export const INVENTION_ACTIVITY_ID = 8;
export const REVERSE_ENGINEERING_ACTIVITY_ID = 7;



function setupIndustry( set:(value:any)=>void ) {
    let industry: IndustryStore = {
        activities: {},
        types: {},

    }

    LoadFromStaticDataExport("/data/ramActivities.csv")
        .then((data: Array<RAMActivity>)=>{
            data.forEach(activity=>industry.activities[activity.activityID]=activity);

            return LoadFromStaticDataExport("/data/industryActivity.csv");
        })
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

            return LoadFromStaticDataExport("/data/industryActivityMaterials.csv");
        })
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

            return LoadFromStaticDataExport("/data/industryActivityProducts.csv");
        })
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

            return LoadFromStaticDataExport("/data/industryActivityProbabilities.csv");
        })
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

            return LoadFromStaticDataExport("/data/industryBlueprints.csv");
        })
        .then((data:Array<{
            type_id:Type_Id, 
            maxProductionLimit:number
        }>)=>{
            //TODO check if industry type exists

            data.forEach(blueprint=>industry.types[blueprint.type_id].maxProductionLimit = blueprint.maxProductionLimit);

            set(industry);
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
            decryptorTypes[type_id] = await LoadFromEveSwaggerInterface(`/universe/types/${type_id}/`);
        }
    } catch(error) {
        console.error(error);
    }

    return decryptorTypes;
}