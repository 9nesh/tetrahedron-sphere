import { vec4, vec3, lookAt, perspective, vec2 } from './MV.js';
import { initShaders } from './initShaders.js';

"use strict";

var canvas;
var gl;

var numTimesToSubdivide = 0; // Number of subdivisions for the tetrahedron
var index = 0; // Index for vertex array
var positionsArray = []; // Array to hold vertex positions
var normalsArray = []; // Array to hold vertex normals
var texCoordsArray = []; // Array to hold texture coordinates

// Define vertices of the tetrahedron
var va = vec4(0.0, 0.0, -1.0, 1); // Vertex A
var vb = vec4(0.0, 0.942809, 0.333333, 1); // Vertex B
var vc = vec4(-0.816497, -0.471405, 0.333333, 1); // Vertex C
var vd = vec4(0.816497, -0.471405, 0.333333, 1); // Vertex D

// Define clipping planes
var near = -10; // Near clipping plane
var far = 10; // Far clipping plane
var radius = 2.0; // Camera radius
var theta = 0.0; // Camera angle theta
var phi = 0.0; // Camera angle phi
var dr = 5.0 * Math.PI/180.0; // Delta rotation

// Define orthographic projection boundaries
var left = -2.0; // Left boundary
var right = 2.0; // Right boundary
var top0 = 2.0; // Top boundary
var bottom = -2.0; // Bottom boundary

var lightPosition = vec4(2.0, 2.0, 2.0, 1.0);
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(0.24725, 0.1995, 0.0745, 1.0);
var materialDiffuse = vec4(0.75164, 0.60648, 0.22648, 1.0);
var materialSpecular = vec4(0.628281, 0.555802, 0.366065, 1.0);
var materialShininess = 50.0;

// Matrix variables
var modelMatrix, viewMatrix, projectionMatrix; // Matrices for transformations
var modelViewMatrix; // Combined model-view matrix
var modelMatrixLoc, viewMatrixLoc, projectionMatrixLoc; // Locations for shader uniforms
var nMatrix, nMatrixLoc; // Normal matrix
var lightingEnabledLoc; // Lighting enabled location

var objectTheta = 0.0; // Object rotation angle theta
var objectPhi = 0.0; // Object rotation angle phi

var eye; // Camera eye position
var at = vec3(0.0, 0.0, 0.0); // Look-at point
var up = vec3(0.0, 1.0, 0.0); // Up vector

var program; // Shader program
var vBuffer, nBuffer; // Buffers for vertices and normals
var isLightingEnabled = true; // Lighting toggle
var isTextureEnabled = true; // Texture toggle

// Camera angles - set for a centered front view
var cameraTheta = Math.PI / 2;  // 90 degrees - camera at horizon level
var cameraPhi = 0.0;            // 0 degrees - camera directly in front

// Arrays for axes
var axesPoints = []; // Points for axes
var axesColors = []; // Colors for axes
var buffers; // Buffer references
var drawingAxesLoc; // Location for drawing axes

// Axes toggle state
var isAxesEnabled = true; // Toggle for axes visibility

function updateDisplay() { // Function to update the display values
    document.getElementById('thetaValue').textContent = objectTheta.toFixed(2); // Update theta value
    document.getElementById('phiValue').textContent = objectPhi.toFixed(2); // Update phi value
    document.getElementById('cameraThetaValue').textContent = cameraTheta.toFixed(2); // Update camera theta
    document.getElementById('cameraPhiValue').textContent = cameraPhi.toFixed(2); // Update camera phi
    document.getElementById('subdivValue').textContent = numTimesToSubdivide; // Update subdivision count
    document.getElementById('lightingStatus').textContent = isLightingEnabled ? "On" : "Off"; // Update lighting status
    document.getElementById('textureStatus').textContent = isTextureEnabled ? "On" : "Off"; // Update texture status
    document.getElementById('axesStatus').textContent = isAxesEnabled ? "On" : "Off"; // Update axes status

    // Update button colors based on state
    document.getElementById('toggleLighting').className = isLightingEnabled ? "toggle-button" : "toggle-button off"; // Lighting button
    document.getElementById('toggleTexture').className = isTextureEnabled ? "toggle-button" : "toggle-button off"; // Texture button
    document.getElementById('toggleAxes').className = isAxesEnabled ? "toggle-button" : "toggle-button off"; // Axes button
}

function triangle(a, b, c) { // Function to create a triangle
    positionsArray.push(a); // Add vertex A
    positionsArray.push(b); // Add vertex B
    positionsArray.push(c); // Add vertex C
    
    var t1 = subtract(b, a); // Edge AB
    var t2 = subtract(c, a); // Edge AC
    var normal = normalize(cross(t2, t1)); // Calculate normal
    var normalVec = vec4(normal[0], normal[1], normal[2], 0.0); // Create normal vector
    
    normalsArray.push(normalVec);
    normalsArray.push(normalVec);
    normalsArray.push(normalVec);

    var texCoordA = sphereToTexCoord(normalize(a));
    var texCoordB = sphereToTexCoord(normalize(b));
    var texCoordC = sphereToTexCoord(normalize(c));
    
    texCoordsArray.push(texCoordA);
    texCoordsArray.push(texCoordB);
    texCoordsArray.push(texCoordC);

    index += 3; // Increment index by 3
}

function sphereToTexCoord(point) { // Function to convert sphere point to texture coordinates
    // Normalize the point to ensure it's on unit sphere
    const len = Math.sqrt(point[0] * point[0] + point[1] * point[1] + point[2] * point[2]); // Length of the point
    const x = point[0] / len; // X coordinate
    const y = point[1] / len; // Y coordinate
    const z = point[2] / len; // Z coordinate

    // Calculate angles as shown in the diagram
    const theta = Math.acos(y);           // θ = acos(y),  range [0,π]
    const phi = Math.atan2(z, x);         // φ = atan2(z,x), range [-π,π]

    // Convert to texture coordinates [0,1]
    // For s: map phi from [-π,π] to [0,1]
    // For t: map theta from [0,π] to [0,1]
    const s = (phi + Math.PI) / (2.0 * Math.PI); // S coordinate
    const t = theta / Math.PI; // T coordinate

    return vec2(s, t); // Return texture coordinates
}

function configureTexture(image) { // Function to configure texture
    var texture = gl.createTexture(); // Create texture
    gl.bindTexture(gl.TEXTURE_2D, texture); // Bind texture
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); // Load texture image
    
    gl.generateMipmap(gl.TEXTURE_2D); // Generate mipmaps
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); // Set min filter
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); // Set mag filter
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); // Set wrap S
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); // Set wrap T
}

function divideTriangle(a, b, c, count) { // Function to divide a triangle
    if (count === 0) { // Base case
        triangle(a, b, c); // Create triangle
    } else {
        var ab = mix(a, b, 0.5); // Midpoint AB
        var ac = mix(a, c, 0.5); // Midpoint AC
        var bc = mix(b, c, 0.5); // Midpoint BC

        ab = normalize(ab, true); // Normalize AB
        ac = normalize(ac, true); // Normalize AC
        bc = normalize(bc, true); // Normalize BC

        divideTriangle(a, ab, ac, count - 1); // Divide triangle A
        divideTriangle(ab, b, bc, count - 1); // Divide triangle B
        divideTriangle(bc, c, ac, count - 1); // Divide triangle C
        divideTriangle(ab, bc, ac, count - 1); // Divide triangle D
    }
}

function tetrahedron(a, b, c, d, n) { // Function to create a tetrahedron
    divideTriangle(a, b, c, n); // Divide face ABC
    divideTriangle(d, c, b, n); // Divide face DBC
    divideTriangle(a, d, b, n); // Divide face ADB
    divideTriangle(a, c, d, n); // Divide face ACD
}

function mix(u, v, s) {
    var result = vec4(0, 0, 0, 1);
    for(var i=0; i<3; i++) {
        result[i] = (1.0-s)*u[i] + s*v[i];
    }
    return result; // Return mixed vector
}

function normalize(v, flag) {
    if (!flag) return v;
    var len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    for(var i=0; i<3; i++) {
        v[i] *= 1.0/len;
    }
    v[3] = 1.0; // Set homogeneous coordinate
    return v; // Return normalized vector
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
    return result; // Return result
}

function normalMatrix(m, transpose) {
    const a = mat3();
    const b = new Float32Array(9);
    
    a[0] = m[0]; a[1] = m[1]; a[2] = m[2];
    a[3] = m[4]; a[4] = m[5]; a[5] = m[6];
    a[6] = m[8]; a[7] = m[9]; a[8] = m[10];
    
    if (transpose==true) {
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

function initAxes() {
    // Clear existing points
    axesPoints = []; // Reset points
    axesColors = []; // Reset colors

    const axisLength = 2.0;  // Increased length for better visibility

    // X axis - Red
    axesPoints.push(vec4(0.0, 0.0, 0.0, 1.0)); // Start point
    axesPoints.push(vec4(axisLength, 0.0, 0.0, 1.0)); // End point
    axesColors.push(vec4(1.0, 0.0, 0.0, 1.0)); // Color for X
    axesColors.push(vec4(1.0, 0.0, 0.0, 1.0)); // Color for X

    // Y axis - Green
    axesPoints.push(vec4(0.0, 0.0, 0.0, 1.0)); // Start point
    axesPoints.push(vec4(0.0, axisLength, 0.0, 1.0)); // End point
    axesColors.push(vec4(0.0, 1.0, 0.0, 1.0)); // Color for Y
    axesColors.push(vec4(0.0, 1.0, 0.0, 1.0)); // Color for Y

    // Z axis - Blue
    axesPoints.push(vec4(0.0, 0.0, 0.0, 1.0)); // Start point
    axesPoints.push(vec4(0.0, 0.0, axisLength, 1.0)); // End point
    axesColors.push(vec4(0.0, 0.0, 1.0, 1.0)); // Color for Z
    axesColors.push(vec4(0.0, 0.0, 1.0, 1.0)); // Color for Z

    console.log("Axes Points:", axesPoints.length); // Log number of points
    console.log("Axes Colors:", axesColors.length); // Log number of colors
}

function initBuffers() { // Function to initialize buffers
    console.log("Initializing buffers:"); // Log buffer initialization
    console.log("Positions:", positionsArray.length); // Log positions count
    console.log("Normals:", normalsArray.length); // Log normals count
    console.log("TexCoords:", texCoordsArray.length); // Log texture coordinates count

    // Create buffers for tetrahedron
    nBuffer = gl.createBuffer(); // Create normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer); // Bind normal buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW); // Load normals

    vBuffer = gl.createBuffer(); // Create vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer); // Bind vertex buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW); // Load vertices

    const tBuffer = gl.createBuffer(); // Create texture buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer); // Bind texture buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW); // Load texture coordinates

    // Create buffers for axes
    const axesBuffer = gl.createBuffer(); // Create axes buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, axesBuffer); // Bind axes buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(axesPoints), gl.STATIC_DRAW); // Load axes points

    const axesColorBuffer = gl.createBuffer(); // Create axes color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, axesColorBuffer); // Bind axes color buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(axesColors), gl.STATIC_DRAW); // Load axes colors

    // Store all buffer references
    buffers = { // Create buffer reference object
        position: vBuffer, // Vertex buffer
        normal: nBuffer, // Normal buffer
        texture: tBuffer, // Texture buffer
        axes: axesBuffer, // Axes buffer
        axesColor: axesColorBuffer // Axes color buffer
    };
}

function drawAxes() { // Function to draw axes
    // Set drawing axes flag
    gl.uniform1i(drawingAxesLoc, true); // Enable drawing axes

    // Get attribute locations
    const positionLoc = gl.getAttribLocation(program, "aPosition"); // Position attribute
    const colorLoc = gl.getAttribLocation(program, "aColor"); // Color attribute

    // Disable unused attributes
    const normalLoc = gl.getAttribLocation(program, "aNormal"); // Normal attribute
    const texCoordLoc = gl.getAttribLocation(program, "aTexCoord"); // Texture coordinate attribute
    gl.disableVertexAttribArray(normalLoc); // Disable normal attribute
    gl.disableVertexAttribArray(texCoordLoc); // Disable texture coordinate attribute

    // Bind and set up position buffer for axes
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.axes); // Bind axes buffer
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0); // Set position pointer
    gl.enableVertexAttribArray(positionLoc); // Enable position attribute

    // Bind and set up color buffer for axes
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.axesColor); // Bind axes color buffer
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0); // Set color pointer
    gl.enableVertexAttribArray(colorLoc); // Enable color attribute

    // Draw the axes
    gl.drawArrays(gl.LINES, 0, 6);  // 3 pairs of points = 6 vertices

    // Reset drawing axes flag
    gl.uniform1i(drawingAxesLoc, false); // Disable drawing axes
}

function drawTetrahedron() { // Function to draw tetrahedron
    // Get attribute locations
    const positionLoc = gl.getAttribLocation(program, "aPosition"); // Position attribute
    const normalLoc = gl.getAttribLocation(program, "aNormal"); // Normal attribute
    const texCoordLoc = gl.getAttribLocation(program, "aTexCoord"); // Texture coordinate attribute
    const colorLoc = gl.getAttribLocation(program, "aColor"); // Color attribute

    // Disable color attribute used by axes
    gl.disableVertexAttribArray(colorLoc); // Disable color attribute

    // Bind and set up position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position); // Bind vertex buffer
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0); // Set position pointer
    gl.enableVertexAttribArray(positionLoc); // Enable position attribute

    // Bind and set up normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal); // Bind normal buffer
    gl.vertexAttribPointer(normalLoc, 4, gl.FLOAT, false, 0, 0); // Set normal pointer
    gl.enableVertexAttribArray(normalLoc); // Enable normal attribute

    // Bind and set up texture coordinate buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texture); // Bind texture buffer
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0); // Set texture coordinate pointer
    gl.enableVertexAttribArray(texCoordLoc); // Enable texture coordinate attribute

    console.log("Drawing tetrahedron with", index, "vertices"); // Log drawing info
    // Draw the tetrahedron
    gl.drawArrays(gl.TRIANGLES, 0, index); // Draw triangles
}

function render() { // Function to render the scene
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear buffers

    eye = vec3(radius * Math.sin(cameraTheta) * Math.cos(cameraPhi), // Calculate eye position
               radius * Math.sin(cameraTheta) * Math.sin(cameraPhi),
               radius * Math.cos(cameraTheta));

    // Update light position to match camera position
    var lightPosition = vec4(eye[0], eye[1], eye[2], 1.0); // Update light position
    gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"), lightPosition); // Send to shader

    viewMatrix = lookAt(eye, at, up); // Create view matrix
    projectionMatrix = ortho(left, right, bottom, top0, near, far); // Create projection matrix

    // Create model matrix for rotation
    var cosT = Math.cos(-objectTheta);  // Negate theta for correct up/down direction
    var sinT = Math.sin(-objectTheta); // Calculate sine
    var cosP = Math.cos(objectPhi); // Calculate cosine
    var sinP = Math.sin(objectPhi); // Calculate sine

    modelMatrix = new Float32Array([ // Create model matrix
        cosP,        0,     -sinP,    0,
        sinP * sinT, cosT,   cosP * sinT, 0,
        sinP * cosT, -sinT,  cosP * cosT, 0,
        0,          0,      0,         1
    ]);

    // Update matrices in shader
    gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix); // Send model matrix
    gl.uniformMatrix4fv(viewMatrixLoc, false, flatten(viewMatrix)); // Send view matrix
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix)); // Send projection matrix
    gl.uniformMatrix3fv(nMatrixLoc, false, flatten(normalMatrix(modelMatrix, true))); // Send normal matrix

    // Draw axes if enabled
    if (isAxesEnabled) {
        drawAxes(); // Draw axes
    }

    // Draw tetrahedron
    drawTetrahedron(); // Draw tetrahedron

    requestAnimationFrame(render); // Request next frame
}

function main() { // Main function
    canvas = document.getElementById("gl-canvas"); 

    gl = canvas.getContext('webgl2'); 
    if (!gl) alert("WebGL 2.0 isn't available"); 

    gl.viewport(0, 0, canvas.width, canvas.height); 
    gl.clearColor(0.2, 0.2, 0.2, 1.0); 
    gl.enable(gl.DEPTH_TEST); 

    program = initShaders(gl, "vertex-shader", "fragment-shader"); 
    gl.useProgram(program); 

    // Reset arrays
    positionsArray = []; 
    normalsArray = []; 
    texCoordsArray = []; 
    index = 0; 

    // Create initial geometry
    tetrahedron(va, vb, vc, vd, numTimesToSubdivide);
    console.log("After tetrahedron creation:");
    console.log("- Positions:", positionsArray.length);
    console.log("- Normals:", normalsArray.length);
    console.log("- TexCoords:", texCoordsArray.length);
    console.log("- Index:", index);

    // Initialize axes
    initAxes(); 

    // Initialize buffers
    initBuffers(); 

    // Get uniform locations
    modelMatrixLoc = gl.getUniformLocation(program, "uModelMatrix");
    viewMatrixLoc = gl.getUniformLocation(program, "uViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");
    nMatrixLoc = gl.getUniformLocation(program, "uNormalMatrix");
    lightingEnabledLoc = gl.getUniformLocation(program, "uLightingEnabled");
    drawingAxesLoc = gl.getUniformLocation(program, "uDrawingAxes");

    // Verify all uniforms were found
    console.log("Uniform locations:");
    console.log("- Model Matrix:", modelMatrixLoc);
    console.log("- View Matrix:", viewMatrixLoc);
    console.log("- Projection Matrix:", projectionMatrixLoc);
    console.log("- Normal Matrix:", nMatrixLoc);
    console.log("- Lighting Enabled:", lightingEnabledLoc);
    console.log("- Drawing Axes:", drawingAxesLoc);

    // Set initial states
    gl.uniform1i(lightingEnabledLoc, isLightingEnabled); // Set lighting state
    gl.uniform1i(drawingAxesLoc, false); // Set drawing axes state

    // Set up lighting products
    const ambientProduct = mult(lightAmbient, materialAmbient); 
    const diffuseProduct = mult(lightDiffuse, materialDiffuse); 
    const specularProduct = mult(lightSpecular, materialSpecular); 

    gl.uniform4fv(gl.getUniformLocation(program, "uAmbientProduct"), flatten(ambientProduct)); 
    gl.uniform4fv(gl.getUniformLocation(program, "uDiffuseProduct"), flatten(diffuseProduct)); 
    gl.uniform4fv(gl.getUniformLocation(program, "uSpecularProduct"), flatten(specularProduct)); 
    gl.uniform1f(gl.getUniformLocation(program, "uShininess"), materialShininess); 

    // Object rotation controls
    document.getElementById("Button2").onclick = function() {  
        objectTheta += dr;  
        console.log('Object θ:', objectTheta.toFixed(2), 'Camera θ:', cameraTheta.toFixed(2)); 
        updateDisplay(); 
    };
    document.getElementById("Button3").onclick = function() {  // Down button
        objectTheta -= dr;  
        console.log('Object θ:', objectTheta.toFixed(2), 'Camera θ:', cameraTheta.toFixed(2)); 
        updateDisplay(); 
    };
    document.getElementById("Button4").onclick = function() {  // Right button
        objectPhi += dr; 
        console.log('Object φ:', objectPhi.toFixed(2), 'Camera φ:', cameraPhi.toFixed(2)); 
        updateDisplay(); 
    };
    document.getElementById("Button5").onclick = function() {  // left button
        objectPhi -= dr;    
        console.log('Object φ:', objectPhi.toFixed(2), 'Camera φ:', cameraPhi.toFixed(2)); 
        updateDisplay(); 
    };

    // Also add limits to object rotation to prevent confusion
    function updateObjectRotation() { // Function to update object rotation
        // Keep theta between -PI and PI
        objectTheta = Math.max(-Math.PI, Math.min(Math.PI, objectTheta)); // Clamp theta
        // Keep phi between -PI and PI
        objectPhi = Math.max(-Math.PI, Math.min(Math.PI, objectPhi)); // Clamp phi
    }

    document.getElementById("CameraUp").onclick = function() { // Camera up button
        console.log('Camera θ:', cameraTheta.toFixed(2), 'Object θ:', objectTheta.toFixed(2)); // Log camera and object angles
        cameraTheta = Math.max(0.1, Math.min(Math.PI - 0.1, cameraTheta - dr)); // Move up
        updateDisplay(); // Update display
    };
    document.getElementById("CameraDown").onclick = function() { // Camera down button
        console.log('Camera θ:', cameraTheta.toFixed(2), 'Object θ:', objectTheta.toFixed(2)); // Log camera and object angles
        cameraTheta = Math.max(0.1, Math.min(Math.PI - 0.1, cameraTheta + dr)); // Move down
        updateDisplay(); // Update display
    };
    
    document.getElementById("CameraRight").onclick = function() { // Camera right button
        cameraPhi = (cameraPhi + dr) % (2 * Math.PI); // Wrap around horizontally
        updateDisplay(); // Update display
    };
    document.getElementById("CameraLeft").onclick = function() { // Camera left button
        cameraPhi = (cameraPhi - dr + 2 * Math.PI) % (2 * Math.PI); // Wrap to avoid negatives
        updateDisplay(); // Update display
    };
    

    // Subdivision controls
    document.getElementById("Button0").onclick = function() { // Increase subdivision
        numTimesToSubdivide++; // Increment subdivision count
        // Clear arrays before recreating with new subdivision level
        positionsArray = []; // Reset positions
        normalsArray = []; // Reset normals
        texCoordsArray = []; // Reset texture coordinates
        index = 0; // Reset index
        // Recreate geometry with new subdivision level
        tetrahedron(va, vb, vc, vd, numTimesToSubdivide); // Create new tetrahedron
        // Reinitialize buffers with new data
        initBuffers(); // Initialize buffers
        updateDisplay(); // Update display
    };
    
    document.getElementById("Button1").onclick = function() { // Decrease subdivision
        if(numTimesToSubdivide) { // Check if subdivisions exist
            numTimesToSubdivide--; // Decrement subdivision count
            // Clear arrays before recreating with new subdivision level
            positionsArray = []; // Reset positions
            normalsArray = []; // Reset normals
            texCoordsArray = []; // Reset texture coordinates
            index = 0; // Reset index
            // Recreate geometry with new subdivision level
            tetrahedron(va, vb, vc, vd, numTimesToSubdivide); // Create new tetrahedron
            // Reinitialize buffers with new data
            initBuffers(); // Initialize buffers
            updateDisplay(); // Update display
        }
    };

    // Initialize display
    updateDisplay(); // Update display

    gl.uniform4fv(gl.getUniformLocation(program, "uAmbientProduct"), mult(lightAmbient, materialAmbient)); // Set ambient product
    gl.uniform4fv(gl.getUniformLocation(program, "uDiffuseProduct"), mult(lightDiffuse, materialDiffuse)); // Set diffuse product
    gl.uniform4fv(gl.getUniformLocation(program, "uSpecularProduct"), mult(lightSpecular, materialSpecular)); 
    gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"), lightPosition); 
    gl.uniform1f(gl.getUniformLocation(program, "uShininess"), materialShininess); 

    theta = 0.8; 
    phi = 0.8; 
    updateDisplay(); 

    // Lighting toggle handler
    document.getElementById("toggleLighting").onclick = function() { 
        isLightingEnabled = !isLightingEnabled; 
        gl.uniform1i(lightingEnabledLoc, isLightingEnabled); 
        console.log("Lighting toggled:", isLightingEnabled ? "On" : "Off"); 
        updateDisplay(); 
    };

    // Set initial lighting state
    gl.uniform1i(lightingEnabledLoc, isLightingEnabled); 

    document.getElementById("toggleTexture").onclick = function() { 
        isTextureEnabled = !isTextureEnabled; 
        gl.uniform1i(gl.getUniformLocation(program, "uTextureEnabled"), isTextureEnabled); 
        updateDisplay(); 
    };

    var image = new Image(); 
    image.onload = function() { 
        configureTexture(image);    
        gl.uniform1i(gl.getUniformLocation(program, "uTextureEnabled"), isTextureEnabled); 
        gl.uniform1i(gl.getUniformLocation(program, "uLightingEnabled"), isLightingEnabled); 
        updateDisplay(); 
    }
    image.src = 'wmap.jpg'; // Set image source

    gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0); // Set texture unit
    gl.uniform1i(gl.getUniformLocation(program, "uTextureEnabled"), isTextureEnabled); // Set texture enabled

    // Add axes toggle handler
    document.getElementById("toggleAxes").onclick = function() { // Toggle axes
        isAxesEnabled = !isAxesEnabled; // Toggle state
        updateDisplay(); // Update display
    };

    render(); // Start rendering
}

main(); // Call main function