package utils

import (
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"os"
)

func CompressAndResizeImage(inputPath, outputPath string, maxWidth, maxHeight, quality int) error {
	// Open the input file
	file, err := os.Open(inputPath)
	if err != nil {
		return fmt.Errorf("failed to open input file: %v", err)
	}
	defer file.Close()

	// Decode the image (supports JPEG and PNG)
	img, format, err := image.Decode(file)
	if err != nil {
		return fmt.Errorf("failed to decode image: %v", err)
	}

	// Get the original dimensions
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	// Calculate the new dimensions while maintaining the aspect ratio
	newWidth, newHeight := width, height
	if width > maxWidth || height > maxHeight {
		ratioX := float64(maxWidth) / float64(width)
		ratioY := float64(maxHeight) / float64(height)
		ratio := min(ratioX, ratioY)

		newWidth = int(float64(width) * ratio)
		newHeight = int(float64(height) * ratio)
	}

	// Create a new blank image with the new dimensions
	resizedImg := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))

	// Resize the original image into the new image using a simple scaling algorithm
	for y := 0; y < newHeight; y++ {
		for x := 0; x < newWidth; x++ {
			// Map the coordinates from the new image to the original image
			srcX := x * width / newWidth
			srcY := y * height / newHeight

			// Set the pixel in the new image
			resizedImg.Set(x, y, img.At(srcX, srcY))
		}
	}

	// Create the output file
	outFile, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("failed to create output file: %v", err)
	}
	defer outFile.Close()

	// Encode the image based on the original format
	switch format {
	case "jpeg", "jpg":
		err = jpeg.Encode(outFile, resizedImg, &jpeg.Options{Quality: quality})
	case "png":
		err = png.Encode(outFile, resizedImg)
	default:
		return fmt.Errorf("unsupported image format: %s", format)
	}

	if err != nil {
		return fmt.Errorf("failed to encode image: %v", err)
	}

	// Check the file size and adjust quality if necessary (only for JPEG)
	if format == "jpeg" || format == "jpg" {
		for {
			info, err := outFile.Stat()
			if err != nil {
				return fmt.Errorf("failed to get file info: %v", err)
			}

			// If the file size is less than 100KB, break the loop
			if info.Size() <= 100*1024 {
				break
			}

			// Reduce the quality further
			quality -= 5
			if quality < 5 {
				quality = 5
			}

			// Re-encode the image with the new quality
			outFile.Seek(0, 0)
			outFile.Truncate(0)
			err = jpeg.Encode(outFile, resizedImg, &jpeg.Options{Quality: quality})
			if err != nil {
				return fmt.Errorf("failed to re-encode JPEG: %v", err)
			}
		}
	}

	return nil
}