#ifdef GL_ES
precision mediump float;
#endif

/** @resolution */
uniform vec2 u_resolution;

/** @default 44 */
uniform float u_size;

/** @color @default #000000 */
uniform vec3 u_line_color;

/** @default 0.075 */
uniform float u_alpha;

void main() {
  vec2 pixel = gl_FragCoord.xy;
  vec2 grid = mod(pixel, u_size);
  float vertical = step(grid.x, 1.0);
  float horizontal = step(grid.y, 1.0);
  float line = min(1.0, vertical + horizontal);
  gl_FragColor = vec4(u_line_color, line * u_alpha);
}
