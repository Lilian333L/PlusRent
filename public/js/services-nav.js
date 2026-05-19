(function () {
  'use strict';

  var SERVICES = {
    ro: {
      trigger : 'Servicii',
      label   : 'Toate serviciile',
      phone   : 'Sună acum:',
      items: [
        { name: 'Șofer Treaz',           sub: 'Chișinău · de la 150 MDL',          badge: '24/7',    cls: 'pr-badge-live', url: '/ro/sofer-treaz',       ico: 0 },
        { name: 'Transfer Aeroport KIV', sub: 'Chișinău · de la 800 MDL',          badge: 'Premium', cls: 'pr-badge-gold', url: '/ro/transfer-chisinau', ico: 1 },
        { name: 'Transfer Aeroport IAS', sub: 'Iași · de la €140',                  badge: 'Premium', cls: 'pr-badge-gold', url: '/ro/transfer-iasi',     ico: 2 },
        { name: 'Șofer Personal',        sub: 'Executiv · de la 2.000 MDL/zi',     badge: 'VIP',     cls: 'pr-badge-gold', url: '/ro/sofer-personal',    ico: 3 }
      ]
    },
    ru: {
      trigger : 'Услуги',
      label   : 'Все услуги',
      phone   : 'Позвонить:',
      items: [
        { name: 'Трезвый водитель',       sub: 'Кишинёв · от 150 MDL',                  badge: '24/7',    cls: 'pr-badge-live', url: '/ru/sofer-treaz',       ico: 0 },
        { name: 'Трансфер аэропорт KIV',  sub: 'Кишинёв · от 800 MDL',                  badge: 'Premium', cls: 'pr-badge-gold', url: '/ru/transfer-chisinau', ico: 1 },
        { name: 'Трансфер аэропорт IAS',  sub: 'Яссы · от €140',                         badge: 'Premium', cls: 'pr-badge-gold', url: '/ru/transfer-iasi',     ico: 2 },
        { name: 'Личный водитель',         sub: 'Представительский · от 2000 MDL/дн',   badge: 'VIP',     cls: 'pr-badge-gold', url: '/ru/sofer-personal',    ico: 3 }
      ]
    },
    en: {
      trigger : 'Services',
      label   : 'All services',
      phone   : 'Call now:',
      items: [
        { name: 'Designated Driver',     sub: 'Chișinău · from 150 MDL',           badge: '24/7',    cls: 'pr-badge-live', url: '/en/sofer-treaz',       ico: 0 },
        { name: 'Airport Transfer KIV',  sub: 'Chișinău · from 800 MDL',           badge: 'Premium', cls: 'pr-badge-gold', url: '/en/transfer-chisinau', ico: 1 },
        { name: 'Airport Transfer IAS',  sub: 'Iași · from €140',                   badge: 'Premium', cls: 'pr-badge-gold', url: '/en/transfer-iasi',     ico: 2 },
        { name: 'Personal Driver',       sub: 'Executive · from 2,000 MDL/day',    badge: 'VIP',     cls: 'pr-badge-gold', url: '/en/sofer-personal',    ico: 3 }
      ]
    }
  };

  /* ── inline SVG icons — explicit w/h attrs beat any global CSS ── */
  var S = 'style="width:18px;height:18px;display:block;flex-shrink:0;fill:#f59e0b"';
  var ICO = [
    /* 0 sober    */ '<svg viewBox="0 0 24 24" width="18" height="18" ' + S + '><path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>',
    /* 1 plane    */ '<svg viewBox="0 0 24 24" width="18" height="18" ' + S + '><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011.5 2 1.5 1.5 0 0010 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>',
    /* 2 depart   */ '<svg viewBox="0 0 24 24" width="18" height="18" ' + S + '><path d="M2.5 19h19v2h-19zm7.18-1.73l4.35 1.16 5.31 1.42c.8.21 1.62-.26 1.84-1.06.21-.8-.26-1.62-1.06-1.84l-5.31-1.42-2.76-3.77-1.93-.5.94 3.64-2.89-.77-.74-1.4-1.45-.39.67 2.58 2.03.15z"/></svg>',
    /* 3 personal */ '<svg viewBox="0 0 24 24" width="18" height="18" ' + S + '><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
  ];
  var SP = 'style="width:13px;height:13px;display:inline-block;flex-shrink:0;fill:#f59e0b"';
  var ICO_PH = '<svg viewBox="0 0 24 24" width="13" height="13" ' + SP + '><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.47 11.47 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.47 11.47 0 00.57 3.58 1 1 0 01-.25 1.01l-2.2 2.2z"/></svg>';

  function lang() {
    var p = window.location.pathname.split('/')[1];
    return SERVICES[p] ? p : 'ro';
  }

  function render(t) {
    var cur = window.location.pathname.replace(/\/+$/, '').split('/').pop();
    var cards = t.items.map(function (item) {
      var active = cur === item.url.split('/').pop() ? ' pr-item-active' : '';
      return '<a class="pr-mega-item' + active + '" href="' + item.url + '" role="menuitem" style="display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:10px;border:1px solid transparent;text-decoration:none;color:inherit;transition:background .2s,border-color .2s,transform .2s;cursor:pointer;">'
        + '<div class="pr-mega-icon" style="width:38px;height:38px;min-width:38px;border-radius:9px;background:rgba(245,158,11,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
          + ICO[item.ico]
        + '</div>'
        + '<div style="min-width:0;flex:1;">'
          + '<strong style="display:block;font-size:13px;font-weight:700;color:rgba(255,255,255,.92);line-height:1.3;white-space:nowrap;">' + item.name + '</strong>'
          + '<small style="display:block;font-size:11px;color:rgba(255,255,255,.38);margin-top:2px;white-space:nowrap;">' + item.sub + '</small>'
        + '</div>'
        + '<span class="' + item.cls + '" style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap;flex-shrink:0;">' + item.badge + '</span>'
        + '</a>';
    }).join('');

    return '<div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.28);padding:2px 10px 10px;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:10px;">' + t.label + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">' + cards + '</div>'
      + '<div style="margin-top:10px;padding:10px 10px 0;border-top:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:8px;">'
        + ICO_PH
        + '<span style="font-size:11px;color:rgba(255,255,255,.35);">' + t.phone + '</span>'
        + '<a href="tel:+37360000500" style="font-size:11px;font-weight:700;color:rgba(255,255,255,.68);text-decoration:none;">+373 60 000 500</a>'
      + '</div>';
  }

  function init() {
    var li      = document.getElementById('prServicesLi');
    var trigger = document.getElementById('prServicesTrigger');
    var mega    = document.getElementById('prMegaMenu');
    if (!li || !trigger || !mega) return;

    var t = SERVICES[lang()];

    /* trigger label */
    var lbl = trigger.querySelector('.pr-services-label');
    if (lbl) lbl.textContent = t.trigger;

    /* mega content — all layout via inline style, no external CSS conflict */
    mega.innerHTML = render(t);

    /* active nav state */
    var urls = t.items.map(function (i) { return i.url; });
    if (urls.indexOf(window.location.pathname.replace(/\/+$/, '')) !== -1) {
      li.classList.add('pr-on-service-page');
    }

    /* hover on desktop — also done via CSS, but ensure open class works */
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      var o = li.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(o));
    });

    document.addEventListener('click', function (e) {
      if (!li.contains(e.target)) {
        li.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        li.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      }
    });

    /* hover effects via JS since CSS might be overridden */
    mega.addEventListener('mouseover', function (e) {
      var card = e.target.closest('.pr-mega-item');
      if (card) {
        card.style.background = 'rgba(245,158,11,.07)';
        card.style.borderColor = 'rgba(245,158,11,.25)';
      }
    });
    mega.addEventListener('mouseout', function (e) {
      var card = e.target.closest('.pr-mega-item');
      if (card && !card.classList.contains('pr-item-active')) {
        card.style.background = '';
        card.style.borderColor = 'transparent';
      }
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
}());
