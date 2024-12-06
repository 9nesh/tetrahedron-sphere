// MV.js - Matrix/Vector package
export const vec4 = (x, y, z, w) => new Float32Array([x, y, z, w]);
export const vec3 = (x, y, z) => new Float32Array([x, y, z]);
export const vec2 = (x, y) => new Float32Array([x, y]);

export function perspective(fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    const d = far - near;

    const result = new Float32Array(16);
    result[0] = f / aspect;
    result[5] = f;
    result[10] = -(far + near) / d;
    result[11] = -1;
    result[14] = -(2 * far * near) / d;
    result[15] = 0.0;

    return result;
}

export function lookAt(eye, at, up) {
    const n = normalize(subtract(eye, at));
    const u = normalize(cross(up, n));
    const v = normalize(cross(n, u));

    const result = new Float32Array(16);
    result[0] = u[0]; result[4] = u[1]; result[8] = u[2]; result[12] = -dot(u, eye);
    result[1] = v[0]; result[5] = v[1]; result[9] = v[2]; result[13] = -dot(v, eye);
    result[2] = n[0]; result[6] = n[1]; result[10] = n[2]; result[14] = -dot(n, eye);
    result[3] = 0; result[7] = 0; result[11] = 0; result[15] = 1;

    return result;
}

function subtract(a, b) {
    return new Float32Array([a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
}

function cross(a, b) {
    return new Float32Array([
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ]);
}

function normalize(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return new Float32Array([v[0] / len, v[1] / len, v[2] / len]);
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}