"""Remove only the backdrop from the user-supplied hurricane icon."""

from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageFilter


source = Path(sys.argv[1])
destination = Path(sys.argv[2])

image = Image.open(source).convert("RGB")
pixels = np.asarray(image).astype(np.int16)
red, green, blue = (pixels[:, :, channel] for channel in range(3))

# Select the supplied red artwork without changing any of its RGB pixels.
red_art = (red > 130) & (red - green > 45) & (red - blue > 35)
red_mask = Image.fromarray((red_art * 255).astype(np.uint8), mode="L")

# The supplied white outline is adjacent to the red body. The white eye is
# enclosed by it. These tests retain both while excluding the gray backdrop.
small_size = (max(1, image.width // 4), max(1, image.height // 4))
near_red_image = (
    red_mask.resize(small_size, Image.Resampling.NEAREST)
    .filter(ImageFilter.MaxFilter(27))
    .resize(image.size, Image.Resampling.NEAREST)
)
near_red = np.asarray(near_red_image) > 0
white = (
    (red > 232)
    & (green > 232)
    & (blue > 232)
    & (np.maximum.reduce([red, green, blue]) - np.minimum.reduce([red, green, blue]) < 20)
)

red_on_left = np.maximum.accumulate(red_art, axis=1)
red_on_right = np.maximum.accumulate(red_art[:, ::-1], axis=1)[:, ::-1]
red_above = np.maximum.accumulate(red_art, axis=0)
red_below = np.maximum.accumulate(red_art[::-1, :], axis=0)[::-1, :]
inside_red_body = red_on_left & red_on_right & red_above & red_below

subject = red_art | (white & (near_red | inside_red_body))
alpha = Image.fromarray((subject * 255).astype(np.uint8), mode="L")
alpha = alpha.filter(ImageFilter.GaussianBlur(0.45))

output = image.convert("RGBA")
output.putalpha(alpha)
destination.parent.mkdir(parents=True, exist_ok=True)
output.save(destination, optimize=True)
