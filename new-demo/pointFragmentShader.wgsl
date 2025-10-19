struct FragmentInput {
    @location(0) localUV: vec2<f32>,
    @location(1) height: f32,
}

@fragment
fn fs_main(in: FragmentInput) -> @location(0) vec4<f32> {
    let center = vec2<f32>(0.5, 0.5);
    let dist = distance(in.localUV, center);
    
    if (dist > 0.5) {
        discard;
    }
    
    let normalizedHeight = (in.height + 0.5) / 1.0;
    let clampedHeight = clamp(normalizedHeight, 0.0, 1.0);
    
    let redAmount = clampedHeight;
    let greenAmount = 1.0 - clampedHeight;
    let blueAmount = 0.0;
    
    return vec4<f32>(redAmount, greenAmount, blueAmount, 1.0);
}
