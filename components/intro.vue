<template>
    <div ref="intro" class="intro">
        <canvas></canvas>
    </div>
</template>

<script>
import Intro from '~/webgl/Intro'

let intro = null;

export default {
    
    mounted(){
        intro = new Intro({
            container: this.$refs.intro
        });
    }

}
</script>

<style lang="scss" scoped>
.intro {
    canvas {
        width: 512px;
        height: 512px;
        background-color: transparent;
    }
}
</style>
