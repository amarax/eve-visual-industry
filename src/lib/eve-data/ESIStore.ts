import { writable } from "svelte/store";
import type { Readable } from "svelte/store";
import { LoadFromESI } from "./EveData";
import type { Subscriber } from "svelte/store";

import { base as basePath } from '$app/paths';
import type { EveCharacterId } from "./EveCharacter";


export enum ESIStoreStatus {
    loading,
    loaded,
    error
}

export interface ESIStore<T> extends Readable<T> {
    status: ESIStoreStatus;
} 

export default function CreateESIStore<Data>( route:string, onLoad?:(value)=>void, params?:any ): ESIStore<Data> {
    let store = {
        status: ESIStoreStatus.loading,
        subscribe: null,
    }

    function start(set: Subscriber<Data>): ()=>void {
        if(store.status !== ESIStoreStatus.loaded) {
            let handleValue = (value)=>{
                if(onLoad) value = onLoad(value);
                store.status=ESIStoreStatus.loaded;
                set(value as Data);
            };
            let handleException = (reason)=>{
                store.status=ESIStoreStatus.error;
                set(null);
                console.error(reason);
            }

            if(params) {
                fetch(`${basePath}/esi${route}?${new URLSearchParams(params).toString()}`)
                    .then(response=>response.json())
                    .then(handleValue)
                    .catch(handleException)
            } else {
                LoadFromESI(route)
                    .then(handleValue)
                    .catch(handleException)
        }
        }
        
        return ()=>{}
    }

    // Internally the store is a writable so we can trigger a refresh (not implemented yet) if necessary
    const { subscribe } = writable(null, start);

    store.subscribe = subscribe;

    return store;
}

export function CreateESIStoreFromCache<Data>( route:string, onLoad?:(value)=>void ): ESIStore<Data> {
    let store = {
        status: ESIStoreStatus.loading,
        subscribe: null,
    }

    function start(set: Subscriber<Data>): ()=>void {
        if(store.status !== ESIStoreStatus.loaded) {
            fetch(`${basePath}/esi-cache${route}index.json`)
            .then(response=>{
                if(response.ok)
                    return response.json();
                else
                    return Promise.reject("Fetch failed");
            })
            .then((value)=>{
                if(onLoad) value = onLoad(value);
                store.status=ESIStoreStatus.loaded;
                set(value);
            })
            .catch((reason)=>{
                store.status=ESIStoreStatus.error;
                set(null);
                console.error(reason);
            });
        }

        return ()=>{}
    }
    

    // Internally the store is a writable so we can trigger a refresh (not implemented yet) if necessary
    const { subscribe } = writable(null, start);

    store.subscribe = subscribe;

    return store;
}