import { readable } from "svelte/store";
import type { Readable } from "svelte/store";

// import Papa from "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/4.6.2/papaparse.min.js";

import { browser } from "$app/env";
import Papa from "papaparse";

interface ESIOptions {
    dev?: any,
    datasource?: "tranquility" | "singularity",

}

export type Type_Id = number;


export type Type = {
    type_id: Type_Id;
    name: string;
}

export type MarketGroup_Id = number;

export type MarketGroup = {
    market_group_id: MarketGroup_Id;
    name: string;
    types?: Array<Type_Id>;
    child_groups?: EntityCollection<MarketGroup>;
    parent_group_id: MarketGroup_Id;
}

export interface EntityCollection<Entity> {
    [id: number]: Entity;
}


async function loadFromESI( route:string, options?:ESIOptions ) {
    let endpoint = `https://esi.evetech.net/${(options&&options.dev)?"dev":"latest"}${route}`;

    const response = await window.fetch(
        endpoint,
        {
            method: 'GET',
            headers: {
                accept: 'application/json',
            }
        }
    )

    const data = await response.json();

    if( response.ok ) {
        return data;
    }

    return Promise.reject(response);
}


async function loadMarketsGroupsESI() {
    console.log("Loading market groups from ESI...");

    let data = await loadFromESI(`/markets/groups/`);

    const groups = {};

    for(let group_id of data) {
        let group = await loadFromESI(`/markets/groups/${group_id}/`);

        if(group.published) {
            groups[group_id] = group;
        }

        groups[group_id] = group;
    }

    return groups;
}


async function loadCategoriesESI() {
    console.log("Loading categories from ESI...");

    let data = await loadFromESI(`/universe/categories/`);

    const categories = {};

    for(let category_id of data) {
        let category = await loadFromESI(`/universe/categories/${category_id}/`);
        if(category.published) {
            const groups = {};

            for(let group_id of category.groups) {
                let group = await loadFromESI(`/universe/groups/${group_id}/`);

                if(group.published) {
                    groups[group_id] = group;
                }
            }

            category.groups = groups;
            categories[category_id] = category;
        }
    }

    return categories;
}

async function loadMarketTypesESI(marketGroups) {
    let types = {};

    for(let group_id in marketGroups) {
        for(let type_id of marketGroups[group_id].types) {
            types[type_id] = true;
        }
    }


    let total = Object.keys(types).length;
    let progress = 0;

    // function reportProgress() {
    //     console.log("Loading market types...", progress/total);
    //     if(progress < total) {
    //         setTimeout(reportProgress, 1000);
    //     }
    // }
    // setTimeout(reportProgress, 1000);

    for(let type_id in types) {
        // types[type_id] = await loadFromESI(`/universe/types/${type_id}/`);

        progress++;
    }

    return types;
}

async function loadTypesESI(type_ids:Array<string>) {
    let total = type_ids.length;
    let progress = 0;

    function reportProgress() {
        console.log("Loading market types...", progress/total);
        if(progress < total) {
            setTimeout(reportProgress, 1000);
        }
    }
    setTimeout(reportProgress, 1000);

    let types = {};
    for(let type_id of type_ids) {
        types[type_id] = await loadFromESI(`/universe/types/${type_id}/`);

        progress++;
    }

    return types;
}


async function loadCategoriesStatic() {
    if(!browser) return Promise.reject("Doesn't work on server");

    const response = await window.fetch(
        "/data/categories.json",
        {
            method: 'GET',
            headers: {
                accept: 'application/json',
            }
        }
    )

    const data = await response.json();

    if( response.ok ) {
        return data;
    }

    return Promise.reject(response);
}

async function loadMarketsStatic() {
    let raw;
    try {
        raw = await loadFromSDE("/data/invMarketGroups.csv");
    } catch (error) {
        console.error(error);        
    }

    let data = {groups:{}, groupTree:{}};
    raw.forEach(group => {
        data.groups[group.market_group_id] = group;
        group.types = [];
        if(group.parent_group_id == "None") {
            delete group.parent_group_id;
        }
    });

    let groupTree = {};
    for(let group_id in data.groups) {
        let group = data.groups[group_id];
        if(group.parent_group_id) {
            let parentGroup = data.groups[group.parent_group_id];
            if(parentGroup.child_groups === undefined) {
                parentGroup.child_groups = {};
            }
            parentGroup.child_groups[group_id] = group;
        }
    }
    for(let group_id in data.groups) {
        let group = data.groups[group_id];
        if(group.parent_group_id === undefined) {
            groupTree[group.market_group_id] = group;
        }
    }

    data.groupTree = groupTree;

    return data;
}

function loadFromSDE( route: string ):Promise<Object> {

    let parseOptions = (resolve) => ({
        header: true,
        dynamicTyping: true,
        complete: async (results) => {
            resolve(results.data);
        }
    });

    if(browser) {
        return new Promise((resolve)=>{
            Papa.parse(route, {
                download: true,
                ...parseOptions(resolve)
            });    
        });
    } else {
        // Need to check if this actually works on the server
        return new Promise((resolve)=>{
            Papa.parse(route, {
                ...parseOptions(resolve)
            });    
        });
    }

}

async function loadTypesStatic(marketGroups:EntityCollection<MarketGroup>) {
    if(!browser) return;

    return new Promise((resolve)=>{
        Papa.parse("/data/types.csv", {
            download: true,
            header: true,
            complete: async (results, file) => {
                let types:EntityCollection<Type> = {};

                for(let type of results.data) {
                    if(type.published) {
                        types[type.type_id] = type;
    
                        if(type.market_group_id === "None")
                            delete type.market_group_id;
                        else
                            marketGroups[type.market_group_id].types.push(type.type_id);
                    } else
                        delete types[type.type_id];
                }

                // Fallback if static types don't contain data for some new types
                // let missingTypes = await loadTypesESI( Object.keys(types).filter(type_id=>types[type_id]===null) );
                
                // for(let type_id in missingTypes) {
                //     if(missingTypes[type_id].published)
                //         types[type_id] = missingTypes[type_id];
                //     else
                //         delete types[type_id];
                // }

                resolve(types);
            }
        });
    });
}

let _types:EntityCollection<Type> = null;

function setupUniverse( set:(value:any)=>void ) {
    const universe = {
        categories: null,
        types: _types,
        markets: null,
    };

    set(universe);

    loadCategoriesStatic()
        .then((categories) => {
            universe.categories = categories;
            set(universe);
        })
        .catch(err => {console.error(err)});

    

    loadMarketsStatic()
        .then((markets)=>{
            universe.markets = markets;
            set(universe);

            loadTypesStatic(markets.groups)
                .then((types:EntityCollection<Type>)=>{
                    _types = types;
                    universe.types = _types;
                    set(universe);
                })
                .catch(err => {console.error(err)});
        })
        .catch(err => {console.error(err)});

        


    return () => {};
}

export async function loadType(type_id:number):Promise<Type> {
    try {
        let type = await loadFromESI(`/universe/types/${type_id}/`);

        _types[type_id] = type;

        return type;
    } catch (error) {
        console.error(error);
    }
}

type UniverseStore = {
    categories: any,
    types: EntityCollection<Type>, 
    markets: {
        groups: EntityCollection<MarketGroup>,

    }
}

export const Universe: Readable<UniverseStore> = readable({}, setupUniverse);

type Attribute = {
    attribute_id: number,
    default_value: number,
    description: string,
    display_name: string,
    high_is_good: boolean,
    icon_id: number,
    name: string,
    published: boolean,
    stackable: boolean,
    unit_id: string
  }

interface Dogma {
    attributes: EntityCollection<Attribute>
}

export const Dogma = readable({}, setupDogma);


async function loadDogmaFromESI() {
    let dogma:Dogma = {
        attributes: {},
    };

    let progressTimeout;
    try {
        let attribute_ids:Array<number> = await loadFromESI("/dogma/attributes/");

        let total = attribute_ids.length;
        let progress = 0;
    
        function reportProgress() {
            console.log("Loading attributes...", progress/total);
            if(progress < total) {
                progressTimeout = setTimeout(reportProgress, 1000);
            }
        }
        progressTimeout = setTimeout(reportProgress, 1000);

        for(let attribute_id of attribute_ids) {
            dogma.attributes[attribute_id] = await loadFromESI(`/dogma/attributes/${attribute_id}/`);

            progress++;
        }

    
    } catch (error) {
        console.log(error);
        clearTimeout(progressTimeout);
    }
}

function setupDogma( set:(value:any)=>void ) {
    set({
        attributes: null,
    })

    //loadDogmaFromESI();

    return () => {}
}


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
    activities: EntityCollection<{ 
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
    }>,
    maxProductionLimit?: number,
}

export type IndustryStore = {
    activities:EntityCollection<RAMActivity>, 
    types:EntityCollection<IndustryType>
}


function setupIndustry( set:(value:any)=>void ) {
    let industry: IndustryStore = {
        activities: {},
        types: {},
    }

    loadFromSDE("/data/ramActivities.csv")
        .then((data: Array<RAMActivity>)=>{
            data.forEach(activity=>industry.activities[activity.activityID]=activity);

            return loadFromSDE("/data/industryActivity.csv");
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

            return loadFromSDE("/data/industryActivityMaterials.csv");
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

            return loadFromSDE("/data/industryActivityProducts.csv");
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

            return loadFromSDE("/data/industryBlueprints.csv");
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