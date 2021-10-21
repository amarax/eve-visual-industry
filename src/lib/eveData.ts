import { readable } from "svelte/store";
// import Papa from "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/4.6.2/papaparse.min.js";

interface ESIOptions {
    dev?: any,
    datasource?: "tranquility" | "singularity",

}


export type Type = {
    type_id: number;
    name: string;
}

export type MarketGroup = {
    market_group_id: number;
    name: string;
    types?: Array<number>;
    child_groups?: Object;
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



async function loadCategoriesStatic() {
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
    const response = await window.fetch(
        "/data/markets.json",
        {
            method: 'GET',
            headers: {
                accept: 'application/json',
            }
        }
    )

    const data = await response.json();

    if( response.ok ) {
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

    return Promise.reject(response);
}

async function loadTypesStatic(marketGroups) {
    return new Promise((resolve)=>{
        Papa.parse("/data/types.csv", {
            download: true,
            header: true,
            complete: (results, file) => {
                let types = {};
                for(let group_id in marketGroups) {
                    marketGroups[group_id].types.forEach(type_id => {
                        types[type_id] = true;
                    });
                }

                for(let type of results.data) {
                    if(types[type.type_id])
                        types[type.type_id] = type;
                }

                resolve(types);
            }
        });
    });
}

function setupUniverse( set:(value:any)=>void ) {
    const universe = {
        categories: null,
        types: null,
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
                .then((types)=>{
                    universe.types = types;
                    set(universe);
                })
                .catch(err => {console.error(err)});
        })
        .catch(err => {console.error(err)});

        


    return () => {};
}

export const Universe = readable({}, setupUniverse);