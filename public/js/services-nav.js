(function () {
  'use strict';

  /* ─── All service data — explicit URLs per language ─── */
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
        { name: 'Трезвый водитель',       sub: 'Кишинёв · от 150 MDL',                 badge: '24/7',    live: true,  url: '/ru/sofer-treaz'       },
        { name: 'Трансфер аэропорт KIV',  sub: 'Кишинёв · от 800 MDL',                 badge: 'Premium', live: false, url: '/ru/transfer-chisinau' },
        { name: 'Трансфер аэропорт IAS',  sub: 'Яссы · от €140',                        badge: 'Premium', live: false, url: '/ru/transfer-iasi'     },
        { name: 'Личный водитель',         sub: 'Представительский · от 2000 MDL/дн',  badge: 'VIP',     live: false, url: '/ru/sofer-personal'    }
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

  /* ─── SVG icons with explicit size attrs — beats any global CSS ─── */
  var G = '#f59e0b';
  var ICO = [
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="'+G+'" style="width:18px;height:18px;min-width:18px;display:block"><path d="M12 2C8.1 2 5 6.3 5 10.8 5 17 12 22 12 22s7-5 7-11.2C19 6.3 15.9 2 12 2zm0 12a3.3 3.3 0 110-6.6 3.3 3.3 0 010 6.6z"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="'+G+'" style="width:18px;height:18px;min-width:18px;display:block"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="'+G+'" style="width:18px;height:18px;min-width:18px;display:block"><path d="M2.5 19h19v2h-19zm7.18-1.73l4.35 1.16 5.31 1.42c.8.21 1.62-.26 1.84-1.06.21-.8-.26-1.62-1.06-1.84l-5.31-1.42-2.76-3.77-1.93-.5.94 3.64-2.89-.77-.74-1.4-1.45-.39.67 2.58 2.03.15z"/></svg>',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="'+G+'" style="width:18px;height:18px;min-width:18px;display:block"><path d="M12 12c2.67 0 4.8-2.13 4.8-4.8 0-2.66-2.13-4.8-4.8-4.8-2.66 0-4.8 2.14-4.8 4.8 0 2.67 2.14 4.8 4.8 4.8zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
  ];

  function lang() {
    var p = window.location.pathname.split('/')[1];
    return SERVICES[p] ? p : 'ro';
  }

  function isMobile() { return window.innerWidth < 992; }

  /* ─── Apply styles that CANNOT be overridden by external CSS ─── */
  function stylePanel(el, visible) {
    var mobile = isMobile();
    /* base — always */
    el.style.setProperty('background-color', '#1C1917', 'important');
    el.style.setProperty('border-radius',    mobile ? '8px' : '14px', 'important');
    el.style.setProperty('padding',          '14px', 'important');
    el.style.setProperty('z-index',          '99999', 'important');
    el.style.setProperty('overflow',         'hidden', 'important');
    el.style.setProperty('box-sizing',       'border-box', 'important');

    if (mobile) {
      el.style.setProperty('position',        'static', 'important');
      el.style.setProperty('width',           '100%', 'important');
      el.style.setProperty('max-width',       '100%', 'important');
      el.style.setProperty('border-left',     '2px solid #f59e0b', 'important');
      el.style.setProperty('border-top',      'none', 'important');
      el.style.setProperty('border-right',    'none', 'important');
      el.style.setProperty('border-bottom',   'none', 'important');
      el.style.setProperty('box-shadow',      'none', 'important');
      el.style.setProperty('margin-left',     '12px', 'important');
      el.style.setProperty('margin-top',      '4px', 'important');
      el.style.setProperty('max-height',      visible ? '700px' : '0', 'important');
      el.style.setProperty('padding',         visible ? '10px 10px 12px' : '0', 'important');
      el.style.setProperty('pointer-events',  visible ? 'all' : 'none', 'important');
      el.style.setProperty('transition',      'max-height .35s ease, padding .3s ease', 'important');
    } else {
      el.style.setProperty('position',        'absolute', 'important');
      el.style.setProperty('top',             'calc(100% + 10px)', 'important');
      el.style.setProperty('left',            '50%', 'important');
      el.style.setProperty('width',           '520px', 'important');
      el.style.setProperty('max-width',       '520px', 'important');
      el.style.setProperty('border',          '1px solid rgba(255,255,255,.1)', 'important');
      el.style.setProperty('border-top',      '2px solid #f59e0b', 'important');
      el.style.setProperty('box-shadow',      '0 24px 70px rgba(0,0,0,.6),0 4px 16px rgba(0,0,0,.4)', 'important');
      el.style.setProperty('transform',       visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-8px)', 'important');
      el.style.setProperty('opacity',         visible ? '1' : '0', 'important');
      el.style.setProperty('pointer-events',  visible ? 'all' : 'none', 'important');
      el.style.setProperty('transition',      'opacity .22s ease,transform .22s ease', 'important');
    }
  }

  /* ─── Build card HTML ─── */
  function buildCard(item, isActive, idx) {
    var bg   = isActive ? 'rgba(245,158,11,.10)' : 'transparent';
    var bord = isActive ? '1px solid rgba(245,158,11,.3)' : '1px solid transparent';
    var badgeBg   = item.live ? 'rgba(34,197,94,.15)' : 'rgba(245,158,11,.12)';
    var badgeCol  = item.live ? '#4ade80' : '#f59e0b';
    var badgeBord = item.live ? '1px solid rgba(34,197,94,.25)' : '1px solid rgba(245,158,11,.25)';

    return '<a href="' + item.url + '" role="menuitem" '
      + 'style="'
        + 'display:flex;align-items:center;gap:11px;'
        + 'padding:11px 12px;border-radius:10px;'
        + 'background:' + bg + ';'
        + 'border:' + bord + ';'
        + 'text-decoration:none;color:inherit;'
        + 'cursor:pointer;box-sizing:border-box;'
        + 'transition:background .18s,border-color .18s;'
        + 'margin-bottom:5px;"'
      + ' onmouseover="this.style.background=\'rgba(245,158,11,.07)\';this.style.borderColor=\'rgba(245,158,11,.25)\'"'
      + ' onmouseout="this.style.background=\'' + bg + '\';this.style.borderColor=\'' + (isActive ? 'rgba(245,158,11,.3)' : 'transparent') + '\'"'
    + '>'
      + '<div style="width:38px;height:38px;min-width:38px;border-radius:9px;background:rgba(245,158,11,.10);display:flex;align-items:center;justify-content:center;box-sizing:border-box;">'
        + ICO[idx]
      + '</div>'
      + '<div style="min-width:0;flex:1;overflow:hidden;">'
        + '<strong style="display:block;font-size:13px;font-weight:700;color:rgba(255,255,255,.92);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + item.name + '</strong>'
        + '<small style="display:block;font-size:11px;color:rgba(255,255,255,.38);margin-top:2px;white-space:nowrap;">' + item.sub + '</small>'
      + '</div>'
      + '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap;flex-shrink:0;background:' + badgeBg + ';color:' + badgeCol + ';border:' + badgeBord + ';">' + item.badge + '</span>'
    + '</a>';
  }

  /* ─── Build full panel content ─── */
  function buildContent(t) {
    var cur = window.location.pathname.replace(/\/+$/, '').split('/').pop();

    var cards = t.items.map(function (item, idx) {
      var isActive = cur === item.url.split('/').pop();
      return buildCard(item, isActive, idx);
    });

    /* 2-col grid via flex wrap */
    var half = Math.ceil(cards.length / 2);
    var col1 = cards.slice(0, half).join('');
    var col2 = cards.slice(half).join('');
    var grid = '<div style="display:flex;gap:6px;">'
      + '<div style="flex:1;min-width:0;">' + col1 + '</div>'
      + '<div style="flex:1;min-width:0;">' + col2 + '</div>'
      + '</div>';

    var footer = '<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:7px;padding-left:2px;">'
      + '<svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" style="width:13px;height:13px;flex-shrink:0;"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.47 11.47 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.47 11.47 0 00.57 3.58 1 1 0 01-.25 1.01l-2.2 2.2z"/></svg>'
      + '<span style="font-size:11px;color:rgba(255,255,255,.35);">' + t.phone + '</span>'
      + '<a href="tel:+37360000500" style="font-size:11px;font-weight:700;color:rgba(255,255,255,.7);text-decoration:none;">+373 60 000 500</a>'
    + '</div>';

    var label = '<div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.28);padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:10px;">' + t.label + '</div>';

    return label + grid + footer;
  }

  /* ─── Main init ─── */
  function init() {
    var li      = document.getElementById('prServicesLi');
    var trigger = document.getElementById('prServicesTrigger');
    var mega    = document.getElementById('prMegaMenu');
    if (!li || !trigger || !mega) return;

    var t = SERVICES[lang()];

    /* Set trigger label */
    var lbl = trigger.querySelector('.pr-services-label');
    if (lbl) lbl.textContent = t.trigger;

    /* Ensure parent li is position:relative */
    li.style.setProperty('position', 'relative', 'important');

    /* Render content */
    mega.innerHTML = buildContent(t);

    /* Apply initial hidden styles via JS — no CSS dependency */
    stylePanel(mega, false);

    /* Mark if on service page */
    var urls = t.items.map(function (i) { return i.url; });
    var curPath = window.location.pathname.replace(/\/+$/, '');
    if (urls.indexOf(curPath) !== -1) {
      trigger.style.color = '#f59e0b';
    }

    var open = false;

    function show() {
      open = true;
      mega.style.display = 'block';
      /* small rAF so transition fires */
      requestAnimationFrame(function () { stylePanel(mega, true); });
      trigger.setAttribute('aria-expanded', 'true');
      /* rotate chevron */
      var ch = trigger.querySelector('svg.pr-chevron');
      if (ch) ch.style.transform = 'rotate(180deg)';
    }

    function hide() {
      open = false;
      stylePanel(mega, false);
      trigger.setAttribute('aria-expanded', 'false');
      var ch = trigger.querySelector('svg.pr-chevron');
      if (ch) ch.style.transform = 'rotate(0deg)';
      /* hide after transition */
      if (!isMobile()) {
        setTimeout(function () { if (!open) mega.style.display = ''; }, 250);
      }
    }

    /* Desktop hover */
    if (!isMobile()) {
      li.addEventListener('mouseenter', show);
      li.addEventListener('mouseleave', hide);
    }

    /* Click toggle (desktop click + all mobile) */
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      open ? hide() : show();
    });

    /* Close outside */
    document.addEventListener('click', function (e) {
      if (open && !li.contains(e.target)) hide();
    });

    /* Escape */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { hide(); trigger.focus(); }
    });

    /* Reapply on resize (mobile ↔ desktop) */
    window.addEventListener('resize', function () {
      if (open) stylePanel(mega, true);
      else stylePanel(mega, false);
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
}());
