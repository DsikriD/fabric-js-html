@fragment
fn fs_main(inFrag: VSOut) -> @location(0) vec4<f32> {
    return vec4<f32>(inFrag.color, 1.0);
}
