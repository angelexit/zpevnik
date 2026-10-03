document.addEventListener(
    'wheel',
    (e) => {
        const row = e.target.closest('.context-chip-row');

        if (!row) return;

        const canScroll = row.scrollWidth > row.clientWidth;

        if (!canScroll) return;

        e.preventDefault();

        row.scrollLeft += e.deltaY;
    },
    {
        passive: false,
    },
);
