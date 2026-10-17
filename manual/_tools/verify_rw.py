# -*- coding: utf-8 -*-
"""옹벽 v5.1.0 독립 검증 — KDS 11 80 05 · KDS 11 60 00 (2025-12-24) 규칙을 파이썬으로 따로 옮겨
   index.html 에 내장된 RWENG(node 실행)과 무작위 · 경계값 입력으로 대조한다.
   실행: python3 manual/_tools/verify_rw.py index.html [N] [--inject]"""
import sys, json, math, random, re, subprocess, os, tempfile
SRC = open(sys.argv[1], encoding='utf-8').read()
N = next((int(a) for a in sys.argv[2:] if a.isdigit()), 20000)
R = math.radians

def ka_r(phi, b):
    if b >= phi: return float('nan')
    cb, cf = math.cos(R(b)), math.cos(R(phi)); s = math.sqrt(cb*cb - cf*cf)
    return cb*(cb - s)/(cb + s)
def ka_c(phi, d, t, b):
    if b >= phi: return float('nan')
    f, d, t, b = R(phi), R(d), R(t), R(b)
    root = math.sqrt(math.sin(f+d)*math.sin(f-b)/(math.cos(d+t)*math.cos(t-b)))
    return math.cos(f-t)**2/(math.cos(t)**2*math.cos(d+t)*(1+root)**2)
CFG = {'tri': 1/3, 'qfull': False, 'trap_only': False, 'fsp_perm': 2.5}
def qdist(V, Mr, Mo, B):
    x = (Mr-Mo)/V; e = B/2-x
    if x <= 0 or x >= B: return x, e, float('inf')
    if abs(e) <= B/6 or CFG['trap_only']: return x, e, V/B*(1+6*abs(e)/B)
    return x, e, 2*V/(3*(B/2-abs(e)))
def judge(V, H, Mr, Mo, B, mu, qa, Df):
    x, e, qm = qdist(V, Mr, Mo, B)
    return {'Fo': Mr/Mo, 'Fs': mu*V/H, 'qmax': qm, 'all': Mr/Mo >= 2.0 and mu*V/H >= 1.5 and qm <= qa and Df >= 1.0}
def gravity(p):
    H, B, a = p['H'], p['B'], p['a']; th = math.degrees(math.atan((B-a)/H)); d = 2/3*p['phi']
    K = ka_c(p['phi'], d, th, p['beta']); psi = R(d+th)
    Ps = 0.5*K*p['gs']*H*H; Pq = K*p['q']*H*math.cos(R(th))/math.cos(R(th-p['beta']))
    Ar, At = a*H, 0.5*(B-a)*H; W = p['gc']*(Ar+At)
    xw = (Ar*a/2 + At*(a+(B-a)*CFG['tri']))/(Ar+At)
    V = W + (Ps+Pq)*math.sin(psi); Hh = (Ps+Pq)*math.cos(psi)
    Mr = W*xw + Ps*math.sin(psi)*(B-(B-a)/3) + Pq*math.sin(psi)*(B-(B-a)/2)
    Mo = Ps*math.cos(psi)*H/3 + Pq*math.cos(psi)*H/2
    if CFG['qfull']: V += p['q']*B; Mr += p['q']*B*B/2
    return judge(V, Hh, Mr, Mo, B, p['mu'], p['qa'], p['Df'])
def cantilever(p):
    H, B, bt, tf, tw = p['H'], p['B'], p['bt'], p['tf'], p['tw']; fw = B-bt-tw; tb = math.tan(R(p['beta']))
    Hv = H+tf+fw*tb; K = ka_r(p['phi'], p['beta']); Ps = 0.5*K*p['gs']*Hv*Hv; Pq = K*p['q']*Hv
    sb, cb = math.sin(R(p['beta'])), math.cos(R(p['beta']))
    qw = p['q']*(B if CFG['qfull'] else fw); qx = B/2 if CFG['qfull'] else bt+tw+fw/2
    parts = [(p['gc']*B*tf, B/2), (p['gc']*tw*H, bt+tw/2), (p['gs']*fw*H, bt+tw+fw/2), (0.5*p['gs']*fw*fw*tb, bt+tw+2*fw/3), (qw, qx), ((Ps+Pq)*sb, B)]
    V = sum(w for w, _ in parts); Mr = sum(w*x for w, x in parts)
    Mo = Ps*cb*Hv/3 + Pq*cb*Hv/2
    return judge(V, (Ps+Pq)*cb, Mr, Mo, B, p['mu'], p['qa'], p['Df'])
def anchored(p):
    perm = p['use'] == 'perm'; fsp = CFG['fsp_perm'] if perm else 1.5; fu, fy = (0.60, 0.75) if perm else (0.65, 0.80)
    K = ka_r(p['phi'], p['beta']); Ea = (0.5*K*p['gs']*p['H']**2 + K*p['q']*p['H'])*math.cos(R(p['beta']))
    n = max(1, math.floor(p['H']/p['sv'])); Treq = Ea*p['sh']/(n*math.cos(R(p['ang'])))
    Pu = math.pi*p['D']/1000*min(p['La'], 10)*p['tau']; Tp = Pu/fsp; Tt = p['nstr']*min(fu*p['Tu1'], fy*p['Ty1'])
    ok = Treq <= p['T'] and p['T'] <= Tp and p['T'] <= Tt and p['Lf'] >= 4 and p['La'] >= 4 and p['ang'] >= 10
    return {'Treq': Treq, 'Ta': min(Tp, Tt), 'all': ok}

def cases(N):
    random.seed(20261017); C = []
    for i in range(N):
        k = i % 3; phi = random.choice([25, 28, 30, 32, 35, 38]); beta = random.choice([0, 0, 0, 5, 10, 15, 20])
        base = {'gs': random.choice([17, 18, 19, 20]), 'phi': phi, 'beta': beta, 'q': random.choice([0, 10, 15, 20]), 'mu': random.choice([0.4, 0.5, 0.55, 0.6]),
                'qa': random.choice([100, 150, 200, 300, 400]), 'Df': random.choice([0.5, 0.99, 1.0, 1.5]), 'gc': random.choice([23, 23.5, 24.5]), 'c': 0}
        if k == 0:
            H = round(random.uniform(1.5, 6), 2); B = round(H*random.uniform(0.4, 0.9), 2); a = round(random.uniform(0.3, min(0.8, B-0.1)), 2)
            C.append(('gravity', dict(base, H=H, B=B, a=a)))
        elif k == 1:
            H = round(random.uniform(2, 8), 2); B = round(H*random.uniform(0.45, 0.8), 2); tw = round(random.uniform(0.25, 0.6), 2); bt = round(random.uniform(0.3, B/3), 2)
            C.append(('cantilever', dict(base, H=H, B=B, tw=tw, bt=bt, tf=round(random.uniform(0.4, 0.9), 2))))
        else:
            st = random.choice([(261, 222), (183, 156)])
            C.append(('anchored', {'H': round(random.uniform(3, 12), 1), 'ang': random.choice([5, 9.9, 10, 15, 25, 30]), 'sh': random.choice([1.5, 2, 2.5, 3]), 'sv': random.choice([1.5, 2, 2.5, 3]),
                'T': random.choice([80, 100, 150, 200, 300]), 'La': random.choice([3, 3.99, 4, 6, 8, 10, 12]), 'Lf': random.choice([3, 3.99, 4, 5, 7]), 'D': random.choice([100, 115, 135, 150]),
                'tau': random.choice([60, 100, 150, 200, 300]), 'gs': base['gs'], 'phi': phi, 'beta': beta, 'q': base['q'], 'use': random.choice(['perm', 'temp']),
                'nstr': random.choice([2, 3, 4, 5, 6]), 'Tu1': st[0], 'Ty1': st[1]}))
    return C

def run_js(C):
    eng = re.search(r'/\* RWENG v[\s\S]*?\}\)\(typeof window !== \'undefined\' \? window : globalThis\);', SRC).group(0)
    js = 'var window={};' + eng + '\nconst E=window.RWENG;const C=' + json.dumps(C) + ';\nconsole.log(JSON.stringify(C.map(([k,p])=>{const r=E[k](p);return k==="anchored"?{Treq:r.Treq,Ta:r.Ta,all:r.allPass}:{Fo:r.Fs_o,Fs:r.Fs_s,qmax:isFinite(r.qmax)?r.qmax:null,all:r.allPass};})));'
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f: f.write(js); fn = f.name
    out = subprocess.run(['node', fn], capture_output=True, text=True); os.unlink(fn)
    return json.loads(out.stdout)

def close(a, b):
    if a is None or b is None or (isinstance(a, float) and (math.isnan(a) or math.isinf(a))):
        return (a is None or not math.isfinite(a)) == (b is None or (isinstance(b, float) and not math.isfinite(b)))
    return abs(a-b) <= 1e-7*max(1, abs(a))
def compare(C, J):
    mis = []
    for (k, p), j in zip(C, J):
        r = {'gravity': gravity, 'cantilever': cantilever, 'anchored': anchored}[k](p)
        keys = ['Treq', 'Ta'] if k == 'anchored' else ['Fo', 'Fs', 'qmax']
        bad = r['all'] != j['all'] or any(not close(r[x] if not (x == 'qmax' and math.isinf(r[x])) else None, j[x]) for x in keys)
        if bad: mis.append((k, p, r, j))
    return mis

C = cases(N); J = run_js(C); mis = compare(C, J)
res = {'cases': len(C), 'by_kind': {k: sum(1 for c in C if c[0] == k) for k in ('gravity', 'cantilever', 'anchored')}, 'mismatch': len(mis), 'examples': [str(m)[:300] for m in mis[:3]]}
if '--inject' in sys.argv:
    inj = {}
    for name, key, val in [('중력식 삼각형 도심 2/3', 'tri', 2/3), ('상재하중 전폭 가산', 'qfull', True), ('e > B/6 사다리꼴식', 'trap_only', True), ('영구앵커 인발 Fs 2.0', 'fsp_perm', 2.0)]:
        old = CFG[key]; CFG[key] = val; m = compare(C, J); CFG[key] = old
        inj[name] = {'mismatch': len(m), 'caught': len(m) > 0}
    res['inject'] = inj
print(json.dumps(res, ensure_ascii=False, indent=1))
