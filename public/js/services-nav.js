(function () {
  'use strict';

  /* ── All URLs explicit per language ── */
  var SERVICES = {
    ro: {
      trigger : 'Servicii',
      label   : 'Toate serviciile',
      phone   : 'Sună acum:',
      items: [
        { name: 'Șofer Treaz',           sub: 'Chișinău · de la 150 MDL',         badge: '24/7',    live: true,  url: '/ro/sofer-treaz'       },
        { name: 'Transfer Aeroport KIV', sub: 'Chișinău · de la 800 MDL',         badge: 'Premium', live: false, url: '/ro/transfer-chisinau' },
        { name: 'Transfer Aeroport IAS', sub: 'Iași · de la €140',                 badge: 'Premium', live: false, url: '/ro/transfer-iasi'     },
        { name: 'Șofer Personal',        sub: 'Executiv · de la 2.000 MDL/zi',    badge: 'VIP',     live: false, url: '/ro/sofer-personal'    }
      ]
    },
    ru: {
      trigger : 'Услуги',
      label   : 'Все услуги',
      phone   : 'Позвонить:',
      items: [
        { name: 'Трезвый водитель',       sub: 'Кишинёв · от 150 MDL',                badge: '24/7',    live: true,  url: '/ru/sofer-treaz'       },
        { name: 'Трансфер аэропорт KIV',  sub: 'Кишинёв · от 800 MDL',               badge: 'Premium', live: false, url: '/ru/transfer-chisinau' },
        { name: 'Трансфер аэропорт IAS',  sub: 'Яссы · от €140',                      badge: 'Premium', live: false, url: '/ru/transfer-iasi'     },
        { name: 'Личный водитель',         sub: 'Представительский · от 2000 MDL/дн', badge: 'VIP',     live: false, url: '/ru/sofer-personal'    }
      ]
    },
    en: {
      trigger : 'Services',
      label   : 'All services',
      phone   : 'Call now:',
      items: [
        { name: 'Designated Driver',     sub: 'Chișinău · from 150 MDL',           badge: '24/7',    live: true,  url: '/en/sofer-treaz'       },
        { name: 'Airport Transfer KIV',  sub: 'Chișinău · from 800 MDL',           badge: 'Premium', live: false, url: '/en/transfer-chisinau' },
        { name: 'Airport Transfer IAS',  sub: 'Iași · from €140',                   badge: 'Premium', live: false, url: '/en/transfer-iasi'     },
        { name: 'Personal Driver',       sub: 'Executive · from 2,000 MDL/day',    badge: 'VIP',     live: false, url: '/en/sofer-personal'    }
      ]
    }
  };

  /* ── Icons ── */
  var ICO = [
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b" style="width:18px;height:18px;min-width:18px;flex-shrink:0;display:block"><path d="M12 2C8.1 2 5 6.3 5 10.8 5 17 12 22 12 22s7-5 7-11.2C19 6.3 15.9 2 12 2zm0 12a3.3 3.3 0 110-6.6 3.3 3.3 0 010 6.6z"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b" style="width:18px;height:18px;min-width:18px;flex-shrink:0;display:block"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011.5 2 1.5 1.5 0 0010 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b" style="width:18px;height:18px;min-width:18px;flex-shrink:0;display:block"><path d="M2.5 19h19v2h-19zm7.18-1.73l4.35 1.16 5.31 1.42c.8.21 1.62-.26 1.84-1.06.21-.8-.26-1.62-1.06-1.84l-5.31-1.42-2.76-3.77-1.93-.5.94 3.64-2.89-.77-.74-1.4-1.45-.39.67 2.58 2.03.15z"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b" style="width:18px;height:18px;min-width:18px;flex-shrink:0;display:block"><path d="M12 12c2.67 0 4.8-2.13 4.8-4.8 0-2.66-2.13-4.8-4.8-4.8-2.66 0-4.8 2.14-4.8 4.8 0 2.67 2.14 4.8 4.8 4.8zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
  ];

  function getLang() {
    var p = window.location.pathname.split('/')[1];
    return SERVICES[p] ? p : 'ro';
  }

  function isMobile() { return window.innerWidth < 992; }

  /* ─────────────────────────────────────────────
     DESKTOP PANEL  — detached from header,
     appended to <body>, position:fixed
     Avoids ALL overflow/clip issues from header
  ───────────────────────────────────────────── */
  function buildDesktopPanel(t, cur) {
    var panel = document.createElement('div');
    panel.id = 'prDropPanel';

    /* Critical: fixed, not inside header */
    panel.style.cssText = [
      'position:fixed',
      'z-index:99999',
      'width:500px',
      'background:#1C1917',
      'border-radius:14px',
      'border:1px solid rgba(255,255,255,.10)',
      'border-top:2px solid #f59e0b',
      'padding:14px',
      'box-shadow:0 24px 70px rgba(0,0,0,.6),0 4px 20px rgba(0,0,0,.4)',
      'opacity:0',
      'pointer-events:none',
      'transform:translateY(-6px)',
      'transition:opacity .22s ease,transform .22s ease',
      'box-sizing:border-box'
    ].join(';');

    var cards = t.items.map(function(item, i) {
      var active = cur === item.url.split('/').pop();
      var badgeBg  = item.live ? 'rgba(34,197,94,.15)' : 'rgba(245,158,11,.12)';
      var badgeCol = item.live ? '#4ade80' : '#f59e0b';
      var badgeBrd = item.live ? '1px solid rgba(34,197,94,.25)' : '1px solid rgba(245,158,11,.25)';

      return '<a href="' + item.url + '" style="'
        + 'display:flex;align-items:center;gap:11px;'
        + 'padding:11px 12px;border-radius:10px;'
        + 'background:' + (active ? 'rgba(245,158,11,.1)' : 'transparent') + ';'
        + 'border:1px solid ' + (active ? 'rgba(245,158,11,.3)' : 'transparent') + ';'
        + 'text-decoration:none;color:inherit;'
        + 'transition:background .18s,border-color .18s;'
        + 'margin-bottom:5px;box-sizing:border-box;"'
        + ' onmouseover="this.style.background=\'rgba(245,158,11,.07)\';this.style.borderColor=\'rgba(245,158,11,.25)\'"'
        + ' onmouseout="this.style.background=\'' + (active ? 'rgba(245,158,11,.1)' : 'transparent') + '\';this.style.borderColor=\'' + (active ? 'rgba(245,158,11,.3)' : 'transparent') + '\'"'
        + '>'
        + '<div style="width:38px;height:38px;min-width:38px;border-radius:9px;background:rgba(245,158,11,.10);display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
          + ICO[i]
        + '</div>'
        + '<div style="flex:1;min-width:0;">'
          + '<strong style="display:block;font-size:13px;font-weight:700;color:rgba(255,255,255,.92);line-height:1.3;white-space:nowrap;">' + item.name + '</strong>'
          + '<small style="display:block;font-size:11px;color:rgba(255,255,255,.38);margin-top:2px;">' + item.sub + '</small>'
        + '</div>'
        + '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap;flex-shrink:0;background:' + badgeBg + ';color:' + badgeCol + ';border:' + badgeBrd + ';">' + item.badge + '</span>'
        + '</a>';
    }).join('');

    panel.innerHTML =
      '<div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.28);padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:10px;">' + t.label + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;">' + cards + '</div>'
      + '<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:8px;">'
        + '<svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" style="width:13px;height:13px;flex-shrink:0;"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.47 11.47 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.47 11.47 0 00.57 3.58 1 1 0 01-.25 1.01l-2.2 2.2z"/></svg>'
        + '<span style="font-size:11px;color:rgba(255,255,255,.35);">' + t.phone + '</span>'
        + '<a href="tel:+37360000500" style="font-size:11px;font-weight:700;color:rgba(255,255,255,.72);text-decoration:none;">+373 60 000 500</a>'
      + '</div>';

    return panel;
  }

  /* ─────────────────────────────────────────────
     MOBILE PANEL  — accordion inside mobile menu
     Simple links, clean, easy to tap
  ───────────────────────────────────────────── */
  function buildMobilePanel(t, cur) {
    var panel = document.createElement('div');
    panel.id = 'prMegaMenu';

    panel.style.cssText = [
      'max-height:0',
      'overflow:hidden',
      'transition:max-height .35s ease',
      'padding-left:12px',
      'box-sizing:border-box'
    ].join(';');

    var links = t.items.map(function(item, i) {
      var active = cur === item.url.split('/').pop();
      return '<a href="' + item.url + '" style="'
        + 'display:flex;align-items:center;gap:10px;'
        + 'padding:10px 8px;'
        + 'color:' + (active ? '#f59e0b' : 'rgba(255,255,255,.78)') + ';'
        + 'text-decoration:none;font-size:14px;font-weight:' + (active ? '700' : '500') + ';'
        + 'border-left:2px solid ' + (active ? '#f59e0b' : 'rgba(255,255,255,.12)') + ';'
        + 'padding-left:12px;'
        + 'transition:color .2s,border-color .2s;"'
        + ' onmouseover="this.style.color=\'#f59e0b\';this.style.borderColor=\'#f59e0b\'"'
        + ' onmouseout="this.style.color=\'' + (active ? '#f59e0b' : 'rgba(255,255,255,.78)') + '\';this.style.borderColor=\'' + (active ? '#f59e0b' : 'rgba(255,255,255,.12)') + '\'"'
        + '>'
        + ICO[i]
        + '<div>'
          + '<div>' + item.name + '</div>'
          + '<div style="font-size:11px;color:rgba(255,255,255,.38);font-weight:400;margin-top:1px;">' + item.sub + '</div>'
        + '</div>'
        + '</a>';
    }).join('');

    panel.innerHTML = links;
    return panel;
  }

  /* ─────────────────────────────────────────────
     POSITION desktop panel below trigger
  ───────────────────────────────────────────── */
  function positionPanel(trigger, panel) {
    var rect = trigger.getBoundingClientRect();
    var panelW = 500;
    var left = rect.left + rect.width / 2 - panelW / 2;
    var maxLeft = window.innerWidth - panelW - 12;
    left = Math.max(12, Math.min(left, maxLeft));
    panel.style.top  = (rect.bottom + 8) + 'px';
    panel.style.left = left + 'px';
  }

  /* ─────────────────────────────────────────────
     MAIN INIT
  ───────────────────────────────────────────── */
  function init() {
    var li      = document.getElementById('prServicesLi');
    var trigger = document.getElementById('prServicesTrigger');
    var oldMega = document.getElementById('prMegaMenu');
    if (!li || !trigger) return;

    var t    = SERVICES[getLang()];
    var cur  = window.location.pathname.replace(/\/+$/, '').split('/').pop();

    /* ── Fix label element (override any CSS hiding it) ── */
    var lbl = trigger.querySelector('.pr-services-label');
    if (lbl) {
      lbl.textContent = t.trigger;
      lbl.style.cssText = 'display:inline!important;width:auto!important;font-size:15px!important;font-weight:500!important;text-transform:none!important;border:none!important;line-height:1!important;color:inherit!important;position:static!important;letter-spacing:normal!important;';
    }

    /* ── Fix chevron (override CSS shrinking SVG) ── */
    var ch = trigger.querySelector('.pr-chevron');
    if (ch) {
      ch.style.cssText = 'width:11px!important;height:11px!important;max-width:11px!important;max-height:11px!important;flex-shrink:0!important;display:block!important;opacity:.55!important;transition:transform .22s ease!important;margin-left:2px!important;';
    }

    /* ── Trigger style ── */
    trigger.style.cssText = 'display:inline-flex!important;align-items:center!important;gap:4px!important;padding:15px 0!important;color:#fff!important;font-weight:500!important;text-decoration:none!important;cursor:pointer!important;';

    /* ── Active page indicator ── */
    var urls = t.items.map(function(i){ return i.url; });
    if (urls.indexOf(window.location.pathname.replace(/\/+$/, '')) !== -1) {
      trigger.style.setProperty('color', '#f59e0b', 'important');
    }

    var mobile = isMobile();
    var open   = false;
    var panel;

    if (!mobile) {
      /* ── DESKTOP: remove old inline panel, create detached panel ── */
      if (oldMega) oldMega.remove();

      panel = buildDesktopPanel(t, cur);
      document.body.appendChild(panel);

      function showDesk() {
        open = true;
        positionPanel(trigger, panel);
        panel.style.opacity = '1';
        panel.style.pointerEvents = 'all';
        panel.style.transform = 'translateY(0)';
        trigger.setAttribute('aria-expanded', 'true');
        if (ch) ch.style.transform = 'rotate(180deg)';
        if (lbl) lbl.style.color = '#f59e0b';
      }

      function hideDesk() {
        open = false;
        panel.style.opacity = '0';
        panel.style.pointerEvents = 'none';
        panel.style.transform = 'translateY(-6px)';
        trigger.setAttribute('aria-expanded', 'false');
        if (ch) ch.style.transform = 'rotate(0deg)';
        if (lbl) lbl.style.color = '';
      }

      li.addEventListener('mouseenter', showDesk);
      li.addEventListener('mouseleave', hideDesk);

      trigger.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        open ? hideDesk() : showDesk();
      });

      document.addEventListener('click', function(e) {
        if (open && !li.contains(e.target) && !panel.contains(e.target)) hideDesk();
      });

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && open) { hideDesk(); trigger.focus(); }
      });

      /* Reposition on scroll (header is fixed) */
      window.addEventListener('scroll', function() {
        if (open) positionPanel(trigger, panel);
      }, { passive: true });

    } else {
      /* ── MOBILE: accordion inside burger menu ── */
      if (oldMega) {
        panel = oldMega;
        panel.innerHTML = '';
        var mPanel = buildMobilePanel(t, cur);
        panel.innerHTML = mPanel.innerHTML;
        panel.style.cssText = mPanel.style.cssText;
      } else {
        panel = buildMobilePanel(t, cur);
        li.appendChild(panel);
      }

      trigger.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        open = !open;
        panel.style.maxHeight = open ? '600px' : '0';
        trigger.setAttribute('aria-expanded', String(open));
        if (ch) ch.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
      });
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

}());
