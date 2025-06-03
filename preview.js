document.addEventListener('DOMContentLoaded', function() {
    const imageLoader = document.getElementById('imageLoader');
    const imageCanvas = document.getElementById('imageCanvas');
    const colorSelector = document.getElementById('colorSelector');
    const ctx = imageCanvas.getContext('2d');

    const predefinedColors = [
        '#FF0000', // Red
        '#00FF00', // Green
        '#0000FF', // Blue
        '#FFFF00', // Yellow
        '#FF00FF', // Magenta
        '#00FFFF', // Cyan
        '#808080', // Grey
        '#FFFFFF', // White
        '#000000', // Black
        '#A52A2A', // Brown
        '#FFA500', // Orange
        '#800080'  // Purple
    ];

    let currentImage = null;
    let selectedColor = predefinedColors[0]; // Default to the first color

    // Function to apply color
    function applyColorToCanvas() {
        if (!currentImage) {
            // No alert here, as it might be annoying on first load.
            // Simply don't do anything if there's no image.
            return;
        }
        // Redraw the original image first
        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height); // Clear canvas
        ctx.drawImage(currentImage, 0, 0, imageCanvas.width, imageCanvas.height);

        // Apply the tint
        // 'multiply' often gives a good tinting effect.
        // 'overlay' or 'screen' can also be tried.
        // For a simple translucent overlay, one could use 'source-over' (default)
        // and draw a semi-transparent rectangle.
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = selectedColor;
        ctx.fillRect(0, 0, imageCanvas.width, imageCanvas.height);

        // For a semi-transparent overlay effect (alternative to multiply)
        // ctx.globalCompositeOperation = 'source-atop'; // or 'source-over'
        // ctx.fillStyle = selectedColor; // Make sure selectedColor can have alpha, e.g., 'rgba(255,0,0,0.5)'
                                         // Or set globalAlpha
        // ctx.globalAlpha = 0.5; // Example: 50% opacity
        // ctx.fillRect(0, 0, imageCanvas.width, imageCanvas.height);
        // ctx.globalAlpha = 1.0; // Reset global alpha

        // Reset composite operation to default
        ctx.globalCompositeOperation = 'source-over';
    }

    // Load image
    imageLoader.addEventListener('change', function(e) {
        const reader = new FileReader();
        reader.onload = function(event) {
            currentImage = new Image();
            currentImage.onload = function() {
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
                applyColorToCanvas(); // Apply default color tint after image loads
            }
            currentImage.src = event.target.result;
        }
        if (e.target.files[0]) {
            reader.readAsDataURL(e.target.files[0]);
        } else {
            ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
            imageCanvas.width = 600;
            imageCanvas.height = 300;
            currentImage = null;
        }
    });

    // Populate color swatches
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
            document.querySelectorAll('#colorSelector div').forEach(s => s.style.borderColor = '#eee');
            swatch.style.borderColor = '#000';
            applyColorToCanvas(); // Apply selected color
        });
        colorSelector.appendChild(swatch);
    });
});
