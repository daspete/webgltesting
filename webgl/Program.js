class Program {

    constructor(context, vertexShader, fragmentShader){
        this.uniforms = {};
        this.context = context;
        this.program = context.gl.createProgram();

        context.gl.attachShader(this.program, vertexShader);
        context.gl.attachShader(this.program, fragmentShader);
        context.gl.linkProgram(this.program);

        if(!context.gl.getProgramParameter(this.program, context.gl.LINK_STATUS))
            throw context.gl.getProgramInfoLog(this.program);

        const uniformCount = context.gl.getProgramParameter(this.program, context.gl.ACTIVE_UNIFORMS);
        for(let i = 0; i < uniformCount; i++){
            const uniformName = context.gl.getActiveUniform(this.program, i).name;
            this.uniforms[uniformName] = context.gl.getUniformLocation(this.program, uniformName);
        }
    }

    bind(){
        this.context.gl.useProgram(this.program);
    }

}

export default Program;