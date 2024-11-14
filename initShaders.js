export function initShaders(gl, vertexShaderId, fragmentShaderId) {
    const vertElem = document.getElementById(vertexShaderId);
    const fragElem = document.getElementById(fragmentShaderId);

    const vertShdr = gl.createShader(gl.VERTEX_SHADER);
    const fragShdr = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertShdr, vertElem.text.trim());
    gl.shaderSource(fragShdr, fragElem.text.trim());

    gl.compileShader(vertShdr);
    if (!gl.getShaderParameter(vertShdr, gl.COMPILE_STATUS)) {
        const msg = `Vertex shader failed to compile. The error log is:
            ${gl.getShaderInfoLog(vertShdr)}`;
        console.error(msg);
        return null;
    }

    gl.compileShader(fragShdr);
    if (!gl.getShaderParameter(fragShdr, gl.COMPILE_STATUS)) {
        const msg = `Fragment shader failed to compile. The error log is:
            ${gl.getShaderInfoLog(fragShdr)}`;
        console.error(msg);
        return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertShdr);
    gl.attachShader(program, fragShdr);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const msg = `Shader program failed to link. The error log is:
            ${gl.getProgramInfoLog(program)}`;
        console.error(msg);
        return null;
    }

    return program;
}