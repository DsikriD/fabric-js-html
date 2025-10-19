struct Uniforms {
    scale: f32,
    totalRotateX: f32,
    totalRotateY: f32,
    totalRotateZ: f32,
    _padding1: f32,
    _padding2: f32,
    _padding3: f32,
    _padding4: f32,
    _padding5: f32,
    _padding6: f32,
    _padding7: f32,
    _padding8: f32,
}

struct VSOut {
    @builtin(position) pos: vec4<f32>,
    @location(0) color: vec3<f32>,
}

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

@vertex
fn vs_main(@location(0) position: vec3<f32>) -> VSOut {
    let pos = position;
    let scale = uniforms.scale;
    var worldPos = vec4<f32>(pos.x * scale, pos.y * scale, pos.z * scale, 1.0);
    
    var v = worldPos.xyz;
    
    let ax = uniforms.totalRotateX;
    let ay = uniforms.totalRotateY;
    let az = uniforms.totalRotateZ;
    let cx = cos(ax); let sx = sin(ax);
    let cy = cos(ay); let sy = sin(ay);
    let cz = cos(az); let sz = sin(az);
    
    v = vec3<f32>(cy*v.x + sy*v.z, v.y, -sy*v.x + cy*v.z);
    v = vec3<f32>(v.x, cx*v.y - sx*v.z, sx*v.y + cx*v.z);
    v = vec3<f32>(cz*v.x - sz*v.y, sz*v.x + cz*v.y, v.z);
    
    var out: VSOut;
    out.pos = vec4<f32>(v.x, v.y - 0.1, 0.0, 1.0);
    out.color = vec3<f32>(1.0, 0.0, 0.0);
    return out;
}
