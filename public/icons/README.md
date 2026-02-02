# PWA Icons

To generate PWA icons, you need to create icons in the following sizes:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Quick Generate with Online Tool

You can use https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator

1. Create a 512x512 PNG source image with your logo
2. Upload to one of the tools above
3. Download and extract icons to this folder

## Or use ImageMagick (if installed)

```bash
# From a 512x512 source image (source.png)
convert source.png -resize 72x72 icon-72x72.png
convert source.png -resize 96x96 icon-96x96.png
convert source.png -resize 128x128 icon-128x128.png
convert source.png -resize 144x144 icon-144x144.png
convert source.png -resize 152x152 icon-152x152.png
convert source.png -resize 192x192 icon-192x192.png
convert source.png -resize 384x384 icon-384x384.png
convert source.png -resize 512x512 icon-512x512.png
```

