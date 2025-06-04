document.addEventListener('DOMContentLoaded', function() {
    const imageLoader = document.getElementById('imageLoader');
    const imageCanvas = document.getElementById('imageCanvas');
    const colorSelector = document.getElementById('colorSelector');
    const ctx = imageCanvas ? imageCanvas.getContext('2d') : null;

    const toleranceSlider = document.getElementById('toleranceSlider');
    const toleranceValueDisplay = document.getElementById('toleranceValueDisplay');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    const setBackgroundWhiteBtn = document.getElementById('setBackgroundWhiteBtn'); // Get the new button

    const predefinedColors = [
        '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
        '#808080', '#FFFFFF', '#000000', '#A52A2A', '#FFA500', '#800080'
    ];

    let currentImage = null;
    let selectedColor = predefinedColors[0];
    let selectedRegionMask = null;
    let processingSelection = false;
    let selectionTolerance = 20;

    if (toleranceSlider) {
        selectionTolerance = parseInt(toleranceSlider.value, 10);
    }
    if (toleranceValueDisplay && toleranceSlider) {
         toleranceValueDisplay.textContent = toleranceSlider.value;
    }

    function colorsMatch(color1, color2) {
        if (color1.length !== 4 || color2.length !== 4) return false;
        if (color2[3] < 30) return false;
        if (color1[3] < 30 && color2[3] >=30) return false;

        for (let i = 0; i < 3; i++) {
            if (Math.abs(color1[i] - color2[i]) > selectionTolerance) {
                return false;
            }
        }
        return true;
    }

    function getPixelColor(imageData, x, y) {
        if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) {
            return [-1, -1, -1, -1];
        }
        const offset = (y * imageData.width + x) * 4;
        return [
            imageData.data[offset], imageData.data[offset + 1],
            imageData.data[offset + 2], imageData.data[offset + 3]
        ];
    }

    function applyColorToCanvas() {
        if (!currentImage || !ctx) return;
        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        ctx.drawImage(currentImage, 0, 0, imageCanvas.width, imageCanvas.height);
        if (!selectedRegionMask) return;

        const canvasImageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
        const data = canvasImageData.data;
        const maskData = selectedRegionMask.data;
        let r = parseInt(selectedColor.slice(1, 3), 16);
        let g = parseInt(selectedColor.slice(3, 5), 16);
        let b = parseInt(selectedColor.slice(5, 7), 16);
        for (let i = 0; i < maskData.length; i += 4) {
            if (maskData[i + 3] > 0) {
                data[i] = (data[i] * r) / 255;
                data[i + 1] = (data[i + 1] * g) / 255;
                data[i + 2] = (data[i + 2] * b) / 255;
            }
        }
        ctx.putImageData(canvasImageData, 0, 0);
    }

    if (imageLoader) {
        imageLoader.addEventListener('change', function(e) {
            const reader = new FileReader();
            reader.onload = function(event) {
                currentImage = new Image();
                currentImage.onload = function() {
                    if (!imageCanvas || !ctx) return;
                    const maxWidth = 600;
                    let width = currentImage.width;
                    let height = currentImage.height;
                    if (width > maxWidth) {
                        height = (maxWidth / width) * height;
                        width = maxWidth;
                    }
                    imageCanvas.width = width;
                    imageCanvas.height = height;
                    ctx.drawImage(currentImage, 0, 0, width, height);
                    selectedRegionMask = null;
                }
                currentImage.src = event.target.result;
            }
            if (e.target.files[0]) {
                reader.readAsDataURL(e.target.files[0]);
            } else {
                if (ctx) ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
                if (imageCanvas) {
                    imageCanvas.width = 600;
                    imageCanvas.height = 300;
                }
                currentImage = null;
                selectedRegionMask = null;
            }
        });
    }

    function selectRegion(startX, startY, mode = 'new') {
        console.log("selectRegion called. StartX:", startX, "StartY:", startY,
                    "Mode:", mode,
                    "currentImage exists:", !!currentImage,
                    "processingSelection flag:", processingSelection);

        if (!currentImage || !ctx) {
            console.log("selectRegion: Exiting early - no image or canvas context.");
            return;
        }

        if (processingSelection) {
            if (mode === 'new') {
                console.log("selectRegion: Exiting early - 'new' selection attempted while processing.");
                return;
            } else {
                console.warn("selectRegion: Mode '" + mode + "' initiated while another selection might be active or finishing.");
            }
        }

        processingSelection = true;
        console.log("selectRegion: processingSelection set to true. Mode:", mode);

        try {
            ctx.clearRect(0,0,imageCanvas.width, imageCanvas.height);
            ctx.drawImage(currentImage, 0,0, imageCanvas.width, imageCanvas.height);
            const originalImageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
            const targetColor = getPixelColor(originalImageData, startX, startY);

            if (targetColor[0] === -1 || targetColor[3] < 30) {
                console.log("selectRegion: Exiting (from try block) - targetColor is out of bounds or too transparent. TargetColor Alpha:", targetColor[3]);
                applyColorToCanvas();
                return;
            }

            let currentClickMaskDataObj = ctx.createImageData(imageCanvas.width, imageCanvas.height);
            const visited = new Uint8Array(originalImageData.width * originalImageData.height);
            const queue = [[startX, startY]];
            visited[startY * originalImageData.width + startX] = 1;
            let head = 0;
            while(head < queue.length) {
                const [x, y] = queue[head++];
                const currentColorOnImage = getPixelColor(originalImageData, x, y);
                if (colorsMatch(currentColorOnImage, targetColor)) {
                    const offset = (y * currentClickMaskDataObj.width + x) * 4;
                    currentClickMaskDataObj.data[offset + 3] = 150;

                    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && nx < originalImageData.width && ny >= 0 && ny < originalImageData.height &&
                            !visited[ny * originalImageData.width + nx]) {
                            visited[ny * originalImageData.width + nx] = 1;
                            const neighborColorOnImage = getPixelColor(originalImageData, nx, ny);
                            if (colorsMatch(neighborColorOnImage, targetColor)) {
                               queue.push([nx, ny]);
                            }
                        }
                    }
                }
            }
            console.log("selectRegion: Flood fill for current click complete. Queue length:", queue.length);

            if (mode === 'new' || !selectedRegionMask) {
                console.log("selectRegion: Mode is 'new' or no existing selectedRegionMask. Replacing mask.");
                selectedRegionMask = currentClickMaskDataObj;
            } else {
                if (!(selectedRegionMask instanceof ImageData)) {
                     console.error("selectedRegionMask is not ImageData. Resetting.");
                     selectedRegionMask = ctx.createImageData(imageCanvas.width, imageCanvas.height);
                }
                const mainMaskData = selectedRegionMask.data;
                const newClickPixels = currentClickMaskDataObj.data;

                if (mode === 'add') {
                    console.log("selectRegion: Mode is 'add'. Adding to existing mask.");
                    for (let i = 0; i < newClickPixels.length; i += 4) {
                        if (newClickPixels[i + 3] > 0) {
                            mainMaskData[i + 3] = 150;
                        }
                    }
                } else if (mode === 'subtract') {
                    console.log("selectRegion: Mode is 'subtract'. Subtracting from existing mask.");
                    for (let i = 0; i < newClickPixels.length; i += 4) {
                        if (newClickPixels[i + 3] > 0) {
                            mainMaskData[i + 3] = 0;
                        }
                    }
                }
            }

            applyColorToCanvas();

        } finally {
            console.log("selectRegion: (in finally block) processingSelection is being set to false.");
            processingSelection = false;
        }
    }

    if (imageCanvas) {
        imageCanvas.addEventListener('click', function(event) {
            console.log("Canvas clicked!");

            if (!currentImage) {
                console.log('No image loaded. Click ignored.');
                return;
            }

            let clickSelectionMode = 'new'; // Determine mode for the current click
            if (event.shiftKey) clickSelectionMode = 'add';
            else if (event.altKey) clickSelectionMode = 'subtract';

            if (processingSelection && clickSelectionMode === 'new') {
                 console.log('New selection ignored while another selection is processing.');
                 return;
            }
            // Allow add/subtract to proceed even if processingSelection is true,
            // as they might be rapid adjustments. The flag will still prevent true parallelism.


            const rect = imageCanvas.getBoundingClientRect();
            const canvasX = event.clientX - rect.left;
            const canvasY = event.clientY - rect.top;

            const bufferWidth = imageCanvas.width;
            const bufferHeight = imageCanvas.height;
            const displayWidth = rect.width;
            const displayHeight = rect.height;

            const imageX = Math.floor(canvasX * (bufferWidth / displayWidth));
            const imageY = Math.floor(canvasY * (bufferHeight / displayHeight));

            console.log("Coordinate Calculation Details:", {
                clientX: event.clientX,
                clientY: event.clientY,
                canvasRectLeft: rect.left,
                canvasRectTop: rect.top,
                canvasX: canvasX,
                canvasY: canvasY,
                bufferWidth: bufferWidth,
                bufferHeight: bufferHeight,
                displayWidth: displayWidth,
                displayHeight: displayHeight,
                imageX: imageX,
                imageY: imageY,
                detectedSelectionMode: clickSelectionMode
            });

            console.log("Calling selectRegion from click listener with mode:", clickSelectionMode);
            selectRegion(imageX, imageY, clickSelectionMode);
        });
        console.log("Canvas click listener attached successfully.");
    } else {
        console.error("ERROR: imageCanvas element not found during DOMContentLoaded!");
    }

    if (colorSelector) {
        colorSelector.innerHTML = '';
        predefinedColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.style.backgroundColor = color;
            swatch.style.width = '30px';
            swatch.style.height = '30px';
            swatch.style.borderRadius = '50%';
            swatch.style.display = 'inline-block';
            swatch.style.margin = '5px';
            swatch.style.cursor = 'pointer';
            swatch.style.border = '2px solid #eee';
            if (color === selectedColor) {
                swatch.style.borderColor = '#000';
            }
            swatch.addEventListener('click', function() {
                selectedColor = color;
                if (document) document.querySelectorAll('#colorSelector div').forEach(s => s.style.borderColor = '#eee');
                swatch.style.borderColor = '#000';
                applyColorToCanvas();
            });
            colorSelector.appendChild(swatch);
        });
    }

    if (toleranceSlider && toleranceValueDisplay) {
        toleranceSlider.addEventListener('input', function() {
            selectionTolerance = parseInt(this.value, 10);
            toleranceValueDisplay.textContent = this.value;
        });
    }

    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', function() {
            if (selectedRegionMask) {
                selectedRegionMask = null;
                if (currentImage && ctx) {
                    ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
                    ctx.drawImage(currentImage, 0, 0, imageCanvas.width, imageCanvas.height);
                }
                console.log("Selection cleared via button.");
            }
        });
    }

    function applyWhiteBackground() {
        console.log("applyWhiteBackground called.");
        if (!currentImage || !ctx) {
            console.log("applyWhiteBackground: No image or canvas context available.");
            return;
        }
        if (!selectedRegionMask) {
            console.log("applyWhiteBackground: No region selected to turn white.");
            return;
        }

        console.log("applyWhiteBackground: Redrawing original image before modification.");
        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        ctx.drawImage(currentImage, 0, 0, imageCanvas.width, imageCanvas.height);

        const canvasImageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
        const data = canvasImageData.data;
        const maskData = selectedRegionMask.data;

        let pixelsChangedCount = 0;
        for (let i = 0; i < maskData.length; i += 4) {
            if (maskData[i + 3] > 0) {
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
                data[i + 3] = 255;
                pixelsChangedCount++;
            }
        }

        if (pixelsChangedCount > 0) {
            ctx.putImageData(canvasImageData, 0, 0);
            console.log(`applyWhiteBackground: ${pixelsChangedCount} pixels in the selected region were changed to white.`);

            selectedRegionMask = null;
            console.log("applyWhiteBackground: selectedRegionMask has been cleared.");
        } else {
            console.log("applyWhiteBackground: No pixels were selected in the mask to change to white.");
        }
    }

    // Add event listener for the Set Background to White button
    if (setBackgroundWhiteBtn) {
        setBackgroundWhiteBtn.addEventListener('click', function() {
            console.log("Set Background to White button clicked.");
            applyWhiteBackground();
        });
    } else {
        console.warn("Button with ID 'setBackgroundWhiteBtn' not found. Make sure HTML is correct and script is deferred or at end of body.");
    }
});
