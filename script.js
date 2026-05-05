(function () {
    'use strict';

    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var name = document.getElementById('name');
    var nav  = document.getElementById('nav');
    if (!name) return;

    var rests = name.querySelectorAll('.rest');
    var gap   = name.querySelector('.gap');

    // Target position of the collapsed "AG" (top-left on desktop). Scaled by the final scale factor.
    var FINAL_SCALE = 0.22;          // final font-size relative to initial
    var FINAL_X = 20;                // px from viewport left (of the AG glyph, after scale)
    var FINAL_Y = 10;                // px from viewport top
    var FINAL_Y_MOBILE = 8;          // px from viewport top when centred on narrow screens
    var START_Y = 0;                 // expanded state pinned to very top
    var START_Y_MOBILE = 0;          // no extra top margin on phones
    var MOBILE_NAV_BREAKPOINT = 640; // stack nav below centred AG; no overlap with links
    var SCROLL_FACTOR = 0.65;        // collapse finishes at 65% of viewport height

    // Measured at the initial (fully expanded) state.
    var origW = 0, origH = 0;
    // Natural pixel width of each .rest at full size (used as a ceiling for max-width).
    var restWidths = [];
    // Natural gap width in px (inter-word space).
    var gapWidth = 0;

    function measure() {
        // Reset to natural (fully expanded) state to measure.
        name.style.transform = 'none';
        rests.forEach(function (r) {
            r.style.maxWidth = 'none';
            r.style.opacity = '1';
        });
        if (gap) { gap.style.width = ''; gap.style.maxWidth = ''; }

        restWidths = [];
        rests.forEach(function (r) { restWidths.push(r.getBoundingClientRect().width); });
        gapWidth = gap ? gap.getBoundingClientRect().width : 0;

        var rect = name.getBoundingClientRect();
        origW = rect.width;
        origH = rect.height;

        // Immediately apply the correct state for current scroll.
        update();
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    // easeInOutCubic — smooth feel for the movement
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    function update() {
        if (prefersReduced) return;

        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var end = Math.max(260, vh * SCROLL_FACTOR);
        var rawP = Math.max(0, Math.min(1, window.scrollY / end));
        var p = ease(rawP);

        // Collapse the "ndrey" and "izdov" portions.
        for (var i = 0; i < rests.length; i++) {
            var w = restWidths[i] * (1 - rawP);
            rests[i].style.maxWidth = w + 'px';
            rests[i].style.opacity  = Math.max(0, 1 - rawP * 1.15);
        }
        // Shrink the gap between A and G down to a smaller space.
        if (gap) {
            var gMin = gapWidth * 0.35;
            gap.style.width = lerp(gapWidth, gMin, rawP) + 'px';
        }

        // Move and scale the whole name element.
        // Start: top edge (no empty margin above the name).
        // End: desktop top-left at FINAL_SCALE; mobile stays horizontally centred (CSS left:50% +
        // translate -50% + transform-origin top centre — layout width shrinks as .rest collapse,
        // which breaks a naive (vw - origW*s)/2 calculation).
        var startX = (vw - origW) / 2;
        var s = lerp(1, FINAL_SCALE, p);
        var mobile = vw <= MOBILE_NAV_BREAKPOINT;
        var startY = mobile ? START_Y_MOBILE : START_Y;
        var x = lerp(startX, FINAL_X, p);
        var y = mobile ? lerp(startY, FINAL_Y_MOBILE, p) : lerp(startY, FINAL_Y, p);

        if (mobile) {
            name.style.transform = 'translate3d(-50%, ' + y + 'px, 0) scale(' + s + ')';
        } else {
            name.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + s + ')';
        }

        // Pop down the nav once the collapse is essentially done.
        if (nav) nav.classList.toggle('visible', rawP > 0.88);
    }

    // RAF-throttled scroll handler
    var scheduled = false;
    function onScroll() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(function () {
            update();
            scheduled = false;
        });
    }

    // Re-measure on resize (debounced) — viewport-dependent font-size via clamp().
    var resizeT;
    function onResize() {
        clearTimeout(resizeT);
        resizeT = setTimeout(measure, 80);
    }

    // Active-section highlighting in the pill nav.
    function setupActiveNav() {
        if (!('IntersectionObserver' in window) || !nav) return;
        var links = nav.querySelectorAll('a');
        var map = {};
        links.forEach(function (a) {
            var href = a.getAttribute('href') || '';
            if (href.charAt(0) === '#') map[href.slice(1)] = a;
        });
        var sections = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                var id = e.target.id;
                links.forEach(function (l) { l.classList.remove('active'); });
                if (map[id]) map[id].classList.add('active');
            });
        }, { threshold: 0, rootMargin: '-40% 0px -55% 0px' });
        sections.forEach(function (s) { obs.observe(s); });
    }

    // Init once fonts are ready so measurements are correct.
    function init() {
        measure();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);
        setupActiveNav();
    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(init).catch(init);
    } else if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();
