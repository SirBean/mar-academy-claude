# Working in this repo

This is the MAR Kinetic System: the motion production system for MAR Creative Academy.

- **`MAR_KINETIC_SYSTEM.md` is the spec.** Read it before generating or changing any graphic. Code must follow it; if a graphic breaks a rule, the graphic is wrong.
- **Identity is fixed:** Arial Narrow (fallback Liberation Sans Narrow), type always `#FFFFFF`, ground always `#000000`. No other colors, no type on white.
- **Motion rules come only from section 3** (text motion extracted from the OpenAI reference). No easing, fades, slides or scaling.
- **New reference rules** go in section 7 of the spec, one numbered rule with a value, only for what Mattia says he likes. Never import a reference's whole aesthetic.
- **Determinism:** use the seeded `random.Random` instances in `marsys.py`. Never module-level `random`. Every frame is a pure function of (content, seed, duration, format, frame).
- **Verify with stills first:** `python3 marsys.py --seed N --stills 20,60,148 --out check.png`, look at the PNGs, then render video.
