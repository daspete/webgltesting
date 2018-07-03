import config from '~/webgl/IntroSettings'
import Pointer from '~/webgl/Pointer'
import Program from '~/webgl/Program'

import AdvectionManualFilteringShader from '~/webgl/shader/AdvectionManualFilteringShader'
import AdvectionShader from '~/webgl/shader/AdvectionShader'
import BaseVertexShader from '~/webgl/shader/BaseVertexShader'
import ClearShader from '~/webgl/shader/ClearShader'
import CurlShader from '~/webgl/shader/CurlShader'
import DisplayShader from '~/webgl/shader/DisplayShader'
import DivergenceShader from '~/webgl/shader/DivergenceShader'
import GradientSubtractShader from '~/webgl/shader/GradientSubtractShader'
import PressureShader from '~/webgl/shader/PressureShader'
import SplatShader from '~/webgl/shader/SplatShader'
import VorticityShader from '~/webgl/shader/VorticityShader'

class Intro {
    constructor(settings){
        this.$container = settings.container;

        this.$canvas = this.$container.getElementsByTagName('canvas')[0];
        this.$canvas.width = this.$canvas.clientWidth;
        this.$canvas.height = this.$canvas.clientHeight;
        
        this.pointers = [];
        this.splatStack = [];

        this.context = this.GetWebGLContext(this.$canvas);

        this.pointers = [
            new Pointer(),
            new Pointer()
        ];

        this.pointers[0].color = [ 150, 70, 0];
        this.pointers[1].color = [ 50, 120, 0];
        
        this.pointers[0].x = 280;
        this.pointers[1].x = 220;
        this.pointers[1].dx = 0;
        this.pointers[1].dy = 10;
        


        this.textureWidth;
        this.textureHeight;
        this.density;
        this.velocity;
        this.divergence;
        this.curl;
        this.pressure;

        this.InitFrameBuffer();

        let shaders = {
            baseVertex: this.CompileShader(this.context.gl.VERTEX_SHADER, BaseVertexShader),

            clear: this.CompileShader(this.context.gl.FRAGMENT_SHADER, ClearShader),
            display: this.CompileShader(this.context.gl.FRAGMENT_SHADER, DisplayShader),
            splat: this.CompileShader(this.context.gl.FRAGMENT_SHADER, SplatShader),

            advection: this.CompileShader(this.context.gl.FRAGMENT_SHADER, AdvectionShader),
            advectionManualFiltering: this.CompileShader(this.context.gl.FRAGMENT_SHADER, AdvectionManualFilteringShader),

            curl: this.CompileShader(this.context.gl.FRAGMENT_SHADER, CurlShader),
            vorticity: this.CompileShader(this.context.gl.FRAGMENT_SHADER, VorticityShader),
            pressure: this.CompileShader(this.context.gl.FRAGMENT_SHADER, PressureShader),
            gradientSubtract: this.CompileShader(this.context.gl.FRAGMENT_SHADER, GradientSubtractShader),
            divergence: this.CompileShader(this.context.gl.FRAGMENT_SHADER, DivergenceShader)
        }

        this.shaders = {
            clear: new Program(this.context, shaders.baseVertex, shaders.clear),
            display: new Program(this.context, shaders.baseVertex, shaders.display),
            splat: new Program(this.context, shaders.baseVertex, shaders.splat),
            advection: new Program(
                this.context, 
                shaders.baseVertex, 
                this.context.ext.supportLinearFiltering ? 
                    shaders.advection : 
                    shaders.advectionManualFiltering
            ),
            divergence: new Program(this.context, shaders.baseVertex, shaders.divergence),
            curl: new Program(this.context, shaders.baseVertex, shaders.curl),
            vorticity: new Program(this.context, shaders.baseVertex, shaders.vorticity),
            pressure: new Program(this.context, shaders.baseVertex, shaders.pressure),
            gradientSubtract: new Program(this.context, shaders.baseVertex, shaders.gradientSubtract)            
        }

        this.blit = (() => {
            this.context.gl.bindBuffer(this.context.gl.ARRAY_BUFFER, this.context.gl.createBuffer());
            this.context.gl.bufferData(this.context.gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), this.context.gl.STATIC_DRAW);
            this.context.gl.bindBuffer(this.context.gl.ELEMENT_ARRAY_BUFFER, this.context.gl.createBuffer());
            this.context.gl.bufferData(this.context.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), this.context.gl.STATIC_DRAW);
            this.context.gl.vertexAttribPointer(0, 2, this.context.gl.FLOAT, false, 0, 0);
            this.context.gl.enableVertexAttribArray(0);
        
            return (destination) => {
                if(destination == null){
                    this.context.gl.bindFramebuffer(this.context.gl.FRAMEBUFFER, destination);
                    this.context.gl.drawElements(this.context.gl.TRIANGLES, 6, this.context.gl.UNSIGNED_SHORT, 0);
                }else{
                    this.context.gl.bindFramebuffer(this.context.gl.FRAMEBUFFER, destination);
                    this.context.gl.drawElements(this.context.gl.TRIANGLES, 6, this.context.gl.UNSIGNED_SHORT, 0);
                }
                
            }
        })();

        this.lastTime = Date.now();

        //this.MultipleSplats(parseInt(Math.random() * 20) + 5);
        this.Update();
    }

    Update(){
        this.context.gl.enable(this.context.gl.BLEND);
        this.context.gl.blendFunc(this.context.gl.ONE, this.context.gl.ONE_MINUS_SRC_ALPHA);

        const dt = Math.min((Date.now() - this.lastTime) / 1000, 0.016);
        this.lastTime = Date.now();

        this.context.gl.viewport(0, 0, this.textureWidth, this.textureHeight);

        
        //if (this.splatStack.length > 0) this.MultipleSplats(this.splatStack.pop());


        this.shaders.advection.bind();
        this.context.gl.uniform2f(this.shaders.advection.uniforms.texelSize, 1.0 / this.textureWidth, 1.0 / this.textureHeight);
        this.context.gl.uniform1i(this.shaders.advection.uniforms.uVelocity, this.velocity.read[2]);
        this.context.gl.uniform1i(this.shaders.advection.uniforms.uSource, this.velocity.read[2]);
        this.context.gl.uniform1f(this.shaders.advection.uniforms.dt, dt);
        this.context.gl.uniform1f(this.shaders.advection.uniforms.dissipation, config.VELOCITY_DISSIPATION);
        this.blit(this.velocity.write[1]);
        this.velocity.swap();

        this.context.gl.uniform1i(this.shaders.advection.uniforms.uVelocity, this.velocity.read[2]);
        this.context.gl.uniform1i(this.shaders.advection.uniforms.uSource, this.density.read[2]);
        this.context.gl.uniform1f(this.shaders.advection.uniforms.dissipation, config.DENSITY_DISSIPATION);
        this.blit(this.density.write[1]);
        this.density.swap();

        for (let i = 0; i < this.pointers.length; i++) {
            const pointer = this.pointers[i];
            
            if(pointer.moved){
                this.Splat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.color);
                //pointer.moved = false;
            }
        }

        this.shaders.curl.bind();
        this.context.gl.uniform2f(this.shaders.curl.uniforms.texelSize, 1.0 / this.textureWidth, 1.0 / this.textureHeight);
        this.context.gl.uniform1i(this.shaders.curl.uniforms.uVelocity, this.velocity.read[2]);
        this.blit(this.curl[1]);

        this.shaders.vorticity.bind();
        this.context.gl.uniform2f(this.shaders.vorticity.uniforms.texelSize, 1.0 / this.textureWidth, 1.0 / this.textureHeight);
        this.context.gl.uniform1i(this.shaders.vorticity.uniforms.uVelocity, this.velocity.read[2]);
        this.context.gl.uniform1i(this.shaders.vorticity.uniforms.uCurl, this.curl[2]);
        this.context.gl.uniform1f(this.shaders.vorticity.uniforms.curl, config.CURL);
        this.context.gl.uniform1f(this.shaders.vorticity.uniforms.dt, dt);
        this.blit(this.velocity.write[1]);
        this.velocity.swap();

        this.shaders.divergence.bind();
        this.context.gl.uniform2f(this.shaders.divergence.uniforms.texelSize, 1.0 / this.textureWidth, 1.0 / this.textureHeight);
        this.context.gl.uniform1i(this.shaders.divergence.uniforms.uVelocity, this.velocity.read[2]);
        this.blit(this.divergence[1]);

        this.shaders.clear.bind();
        let pressureTexId = this.pressure.read[2];
        this.context.gl.activeTexture(this.context.gl.TEXTURE0 + pressureTexId);
        this.context.gl.bindTexture(this.context.gl.TEXTURE_2D, this.pressure.read[0]);
        this.context.gl.uniform1i(this.shaders.clear.uniforms.uTexture, pressureTexId);
        this.context.gl.uniform1f(this.shaders.clear.uniforms.value, config.PRESSURE_DISSIPATION);
        this.blit(this.pressure.write[1]);
        this.pressure.swap();

        this.shaders.pressure.bind();
        this.context.gl.uniform2f(this.shaders.pressure.uniforms.texelSize, 1.0 / this.textureWidth, 1.0 / this.textureHeight);
        this.context.gl.uniform1i(this.shaders.pressure.uniforms.uDivergence, this.divergence[2]);
        pressureTexId = this.pressure.read[2];
        this.context.gl.uniform1i(this.shaders.pressure.uniforms.uPressure, pressureTexId);
        this.context.gl.activeTexture(this.context.gl.TEXTURE0 + pressureTexId);
        for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
            this.context.gl.bindTexture(this.context.gl.TEXTURE_2D, this.pressure.read[0]);
            this.blit(this.pressure.write[1]);
            this.pressure.swap();
        }

        this.shaders.gradientSubtract.bind();
        this.context.gl.uniform2f(this.shaders.gradientSubtract.uniforms.texelSize, 1.0 / this.textureWidth, 1.0 / this.textureHeight);
        this.context.gl.uniform1i(this.shaders.gradientSubtract.uniforms.uPressure, this.pressure.read[2]);
        this.context.gl.uniform1i(this.shaders.gradientSubtract.uniforms.uVelocity, this.velocity.read[2]);
        this.blit(this.velocity.write[1]);
        this.velocity.swap();

        this.context.gl.viewport(0, 0, this.context.gl.drawingBufferWidth, this.context.gl.drawingBufferHeight);
        this.shaders.display.bind();
        this.context.gl.uniform1i(this.shaders.display.uniforms.uTexture, this.density.read[2]);
        this.blit(null);
        
        this.context.gl.pixelStorei(this.context.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        requestAnimationFrame(() => { this.Update() });
    }




    Splat(x, y, dx, dy, color){
        this.shaders.splat.bind();
        this.context.gl.uniform1i(this.shaders.splat.uniforms.uTarget, this.velocity.read[2]);
        this.context.gl.uniform1f(this.shaders.splat.uniforms.aspectRatio, this.$canvas.width / this.$canvas.height);
        this.context.gl.uniform2f(this.shaders.splat.uniforms.point, x / this.$canvas.width, 1.0 - y / this.$canvas.height);
        this.context.gl.uniform3f(this.shaders.splat.uniforms.color, dx, -dy, 1.0);
        this.context.gl.uniform1f(this.shaders.splat.uniforms.radius, config.SPLAT_RADIUS);
        this.blit(this.velocity.write[1]);
        this.velocity.swap();

        this.context.gl.uniform1i(this.shaders.splat.uniforms.uTarget, this.density.read[2]);
        // this.context.gl.uniform3f(this.shaders.splat.uniforms.color, color[0] * 0.3, color[1] * 0.3, color[2] * 0.3);
        this.context.gl.uniform3f(this.shaders.splat.uniforms.color, color[0] * 0.004, color[1] * 0.004, color[2] * 0.004);
        this.blit(this.density.write[1]);
        this.density.swap();
    }

    MultipleSplats(amount){
        for (let i = 0; i < amount; i++) {
            const color = [Math.random() * 10, Math.random() * 10, Math.random() * 10];
            const x = this.$canvas.width * Math.random();
            const y = this.$canvas.height * Math.random();
            const dx = 1000 * (Math.random() - 0.5);
            const dy = 1000 * (Math.random() - 0.5);
            this.Splat(x, y, dx, dy, color);
        }
    }

    // GetBlit(){
    //     this.context.gl.bindBuffer(this.context.gl.ARRAY_BUFFER, this.context.gl.createBuffer());
    //     this.context.gl.bufferData(this.context.gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, 1]), this.context.gl.STATIC_DRAW);
    //     this.context.gl.bindBuffer(this.context.gl.ELEMENT_ARRAY_BUFFER, this.context.gl.createBuffer());
    //     this.context.gl.bufferData(this.context.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), this.context.gl.STATIC_DRAW);
    //     this.context.gl.vertexAttribPointer(0, 2, this.context.gl.FLOAT, false, 0, 0);
    //     this.context.gl.enableVertexAttribArray(0);

    //     return (destination) => {
    //         this.context.gl.bindFramebuffer(this.context.gl.FRAMEBUFFER, destination);
    //         this.context.gl.drawElements(this.context.gl.TRIANGLES, 6, this.context.gl.UNSIGNED_SHORT, 0);
    //     }
    // }

    InitFrameBuffer(){
        this.textureWidth = this.context.gl.drawingBufferWidth >> config.TEXTURE_DOWNSAMPLE;
        this.textureHeight = this.context.gl.drawingBufferHeight >> config.TEXTURE_DOWNSAMPLE;

        const texType = this.context.ext.halfFloatTexType;
        const rgba = this.context.ext.formatRGBA;
        const rg = this.context.ext.formatRG;
        const r = this.context.ext.formatR;

        // this.density = this.CreateDoubleFBO(2, this.textureWidth, this.textureHeight, rgba.internalFormat, rgba.format, texType, this.context.ext.supportLinearFiltering ? this.context.gl.LINEAR : this.context.gl.NEAREST);
        // this.velocity = this.CreateDoubleFBO(0, this.textureWidth, this.textureHeight, rgba.internalFormat, rgba.format, texType, this.context.ext.supportLinearFiltering ? this.context.gl.LINEAR : this.context.gl.NEAREST);
        // this.divergence = this.CreateFBO(4, this.textureWidth, this.textureHeight, rgba.internalFormat, rgba.format, texType, this.context.gl.NEAREST);
        // this.curl = this.CreateFBO(5, this.textureWidth, this.textureHeight, rgba.internalFormat, rgba.format, texType, this.context.gl.NEAREST);
        // this.pressure = this.CreateDoubleFBO(6, this.textureWidth, this.textureHeight, rgba.internalFormat, rgba.format, texType, this.context.gl.NEAREST);

        this.density = this.CreateDoubleFBO(2, this.textureWidth, this.textureHeight, rgba.internalFormat, rgba.format, texType, this.context.ext.supportLinearFiltering ? this.context.gl.LINEAR : this.context.gl.NEAREST);
        this.velocity = this.CreateDoubleFBO(0, this.textureWidth, this.textureHeight, rg.internalFormat, rg.format, texType, this.context.ext.supportLinearFiltering ? this.context.gl.LINEAR : this.context.gl.NEAREST);
        this.divergence = this.CreateFBO(4, this.textureWidth, this.textureHeight, r.internalFormat, r.format, texType, this.context.gl.NEAREST);
        this.curl = this.CreateFBO(5, this.textureWidth, this.textureHeight, r.internalFormat, r.format, texType, this.context.gl.NEAREST);
        this.pressure = this.CreateDoubleFBO(6, this.textureWidth, this.textureHeight, r.internalFormat, r.format, texType, this.context.gl.NEAREST);
    }

    CreateDoubleFBO(texId, w, h, internalFormat, format, type, param){
        let fbo1 = this.CreateFBO(texId , w, h, internalFormat, format, type, param);
        let fbo2 = this.CreateFBO(texId + 1, w, h, internalFormat, format, type, param);

        return {
            get read(){
                return fbo1;
            },
            get write(){
                return fbo2;
            },
            swap(){
                let temp = fbo1;
                fbo1 = fbo2;
                fbo2 = temp;
            }
        }
    }

    CreateFBO(texId, w, h, internalFormat, format, type, param){
        this.context.gl.activeTexture(this.context.gl.TEXTURE0 + texId);

        let texture = this.context.gl.createTexture();
        this.context.gl.bindTexture(this.context.gl.TEXTURE_2D, texture);
        this.context.gl.texParameteri(this.context.gl.TEXTURE_2D, this.context.gl.TEXTURE_MIN_FILTER, param);
        this.context.gl.texParameteri(this.context.gl.TEXTURE_2D, this.context.gl.TEXTURE_MAG_FILTER, param);
        this.context.gl.texParameteri(this.context.gl.TEXTURE_2D, this.context.gl.TEXTURE_WRAP_S, this.context.gl.CLAMP_TO_EDGE);
        this.context.gl.texParameteri(this.context.gl.TEXTURE_2D, this.context.gl.TEXTURE_WRAP_T, this.context.gl.CLAMP_TO_EDGE);
        this.context.gl.texImage2D(this.context.gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

        let fbo = this.context.gl.createFramebuffer();
        this.context.gl.bindFramebuffer(this.context.gl.FRAMEBUFFER, fbo);
        this.context.gl.framebufferTexture2D(this.context.gl.FRAMEBUFFER, this.context.gl.COLOR_ATTACHMENT0, this.context.gl.TEXTURE_2D, texture, 0);
        this.context.gl.viewport(0, 0, w, h);
        this.context.gl.clear(this.context.gl.COLOR_BUFFER_BIT);
        
        return [texture, fbo, texId];
    }






    CompileShader(type, source){
        const shader = this.context.gl.createShader(type);

        this.context.gl.shaderSource(shader, source);
        this.context.gl.compileShader(shader);

        if (!this.context.gl.getShaderParameter(shader, this.context.gl.COMPILE_STATUS)) throw this.context.gl.getShaderInfoLog(shader);

        return shader;
    }


    GetWebGLContext(canvas){
        const params = { 
            alpha: true, 
            depth: false, 
            stencil: false, 
            antialias: false,
            premultipliedAlpha: false
        };


        let gl = canvas.getContext('webgl2', params);


        const isWebGL2 = !!gl;
        if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);

        
        let halfFloat;
        let supportLinearFiltering;
        
        if(isWebGL2){
            gl.getExtension('EXT_color_buffer_float');
            supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
        }else{
            halfFloat = gl.getExtension('OES_texture_half_float');
            supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
        }

        gl.clearColor(1,0.5,0, 1);

        const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
        let formatRGBA;
        let formatRG;
        let formatR;

        if (isWebGL2){
            formatRGBA = this.GetSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
            formatRG = this.GetSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
            formatR = this.GetSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
        }else{
            formatRGBA = this.GetSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
            formatRG = this.GetSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
            formatR = this.GetSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        }

        return {
            gl,
            ext: {
                formatRGBA,
                formatRG,
                formatR,
                halfFloatTexType,
                supportLinearFiltering
            }
        };
    }

    GetSupportedFormat(gl, internalFormat, format, type){
        if (!this.SupportRenderTextureFormat(gl, internalFormat, format, type)){
            switch (internalFormat){
                case gl.R16F: return this.GetSupportedFormat(gl, gl.RG16F, gl.RG, type);
                case gl.RG16F: return this.GetSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
                default: return null;
            }
        }

        return { internalFormat, format }
    }

    SupportRenderTextureFormat(gl, internalFormat, format, type){
        let texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

        let fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if(status != gl.FRAMEBUFFER_COMPLETE) return false;
        
        return true;
    }
}

export default Intro;