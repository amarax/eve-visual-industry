import { derived, readable, writable } from "svelte/store";
import type { Readable } from "svelte/store";

// import Papa from "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/4.6.2/papaparse.min.js";

import { browser } from "$app/env";
import Papa from "papaparse";
import CreateESIStore, { CreateESIStoreFromCache } from "./ESIStore";
import type { ESIStore } from "./ESIStore";

import { base as basePath } from '$app/paths';
import type { Activity_Id } from "./EveIndustry";
import type { EveMarketGroupId } from "./EveMarketGroups";
import type { EveCharacterId } from "./EveCharacter";
import { GetAccessToken } from "$lib/eve-sso/Tokens";

interface ESIOptions {
    dev?: boolean,
    datasource?: "tranquility" | "singularity",
    characterId?: EveCharacterId
}

export type Type_Id = number;


export type Location_Id = number;

export type Type = {
    type_id: Type_Id;
    name: string;

    group_id: number;
    market_group_id: EveMarketGroupId;

    dogma_attributes?: Array<{
        attribute_id: number,
        value: number
    }>
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


export async function LoadFromESI( route:string, options?:ESIOptions ) {
    let endpoint = new URL(`https://esi.evetech.net/${(options?.dev)?"dev":"latest"}${route}`);

    let headers = {accept: 'application/json'};
    let token = GetAccessToken(options?.characterId);
    if(token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(
            endpoint.toString(),
            {
                method: 'GET',
                headers
            }
        )
        let data = await response.json();

        if( response.ok ) {
            let maxPages = response.headers.get("X-Pages");
            if(maxPages && parseInt(maxPages)>1) {
                // If we're getting multple pages, it should mean that the data is in the form of an array
                console.assert(data instanceof Array);
                
                let nextPageEndpoint = new URL(endpoint.toString());

                for(let page=2; page <= parseInt(maxPages); page++) {
                    nextPageEndpoint.searchParams.set('page', page.toString());
                    let pageResponse = await fetch( nextPageEndpoint.toString(), {method:'GET', headers});
                    let pageData = await pageResponse.json();

                    data = [...(data as Array<any>), ...pageData];
                }

                console.log("Obtained all pages for", maxPages, endpoint.toString());
            }
    
            return data;
        }
    
    } catch(error) {
        console.error(error);
    }

    return Promise.reject(response);
}

async function loadCategoriesStatic() {
    if(!browser) return Promise.reject("Doesn't work on server");

    const response = await fetch(
        `${basePath}/eve-sde/categories.json`,
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
        raw = await LoadFromSDE("invMarketGroups");
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

export function LoadFromSDE( route: string ):Promise<Array<Object>> {

    let parseOptions = (resolve) => ({
        header: true,
        dynamicTyping: true,
        complete: async (results) => {
            resolve(results.data);
        }
    });

    let url = `${basePath}/eve-sde/${route}.csv`

    if(browser) {
        return new Promise((resolve)=>{
            Papa.parse(url, {
                download: true,
                ...parseOptions(resolve)
            });    
        });
    } else {
        // Need to check if this actually works on the server
        return new Promise((resolve)=>{
            Papa.parse(url, {
                ...parseOptions(resolve)
            });    
        });
    }

}

async function loadTypesStatic(marketGroups:EntityCollection<MarketGroup>) {
    if(!browser) return;

    return new Promise((resolve)=>{
        Papa.parse(`${basePath}/eve-sde/types.csv`, {
            download: true,
            header: true,
            dynamicTyping: true,
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

let _types:EntityCollection<Type> = {};

let universePopulated = false;
function setupUniverse( set:(value:any)=>void ) {
    if(universePopulated) return ()=>{};

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

                    universePopulated = true;
                })
                .catch(err => {console.error(err)});
        })
        .catch(err => {console.error(err)});

        


    return () => {};
}

export async function loadType(type_id:number):Promise<Type> {
    try {
        let type = await LoadFromESI(`/universe/types/${type_id}/`);

        _types[type_id] = type;

        return type;
    } catch (error) {
        console.error(error);
    }
}

export type UniverseStore = {
    categories: any,
    types: EntityCollection<Type>, 
    markets: {
        groups: EntityCollection<MarketGroup>,

    }
}

export const Universe: Readable<UniverseStore> = readable({types:{}}, setupUniverse);

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
        let attribute_ids:Array<number> = await LoadFromESI("/dogma/attributes/");

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
            dogma.attributes[attribute_id] = await LoadFromESI(`/dogma/attributes/${attribute_id}/`);

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


export interface EveLocation {
    name: string,
    system_id?: number,
    solar_system_id?: number,
    type_id?: Type_Id,
}

let Locations: {[index: Location_Id]: ESIStore<EveLocation>} = {};

type StructureTaxRates = {[index: number]:{
    [index:Activity_Id]: number
}};


function createStructureTaxRates() {
	const { subscribe, update } = writable<StructureTaxRates>({});

	return {
		subscribe,
        update: (change:StructureTaxRates)=>update(rates=>{
            for(let structure_id in change) {
                if(rates[structure_id] === undefined) rates[structure_id] = {};
                Object.assign(rates[structure_id], change[structure_id]);
            }
            return rates;
        })
	};
}

export const StructureTaxRates = createStructureTaxRates();

export function IsLocationStation(location_id:Location_Id) {
    return 60000000 <= location_id && location_id < 70000000;
}

export function GetLocationStore(location_id: Location_Id): ESIStore<EveLocation> {
    if(Locations[location_id] === undefined) {
        if(IsLocationStation(location_id)) { // this is a station
            Locations[location_id] = CreateESIStore( `/universe/stations/${location_id}/` )
        } else {
            Locations[location_id] = CreateESIStoreFromCache( `/universe/structures/${location_id}/`);
        }
    }

    return Locations[location_id];
}

