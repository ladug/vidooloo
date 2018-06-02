/**
 * Created by vladi on 19-May-17.
 */
import {CanvasReady} from "./CanvasEvents"
import EventEmitter from "../events/EventEmitter";

const createCanvas = (width, height) => {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = ["width:", width, "px;height:", height, "px;background-color:#000"].join('');
    canvas.width = width;
    canvas.height = height;
    return canvas;
};


const fragmentShaderScript = [
    'precision highp float;',
    'varying highp vec2 textureCoord;',
    'varying highp vec2 uTextureCoord;',
    'varying highp vec2 vTextureCoord;',
    'uniform sampler2D ySampler;',
    'uniform sampler2D uSampler;',
    'uniform sampler2D vSampler;',
    'uniform mat4 YUV2RGB;',

    'void main(void) {',
    '  highp float y = texture2D(ySampler,  textureCoord).r;',
    '  highp float u = texture2D(uSampler,  uTextureCoord).r;',
    '  highp float v = texture2D(vSampler,  vTextureCoord).r;',
    '  gl_FragColor = vec4(y, u, v, 1) * YUV2RGB;',
    '}'
].join('\n');
const vertexShaderScript = [
    'attribute vec4 vertexPos;',
    'attribute vec4 texturePos;',
    'attribute vec4 uTexturePos;',
    'attribute vec4 vTexturePos;',
    'varying vec2 textureCoord;',
    'varying vec2 uTextureCoord;',
    'varying vec2 vTextureCoord;',

    'void main()',
    '{',
    '  gl_Position = vertexPos;',
    '  textureCoord = texturePos.xy;',
    '  uTextureCoord = uTexturePos.xy;',
    '  vTextureCoord = vTexturePos.xy;',
    '}'
].join('\n');

export default class CanvasPlayer extends EventEmitter {
    canvas = null;
    context = null;
    container = null;
    useWebGl = true;
    options = {};

    constructor(container, width, height) {
        super();
        this.container = container;
        this.options = {
            width,
            height
        };
    }

    init() {
        const {container, options: {width, height}} = this,
            canvas = createCanvas(width, height);
        container.appendChild(canvas);
        this.canvas = canvas;
        this.context = this._getCanvasContext();

        if ( this.useWebGl) {
            this.initProgram();
            this.initBuffers();
            this.initTextures();
        }
        this.dispatchEvent(new CanvasReady())
    }

    _getCanvasContext() {
        const {useWebGl, canvas} = this;
        if (useWebGl) {
            const context = this.canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (context) {
                return context;
            }
        }
        this.useWebGl = false;
        return canvas.getContext('2d');
    }

    renderPicture({data, width, height}) {
        const {useWebGl, context} = this;
        if (useWebGl) {
            this._renderTexture(data, width, height)
        } else {
            const image = context.createImageData(width, height);
            image.data.set(data);
            context.putImageData(image, 0, 0);
        }
    }

    _renderTexture(data, width, height) {
        const {context} = this;
        const gl = context;
        gl.viewport(0, 0, width, height);

        var ylen = width * height;
        var uvlen = (width / 2) * (height / 2);

        var par = {
            yData: data.subarray(0, ylen),
            uData: data.subarray(ylen, ylen + uvlen),
            vData: data.subarray(ylen + uvlen, ylen + uvlen + uvlen)
        };



        var texturePosBuffer = this.texturePosBuffer;
        var uTexturePosBuffer = this.uTexturePosBuffer;
        var vTexturePosBuffer = this.vTexturePosBuffer;

        var yTextureRef = this.yTextureRef;
        var uTextureRef = this.uTextureRef;
        var vTextureRef = this.vTextureRef;

        var yData = par.yData;
        var uData = par.uData;
        var vData = par.vData;


        var yDataPerRow = par.yDataPerRow || width;
        var yRowCnt     = par.yRowCnt || height;

        var uDataPerRow = par.uDataPerRow || (width / 2);
        var uRowCnt     = par.uRowCnt || (height / 2);

        var vDataPerRow = par.vDataPerRow || uDataPerRow;
        var vRowCnt     = par.vRowCnt || uRowCnt;

        gl.viewport(0, 0, width, height);

        var tTop = 0;
        var tLeft = 0;
        var tBottom = height / yRowCnt;
        var tRight = width / yDataPerRow;
        var texturePosValues = new Float32Array([tRight, tTop, tLeft, tTop, tRight, tBottom, tLeft, tBottom]);

        gl.bindBuffer(gl.ARRAY_BUFFER, texturePosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texturePosValues, gl.DYNAMIC_DRAW);

        if (this.customYUV444){
            tBottom = height / uRowCnt;
            tRight = width / uDataPerRow;
        }else{
            tBottom = (height / 2) / uRowCnt;
            tRight = (width / 2) / uDataPerRow;
        };
        var uTexturePosValues = new Float32Array([tRight, tTop, tLeft, tTop, tRight, tBottom, tLeft, tBottom]);

        gl.bindBuffer(gl.ARRAY_BUFFER, uTexturePosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, uTexturePosValues, gl.DYNAMIC_DRAW);


        if (this.customYUV444){
            tBottom = height / vRowCnt;
            tRight = width / vDataPerRow;
        }else{
            tBottom = (height / 2) / vRowCnt;
            tRight = (width / 2) / vDataPerRow;
        };
        var vTexturePosValues = new Float32Array([tRight, tTop, tLeft, tTop, tRight, tBottom, tLeft, tBottom]);

        gl.bindBuffer(gl.ARRAY_BUFFER, vTexturePosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vTexturePosValues, gl.DYNAMIC_DRAW);


        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, yTextureRef);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, yDataPerRow, yRowCnt, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, yData);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, uTextureRef);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, uDataPerRow, uRowCnt, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, uData);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, vTextureRef);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, vDataPerRow, vRowCnt, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, vData);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    };

    initTextures() {
        var gl = this.context;
        var program = this.shaderProgram;



            var yTextureRef = this.initTexture();
            var ySamplerRef = gl.getUniformLocation(program, 'ySampler');
            gl.uniform1i(ySamplerRef, 0);
            this.yTextureRef = yTextureRef;

            var uTextureRef = this.initTexture();
            var uSamplerRef = gl.getUniformLocation(program, 'uSampler');
            gl.uniform1i(uSamplerRef, 1);
            this.uTextureRef = uTextureRef;

            var vTextureRef = this.initTexture();
            var vSamplerRef = gl.getUniformLocation(program, 'vSampler');
            gl.uniform1i(vSamplerRef, 2);
            this.vTextureRef = vTextureRef;


    }

    initBuffers() {
        var gl = this.context;
        var program = this.shaderProgram;

        var vertexPosBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 1, -1, 1, 1, -1, -1, -1]), gl.STATIC_DRAW);

        var vertexPosRef = gl.getAttribLocation(program, 'vertexPos');
        gl.enableVertexAttribArray(vertexPosRef);
        gl.vertexAttribPointer(vertexPosRef, 2, gl.FLOAT, false, 0, 0);

        if (this.animationTime) {

            var animationTime = this.animationTime;
            var timePassed = 0;
            var stepTime = 15;

            var aniFun = function () {

                timePassed += stepTime;
                var mul = ( 1 * timePassed ) / animationTime;

                if (timePassed >= animationTime) {
                    mul = 1;
                } else {
                    setTimeout(aniFun, stepTime);
                }
                ;

                var neg = -1 * mul;
                var pos = 1 * mul;

                var vertexPosBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([pos, pos, neg, pos, pos, neg, neg, neg]), gl.STATIC_DRAW);

                var vertexPosRef = gl.getAttribLocation(program, 'vertexPos');
                gl.enableVertexAttribArray(vertexPosRef);
                gl.vertexAttribPointer(vertexPosRef, 2, gl.FLOAT, false, 0, 0);

                try {
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                } catch (e) {
                }
                ;

            };
            aniFun();

        }
        ;


        var texturePosBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texturePosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 0, 0, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);

        var texturePosRef = gl.getAttribLocation(program, 'texturePos');
        gl.enableVertexAttribArray(texturePosRef);
        gl.vertexAttribPointer(texturePosRef, 2, gl.FLOAT, false, 0, 0);

        this.texturePosBuffer = texturePosBuffer;

            var uTexturePosBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, uTexturePosBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 0, 0, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);

            var uTexturePosRef = gl.getAttribLocation(program, 'uTexturePos');
            gl.enableVertexAttribArray(uTexturePosRef);
            gl.vertexAttribPointer(uTexturePosRef, 2, gl.FLOAT, false, 0, 0);

            this.uTexturePosBuffer = uTexturePosBuffer;

            var vTexturePosBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vTexturePosBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 0, 0, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);

            var vTexturePosRef = gl.getAttribLocation(program, 'vTexturePos');
            gl.enableVertexAttribArray(vTexturePosRef);
            gl.vertexAttribPointer(vTexturePosRef, 2, gl.FLOAT, false, 0, 0);

            this.vTexturePosBuffer = vTexturePosBuffer;
    };

    initProgram() {
        var gl = this.context;
        var vertexShaderScript;
        var fragmentShaderScript;

            vertexShaderScript = [
                'attribute vec4 vertexPos;',
                'attribute vec4 texturePos;',
                'attribute vec4 uTexturePos;',
                'attribute vec4 vTexturePos;',
                'varying vec2 textureCoord;',
                'varying vec2 uTextureCoord;',
                'varying vec2 vTextureCoord;',

                'void main()',
                '{',
                '  gl_Position = vertexPos;',
                '  textureCoord = texturePos.xy;',
                '  uTextureCoord = uTexturePos.xy;',
                '  vTextureCoord = vTexturePos.xy;',
                '}'
            ].join('\n');

            fragmentShaderScript = [
                'precision highp float;',
                'varying highp vec2 textureCoord;',
                'varying highp vec2 uTextureCoord;',
                'varying highp vec2 vTextureCoord;',
                'uniform sampler2D ySampler;',
                'uniform sampler2D uSampler;',
                'uniform sampler2D vSampler;',
                'uniform mat4 YUV2RGB;',

                'void main(void) {',
                '  highp float y = texture2D(ySampler,  textureCoord).r;',
                '  highp float u = texture2D(uSampler,  uTextureCoord).r;',
                '  highp float v = texture2D(vSampler,  vTextureCoord).r;',
                '  gl_FragColor = vec4(y, u, v, 1) * YUV2RGB;',
                '}'
            ].join('\n');



        var YUV2RGB = [];

        if (this.conversionType == "rec709") {
            // ITU-T Rec. 709
            YUV2RGB = [
                1.16438, 0.00000, 1.79274, -0.97295,
                1.16438, -0.21325, -0.53291, 0.30148,
                1.16438, 2.11240, 0.00000, -1.13340,
                0, 0, 0, 1,
            ];
        } else {
            // assume ITU-T Rec. 601
            YUV2RGB = [
                1.16438, 0.00000, 1.59603, -0.87079,
                1.16438, -0.39176, -0.81297, 0.52959,
                1.16438, 2.01723, 0.00000, -1.08139,
                0, 0, 0, 1
            ];
        }
        ;

        var vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderScript);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.log('Vertex shader failed to compile: ' + gl.getShaderInfoLog(vertexShader));
        }

        var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderScript);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.log('Fragment shader failed to compile: ' + gl.getShaderInfoLog(fragmentShader));
        }

        var program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.log('Program failed to compile: ' + gl.getProgramInfoLog(program));
        }

        gl.useProgram(program);

        var YUV2RGBRef = gl.getUniformLocation(program, 'YUV2RGB');
        gl.uniformMatrix4fv(YUV2RGBRef, false, YUV2RGB);

        this.shaderProgram = program;
    };

    initTexture() {
        var gl = this.context;

        var textureRef = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, textureRef);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);

        return textureRef;
    }
}