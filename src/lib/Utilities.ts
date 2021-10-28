export function sum(array: Array<any>, accessor?: (element: any)=>number) {

    return array.reduce( (runningTotal, element)=> runningTotal + accessor?accessor(element):element, 0);
}