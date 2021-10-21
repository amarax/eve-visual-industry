<script lang="ts">
    import { Universe } from '$lib/EveData';


    Universe.subscribe(value => {console.log("Universe updated", value)});
</script>


<label>
    Science skill 1
    <input type="range" min={0} max={5} />
</label>
<br />
<label>
    Science skill 2
    <input type="range" min={0} max={5} />
</label>
<br />
<label>
    Racial encryption skill
    <input type="range" min={0} max={5} />
</label>