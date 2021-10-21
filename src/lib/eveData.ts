import { readable } from "svelte/store";

interface ESIOptions {
    dev?: any,
    datasource?: "tranquility" | "singularity",

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
        let groupsTree = {};
        for(let group_id in data.groups) {
            let group = data.groups[group_id];
            if(group.parent_group_id) {
                if(data.groups[group.parent_group_id].child_groups instanceof Array) {
                    data.groups[group.parent_group_id].child_groups.push(group);
                } else {
                    data.groups[group.parent_group_id].child_groups = [group];
                }
            }
        }
        for(let group_id in data.groups) {
            let group = data.groups[group_id];
            if(group.parent_group_id === undefined) {
                groupsTree[group.market_group_id] = group;
            }
        }

        data.groupsTree = groupsTree;

        return data;
    }

    return Promise.reject(response);
}


function setupUniverse( set:(value:any)=>void ) {
    const universe = {
        categories: null,
        types: null,
        markets: null,
    };

    set(universe);

    loadCategoriesStatic()
        .then((categories:Object) => {
            universe.categories = categories;
            set(universe);
        })
        .catch(err => {console.error(err)});

    loadMarketsStatic()
        .then((markets:Object)=>{
            universe.markets = markets;
        })
        .catch(err => {console.error(err)});


    return () => {};
}

export const Universe = readable({}, setupUniverse);