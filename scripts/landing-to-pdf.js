const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const W = 1440;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: 900 } });
  // fetch Google Fonts through curl (proxy CA bundle) so the real fonts are embedded
  await p.route(/fonts\.(googleapis|gstatic)\.com/, async route => {
    const url = route.request().url();
    const body = execFileSync('curl', ['-sSL', '--cacert', '/root/.ccr/ca-bundle.crt', '-A', UA, url], { maxBuffer: 1 << 26 });
    await route.fulfill({ status: 200, body, headers: { 'content-type': url.includes('gstatic') ? 'font/woff2' : 'text/css', 'access-control-allow-origin': '*' } });
  });
  await p.goto('file://' + require('path').join(__dirname, '..', 'proactive-cybersecurity-landing.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1500);

  const H = await p.evaluate(() => {
    const css = `
      *,*::before,*::after{animation:none!important;transition:none!important}
      html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;scroll-behavior:auto}
      .topbar,.side,.totop,.progress,.scrolldown,.marquee,.hero .cur,.toggle{display:none!important}
      .r{opacity:1!important;transform:none!important;filter:none!important}
      .slide{min-height:0;break-before:page;break-inside:avoid;padding:60px 90px}
      .slide:first-of-type{break-before:auto}
      .slide+.slide::before{display:none}
      .pane li,.owi{opacity:1!important}
      .step p{max-height:none!important;opacity:1!important;margin-top:6px}
      .step{border-color:var(--line)!important;background:rgba(18,26,46,.55)!important}
      .tl.good i{transform:none!important}
      .bar i{width:var(--w)!important}
      /* services: show all four panes */
      #svcTabs{display:block}
      #svcTabs .tablist{display:none}
      #svcTabs>.card{background:none;border:0;padding:0;backdrop-filter:none;display:grid;grid-template-columns:1fr 1fr;gap:18px}
      #svcTabs>.card::before{display:none}
      #svcTabs .pane{display:block!important;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px}
      #svcTabs .pane h3{font-size:20px;margin-bottom:12px}
      #svcTabs .pane ul{gap:8px}
      #svcTabs .pane li{padding:9px 12px;font-size:14px}
      /* owasp: both lists side by side */
      #owSeg{display:none}
      .owcols{display:grid;grid-template-columns:1fr 1fr;gap:22px}
      .owcols h3{display:flex;align-items:center;gap:10px;font-size:19px;margin-bottom:6px}
      .owcols h3 svg{width:22px;height:22px;color:var(--red2)}
      .owcols .ow{grid-template-columns:1fr;gap:7px}
      .owcols .owdesc{font-size:13px;margin-bottom:10px}
      .owcols .owi{padding:7px 12px;font-size:13px}
      footer{break-before:avoid}
      .stat .num{background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;color:#ffd9de!important;-webkit-text-fill-color:#ffd9de}
    `;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    document.querySelectorAll('.slide').forEach(s => s.classList.add('active'));
    document.querySelectorAll('.r').forEach(e => e.classList.add('in'));
    document.getElementById('typed').textContent = 'ДИЖИТАЛ БИЗНЕСИЙН ШИНЭ ЭРСДЭЛЭЭС ХАМГААЛАХ';
    document.querySelectorAll('[data-count]').forEach(el => {
      const t = parseFloat(el.dataset.count), d = +(el.dataset.dec || 0);
      el.textContent = (el.dataset.prefix || '') + (el.dataset.sep ? t.toLocaleString('en-US') : t.toFixed(d)) + (el.dataset.suffix || '');
    });
    const ts = document.getElementById('tsec'); ts.textContent = '22'; ts.style.color = 'var(--red2)';
    document.querySelector('#timer .fg').style.strokeDashoffset = 565.5 * (1 - 22 / 60);
    document.querySelectorAll('.svc').forEach(x => x.classList.add('hacked'));
    document.querySelectorAll('.node').forEach((n, i) => n.classList.toggle('on', i === 0));
    // OWASP: rebuild as two columns with both lists
    const holder = document.getElementById('owList').parentElement;
    const btns = [...document.querySelectorAll('#owSeg button')];
    const cols = document.createElement('div'); cols.className = 'owcols';
    const icons = { m: 'i-phone', w: 'i-globe' }, names = { m: 'Мобайл — OWASP Mobile Top 10', w: 'Веб — OWASP Top 10' };
    for (const k of ['m', 'w']) {
      btns.find(b => b.dataset.k === k).click();
      const col = document.createElement('div');
      col.innerHTML = `<h3><svg><use href="#${icons[k]}"/></svg>${names[k]}</h3><p class="owdesc">${document.getElementById('owDesc').textContent}</p><div class="ow">${document.getElementById('owList').innerHTML}</div>`;
      cols.appendChild(col);
    }
    document.getElementById('owDesc').remove(); document.getElementById('owList').remove();
    holder.appendChild(cols);
    scrollTo(0, 0);
    const secs = [...document.querySelectorAll('.slide')];
    const foot = document.querySelector('footer').offsetHeight;
    const hs = secs.map(s => s.offsetHeight);
    const Hp = Math.max(...hs.slice(0, -1), hs[hs.length - 1] + foot);
    secs.forEach((s, i) => s.style.minHeight = (i === secs.length - 1 ? Hp - foot : Hp) + 'px');
    // canvas: sized to one page so the network background prints on each page
    return { Hp, hs };
  });
  console.log(H);
  await p.setViewportSize({ width: W, height: H.Hp });
  await p.waitForTimeout(800);
  await p.pdf({ path: require('path').join(__dirname, '..', 'proactive-cybersecurity-landing.pdf'), width: W + 'px', height: H.Hp + 'px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await b.close();
})();
