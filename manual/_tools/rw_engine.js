/* RWENG v5.1.0 — 옹벽 안정 검토 순수 엔진 (DOM 무관)
   근거 : KDS 11 80 05 콘크리트옹벽 (2025-12-24) · KDS 11 60 00 앵커 설계기준 (2025-12-24) — kcsc.re.kr 원문 대조 2026-10-17
   - 안정검토는 사용하중 · 기준안전율(표 4.4-1 평상시) : 활동 1.5 · 전도 2.0 · 지지력 3.0(허용지지력 qa = qu/3로 입력)
   - 토압 : 중력식 Coulomb(실제 배면 · δ = 2/3φ) · 캔틸레버 뒷굽 연직 가상배면 Rankine (1.7.3(2))
   - 앵커 : 극한인발력 안전율 가설 1.5 · 영구 2.5 (표 4.2-2) · 허용인장력 (표 4.2-3) · 설계앵커력 = 최소 허용앵커력 (4.3(3)) */
(function(root){
  var D2R = Math.PI / 180;
  function kaRankine(phi, beta){
    var b = (beta || 0) * D2R, f = phi * D2R, cb = Math.cos(b), cf = Math.cos(f);
    if(beta >= phi) return NaN;
    var s = Math.sqrt(cb * cb - cf * cf);
    return cb * (cb - s) / (cb + s);
  }
  function kaCoulomb(phi, delta, theta, beta){   // theta : 배면의 연직 경사각(뒤채움 쪽으로 기울면 +)
    var f = phi * D2R, d = delta * D2R, t = theta * D2R, b = (beta || 0) * D2R;
    if(beta >= phi) return NaN;
    var num = Math.pow(Math.cos(f - t), 2);
    var root = Math.sqrt(Math.sin(f + d) * Math.sin(f - b) / (Math.cos(d + t) * Math.cos(t - b)));
    return num / (Math.pow(Math.cos(t), 2) * Math.cos(d + t) * Math.pow(1 + root, 2));
  }
  function bearing(SV, Mr, Mo, B){
    var xR = (Mr - Mo) / SV, e = B / 2 - xR, ae = Math.abs(e), qmax, qmin, tri = false;
    if(xR <= 0 || xR >= B){ qmax = Infinity; qmin = 0; tri = true; }
    else if(ae <= B / 6){ qmax = SV / B * (1 + 6 * ae / B); qmin = SV / B * (1 - 6 * ae / B); }
    else { qmax = 2 * SV / (3 * (B / 2 - ae)); qmin = 0; tri = true; }   // 삼각형 분포(B/6 초과)
    return {xR: xR, e: e, qmax: qmax, qmin: qmin, tri: tri};
  }
  var FS = {slide: 1.5, over: 2.0, bear: 3.0, Df: 1.0};   // KDS 11 80 05 표 4.4-1 평상시 · 4.4.1(4)

  function finish(r){
    r.Fs_o = r.Mr / r.Mo; r.Fs_s = r.mu * r.SV / r.SH;
    var b = bearing(r.SV, r.Mr, r.Mo, r.B);
    r.xR = b.xR; r.e = b.e; r.qmax = b.qmax; r.qmin = b.qmin; r.tri = b.tri;
    r.e_allow = r.B / 6; r.e_ok = Math.abs(r.e) <= r.B / 6;   // 참고 — 전면 압축 여부
    r.pass_o = r.Fs_o >= FS.over; r.pass_s = r.Fs_s >= FS.slide;
    r.pass_b = isFinite(r.qmax) && r.qmax <= r.qa; r.pass_d = r.Df >= FS.Df;
    r.allPass = r.pass_o && r.pass_s && r.pass_b && r.pass_d;
    r.special = r.c > 0;   // 점착력 고려 = 특수설계(4.3.1①)
    return r;
  }

  /* 중력식 — 전면 연직 · 배면 경사(상단폭 a → 저면폭 B) · 발끝 기준 */
  function gravity(p){
    var H = p.H, B = p.B, a = p.a, th = Math.atan((B - a) / H) / D2R, dl = 2 / 3 * p.phi;
    var Ka = kaCoulomb(p.phi, dl, th, p.beta), psi = (dl + th) * D2R;
    var cq = Math.cos(th * D2R) / Math.cos((th - (p.beta || 0)) * D2R);
    var Ps = 0.5 * Ka * p.gs * H * H, Pq = Ka * p.q * H * cq;   // 상재하중 = 등가 흙두께(MANMIN 적용)
    var Phs = Ps * Math.cos(psi), Pvs = Ps * Math.sin(psi), Phq = Pq * Math.cos(psi), Pvq = Pq * Math.sin(psi);
    var xs = B - (B - a) / 3, xq = B - (B - a) / 2;               // 배면 위 작용점(H/3 · H/2)
    var Ar = a * H, At = 0.5 * (B - a) * H, Ww = p.gc * (Ar + At);
    var xw = (Ar * a / 2 + At * (a + (B - a) / 3)) / (Ar + At);   // 삼각형 도심 a + (B−a)/3
    var r = {kind: 'gravity', H: H, B: B, a: a, gc: p.gc, gs: p.gs, phi: p.phi, beta: p.beta || 0, c: p.c || 0, mu: p.mu, qa: p.qa, q: p.q, Df: p.Df,
      theory: 'Coulomb', theta: th, delta: dl, Ka: Ka, Pa: Ps + Pq, Ea: Phs + Phq, Pv: Pvs + Pvq, Ww: Ww, xw: xw};
    r.SV = Ww + Pvs + Pvq; r.SH = Phs + Phq;
    r.Mr = Ww * xw + Pvs * xs + Pvq * xq; r.Mo = Phs * H / 3 + Phq * H / 2;
    r.ya = r.Mo / r.SH;
    return finish(r);
  }

  /* 캔틸레버식(역T형) — 뒷굽 끝 연직 가상배면 Rankine · 상재하중은 뒷굽 위만 */
  function cantilever(p){
    var H = p.H, B = p.B, bt = p.bt, tf = p.tf, tw = p.tw, fw = B - bt - tw, tb = Math.tan((p.beta || 0) * D2R);
    var Hv = H + tf + fw * tb, Ka = kaRankine(p.phi, p.beta), cb = Math.cos((p.beta || 0) * D2R), sb = Math.sin((p.beta || 0) * D2R);
    var Ps = 0.5 * Ka * p.gs * Hv * Hv, Pq = Ka * p.q * Hv;
    var W = [
      ['기초판', p.gc * B * tf, B / 2],
      ['벽체', p.gc * tw * H, bt + tw / 2],
      ['뒷굽 위 흙', p.gs * fw * H, bt + tw + fw / 2],
      ['경사 흙', 0.5 * p.gs * fw * fw * tb, bt + tw + 2 * fw / 3],
      ['상재하중(뒷굽)', p.q * fw, bt + tw + fw / 2],
      ['토압 연직분력', (Ps + Pq) * sb, B]
    ];
    var SV = 0, Mr = 0; W.forEach(function(w){ SV += w[1]; Mr += w[1] * w[2]; });
    var Phs = Ps * cb, Phq = Pq * cb;
    var r = {kind: 'cantilever', H: H, B: B, bt: bt, tf: tf, tw: tw, fw: fw, Hv: Hv, gc: p.gc, gs: p.gs, phi: p.phi, beta: p.beta || 0, c: p.c || 0, mu: p.mu, qa: p.qa, q: p.q, Df: p.Df,
      theory: 'Rankine', Ka: Ka, Pa: Ps + Pq, Ea: Phs + Phq, Pv: (Ps + Pq) * sb, W: W};
    r.SV = SV; r.SH = Phs + Phq; r.Mr = Mr; r.Mo = Phs * Hv / 3 + Phq * Hv / 2; r.ya = r.Mo / r.SH;
    return finish(r);
  }

  /* 앵커식 — 앵커 1본 기준 · 설계앵커력 T 를 필요앵커력 · 허용인발력 · 허용인장력과 비교 */
  var USE = {temp: {nm: '가설앵커(2년 미만)', fsp: 1.5, fu: 0.65, fy: 0.80}, perm: {nm: '영구앵커(2년 이상)', fsp: 2.5, fu: 0.60, fy: 0.75}};
  function anchored(p){
    var u = USE[p.use] || USE.perm, Ka = kaRankine(p.phi, p.beta), cb = Math.cos((p.beta || 0) * D2R);
    var Pa = 0.5 * Ka * p.gs * p.H * p.H + Ka * p.q * p.H, Ea = Pa * cb;
    var n = Math.max(1, Math.floor(p.H / p.sv)), ca = Math.cos(p.ang * D2R);
    var Treq = Ea * p.sh / (n * ca);
    var Le = Math.min(p.La, 10), Pu = Math.PI * p.D / 1000 * Le * p.tau;   // 정착장 10 m 초과분은 인발력 증가 없음
    var Tpull = Pu / u.fsp, Tten = p.nstr * Math.min(u.fu * p.Tu1, u.fy * p.Ty1), Ta = Math.min(Tpull, Tten);
    var r = {kind: 'anchored', H: p.H, ang: p.ang, sh: p.sh, sv: p.sv, T: p.T, La: p.La, Lf: p.Lf, D: p.D, tau: p.tau, gs: p.gs, phi: p.phi, beta: p.beta || 0, q: p.q,
      use: p.use, useNm: u.nm, fsp: u.fsp, fu: u.fu, fy: u.fy, nstr: p.nstr, Tu1: p.Tu1, Ty1: p.Ty1,
      Ka: Ka, Pa: Pa, Ea: Ea, n_rows: n, Treq: Treq, Le: Le, Pu: Pu, Tpull: Tpull, Tten: Tten, Ta: Ta,
      Th: p.T * ca, Tv: p.T * Math.sin(p.ang * D2R)};
    r.pass_req = Treq <= p.T; r.pass_pull = p.T <= Tpull; r.pass_ten = p.T <= Tten;
    r.pass_Lf = p.Lf >= 4.0; r.pass_La = p.La >= 4.0; r.pass_ang = p.ang >= 10;
    r.allPass = r.pass_req && r.pass_pull && r.pass_ten && r.pass_Lf && r.pass_La && r.pass_ang;
    r.Lf_need = Math.max(1.5, 0.15 * p.H);   // 가상활동면에서 더할 길이(도면에서 확인)
    return r;
  }
  root.RWENG = {version: '5.1.0', kaRankine: kaRankine, kaCoulomb: kaCoulomb, bearing: bearing, FS: FS, USE: USE,
    gravity: gravity, cantilever: cantilever, anchored: anchored};
})(typeof window !== 'undefined' ? window : globalThis);
