(function () {
  'use strict';

  var SERVICES = {
    ro: {
      trigger : 'Servicii',
      label   : 'Toate serviciile',
      items: [
        { name: 'Șofer Treaz',           sub: 'Chișinău · 150 MDL',      badge: '24/7',    live: true,  url: '/ro/sofer-treaz'       },
        { name: 'Transfer Aeroport KIV', sub: 'Chișinău · 800 MDL',      badge: 'Premium', live: false, url: '/ro/transfer-chisinau' },
        { name: 'Transfer Aeroport IAS', sub: 'Iași · €140',              badge: 'Premium', live: false, url: '/ro/transfer-iasi'     },
        { name: 'Șofer Personal',        sub: 'Executiv · 2.000 MDL/zi', badge: 'VIP',     live: false, url: '/ro/sofer-personal'    }
      ]
    },
    ru: {
      trigger : 'Услуги',
      label   : 'Все услуги',
      items: [
        { name: 'Трезвый водитель',       sub: 'Кишинёв · 150 MDL',      badge: '24/7',    live: true,  url: '/ru/sofer-treaz'       },
        { name: 'Трансфер аэропорт KIV',  sub: 'Кишинёв · 800 MDL',      badge: 'Premium', live: false, url: '/ru/transfer-chisinau' },
        { name: 'Трансфер аэропорт IAS',  sub: 'Яссы · €140',             badge: 'Premium', live: false, url: '/ru/transfer-iasi'     },
        { name: 'Личный водитель',         sub: 'VIP · 2000 MDL/дн',      badge: 'VIP',     live: false, url: '/ru/sofer-personal'    }
      ]
    },
    en: {
      trigger : 'Services',
      label   : 'All services',
      items: [
        { name: 'Sober Driver',           sub: 'Chișinău · 150 MDL',     badge: '24/7',    live: true,  url: '/en/sofer-treaz'       },
        { name: 'Airport Transfer KIV',   sub: 'Chișinău · 800 MDL',     badge: 'Premium', live: false, url: '/en/transfer-chisinau' },
        { name: 'Airport Transfer IAS',   sub: 'Iași · €140',             badge: 'Premium', live: false, url: '/en/transfer-iasi'     },
        { name: 'Personal Driver',        sub: 'Executive · 2000/day',   badge: 'VIP',     live: false, url: '/en/sofer-personal'    }
      ]
    }
  };

  var ICO = [
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="#f59e0b" style="width:17px;height:17px;min-width:17px;display:block;flex-shrink:0"><path d="M12 2C8.1 2 5 6.3 5 10.8 5 17 12 22 12 22s7-5 7-11.2C19 6.3 15.9 2 12 2zm0 12a3.3 3.3 0 110-6.6 3.3 3.3 0 010 6.6z"/></svg>',
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="#f59e0b" style="width:17px;height:17px;min-width:17px;display:block;flex-shrink:0"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011.5 2 1.5 1.5 0 0010 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>',
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="#f59e0b" style="width:17px;height:17px;min-width:17px;display:block;flex-shrink:0"><path d="M2.5 19h19v2h-19zm7.18-1.73l4.35 1.16 5.31 1.42c.8.21 1.62-.26 1.84-1.06.21-.8-.26-1.62-1.06-1.84l-5.31-1.42-2.76-3.77-1.93-.5.94 3.64-2.89-.77-.74-1.4-1.45-.39.67 2.58 2.03.15z"/></svg>',
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="#f59e0b" style="width:17px;height:17px;min-width:17px;display:block;flex-shrink:0"><path d="M12 12c2.67 0 4.8-2.13 4.8-4.8 0-2.66-2.13-4.8-4.8-4.8-2.66 0-4.8 2.14-4.8 4.8 0 2.67 2.14 4.8 4.8 4.8zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
  ];

  function getLang() { var p = window.location.pathname.split('/')[1]; return SERVICES[p] ? p : 'ro'; }
  function isMobile() { return window.innerWidth < 992; }

  /* ══════════════════════════════════════════════════════════
     DESKTOP PANEL
     Single column — full names always readable, no truncation,
     no badge overflow
  ══════════════════════════════════════════════════════════ */
  function buildDesktopPanel(t, cur) {
    var el = document.createElement('div');
    el.id = 'prDropPanel';
    el.style.cssText = 'position:fixed;z-index:9200;width:400px;background:#1C1917;border-radius:14px;border:1px solid rgba(255,255,255,.10);border-top:2px solid #f59e0b;padding:12px 14px 14px;box-shadow:0 24px 70px rgba(0,0,0,.6),0 4px 20px rgba(0,0,0,.4);opacity:0;pointer-events:none;transform:translateY(-6px);transition:opacity .2s ease,transform .2s ease;box-sizing:border-box;';

    var cards = t.items.map(function(item, i) {
      var isActive = cur === item.url.split('/').pop();
      var bbg  = item.live ? 'rgba(34,197,94,.15)'           : 'rgba(245,158,11,.12)';
      var bcol = item.live ? '#4ade80'                       : '#f59e0b';
      var bbrd = item.live ? '1px solid rgba(34,197,94,.25)' : '1px solid rgba(245,158,11,.25)';

      return '<a href="' + item.url + '" style="'
        + 'display:flex;align-items:center;gap:10px;'
        + 'padding:9px 10px;border-radius:10px;'
        + 'background:' + (isActive ? 'rgba(245,158,11,.1)' : 'transparent') + ';'
        + 'border:1px solid ' + (isActive ? 'rgba(245,158,11,.3)' : 'transparent') + ';'
        + 'text-decoration:none;color:inherit;margin-bottom:3px;box-sizing:border-box;"'
        + ' onmouseover="this.style.background=\'rgba(245,158,11,.07)\';this.style.borderColor=\'rgba(245,158,11,.22)\';"'
        + ' onmouseout="this.style.background=\'' + (isActive ? 'rgba(245,158,11,.1)' : 'transparent') + '\';this.style.borderColor=\'' + (isActive ? 'rgba(245,158,11,.3)' : 'transparent') + '\';"'
        + '>'
        /* icon */
        + '<div style="width:34px;height:34px;min-width:34px;border-radius:9px;background:rgba(245,158,11,.10);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + ICO[i] + '</div>'
        /* text — single col means plenty of space, no ellipsis needed */
        + '<div style="flex:1;min-width:0;">'
          + '<strong style="display:block;font-size:13px;font-weight:700;color:rgba(255,255,255,.92);line-height:1.3;">' + item.name + '</strong>'
          + '<small style="display:block;font-size:11px;color:rgba(255,255,255,.4);margin-top:2px;">' + item.sub + '</small>'
        + '</div>'
        /* badge — always fits, single column gives room */
        + '<span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;white-space:nowrap;flex-shrink:0;background:' + bbg + ';color:' + bcol + ';border:' + bbrd + ';">' + item.badge + '</span>'
        + '</a>';
    }).join('');

    el.innerHTML =
      '<div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.28);padding-bottom:9px;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:9px;">' + t.label + '</div>'
      /* 1 column — no truncation, badges always inside */
      + '<div>' + cards + '</div>';

    return el;
  }

  /* ══════════════════════════════════════════════════════════
     MOBILE PANEL — accordion, dark theme
  ══════════════════════════════════════════════════════════ */
  function buildMobilePanel(t, cur) {
    var el = document.createElement('div');
    el.id = 'prMegaMenu';
    el.style.cssText = 'max-height:0;overflow:hidden;transition:max-height .35s ease;box-sizing:border-box;';

    var links = t.items.map(function(item, i) {
      var isActive = cur === item.url.split('/').pop();
      return '<a href="' + item.url + '" style="'
        + 'display:flex;align-items:center;gap:12px;'
        + 'padding:11px 20px;'
        + 'color:' + (isActive ? '#f59e0b' : 'rgba(255,255,255,.82)') + ';'
        + 'text-decoration:none;font-size:14px;font-weight:' + (isActive ? '700' : '500') + ';'
        + 'border-bottom:1px solid rgba(255,255,255,.07);'
        + 'box-sizing:border-box;background:transparent;'
        + '-webkit-tap-highlight-color:rgba(245,158,11,.2);"'
        /* tap feedback — longer duration (450ms) */
        + ' ontouchstart="this._pr_bg=this.style.background;this.style.background=\'rgba(245,158,11,.14)\';"'
        + ' ontouchend="var el=this;setTimeout(function(){el.style.background=el._pr_bg||\'transparent\';},450);"'
        + ' onmouseover="this.style.background=\'rgba(245,158,11,.08)\';"'
        + ' onmouseout="this.style.background=\'transparent\';"'
        + '>'
        + '<div style="width:34px;height:34px;min-width:34px;border-radius:9px;background:rgba(245,158,11,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + ICO[i] + '</div>'
        + '<div style="flex:1;min-width:0;text-align:left;">'
          + '<div style="font-weight:600;font-size:14px;">' + item.name + '</div>'
          + '<div style="font-size:12px;color:rgba(255,255,255,.45);margin-top:2px;">' + item.sub + '</div>'
        + '</div>'
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
    panel.style.top  = (rect.bottom + 4) + 'px';  /* 4px gap — easier to bridge */
    panel.style.left = left + 'px';
  }

  function init() {
    var li      = document.getElementById('prServicesLi');
    var trigger = document.getElementById('prServicesTrigger');
    var oldMega = document.getElementById('prMegaMenu');
    if (!li || !trigger) return;

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
      + 'flex-shrink:0!important;display:block!important;opacity:.55;transition:transform .22s ease;'
    );

    var mobile = isMobile();

    /* Trigger style — desktop: flex left-aligned | mobile: centered like other items */
    trigger.setAttribute('style',
      'display:flex!important;align-items:center!important;gap:4px!important;'
      + 'padding:15px 0!important;'
      + (mobile ? 'justify-content:center!important;width:100%!important;' : '')
      + 'color:rgba(255,255,255,.88)!important;font-weight:500!important;'
      + 'text-decoration:none!important;cursor:pointer!important;background:transparent!important;border-bottom:none!important;'
    );

    /* Active page gold */
    var urls = t.items.map(function(i){ return i.url; });
    if (urls.indexOf(window.location.pathname.replace(/\/+$/, '')) !== -1 && lbl) {
      lbl.style.setProperty('color', '#f59e0b', 'important');
    }

    var open      = false;
    var hideTimer = null;
    var panel;

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
        open = false;
        hideTimer = null;
        panel.style.opacity = '0';
        panel.style.pointerEvents = 'none';
        panel.style.transform = 'translateY(-6px)';
        trigger.setAttribute('aria-expanded', 'false');
        if (ch)  ch.style.transform = 'rotate(0deg)';
        if (lbl) lbl.style.setProperty('color', 'rgba(255,255,255,.88)', 'important');
      }

      function scheduleHide() {
        /* 120ms delay — mouse can cross the 4px gap without closing */
        hideTimer = setTimeout(hide, 120);
      }

      /* Hover: li AND panel — cancel hide when entering either */
      li.addEventListener('mouseenter',    function() { if (hideTimer) clearTimeout(hideTimer); show(); });
      li.addEventListener('mouseleave',    scheduleHide);
      panel.addEventListener('mouseenter', function() { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } });
      panel.addEventListener('mouseleave', scheduleHide);

      /* Click toggle */
      trigger.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); open ? hide() : show(); });

      /* Close on outside click / Escape */
      document.addEventListener('click', function(e){ if (open && !li.contains(e.target) && !panel.contains(e.target)) hide(); });
      document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && open) { hide(); trigger.focus(); } });
      window.addEventListener('scroll', function(){ if (open) positionPanel(trigger, panel); }, { passive: true });

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
        panel.style.maxHeight = open ? '500px' : '0';
        trigger.setAttribute('aria-expanded', String(open));
        if (ch)  ch.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
        if (lbl) lbl.style.setProperty('color', open ? '#f59e0b' : 'rgba(255,255,255,.88)', 'important');
        /* tap feedback on trigger — 450ms */
        trigger.style.background = open ? 'rgba(245,158,11,.08)' : 'transparent';
        if (!open) {
          var tr = trigger;
          setTimeout(function(){ tr.style.background = 'transparent'; }, 450);
        }
      });
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
}());
