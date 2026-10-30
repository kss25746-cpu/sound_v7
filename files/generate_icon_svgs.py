from pathlib import Path

TOTAL_PNG = Path(__file__).resolve().parents[1] / "assets" / "test_img" / "total_embedded.png"
OUTPUT_DIR = TOTAL_PNG.parent

ICON_BOXES = [
    (6.0, 0.0, 50.997, 68.067),
    (106.993, 2.002, 60.996, 64.063),
    (219.985, 6.006, 42.997, 57.056),
    (326.978, 15.015, 39.997, 47.047),
    (419.972, 16.016, 48.997, 41.041),
    (7.0, 106.105, 54.996, 67.066),
    (109.993, 109.108, 46.997, 56.055),
    (219.985, 113.112, 45.997, 52.052),
    (319.978, 118.117, 54.996, 47.047),
    (420.972, 121.120, 42.997, 41.041),
    (418.972, 209.207, 42.997, 65.064),
    (105.993, 220.218, 59.996, 49.049),
    (318.979, 220.218, 40.997, 57.056),
    (219.985, 225.223, 56.996, 39.039),
    (0.0, 227.225, 68.995, 31.031),
    (103.993, 310.307, 64.996, 68.067),
    (315.979, 319.316, 54.996, 58.057),
    (421.972, 320.317, 50.997, 52.052),
    (5.0, 325.322, 46.997, 43.043),
    (213.986, 326.323, 53.996, 45.045),
]

SVG_TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width:.3f}" height="{height:.3f}" viewBox="{x:.3f} {y:.3f} {width:.3f} {height:.3f}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <image width="472.96813" height="378.37449" xlink:href="{png}" href="{png}" preserveAspectRatio="none" />
</svg>
"""


def main() -> None:
    if not TOTAL_PNG.exists():
        raise FileNotFoundError(f"Expected PNG at {TOTAL_PNG}")

    for idx, (x, y, width, height) in enumerate(ICON_BOXES, start=1):
        icon_path = OUTPUT_DIR / f"icon-{idx:02d}.svg"
        icon_path.write_text(
            SVG_TEMPLATE.format(width=width, height=height, x=x, y=y, png=TOTAL_PNG.name),
            encoding="utf-8",
        )
        print("wrote", icon_path)


if __name__ == "__main__":
    main()
