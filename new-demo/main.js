const canvas = document.getElementById('canvas');

const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const context = canvas.getContext('webgpu');
const format = navigator.gpu.getPreferredCanvasFormat();
context.configure({ device, format });

const config = {
    rotation: {
        x: 2.5,
        y: 0.6,
        z: 2.3
    },
    scale: 0.6,
    
    grid: {
        rows: 10,
        cols: 10
    }
};

let totalRotateX = config.rotation.x;
let totalRotateY = config.rotation.y;
let totalRotateZ = config.rotation.z;
let scale = config.scale;
const rows = config.grid.rows;
const cols = config.grid.cols;
const vertices = [];
const triangleIndices = [];
const lineIndices = [];

const pointPositions = [];

const centerIndex = Math.floor(rows/2) * (cols + 1) + Math.floor(cols/2);

const dt = 1/60;
const gravity = 0.5;
const damping = 0.99;
const constraints = [];
const gravityCheckbox = document.getElementById('gravity');
const vertexObjects = [];

for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= cols; x++) {
        const i = y * (cols + 1) + x;
        const isPinned = (x === 0 && y === 0) || (x === cols && y === 0) || 
                        (x === 0 && y === rows) || (x === cols && y === rows);
        
        vertexObjects.push({
            x: (x - cols/2) * 0.2,
            y: 0,
            z: (y - rows/2) * 0.2,
            pinned: isPinned
        });
        
        vertices.push(
            (x - cols/2) * 0.2,
            (y - rows/2) * 0.2,
            0
        );
        
        if (x < cols) {
            constraints.push({a: i, b: i + 1, restLength: 0.2});
        }
        if (y < rows) {
            constraints.push({a: i, b: i + cols + 1, restLength: 0.2});
        }
    }
}

const velocities = vertexObjects.map(() => ({x: 0, y: 0, z: 0}));

for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= cols; x++) {
        const i = y * (cols + 1) + x;
        
        if (x < cols) {
            lineIndices.push(i, i + 1);
        }
        if (y < rows) {
            lineIndices.push(i, i + cols + 1);
        }
        if (x < cols && y < rows) {
            const i1 = i + 1;
            const i2 = i + cols + 1;
            const i3 = i2 + 1;
            triangleIndices.push(i, i1, i2);
            triangleIndices.push(i1, i3, i2);
        }
    }
}

const centerX = 0;
const centerY = 0;

pointPositions.push(centerX, centerY);

const quad = [
    -0.5, -0.5,
     0.5, -0.5,
    -0.5,  0.5,
     0.5, -0.5,
     0.5,  0.5,
    -0.5,  0.5,
];

const uniformBuffer = device.createBuffer({
    size: 48, 
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
});

const uniformData = new Float32Array([
    scale, totalRotateX, totalRotateY, totalRotateZ,
    0, 0, 0, 0,
    0, 0, 0, 0
]);

device.queue.writeBuffer(uniformBuffer, 0, uniformData);

function updateUniforms() {
    const uniformData = new Float32Array([
        scale, totalRotateX, totalRotateY, totalRotateZ,   
        0, 0, 0, 0,
        0, 0, 0, 0
    ]);
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);
}

const rotateXSlider = document.getElementById('rotateX');
const rotateYSlider = document.getElementById('rotateY');
const rotateZSlider = document.getElementById('rotateZ');
const scaleSlider = document.getElementById('scale');
const rotateXValue = document.getElementById('rotateXValue');
const rotateYValue = document.getElementById('rotateYValue');
const rotateZValue = document.getElementById('rotateZValue');
const scaleValue = document.getElementById('scaleValue');

const updateSlider = (slider, valueElement, setter) => {
    slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        setter(value);
        valueElement.textContent = value.toFixed(1);
        updateUniforms();
    });
};

updateSlider(rotateXSlider, rotateXValue, (v) => totalRotateX = v);
updateSlider(rotateYSlider, rotateYValue, (v) => totalRotateY = v);
updateSlider(rotateZSlider, rotateZValue, (v) => totalRotateZ = v);
updateSlider(scaleSlider, scaleValue, (v) => scale = v);

function initializeSliders() {
    const sliders = [
        [rotateXSlider, rotateXValue, config.rotation.x],
        [rotateYSlider, rotateYValue, config.rotation.y],
        [rotateZSlider, rotateZValue, config.rotation.z],
        [scaleSlider, scaleValue, config.scale]
    ];
    
    sliders.forEach(([slider, valueElement, value]) => {
        slider.value = value;
        valueElement.textContent = value.toFixed(1);
    });
}

initializeSliders();

const vertexBuffer = device.createBuffer({
    size: vertices.length * 4, 
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
});
device.queue.writeBuffer(vertexBuffer, 0, new Float32Array(vertices));

function updatePhysics() {
    const time = Date.now() * 0.001;
    
    for (let i = 0; i < vertexObjects.length; i++) {
        const vertex = vertexObjects[i];
        const vel = velocities[i];
        
        if (vertex.pinned) {
            continue;
        }
        
        if (i === centerIndex) {
            vertex.y = 0.2 * Math.sin(time * 3.0);
            vel.y = 0.2 * Math.cos(time * 3.0) * 3.0;
            continue;
        }
        
        if (gravityCheckbox.checked) {
            vel.y -= gravity * dt;
        }
        
        vertex.x += vel.x * dt;
        vertex.y += vel.y * dt;
        vertex.z += vel.z * dt;
        
        vel.x *= damping;
        vel.y *= damping;
        vel.z *= damping;
    }
    
    for (let iter = 0; iter < 3; iter++) {
        for (let i = 0; i < constraints.length; i++) {
            const constraint = constraints[i];
            const vertexA = vertexObjects[constraint.a];
            const vertexB = vertexObjects[constraint.b];
            
            if (vertexA.pinned && vertexB.pinned) {
                continue;
            }
            
            const dx = vertexB.x - vertexA.x;
            const dy = vertexB.y - vertexA.y;
            const dz = vertexB.z - vertexA.z;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (distance > 0) {
                const diff = constraint.restLength - distance;
                const correction = diff / (distance * 2.0);
                
                const fx = dx * correction;
                const fy = dy * correction;
                const fz = dz * correction;
                
                if (!vertexA.pinned) {
                    vertexA.x -= fx;
                    vertexA.y -= fy;
                    vertexA.z -= fz;
                }
                if (!vertexB.pinned) {
                    vertexB.x += fx;
                    vertexB.y += fy;
                    vertexB.z += fz;
                }
            }
        }
    }
    
    const animatedVertices = vertexObjects.flatMap(v => [v.x, v.y, v.z]);
    
    device.queue.writeBuffer(vertexBuffer, 0, new Float32Array(animatedVertices));
    
    const centerVertex = vertexObjects[centerIndex];
    const animatedPointPositions = [centerVertex.x, centerVertex.y];
    
    device.queue.writeBuffer(pointPositionsBuffer, 0, new Float32Array(animatedPointPositions));
}

const triangleIndexBuffer = device.createBuffer({
    size: Math.ceil(triangleIndices.length * 2 / 4) * 4, 
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
});
const triangleArray = new Uint16Array(Math.ceil(triangleIndices.length * 2 / 4) * 4 / 2);
triangleArray.set(triangleIndices);
device.queue.writeBuffer(triangleIndexBuffer, 0, triangleArray);

const lineIndexBuffer = device.createBuffer({
    size: Math.ceil(lineIndices.length * 2 / 4) * 4, 
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
});
const lineArray = new Uint16Array(Math.ceil(lineIndices.length * 2 / 4) * 4 / 2);
lineArray.set(lineIndices);
device.queue.writeBuffer(lineIndexBuffer, 0, lineArray);

const pointQuadBuffer = device.createBuffer({
    size: quad.length * 4,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
});
device.queue.writeBuffer(pointQuadBuffer, 0, new Float32Array(quad));

const pointPositionsBuffer = device.createBuffer({
    size: pointPositions.length * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
});
device.queue.writeBuffer(pointPositionsBuffer, 0, new Float32Array(pointPositions));

const depthTexture = device.createTexture({
    size: { width: 800, height: 600 },
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT
});

async function loadShaders() {
    const shaderFiles = [
        './new-demo/vertexShader.wgsl',
        './new-demo/fragmentShader.wgsl',
        './new-demo/wireframeVertexShader.wgsl',
        './new-demo/wireframeFragmentShader.wgsl',
        './new-demo/pointVertexShader.wgsl',
        './new-demo/pointFragmentShader.wgsl?v=2'
    ];
    
    const responses = await Promise.all(shaderFiles.map(file => fetch(file)));
    const codes = await Promise.all(responses.map(response => response.text()));
    
    return {
        vertexCode: codes[0],
        fragmentCode: codes[1],
        wireframeVertexCode: codes[2],
        wireframeFragmentCode: codes[3],
        pointVertexCode: codes[4],
        pointFragmentCode: codes[5]
    };
}

const { vertexCode, fragmentCode, wireframeVertexCode, wireframeFragmentCode, pointVertexCode, pointFragmentCode } = await loadShaders();
const createShaderModule = (vertexCode, fragmentCode) => 
    device.createShaderModule({ code: `${vertexCode}\n\n${fragmentCode}` });

const shaderModule = createShaderModule(vertexCode, fragmentCode);
const wireframeShaderModule = createShaderModule(wireframeVertexCode, wireframeFragmentCode);
const pointShaderModule = createShaderModule(pointVertexCode, pointFragmentCode);

const bindGroupLayout = device.createBindGroupLayout({
    entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'uniform' }
    }]
});

const pointBindGroupLayout = device.createBindGroupLayout({
    entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'uniform' }
    }, {
        binding: 1,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'read-only-storage' }
    }]
});

const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{
        binding: 0,
        resource: { buffer: uniformBuffer }
    }]
});

const pointBindGroup = device.createBindGroup({
    layout: pointBindGroupLayout,
    entries: [{
        binding: 0,
        resource: { buffer: uniformBuffer }
    }, {
        binding: 1,
        resource: { buffer: pointPositionsBuffer }
    }]
});

const fillPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout]
    }),
    vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [{
            arrayStride: 12, 
            attributes: [{
                format: 'float32x3',
                offset: 0,
                shaderLocation: 0
            }]
        }]
    },
    fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format }]
    },
    primitive: { topology: 'triangle-list' },
    depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus'
    }
});

const wireframePipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout]
    }),
    vertex: {
        module: wireframeShaderModule,
        entryPoint: 'vs_main',
        buffers: [{
            arrayStride: 12, 
            attributes: [{
                format: 'float32x3',
                offset: 0,
                shaderLocation: 0
            }]
        }]
    },
    fragment: {
        module: wireframeShaderModule,
        entryPoint: 'fs_main',
        targets: [{ format }]
    },
    primitive: { topology: 'line-list'},
    depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus'
    }
});

const pointPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
        bindGroupLayouts: [pointBindGroupLayout]
    }),
    vertex: {
        module: pointShaderModule,
        entryPoint: 'main',
        buffers: [{
            arrayStride: 8,
            attributes: [{
                format: 'float32x2',
                offset: 0,
                shaderLocation: 0
            }]
        }]
    },
    fragment: {
        module: pointShaderModule,
        entryPoint: 'fs_main',
        targets: [{ format }]
    },
    primitive: { topology: 'triangle-list' },
    depthStencil: {
        depthWriteEnabled: false,
        depthCompare: 'less-equal',
        format: 'depth24plus'
    }
});

function render() {
    updatePhysics();
    
    const encoder = device.createCommandEncoder();
    const renderPass = encoder.beginRenderPass({
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
            loadOp: 'clear',
            storeOp: 'store'
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store'
        }
    });
    
    renderPass.setPipeline(wireframePipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.setIndexBuffer(lineIndexBuffer, 'uint16');
    renderPass.drawIndexed(lineIndices.length);
    
    renderPass.setPipeline(fillPipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.setIndexBuffer(triangleIndexBuffer, 'uint16');
    renderPass.drawIndexed(triangleIndices.length);
    
    renderPass.setPipeline(pointPipeline);
    renderPass.setBindGroup(0, pointBindGroup);
    renderPass.setVertexBuffer(0, pointQuadBuffer);
    const pointCount = pointPositions.length / 2;
    renderPass.draw(6, pointCount);
    
    renderPass.end();
    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(render);
}

render();
