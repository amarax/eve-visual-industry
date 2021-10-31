import type { EntityCollection } from "./EveData";

export function sum(array: Array<any>, accessor?: (element: any)=>number) {

    return array.reduce( (runningTotal, element)=> runningTotal + accessor?accessor(element):element, 0);
}


export function arrayToEntityCollection(array: Array<any>, indexAccessor: (item)=>number) : EntityCollection<any> {
    let collection = {};

    for(let item of array) {
        let index = indexAccessor(item);
        if(index) collection[index] = item;
    }

    return collection;
}