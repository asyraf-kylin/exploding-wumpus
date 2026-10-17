// Semua ikon SVG yang dipakai di grid dan modal.
const ASSETS = {
    PLAYER: `<svg class="w-full h-full player-glow" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="26" fill="#1E3A8A" stroke="#3B82F6" stroke-width="3"/>
        <path d="M32 14L42 28H22L32 14Z" fill="#38BDF8"/>
        <circle cx="32" cy="38" r="10" fill="#0F172A"/>
        <circle cx="28" cy="36" r="2" fill="#38BDF8"/>
        <circle cx="36" cy="36" r="2" fill="#38BDF8"/>
    </svg>`,

    BOMB: `<svg class="w-full h-full bomb-glow" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="38" r="22" fill="#111827" stroke="#EF4444" stroke-width="3"/>
        <circle cx="32" cy="38" r="16" fill="#030712"/>
        <path d="M32 16V6M32 6C36 6 40 10 40 14" stroke="#F59E0B" stroke-width="4" stroke-linecap="round"/>
        <circle cx="40" cy="14" r="3" fill="#EF4444"/>
        <path d="M26 34H38M32 28V40" stroke="#DC2626" stroke-width="3" stroke-linecap="round"/>
    </svg>`,

    MINE: `<svg class="w-full h-full" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="20" fill="#020617" stroke="#334155" stroke-width="3"/>
        <path d="M32 6V12M32 52V58M6 32H12M52 32H58M14 14L18 18M46 46L50 50M14 50L18 46M46 18L50 14" stroke="#EF4444" stroke-width="4" stroke-linecap="round"/>
        <circle cx="32" cy="32" r="8" fill="#DC2626"/>
    </svg>`,

    EXPLOSION: `<svg class="w-full h-full explode-anim" viewBox="0 0 64 64" fill="none">
        <path d="M32 0L38 20L58 10L44 28L64 36L44 42L52 62L34 48L24 64L22 44L0 42L18 32L2 18L22 22L32 0Z" fill="#EF4444"/>
        <path d="M32 10L36 24L50 16L40 30L54 36L40 40L46 54L33 44L25 56L23 41L8 39L21 32L10 22L24 25L32 10Z" fill="#F59E0B"/>
        <circle cx="32" cy="34" r="10" fill="#FEF08A"/>
    </svg>`,

    DEFUSE_KIT: `<svg class="w-full h-full kit-glow" viewBox="0 0 64 64" fill="none">
        <path d="M18 14L32 30M46 14L32 30" stroke="#10B981" stroke-width="6" stroke-linecap="round"/>
        <circle cx="18" cy="14" r="6" stroke="#34D399" stroke-width="4"/>
        <circle cx="46" cy="14" r="6" stroke="#34D399" stroke-width="4"/>
        <rect x="28" y="30" width="8" height="24" rx="3" fill="#059669"/>
    </svg>`,

    STENCH: `<svg class="w-3.5 h-3.5" viewBox="0 0 64 64" fill="none">
        <path d="M16 48C16 48 24 40 24 32C24 24 16 20 16 20" stroke="#F59E0B" stroke-width="8" stroke-linecap="round"/>
        <path d="M38 44C38 44 46 36 46 28C46 20 38 16 38 16" stroke="#EF4444" stroke-width="8" stroke-linecap="round"/>
    </svg>`,

    BREEZE: `<svg class="w-3.5 h-3.5" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="10" stroke="#38BDF8" stroke-width="8"/>
        <circle cx="32" cy="32" r="22" stroke="#0ea5e9" stroke-width="6" stroke-dasharray="8 6"/>
    </svg>`,

    GLINT: `<svg class="w-3.5 h-3.5" viewBox="0 0 64 64" fill="none">
        <path d="M32 4L38 24L58 30L38 36L32 56L26 36L6 30L26 24L32 4Z" fill="#10B981"/>
    </svg>`
};
