# MAR Kinetic System

White narrow type on black. Text as structure. Motion is typing, never animating.

Generative: each seed composes a new sequence of shots from 14 recipes, 4 endings and the structure grammar (spec section 5). Sound is synthesized from what happens on screen (spec section 6).

- Spec: [`MAR_KINETIC_SYSTEM.md`](MAR_KINETIC_SYSTEM.md)
- Engine: `marsys.py` (Python 3, Pillow, NumPy, ffmpeg)
- Fonts: Liberation Sans Narrow (metric clone of Arial Narrow). Drop `ArialNarrow.ttf` and `ArialNarrow-Bold.ttf` into `fonts/` to use the real face.

```bash
pip install -r requirements.txt   # also needs ffmpeg on PATH
python3 marsys.py --title "MAR CREATIVE ACADEMY" \
  --words INNOVATION TECHNOLOGY DESIGN \
  --seconds 15 --seed 5 --format 9:16 --out mar.mp4   # --mute: no sound

python3 marsys.py --seed 5 --stills 20,60,148 --out check.png   # stills only
```

Formats: `9:16`, `4:5`, `1:1`, `16:9`. Same seed = same frames; new seed = new composition within the rules.

`examples/` holds seeds 5 and 6 at 9:16, 5 s, rendered with the previous (v1) engine.

Rules for adding references: see section 8 of the spec.
