// Draw a link thread through the section title blocks. The page scrolls
// normally; the line only reveals itself with scroll progress.
const main = document.querySelector('main.sheets');
const svg = main?.querySelector('.thread');
if (svg) {
  const track = svg.querySelector('.thread-track');
  const line = svg.querySelector('.thread-line');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let nodes = [];
  let length = 0;
  const layout = () => {
    const top = main.getBoundingClientRect().top;
    const points = [...main.querySelectorAll('[data-node]')].map((node) => {
      const box = node.closest('.sheet-tag').getBoundingClientRect();
      return box.top - top + box.height / 2;
    });
    svg.querySelectorAll('circle').forEach((circle) => circle.remove());
    if (!points.length) return;
    // Swing out between nodes, then return to the gutter at each title block.
    let d = `M20 40`;
    let y0 = 40;
    points.forEach((y, index) => {
      const x = index % 2 ? 4 : 36;
      const mid = (y0 + y) / 2;
      d += ` C20 ${mid - 40} ${x} ${mid - 60} ${x} ${mid} S20 ${y - 30} 20 ${y}`;
      y0 = y;
    });
    track.setAttribute('d', d);
    line.setAttribute('d', d);
    length = line.getTotalLength();
    line.style.strokeDasharray = `${length}`;
    nodes = points.map((y) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '20');
      circle.setAttribute('cy', String(y));
      circle.setAttribute('r', '6');
      svg.append(circle);
      return {circle, y};
    });
    svg.classList.add('ready');
    draw();
  };
  const draw = () => {
    const reach = reduced.matches ? Infinity : window.innerHeight * 0.55 - main.getBoundingClientRect().top;
    const drawnTo = Math.min(reach, main.offsetHeight);
    // Map the vertical reach to path length by sampling: the path is monotonic in y.
    let low = 0, high = length;
    for (let i = 0; i < 18; i++) {
      const mid = (low + high) / 2;
      if (line.getPointAtLength(mid).y < drawnTo) low = mid; else high = mid;
    }
    line.style.strokeDashoffset = String(length - low);
    for (const node of nodes) node.circle.classList.toggle('on', node.y <= drawnTo);
  };
  let queued = false;
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; draw(); });
  }, {passive: true});
  new ResizeObserver(layout).observe(main);
  window.addEventListener('load', layout);
}
