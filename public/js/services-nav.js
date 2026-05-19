(function () {
  'use strict';

  /* ══════════════════════════════════════════════════
     PLUSRENT — SERVICES DROPDOWN
     Все URL явно прописаны для каждого языка.
     Язык берётся из pathname[1] только для выбора
     нужного набора — больше ни для чего.
  ══════════════════════════════════════════════════ */

  var SERVICES = {

    ro: {
      trigger : 'Servicii',
      label   : 'Toate serviciile',
      phone   : 'Sună acum:',
      items: [
        { name: 'Șofer Treaz',            sub: 'Chișinău · de la 150 MDL',       badge: '24/7',    cls: 'pr-badge-live', url: '/ro/sofer-treaz'       },
        { name: 'Transfer Aeroport KIV',  sub: 'Chișinău · de la 800 MDL',       badge: 'Premium', cls: 'pr-badge-gold', url: '/ro/transfer-chisinau' },
        { name: 'Transfer Aeroport IAS',  sub: 'Iași · de la €140',               badge: 'Premium', cls: 'pr-badge-gold', url: '/ro/transfer-iasi'     },
        { name: 'Șofer Personal',         sub: 'Executiv · de la 2.000 MDL/zi',  badge: 'VIP',     cls: 'pr-badge-gold', url: '/ro/sofer-personal'    }
      ]
    },

    ru: {
      trigger : 'Услуги',
      label   : 'Все услуги',
      phone   : 'Позвонить:',
      items: [
        { name: 'Трезвый водитель',       sub: 'Кишинёв · от 150 MDL',                badge: '24/7',    cls: 'pr-badge-live', url: '/ru/sofer-treaz'       },
        { name: 'Трансфер аэропорт KIV',  sub: 'Кишинёв · от 800 MDL',               badge: 'Premium', cls: 'pr-badge-gold', url: '/ru/transfer-chisinau' },
        { name: 'Трансфер аэропорт IAS',  sub: 'Яссы · от €140',                      badge: 'Premium', cls: 'pr-badge-gold', url: '/ru/transfer-iasi'     },
        { name: 'Личный водитель',         sub: 'Представительский · от 2000 MDL/дн', badge: 'VIP',     cls: 'pr-badge-gold', url: '/ru/sofer-personal'    }
      ]
    },

    en: {
      trigger : 'Services',
      label   : 'All services',
      phone   : 'Call now:',
      items: [
        { name: 'Designated Driver',      sub: 'Chișinău · from 150 MDL',          badge: '24/7',    cls: 'pr-badge-live', url: '/en/sofer-treaz'       },
        { name: 'Airport Transfer KIV',   sub: 'Chișinău · from 800 MDL',          badge: 'Premium', cls: 'pr-badge-gold', url: '/en/transfer-chisinau' },
        { name: 'Airport Transfer IAS',   sub: 'Iași · from €140',                  badge: 'Premium', cls: 'pr-badge-gold', url: '/en/transfer-iasi'     },
        { name: 'Personal Driver',        sub: 'Executive · from 2,000 MDL/day',   badge: 'VIP',     cls: 'pr-badge-gold', url: '/en/sofer-personal'    }
      ]
    }

  };

  /* ── SVG icons ── */
  var ICO = {
    0: '<svg viewBox="0 0 24 24"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>',
    1: '<svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011.5 2 1.5 1.5 0 0010 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>',
    2: '<svg viewBox="0 0 24 24"><path d="M2.5 19h19v2h-19zm7.18-1.73l4.35 1.16 5.31 1.42c.8.21 1.62-.26 1.84-1.06.21-.8-.26-1.62-1.06-1.84l-5.31-1.42-2.76-3.77-1.93-.5.94 3.64-2.89-.77-.74-1.4-1.45-.39.67 2.58z"/></svg>',
    3: '<svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
  };
  var ICO_PHONE = '<svg viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.47 11.47 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.47 11.47 0 00.57 3.58 1 1 0 01-.25 1.01z"/></svg>';

  /* ── Pick language (ТОЛЬКО для выбора набора из SERVICES) ── */
  function lang() {
    var p = window.location.pathname.split('/')[1];
    return SERVICES[p] ? p : 'ro';
  }

  /* ── Render dropdown HTML ── */
  function render(t) {
    var cur = window.location.pathname.replace(/\/+$/, '').split('/').pop();
    var cards = t.items.map(function (item, i) {
      var active = cur === item.url.split('/').pop() ? ' pr-item-active' : '';
      return '<a class="pr-mega-item' + active + '" href="' + item.url + '" role="menuitem">'
        + '<div class="pr-mega-icon">' + ICO[i] + '</div>'
        + '<div class="pr-mega-text"><strong>' + item.name + '</strong><small>' + item.sub + '</small></div>'
        + '<span class="pr-mega-badge ' + item.cls + '">' + item.badge + '</span>'
        + '</a>';
    }).join('');

    return '<div class="pr-mega-label">' + t.label + '</div>'
      + '<div class="pr-mega-grid">' + cards + '</div>'
      + '<div class="pr-mega-footer">' + ICO_PHONE
        + '<span>' + t.phone + '</span>'
        + '<a href="tel:+37360000500">+373 60 000 500</a>'
      + '</div>';
  }

  /* ── Init ── */
  function init() {
    var li      = document.getElementById('prServicesLi');
    var trigger = document.getElementById('prServicesTrigger');
    var mega    = document.getElementById('prMegaMenu');
    if (!li || !trigger || !mega) return;

    var t = SERVICES[lang()];

    trigger.querySelector('.pr-services-label').textContent = t.trigger;
    mega.innerHTML = render(t);

    /* active nav highlight if on a service page */
    var urls = t.items.map(function(i){ return i.url; });
    if (urls.indexOf(window.location.pathname.replace(/\/+$/,'')) !== -1) {
      li.classList.add('pr-on-service-page');
    }

    /* click toggle */
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      var o = li.classList.toggle('open');
      trigger.setAttribute('aria-expanded', o ? 'true' : 'false');
    });

    /* close outside */
    document.addEventListener('click', function (e) {
      if (!li.contains(e.target)) {
        li.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    /* close Escape */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        li.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      }
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

}());
