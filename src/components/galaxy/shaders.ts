import * as THREE from "three";
import type { PlanetLook } from "@/lib/galaxy/planets";

// ---------------------------------------------------------------------------
// Galaxy star field: soft round points, sized by distance, additively blended.
// ---------------------------------------------------------------------------

export function galaxyPointsMaterial(pixelRatio: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: pixelRatio }, uScale: { value: 60 } },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uPixelRatio;
      uniform float uScale;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(size * uScale * uPixelRatio / -mv.z, 1.0, 9.0 * uPixelRatio);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** A radial-gradient sprite texture for glows (galactic core, stars). */
export function glowTexture(inner = "rgba(255,240,210,1)", mid = "rgba(255,200,140,0.35)") {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.25, mid);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// Procedural planet
// ---------------------------------------------------------------------------

/*
 * 3D simplex noise by Ian McEwan and Stefan Gustavson (Ashima Arts),
 * https://github.com/ashima/webgl-noise, MIT License.
 */
const SIMPLEX_3D = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
float fbm(vec3 p) {
  float sum = 0.0, amp = 0.5;
  for (int i = 0; i < 5; i++) { sum += amp * snoise(p); p *= 2.03; amp *= 0.5; }
  return sum * 0.5 + 0.5;
}
`;

const SPHERE_VERTEX = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vPos = normalize(position);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const c = (hex: string) => new THREE.Color(hex);

export function planetSurfaceMaterial(look: PlanetLook) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSeed: { value: (look.seed % 1000) * 0.137 },
      uDetail: { value: look.detail },
      uWater: { value: look.water },
      uIce: { value: look.ice },
      uLights: { value: look.lights },
      uLava: { value: look.lava },
      uDeep: { value: c(look.palette.deep) },
      uShallow: { value: c(look.palette.shallow) },
      uLow: { value: c(look.palette.low) },
      uMid: { value: c(look.palette.mid) },
      uHigh: { value: c(look.palette.high) },
      uPeak: { value: c(look.palette.peak) },
      uLightsColor: { value: c(look.lightsColor) },
      uSunDir: { value: new THREE.Vector3(1, 0.35, 0.6).normalize() },
    },
    vertexShader: SPHERE_VERTEX,
    fragmentShader: /* glsl */ `
      ${SIMPLEX_3D}
      uniform float uSeed, uDetail, uWater, uIce, uLights, uLava;
      uniform vec3 uDeep, uShallow, uLow, uMid, uHigh, uPeak, uLightsColor, uSunDir;
      varying vec3 vPos;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      void main() {
        vec3 n = normalize(vNormalW);
        vec3 p = vPos * uDetail + vec3(uSeed);
        float h = fbm(p);
        // fbm clusters around 0.5; map the water share to a threshold on that spread.
        float sea = 0.5 + (uWater - 0.5) * 0.5;
        vec3 col;
        bool land = h > sea;
        if (!land) {
          col = mix(uDeep, uShallow, smoothstep(sea - 0.3, sea, h));
        } else {
          float t = (h - sea) / max(1.0 - sea, 0.001);
          col = t < 0.33 ? mix(uLow, uMid, t / 0.33)
              : t < 0.66 ? mix(uMid, uHigh, (t - 0.33) / 0.33)
              : mix(uHigh, uPeak, (t - 0.66) / 0.34);
        }
        // Polar ice
        float cap = 1.0 - uIce * 0.55 + (snoise(p * 3.0) * 0.06);
        float ice = smoothstep(cap, cap + 0.04, abs(vPos.y)) * step(0.001, uIce);
        col = mix(col, vec3(0.93, 0.96, 1.0), ice);

        float diffuse = max(dot(n, uSunDir), 0.0);
        vec3 lit = col * (0.07 + 0.93 * diffuse);
        // Sun glint on open water
        if (!land) {
          float spec = pow(max(dot(reflect(-uSunDir, n), normalize(vViewDir)), 0.0), 48.0);
          lit += vec3(1.0, 0.95, 0.85) * spec * 0.55 * (1.0 - ice);
        }

        // Night-side city lights on land
        float night = smoothstep(0.15, -0.05, dot(n, uSunDir));
        float cities = smoothstep(0.62, 0.8, snoise(vPos * 38.0 + uSeed)) * (land ? 1.0 : 0.0);
        lit += uLightsColor * cities * uLights * night * 1.4;

        // Molten cracks
        float ridge = 1.0 - abs(snoise(p * 2.2 + 7.0));
        float lava = smoothstep(0.93, 0.99, ridge) * uLava * (land ? 1.0 : 0.6);
        lit += vec3(1.0, 0.35, 0.08) * lava * (0.6 + 0.8 * night);

        gl_FragColor = vec4(lit, 1.0);
      }
    `,
  });
}

export function planetCloudsMaterial(look: PlanetLook) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSeed: { value: (look.seed % 1000) * 0.291 },
      uCover: { value: look.clouds },
      uColor: { value: c(look.cloudColor) },
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(1, 0.35, 0.6).normalize() },
    },
    vertexShader: SPHERE_VERTEX,
    fragmentShader: /* glsl */ `
      ${SIMPLEX_3D}
      uniform float uSeed, uCover, uTime;
      uniform vec3 uColor, uSunDir;
      varying vec3 vPos;
      varying vec3 vNormalW;
      void main() {
        vec3 p = vPos * 2.6 + vec3(uSeed, uTime * 0.02, 0.0);
        float n = fbm(p + fbm(p * 0.7));
        float a = smoothstep(1.0 - uCover * 0.75, 1.15 - uCover * 0.7, n) * step(0.001, uCover);
        float diffuse = max(dot(normalize(vNormalW), uSunDir), 0.0);
        gl_FragColor = vec4(uColor * (0.08 + 0.92 * diffuse), a * 0.9);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}

export function atmosphereMaterial(look: PlanetLook) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: c(look.atmosphere) }, uStrength: { value: look.atmosphereStrength } },
    vertexShader: SPHERE_VERTEX,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      void main() {
        float rim = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewDir))), 3.0);
        gl_FragColor = vec4(uColor * rim * uStrength * 1.6, rim * uStrength);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
}

/** A star's surface: bright core, darker limb, slowly churning granulation. */
export function starMaterial(hex: string) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: c(hex) }, uTime: { value: 0 } },
    vertexShader: SPHERE_VERTEX,
    fragmentShader: /* glsl */ `
      ${SIMPLEX_3D}
      uniform vec3 uColor;
      uniform float uTime;
      varying vec3 vPos;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      void main() {
        float mu = max(dot(normalize(vNormalW), normalize(vViewDir)), 0.0);
        float limb = 0.55 + 0.45 * pow(mu, 0.6);
        float grain = fbm(vPos * 6.0 + vec3(0.0, uTime * 0.05, 0.0));
        vec3 col = uColor * limb * (0.85 + 0.3 * grain);
        col += vec3(1.0) * pow(mu, 6.0) * 0.25;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
