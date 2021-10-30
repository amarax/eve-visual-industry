import { writable } from "svelte/store";
import type { Readable } from "svelte/store";
import { LoadFromESI } from "./EveData";


export enum ESIStoreStatus {
    loading,
    loaded,
    error
}

export interface ESIStore<T> extends Readable<T> {
    status: ESIStoreStatus;
} 


export default function CreateESIStore( route:string ): ESIStore<any> {
    let store = {
        status: ESIStoreStatus.loading,
        subscribe: null,
    }

    function load(set) {
        LoadFromESI(route)
            .then((value)=>{
                store.status=ESIStoreStatus.loaded;
                set(value);
            })
            .catch((reason)=>{
                store.status=ESIStoreStatus.error;
                set(null);
                console.error(reason);
            });
    }

    // Internally the store is a writable so we can trigger a refresh (not implemented yet) if necessary
    const { subscribe } = writable(null, load);

    store.subscribe = subscribe;

    return store;
}

export function CreateESIStoreFromCache( route:string ): ESIStore<any> {
    let store = {
        status: ESIStoreStatus.loading,
        subscribe: null,
    }

    function load(set) {
        fetch(`/esi-cache${route}index.json`)
            .then(response=>{
                return response.json();
            })
            .then((value)=>{
                store.status=ESIStoreStatus.loaded;
                set(value);
            })
            .catch((reason)=>{
                store.status=ESIStoreStatus.error;
                set(null);
                console.error(reason);
            });
    }

    // Internally the store is a writable so we can trigger a refresh (not implemented yet) if necessary
    const { subscribe } = writable(null, load);

    store.subscribe = subscribe;

    return store;
}