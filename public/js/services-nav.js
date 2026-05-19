(function () {
  'use strict';

  var SERVICES = {
    ro: {
      trigger : 'Servicii',
      label   : 'Servicii PlusRent',
      items: [
        { name: 'Chirie Auto',           sub: 'Chișinău · de la €15/zi', badge: '€15/zi',  car: true,  url: '/ro/cars'          },
        { name: 'Șofer Treaz',           sub: 'Chișinău · 150 MDL',      badge: '24/7',    live: true,  url: '/ro/sofer-treaz'   },
        { name: 'Transfer Aeroport Chișinău', sub: 'Aeroport KIV · 800 MDL',  badge: 'Premium', live: false, url: '/ro/transfer-chisinau' },
        { name: 'Transfer Aeroport Iași', sub: 'Aeroport IAS · €140',      badge: 'Premium', live: false, url: '/ro/transfer-iasi' },
        { name: 'Șofer Personal',        sub: 'Executiv · 2.000 MDL/zi', badge: 'VIP',     live: false, url: '/ro/sofer-personal' }
      ]
    },
    ru: {
      trigger : 'Услуги',
      label   : 'Услуги PlusRent',
      items: [
        { name: 'Аренда авто',            sub: 'Кишинёв · от €15/день',   badge: '€15/дн',  car: true,  url: '/ru/cars'           },
        { name: 'Трезвый водитель',       sub: 'Кишинёв · 150 MDL',       badge: '24/7',    live: true,  url: '/ru/sofer-treaz'    },
        { name: 'Трансфер аэропорт Кишинёв',  sub: 'Аэропорт KIV · 800 MDL',  badge: 'Premium', live: false, url: '/ru/transfer-chisinau' },
        { name: 'Трансфер аэропорт Яссы',  sub: 'Аэропорт IAS · €140',      badge: 'Premium', live: false, url: '/ru/transfer-iasi'  },
        { name: 'Личный водитель',         sub: 'VIP · 2000 MDL/дн',       badge: 'VIP',     live: false, url: '/ru/sofer-personal' }
      ]
    },
    en: {
      trigger : 'Services',
      label   : 'PlusRent Services',
      items: [
        { name: 'Car Rental',             sub: 'Chișinău · from €15/day', badge: '€15/day', car: true,  url: '/en/cars'           },
        { name: 'Sober Driver',           sub: 'Chișinău · 150 MDL',      badge: '24/7',    live: true,  url: '/en/sofer-treaz'    },
        { name: 'Airport Transfer Chișinău',   sub: 'KIV Airport · 800 MDL',   badge: 'Premium', live: false, url: '/en/transfer-chisinau' },
        { name: 'Airport Transfer Iași',   sub: 'IAS Airport · €140',       badge: 'Premium', live: false, url: '/en/transfer-iasi'  },
        { name: 'Personal Driver',        sub: 'Executive · 2000/day',    badge: 'VIP',     live: false, url: '/en/sofer-personal' }
      ]
    }
  };

  /* Inject CSS for mobile panel — overrides Designesia's header-mobile rules */
  (function() {
    if (document.getElementById('prNavStyle')) return;
    var s = document.createElement('style');
    s.id = 'prNavStyle';
    s.textContent = [
      '#prMegaMenu a { display:flex !important; align-items:center !important; flex-direction:row !important; text-align:left !important; padding:11px 20px !important; border-bottom:1px solid rgba(255,255,255,.07) !important; }',
      '#prMegaMenu a > div:last-of-type { flex:1 !important; min-width:0 !important; text-align:left !important; }',
      '#prMegaMenu a > div > div { text-align:left !important; white-space:normal !important; }',
      '#prMegaMenu a > span { flex-shrink:0 !important; display:inline-block !important; width:auto !important; align-self:center !important; }'
    ].join('');
    document.head.appendChild(s);
  })();

    /* SVG icons by index (0=car,1=sober,2=plane,3=depart,4=person) */
  var ICO = [
    /* 0 car */
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="#f59e0b" style="width:17px;height:17px;min-width:17px;display:block;flex-shrink:0"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>',
    /* 1 sober */
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="#f59e0b" style="width:17px;height:17px;min-width:17px;display:block;flex-shrink:0"><path d="M12 2C8.1 2 5 6.3 5 10.8 5 17 12 22 12 22s7-5 7-11.2C19 6.3 15.9 2 12 2zm0 12a3.3 3.3 0 110-6.6 3.3 3.3 0 010 6.6z"/></svg>',
    /* 2 plane */
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="#f59e0b" style="width:17px;height:17px;min-width:17px;display:block;flex-shrink:0"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011.5 2 1.5 1.5 0 0010 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>',
    /* 3 depart */
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="#f59e0b" style="width:17px;height:17px;min-width:17px;display:block;flex-shrink:0"><path d="M2.5 19h19v2h-19zm7.18-1.73l4.35 1.16 5.31 1.42c.8.21 1.62-.26 1.84-1.06.21-.8-.26-1.62-1.06-1.84l-5.31-1.42-2.76-3.77-1.93-.5.94 3.64-2.89-.77-.74-1.4-1.45-.39.67 2.58 2.03.15z"/></svg>',
    /* 4 person */
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="#f59e0b" style="width:17px;height:17px;min-width:17px;display:block;flex-shrink:0"><path d="M12 12c2.67 0 4.8-2.13 4.8-4.8 0-2.66-2.13-4.8-4.8-4.8-2.66 0-4.8 2.14-4.8 4.8 0 2.67 2.14 4.8 4.8 4.8zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
  ];

  function getLang() { var p = window.location.pathname.split('/')[1]; return SERVICES[p] ? p : 'ro'; }
  function isMobile() { return window.innerWidth < 992; }

  /* ── DESKTOP PANEL ── */
  function buildDesktopPanel(t, cur) {
    var el = document.createElement('div');
    el.id = 'prDropPanel';
    el.style.cssText = 'position:fixed;z-index:9200;width:400px;background:#1C1917;border-radius:14px;border:1px solid rgba(255,255,255,.10);border-top:2px solid #f59e0b;padding:12px 14px 14px;box-shadow:0 24px 70px rgba(0,0,0,.6),0 4px 20px rgba(0,0,0,.4);opacity:0;pointer-events:none;transform:translateY(-6px);transition:opacity .2s ease,transform .2s ease;box-sizing:border-box;';

    var cards = t.items.map(function(item, i) {
      var isCar    = !!item.car;
      var isActive = cur === item.url.split('/').pop();

      /* badge colors */
      var bbg  = isCar  ? 'rgba(245,158,11,.20)' : (item.live ? 'rgba(34,197,94,.15)'   : 'rgba(245,158,11,.12)');
      var bcol = isCar  ? '#f59e0b'               : (item.live ? '#4ade80'               : '#f59e0b');
      var bbrd = isCar  ? '1.5px solid rgba(245,158,11,.5)' : (item.live ? '1px solid rgba(34,197,94,.25)' : '1px solid rgba(245,158,11,.25)');

      /* card highlight */
      var cbg  = isCar ? 'rgba(245,158,11,.07)' : (isActive ? 'rgba(245,158,11,.10)' : 'transparent');
      var cbrd = isCar ? 'rgba(245,158,11,.25)'  : (isActive ? 'rgba(245,158,11,.30)' : 'transparent');
      var cmbottom = isCar ? '8px' : '3px';

      var card = '<a href="' + item.url + '" style="'
        + 'display:flex;align-items:center;gap:10px;'
        + 'padding:9px 10px;border-radius:10px;'
        + 'background:' + cbg + ';'
        + 'border:1px solid ' + cbrd + ';'
        + 'text-decoration:none;color:inherit;'
        + 'margin-bottom:' + cmbottom + ';'
        + 'box-sizing:border-box;"'
        + ' onmouseover="this.style.background=\'rgba(245,158,11,.10)\';this.style.borderColor=\'rgba(245,158,11,.28)\';"'
        + ' onmouseout="this.style.background=\'' + cbg + '\';this.style.borderColor=\'' + cbrd + '\';"'
        + '>'
        + '<div style="width:34px;height:34px;min-width:34px;border-radius:9px;background:rgba(245,158,11,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + ICO[i] + '</div>'
        + '<div style="flex:1;min-width:0;">'
          + '<strong style="display:block;font-size:13px;font-weight:700;color:rgba(255,255,255,.92);line-height:1.3;">' + item.name + '</strong>'
          + '<small style="display:block;font-size:11px;color:rgba(255,255,255,.40);margin-top:2px;">' + item.sub + '</small>'
        + '</div>'
        + '<span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;white-space:nowrap;flex-shrink:0;background:' + bbg + ';color:' + bcol + ';border:' + bbrd + ';">' + item.badge + '</span>'
        + '</a>';

      /* thin separator after car item */
      var sep = isCar ? '<div style="height:1px;background:rgba(255,255,255,.07);margin-bottom:8px;"></div>' : '';
      return card + sep;
    }).join('');

    el.innerHTML =
      '<div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.28);padding-bottom:9px;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:9px;">' + t.label + '</div>'
      + '<div>' + cards + '</div>';

    return el;
  }

  /* ── MOBILE PANEL ── */
  function buildMobilePanel(t, cur) {
    var el = document.createElement('div');
    el.id = 'prMegaMenu';
    el.style.cssText = 'max-height:0;overflow:hidden;transition:max-height .35s ease;box-sizing:border-box;';

    var links = t.items.map(function(item, i) {
      var isCar    = !!item.car;
      var isActive = cur === item.url.split('/').pop();
      var col = isActive ? '#f59e0b' : 'rgba(255,255,255,.82)';
      return '<a href="' + item.url + '" style="'
        + 'display:flex;align-items:center;gap:12px;'
        + 'padding:' + (isCar ? '12px 20px' : '10px 20px') + ';'
        + 'color:' + col + ';'
        + 'text-decoration:none;font-size:14px;font-weight:' + (isActive || isCar ? '700' : '500') + ';'
        + 'border-bottom:1px solid rgba(255,255,255,.07);'
        + 'background:' + (isCar ? 'rgba(245,158,11,.05)' : 'transparent') + ';'
        + 'box-sizing:border-box;'
        + '-webkit-tap-highlight-color:rgba(245,158,11,.2);"'
        + ' ontouchstart="this._b=this.style.background;this.style.background=\'rgba(245,158,11,.14)\';"'
        + ' ontouchend="var e=this;setTimeout(function(){e.style.background=e._b||\'transparent\';},450);"'
        + ' onmouseover="this.style.background=\'rgba(245,158,11,.08)\';"'
        + ' onmouseout="this.style.background=\'' + (isCar ? 'rgba(245,158,11,.05)' : 'transparent') + '\';"'
        + '>'
        + '<div style="width:34px;height:34px;min-width:34px;border-radius:9px;background:rgba(245,158,11,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + ICO[i] + '</div>'
        + '<div style="flex:1;min-width:0;text-align:left;">'
          + '<div style="font-weight:' + (isCar ? '700' : '600') + ';font-size:14px;">' + item.name + '</div>'
          + '<div style="font-size:12px;color:rgba(255,255,255,.45);margin-top:2px;">' + item.sub + '</div>'
        + '</div>'
        + (isCar ? '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:rgba(245,158,11,.2);color:#f59e0b;border:1px solid rgba(245,158,11,.4);">' + item.badge + '</span>' : '')
        + '</a>';
    }).join('');

    el.innerHTML = links;
    return el;
  }

  function positionPanel(trigger, panel) {
    var rect = trigger.getBoundingClientRect();
    var W = 400;
    var left = rect.left + rect.width / 2 - W / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - W - 10));
    panel.style.top  = (rect.bottom + 4) + 'px';
    panel.style.left = left + 'px';
  }

  function init() {
    var li      = document.getElementById('prServicesLi');
    var trigger = document.getElementById('prServicesTrigger');
    var oldMega = document.getElementById('prMegaMenu');
    var oldDrop = document.getElementById('prDropPanel');
    if (!li || !trigger) return;
    if (oldDrop) oldDrop.remove();

    var t   = SERVICES[getLang()];
    var cur = window.location.pathname.replace(/\/+$/, '').split('/').pop();

    /* Fix label */
    var lbl = trigger.querySelector('.pr-services-label');
    if (lbl) {
      lbl.textContent = t.trigger;
      lbl.setAttribute('style',
        'display:inline!important;width:auto!important;font-size:15px!important;'
        + 'font-weight:500!important;text-transform:none!important;border:none!important;'
        + 'line-height:1!important;color:rgba(255,255,255,.88)!important;'
        + 'position:static!important;letter-spacing:normal!important;background:transparent!important;'
      );
    }

    /* Fix chevron */
    var ch = trigger.querySelector('.pr-chevron');
    if (ch) ch.setAttribute('style',
      'width:11px!important;height:11px!important;max-width:11px!important;max-height:11px!important;'
      + 'display:inline-block!important;vertical-align:-2px!important;'
      + 'opacity:.55;transition:transform .22s ease;margin-left:2px;'
    );

    var mobile = isMobile();
    trigger.setAttribute('style',
      'display:' + (mobile ? 'flex' : 'block') + '!important;'
      + (mobile ? 'align-items:center!important;justify-content:center!important;width:100%!important;gap:4px!important;' : '')
      + 'padding:15px 0!important;'
      + 'color:rgba(255,255,255,.88)!important;font-weight:500!important;'
      + 'text-decoration:none!important;cursor:pointer!important;'
      + 'background:transparent!important;border-bottom:none!important;'
    );

    /* Active page gold */
    var urls = t.items.map(function(i){ return i.url; });
    if (urls.indexOf(window.location.pathname.replace(/\/+$/, '')) !== -1 && lbl) {
      lbl.style.setProperty('color', '#f59e0b', 'important');
    }

    var open = false, hideTimer = null, panel;

    if (!mobile) {
      /* ─ DESKTOP ─ */
      if (oldMega) oldMega.remove();
      panel = buildDesktopPanel(t, cur);
      document.body.appendChild(panel);

      function show() {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        open = true;
        positionPanel(trigger, panel);
        panel.style.opacity = '1';
        panel.style.pointerEvents = 'all';
        panel.style.transform = 'translateY(0)';
        trigger.setAttribute('aria-expanded', 'true');
        if (ch)  ch.style.transform = 'rotate(180deg)';
        if (lbl) lbl.style.setProperty('color', '#f59e0b', 'important');
      }
      function hide() {
        open = false; hideTimer = null;
        panel.style.opacity = '0';
        panel.style.pointerEvents = 'none';
        panel.style.transform = 'translateY(-6px)';
        trigger.setAttribute('aria-expanded', 'false');
        if (ch)  ch.style.transform = 'rotate(0deg)';
        if (lbl) lbl.style.setProperty('color', 'rgba(255,255,255,.88)', 'important');
      }
      function scheduleHide() { hideTimer = setTimeout(hide, 120); }

      li.addEventListener('mouseenter',    function(){ if (hideTimer) clearTimeout(hideTimer); show(); });
      li.addEventListener('mouseleave',    scheduleHide);
      panel.addEventListener('mouseenter', function(){ if (hideTimer){ clearTimeout(hideTimer); hideTimer = null; } });
      panel.addEventListener('mouseleave', scheduleHide);
      trigger.addEventListener('click',    function(e){ e.preventDefault(); e.stopPropagation(); open ? hide() : show(); });
      document.addEventListener('click',   function(e){ if (open && !li.contains(e.target) && !panel.contains(e.target)) hide(); });
      document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && open) { hide(); trigger.focus(); } });
      window.addEventListener('scroll',    function(){ if (open) positionPanel(trigger, panel); }, { passive: true });

    } else {
      /* ─ MOBILE ─ */
      if (oldMega) oldMega.remove();
      panel = buildMobilePanel(t, cur);
      li.appendChild(panel);
      trigger.style.setProperty('color', 'rgba(255,255,255,.88)', 'important');
      trigger.style.setProperty('background', 'transparent', 'important');

      trigger.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        open = !open;
        panel.style.maxHeight = open ? '600px' : '0';
        trigger.setAttribute('aria-expanded', String(open));
        if (ch)  ch.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
        if (lbl) lbl.style.setProperty('color', open ? '#f59e0b' : 'rgba(255,255,255,.88)', 'important');
        trigger.style.background = open ? 'rgba(245,158,11,.08)' : 'transparent';
        if (!open) setTimeout(function(){ trigger.style.background = 'transparent'; }, 450);
      });
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
}());
