// Simple, scalable rules driven by color + size.
// Color => effect type.
export const GEM_COLORS = {
  R: { name: "Red",   effect: "heal"   },
  B: { name: "Blue",  effect: "block"  },
  G: { name: "Green", effect: "poison" },
  Y: { name: "Yellow",effect: "attack" },
};

// Size => numeric value.
export const GEM_SIZES = {
  small:  2,
  medium: 4,
  big:    6,
};

// Combine exactly two gems now (later: allow more).
export function fuseGems(gA, gB) {
  const r = { heal:0, block:0, poison:0, dmg:0 };
  const apply = (g)=>{
    const power = GEM_SIZES[g.size] ?? 2;
    const eff = GEM_COLORS[g.color]?.effect;
    if (eff === "heal")   r.heal   += power;
    if (eff === "block")  r.block  += power;
    if (eff === "poison") r.poison += power;
    if (eff === "attack") r.dmg    += power;
  };
  apply(gA); apply(gB);
  return r;
}
