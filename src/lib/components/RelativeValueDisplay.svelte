<script lang="ts">
    import { scaleLinear } from "d3-scale";



    export let value: number;
    export let extents: Array<number>;

    $: validExtents = extents[1] > extents[0]

    $: x = scaleLinear()
        .domain(validExtents ? extents:[0,1])
        .range([0,100]);



    $: rectDimensions = v=>({
        x: `${Math.min(x(v), x(0))}%`,
        width: `${Math.abs(x(v)-x(0))}%`,
        y: 0,
        height: "100%",
    })
</script>

<style lang="scss">

    .block {
        width: 100%;    // Fill the width so it can be relative to other elements
        padding-bottom: 2px;
        margin-bottom: 2px;

        position: relative;

        svg {
            position: absolute;
            bottom: 1px;    // To account for rounding errors in the height of the parent
            left: 0;
            width: 100%;
            height: 1px;



            background-color: #222;

            rect {
                &.positive {
                    fill: #0f0;
                }
                &.negative {
                    fill: red;
                }

                stroke: none;
            }
        }
    }

</style>

<div class="block">
    <slot />
    <svg>
        <rect class={value < 0 ? "negative" : "positive"} {...rectDimensions(value)} />
    </svg>
</div>