struct VertexInput {
    @location(0) pos: vec2<f32>,
    @builtin(instance_index) instance: u32,
}

struct VSOut {
    @builtin(position) Position: vec4<f32>,
    @location(0) localUV: vec2<f32>,
    @location(1) height: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> pointPositions: array<vec2<f32>>;

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

@vertex
fn main(input: VertexInput) -> VSOut {
    let center = pointPositions[input.instance];
    let pointSize = 0.1;
    let scale = uniforms.scale;
    
    var center3D = vec3<f32>(center, 0.0);
    center3D *= scale;
    
    let ax = uniforms.totalRotateX;
    let ay = uniforms.totalRotateY;
    let az = uniforms.totalRotateZ;
    let cx = cos(ax); let sx = sin(ax);
    let cy = cos(ay); let sy = sin(ay);
    let cz = cos(az); let sz = sin(az);
    
    center3D = vec3<f32>(cy*center3D.x + sy*center3D.z, center3D.y, -sy*center3D.x + cy*center3D.z);
    center3D = vec3<f32>(center3D.x, cx*center3D.y - sx*center3D.z, sx*center3D.y + cx*center3D.z);
    center3D = vec3<f32>(cz*center3D.x - sz*center3D.y, sz*center3D.x + cz*center3D.y, center3D.z);
    
    let pos = vec4<f32>(center3D, 1.0);
    let offset = input.pos * pointSize;
    
    var out: VSOut;
    out.Position = vec4<f32>(pos.x + offset.x, pos.y + offset.y, 0.0, 1.0);
    out.localUV = input.pos + vec2(0.5);
    out.height = center3D.y;
    return out;
}
