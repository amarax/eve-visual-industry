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



const DEV = false;


async function loadCategory(category_id) {
    return await loadFromESI(`/universe/categories/${category_id}/`, {dev:DEV});
}

async function loadCategories() {
    let data = await loadFromESI("/universe/categories/");

    const categories = {};

    for(let index of data) {
        categories[index] = await loadCategory(index);
    }

    return categories;
}


function setupUniverse( set:(value:any)=>void ) {
    const universe = {
        categories: null,
        types: null,
    };

    set(universe);

    loadCategories()
        .then((categories:Object) => {
            universe.categories = categories;
            set(universe);
        })
        .catch(err => {console.error(err)});


    return () => {};
}

export const Universe = readable({}, setupUniverse);