const instruments = {
    gtr_openc: { strings: 6, tuning: ['C', 'G', 'C', 'G', 'C', 'E'] },
    gtr_openg: { strings: 6, tuning: ['D', 'G', 'D', 'G', 'B', 'D'] },
    banjo_6: { strings: 6, tuning: ['E', 'A', 'D', 'G', 'B', 'E'] },
    gtr_std: { strings: 6, tuning: ['E', 'A', 'D', 'G', 'B', 'E'] },
    gtr_7: { strings: 7, tuning: ['B', 'E', 'A', 'D', 'G', 'B', 'E'] },
    gtr_dropd: { strings: 6, tuning: ['D', 'A', 'D', 'G', 'B', 'E'] },
    gtr_dropc: { strings: 6, tuning: ['C', 'G', 'C', 'F', 'A', 'D'] },
    gtr_opend: { strings: 6, tuning: ['D', 'A', 'D', 'F#', 'A', 'D'] },
    banjo_5: { strings: 5, tuning: ['G', 'D', 'G', 'B', 'D'] },
    banjo_tenor: { strings: 4, tuning: ['C', 'G', 'D', 'A'] },
    uke_std: { strings: 4, tuning: ['G', 'C', 'E', 'A'] },
    uke_bar: { strings: 4, tuning: ['D', 'G', 'B', 'E'] },
    mandolin: { strings: 4, tuning: ['G', 'D', 'A', 'E'] },
};

const dotFrets = [3, 5, 7, 9, 12];

const heights = [35, 45, 41, 37, 34, 31, 28, 26, 24, 22, 20, 18, 17];
export { instruments, dotFrets, heights };
