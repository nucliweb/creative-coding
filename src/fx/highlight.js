// Tiny highlighter for slide snippets (JS, Java/Processing, GLSL, WGSL). Good enough for a projector.
const KW = /\b(void|function|const|let|var|return|if|else|for|new|float|int|vec2|vec3|vec4|uniform|in|out|fn|struct|var|let|precision|highp|mediump|import|export|from|class|this|true|false|f32|u32|array|@compute|@workgroup_size|@builtin|@group|@binding|storage|read_write)\b/g;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function highlight(code) {
  const out = [];
  const re = /(\/\/[^\n]*)|("[^"]*"|'[^']*')|(@?\b[a-zA-Z_]\w*\b)(\s*\()?|(\b\d+\.?\d*\b)/g;
  let i = 0, m;
  while ((m = re.exec(code))) {
    out.push(esc(code.slice(i, m.index)));
    if (m[1]) out.push(`<span class="tk-com">${esc(m[1])}</span>`);
    else if (m[2]) out.push(`<span class="tk-str">${esc(m[2])}</span>`);
    else if (m[3]) {
      KW.lastIndex = 0;
      const cls = KW.test(m[3]) ? 'tk-kw' : m[4] ? 'tk-fn' : '';
      out.push(cls ? `<span class="${cls}">${esc(m[3])}</span>` : esc(m[3]));
      if (m[4]) out.push(esc(m[4]));
    } else if (m[5]) out.push(`<span class="tk-num">${m[5]}</span>`);
    i = re.lastIndex;
  }
  out.push(esc(code.slice(i)));
  return out.join('');
}

export function codeBlock(code) {
  return `<pre class="code">${highlight(code.replace(/^\n/, '').replace(/\s+$/, ''))}</pre>`;
}
