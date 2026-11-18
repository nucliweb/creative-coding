import { COMPUTE_WGSL, RENDER_WGSL, FADE_WGSL, BLIT_WGSL } from './gpuParticles.wgsl.js';

export const MAX_ATTRACTORS = 160;

export class GpuParticles {
  static async create(canvas, opts) {
    if (!navigator.gpu) throw new Error('WebGPU no disponible');
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('Sense adaptador WebGPU');
    const device = await adapter.requestDevice();
    return new GpuParticles(canvas, device, opts);
  }

  constructor(canvas, device, { count = 1_000_000 } = {}) {
    this.canvas = canvas;
    this.device = device;
    this.count = count;
    this.ctx = canvas.getContext('webgpu');
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.ctx.configure({ device, format: this.format, alphaMode: 'opaque' });
    this.swirl = 0.9; this.pull = 0.00007; this.fade = 0.12;
    this.soft = 0.008; this.damp = 0.972; this.flow = 0.00015;

    // particles: pos(2) vel(2) hue seed pad(2) = 8 floats
    const data = new Float32Array(count * 8);
    for (let i = 0; i < count; i++) {
      const o = i * 8;
      data[o] = Math.random() * 2 - 1; data[o + 1] = Math.random() * 2 - 1;
      data[o + 4] = Math.random(); data[o + 5] = Math.random();
    }
    this.pbuf = device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(this.pbuf, 0, data);
    this.ubuf = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.abuf = device.createBuffer({ size: MAX_ATTRACTORS * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.fbuf = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.attrData = new Float32Array(MAX_ATTRACTORS * 4);

    const mod = (code) => device.createShaderModule({ code });
    this.compute = device.createComputePipeline({ layout: 'auto', compute: { module: mod(COMPUTE_WGSL), entryPoint: 'main' } });
    this.computeBG = device.createBindGroup({ layout: this.compute.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: this.pbuf } }, { binding: 1, resource: { buffer: this.ubuf } }, { binding: 2, resource: { buffer: this.abuf } }] });

    const add = { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' } };
    const over = { color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' } };
    const accumFormat = 'rgba16float';
    const rmod = mod(RENDER_WGSL);
    this.render = device.createRenderPipeline({ layout: 'auto',
      vertex: { module: rmod, entryPoint: 'vs' },
      fragment: { module: rmod, entryPoint: 'fs', targets: [{ format: accumFormat, blend: add }] },
      primitive: { topology: 'point-list' } });
    this.renderBG = device.createBindGroup({ layout: this.render.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.pbuf } }] });
    const fmod = mod(FADE_WGSL);
    this.fadeP = device.createRenderPipeline({ layout: 'auto',
      vertex: { module: fmod, entryPoint: 'vs' }, fragment: { module: fmod, entryPoint: 'fs', targets: [{ format: accumFormat, blend: over }] } });
    this.fadeBG = device.createBindGroup({ layout: this.fadeP.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.fbuf } }] });
    const bmod = mod(BLIT_WGSL);
    this.blit = device.createRenderPipeline({ layout: 'auto',
      vertex: { module: bmod, entryPoint: 'vs' }, fragment: { module: bmod, entryPoint: 'fs', targets: [{ format: this.format }] } });
    this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    this.accumFormat = accumFormat;
    this.resize();
  }

  resize() {
    const w = Math.max(1, this.canvas.clientWidth), h = Math.max(1, this.canvas.clientHeight);
    this.canvas.width = w; this.canvas.height = h; // 1 particle = 1 projector pixel
    this.accum?.destroy();
    this.accum = this.device.createTexture({ size: [w, h], format: this.accumFormat, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    this.blitBG = this.device.createBindGroup({ layout: this.blit.getBindGroupLayout(0), entries: [
      { binding: 0, resource: this.accum.createView() }, { binding: 1, resource: this.sampler }] });
    this.aspect = w / h;
  }

  // attractors: [{x, y (0..1 screen coords), strength, hue (0..1)}]
  frame(time, level, attractors) {
    const { device } = this;
    if (this.canvas.clientWidth !== this.canvas.width || this.canvas.clientHeight !== this.canvas.height) this.resize();
    const n = Math.min(MAX_ATTRACTORS, attractors.length);
    for (let i = 0; i < n; i++) {
      const a = attractors[i], o = i * 4;
      this.attrData[o] = a.x * 2 - 1; this.attrData[o + 1] = 1 - a.y * 2; this.attrData[o + 2] = a.strength ?? 1; this.attrData[o + 3] = a.hue;
    }
    device.queue.writeBuffer(this.abuf, 0, this.attrData, 0, Math.max(4, n * 4));
    const u = new ArrayBuffer(48), dv = new DataView(u);
    dv.setUint32(0, this.count, true); dv.setUint32(4, n, true);
    dv.setFloat32(8, time, true); dv.setFloat32(12, level, true); dv.setFloat32(16, this.aspect, true);
    dv.setFloat32(20, this.swirl * 0.00004, true); dv.setFloat32(24, this.pull, true);
    dv.setFloat32(28, this.soft, true); dv.setFloat32(32, this.damp, true); dv.setFloat32(36, this.flow, true);
    device.queue.writeBuffer(this.ubuf, 0, u);
    device.queue.writeBuffer(this.fbuf, 0, new Float32Array([0, 0, 0, this.fade]));

    const enc = device.createCommandEncoder();
    const cp = enc.beginComputePass();
    cp.setPipeline(this.compute); cp.setBindGroup(0, this.computeBG);
    cp.dispatchWorkgroups(Math.ceil(this.count / 256));
    cp.end();

    const rp = enc.beginRenderPass({ colorAttachments: [{ view: this.accum.createView(), loadOp: 'load', storeOp: 'store' }] });
    rp.setPipeline(this.fadeP); rp.setBindGroup(0, this.fadeBG); rp.draw(3);
    rp.setPipeline(this.render); rp.setBindGroup(0, this.renderBG); rp.draw(this.count);
    rp.end();

    const bp = enc.beginRenderPass({ colorAttachments: [{ view: this.ctx.getCurrentTexture().createView(), loadOp: 'clear', clearValue: [0, 0, 0, 1], storeOp: 'store' }] });
    bp.setPipeline(this.blit); bp.setBindGroup(0, this.blitBG); bp.draw(3);
    bp.end();
    device.queue.submit([enc.finish()]);
  }

  destroy() { this.accum?.destroy(); this.pbuf.destroy(); this.device.destroy(); }
}
