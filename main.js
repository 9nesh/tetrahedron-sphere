import { vec4, vec3, lookAt, perspective } from './MV.js';
import { initShaders } from './initShaders.js';

"use strict";

var canvas;
var gl;

var numTimesToSubdivide = 0;
var index = 0;
var positionsArray = [];
var normalsArray = [];

var va = vec4(0.0, 0.0, -1.0, 1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333, 1);

var near = -10;
var far = 10;
var radius = 2.0;
var theta = 0.0;
var phi = 0.0;
var dr = 5.0 * Math.PI/180.0;

var left = -2.0;
var right = 2.0;
var top0 = 2.0;
var bottom = -2.0;

var lightPosition = vec4(2.0, 2.0, 2.0, 1.0);
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(0.24725, 0.1995, 0.0745, 1.0);
var materialDiffuse = vec4(0.75164, 0.60648, 0.22648, 1.0);
var materialSpecular = vec4(0.628281, 0.555802, 0.366065, 1.0);
var materialShininess = 50.0;

var modelMatrix, viewMatrix, projectionMatrix;
var modelViewMatrix;
var modelMatrixLoc, viewMatrixLoc, projectionMatrixLoc;
var nMatrix, nMatrixLoc;

var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var program;
var vBuffer, nBuffer;

function updateDisplay() {
    document.getElementById('thetaValue').textContent = theta.toFixed(2);
    document.getElementById('phiValue').textContent = phi.toFixed(2);
    document.getElementById('subdivValue').textContent = numTimesToSubdivide;
}

function triangle(a, b, c) {
    positionsArray.push(a);
    positionsArray.push(b);
    positionsArray.push(c);
    
    var t1 = subtract(b, a);
    var t2 = subtract(c, a);
    var normal = normalize(cross(t2, t1));
    var normalVec = vec4(normal[0], normal[1], normal[2], 0.0);
    
    normalsArray.push(normalVec);
    normalsArray.push(normalVec);
    normalsArray.push(normalVec);

    index += 3;
}

// Divide the triangle into smaller triangles recursively
function divideTriangle(a, b, c, count) {
    if (count === 0) {
        // Base case: if count is 0, just draw the triangle
        triangle(a, b, c);
    } else {
        // Calculate the midpoints of the triangle
        var ab = mix(a, b, 0.5);
        var ac = mix(a, c, 0.5);
        var bc = mix(b, c, 0.5);

        // Normalize the midpoints so that they are unit vectors
        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        // Recursively divide the smaller triangles
        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    }
}

function tetrahedron(a, b, c, d, n) {
    // Divide the tetrahedron into smaller triangles
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

function mix(u, v, s) {
    var result = vec4(0, 0, 0, 1);
    for(var i=0; i<3; i++) {
        result[i] = (1.0-s)*u[i] + s*v[i];
    }
    return result; 
}

function normalize(v, flag) {
    if (!flag) return v;
    var len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    for(var i=0; i<3; i++) {
        v[i] *= 1.0/len;
    }
    v[3] = 1.0;
    return v;
}

function subtract(a, b) {
    return vec4(a[0] - b[0], a[1] - b[1], a[2] - b[2], 0.0);
}

function cross(a, b) {
    return [
        a[1]*b[2] - a[2]*b[1],
        a[2]*b[0] - a[0]*b[2],
        a[0]*b[1] - a[1]*b[0]
    ];
}

function flatten(v) {
    if (v.length === undefined) return v;
    const n = v.length;
    const elemsAreArrays = Array.isArray(v[0]) || ArrayBuffer.isView(v[0]);
    
    if (!elemsAreArrays) {
        return v;
    }

    const floats = new Float32Array(n * v[0].length);
    let idx = 0;
    for (let i = 0; i < n; ++i) {
        for (let j = 0; j < v[i].length; ++j) {
            floats[idx++] = v[i][j];
        }
    }
    return floats;
}

function mult(u, v) {
    const result = vec4(0, 0, 0, 0);
    for (let i = 0; i < 4; ++i) {
        result[i] = u[i] * v[i];
    }
    return result;
}

function normalMatrix(m, transpose) {
    const a = mat3();
    const b = new Float32Array(9);
    
    a[0] = m[0]; a[1] = m[1]; a[2] = m[2];
    a[3] = m[4]; a[4] = m[5]; a[5] = m[6];
    a[6] = m[8]; a[7] = m[9]; a[8] = m[10];
    
    if (transpose) {
        b[0] = a[0]; b[1] = a[3]; b[2] = a[6];
        b[3] = a[1]; b[4] = a[4]; b[5] = a[7];
        b[6] = a[2]; b[7] = a[5]; b[8] = a[8];
    }
    
    return b;
}

function mat3() {
    const result = new Float32Array(9);
    for(let i = 0; i < 9; i++) {
        result[i] = 0.0;
    }
    result[0] = result[4] = result[8] = 1.0;
    return result;
}

function ortho(left, right, bottom, top, near, far) {
    const w = right - left;
    const h = top - bottom;
    const d = far - near;

    const result = new Float32Array(16);
    result[0] = 2.0 / w;
    result[5] = 2.0 / h;
    result[10] = -2.0 / d;
    result[12] = -(right + left) / w;
    result[13] = -(top + bottom) / h;
    result[14] = -(far + near) / d;
    result[15] = 1.0;
    
    return result;
}

function initBuffers() {
    nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    const normalLoc = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(normalLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);
}


function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = vec3(radius * Math.sin(theta) * Math.cos(phi),
               radius * Math.sin(theta) * Math.sin(phi),
               radius * Math.cos(theta));

    viewMatrix = lookAt(eye, at, up);
    projectionMatrix = ortho(left, right, bottom, top0, near, far);
    modelMatrix = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    
    modelViewMatrix = viewMatrix;
    nMatrix = normalMatrix(modelViewMatrix, true);

    gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
    gl.uniformMatrix4fv(viewMatrixLoc, false, flatten(viewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    gl.uniformMatrix3fv(nMatrixLoc, false, flatten(nMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, index);
    requestAnimationFrame(render);
}

function main() {
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    const ambientProduct = mult(lightAmbient, materialAmbient);
    const diffuseProduct = mult(lightDiffuse, materialDiffuse);
    const specularProduct = mult(lightSpecular, materialSpecular);

    positionsArray = [];
    normalsArray = [];
    index = 0;

    tetrahedron(va, vb, vc, vd, numTimesToSubdivide);
    initBuffers();

    modelMatrixLoc = gl.getUniformLocation(program, "uModelMatrix");
    viewMatrixLoc = gl.getUniformLocation(program, "uViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");
    nMatrixLoc = gl.getUniformLocation(program, "uNormalMatrix");

    document.getElementById("Button2").onclick = function() { 
        theta += dr; 
        updateDisplay();
    };
    document.getElementById("Button3").onclick = function() { 
        theta -= dr; 
        updateDisplay();
    };
    document.getElementById("Button4").onclick = function() { 
        phi += dr; 
        updateDisplay();
    };
    document.getElementById("Button5").onclick = function() { 
        phi -= dr; 
        updateDisplay();
    };

    document.getElementById("Button0").onclick = function() {
        numTimesToSubdivide++;
        main();
    };
    document.getElementById("Button1").onclick = function() {
        if(numTimesToSubdivide) numTimesToSubdivide--;
        main();
    };

    gl.uniform4fv(gl.getUniformLocation(program, "uAmbientProduct"), ambientProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uDiffuseProduct"), diffuseProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uSpecularProduct"), specularProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"), lightPosition);
    gl.uniform1f(gl.getUniformLocation(program, "uShininess"), materialShininess);

    theta = 0.8;
    phi = 0.8;
    updateDisplay();

    render();
}



main();