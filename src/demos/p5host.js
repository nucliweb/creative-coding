import p5 from 'p5';

// Mounts a p5 sketch (instance mode) that fills the host element.
export function mountSketch(host, sketch) {
  const inst = new p5((p) => {
    sketch(p);
    const userSetup = p.setup;
    p.setup = async function () {
      p.createCanvas(host.clientWidth, host.clientHeight);
      p.pixelDensity(Math.min(2, devicePixelRatio || 1));
      if (userSetup) await userSetup.call(p);
    };
    p.windowResized = () => { p.resizeCanvas(host.clientWidth, host.clientHeight); p.onResize?.(); };
  }, host);
  return { p: inst, destroy: () => inst.remove() };
}
