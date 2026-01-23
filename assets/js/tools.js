/**
 * Painting Tools
 * Handles grid display, eyedropper, and tutorial system
 */

const tools = {
    // Tool states
    gridVisible: false,
    eyedropperActive: false,
    tutorialActive: false,
    
    // Tutorial state
    tutorialData: [],
    currentTutorialStep: 0,
    tutorialSteps: {},

    /**
     * Initialize tools
     */
    initialize() {
        this.setupToolButtons();
        this.setupTutorial();

        try { localStorage.setItem('tutorial_last_step', 0); } catch (err) {}
        // setupColorPanel() will be called from app.js after colors are loaded
    },

    /**
     * Setup tool buttons
     */
    setupToolButtons() {
        // Grid button
        document.getElementById('tool-grid').addEventListener('click', () => {
            this.toggleGrid();
        });

        // Eyedropper button
        document.getElementById('tool-pick').addEventListener('click', () => {
            this.toggleEyedropper();
        });

        // Tutorial button
        document.getElementById('tool-teach').addEventListener('click', () => {
            this.toggleTutorial();
        });
    },

    /**
     * Toggle grid visibility
     */
    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        const btn = document.getElementById('tool-grid');
        
        if (this.gridVisible) {
            btn.classList.add('active');
            btn.querySelector('svg').style.fill = '#FFFFFF';
        } else {
            btn.classList.remove('active');
            btn.querySelector('svg').style.fill = '#713F3E';
        }

        if (window.canvas) {
            window.canvas.draw();
        }
    },

    /**
     * Toggle eyedropper
     */
    toggleEyedropper() {
        this.eyedropperActive = !this.eyedropperActive;
        const btn = document.getElementById('tool-pick');
        const canvas = document.getElementById('paint-canvas');

        if (this.eyedropperActive) {
            btn.classList.add('active');
            btn.querySelector('svg').style.fill = '#FFFFFF';
            canvas.style.cursor = 'crosshair';
        } else {
            btn.classList.remove('active');
            btn.querySelector('svg').style.fill = '#713F3E';
            canvas.style.cursor = 'grab';
        }
    },

    /**
     * Toggle tutorial
     */
    toggleTutorial() {
        this.tutorialActive = !this.tutorialActive;
        const btn = document.getElementById('tool-teach');
        const tutorialPanel = document.getElementById('tutorial-panel');

        if (this.tutorialActive) {
            btn.classList.add('active');
            btn.querySelector('svg').style.fill = '#FFFFFF';
            tutorialPanel.classList.remove('hidden');
            this.initializeTutorial();
        } else {
            btn.classList.remove('active');
            btn.querySelector('svg').style.fill = '#713F3E';
            tutorialPanel.classList.add('hidden');
            this.completeTutorial();
        }
    },

    /**
     * Setup color panel (call this after colors are loaded)
     */
    setupColorPanel() {
        // Get color groups from app state
        const colorGroups = app.state.colors;
        const groupsDisplay = document.getElementById('color-groups-display');

        // Clear and populate
        groupsDisplay.innerHTML = '';
        
        let groupIndex = 0;
        Object.entries(colorGroups).forEach(([groupName, groupData]) => {

            const groupItem = document.createElement('div');
            groupItem.className = 'color-group-item';
            groupItem.style.backgroundColor = groupData.mainColor;
            groupItem.setAttribute('data-group-index', groupIndex);

            /*
            groupItem.addEventListener('click', () => {
                this.navigateToColorGroup(groupIndex);
            });
            */

            groupsDisplay.appendChild(groupItem);
            groupIndex++;
        });

        console.log(`Colors loaded: ${groupIndex} groups`);

        // Wait for jQuery and Owl Carousel to load before initializing
        const initOwlCarousel = () => {
            if (typeof $ !== 'undefined' && typeof $.fn.owlCarousel !== 'undefined') {
                $(groupsDisplay).owlCarousel({
                    items: 5,
                    center: true,
                    loop: false,
                    dots: false,
                    margin: 0,
                    onChanged: (event) => {
                        // Wait for carousel animation to complete before reading center class
                        setTimeout(() => {
                            const centerItem = groupsDisplay.querySelector('.center');
                            console.log('Centered item:', centerItem);
                            if (centerItem) {
                                const groupItem = centerItem.querySelector('.color-group-item');
                                if (groupItem) {
                                    const centerIndex = parseInt(groupItem.getAttribute('data-group-index'));
                                    console.log('Center index:', centerIndex);
                                    this.selectColorGroup(centerIndex);
                                }
                            }
                        }, 100);
                    }
                });
                console.log('Owl Carousel initialized for color groups');
                // Store carousel reference for navigation
                this.carouselElement = groupsDisplay;
            } else {
                // Retry if libraries not loaded yet
                setTimeout(initOwlCarousel, 100);
            }
        };

       initOwlCarousel();

        // Display first group colors
        this.selectColorGroup(0);


        const centerItem = document.createElement('div');
        centerItem.className = 'color-group-cennter-line';
        groupsDisplay.appendChild(centerItem);
    },

    /**
     * Navigate to a color group and move carousel to center it
     */
    navigateToColorGroup(index) {
        // Move carousel to center this item
        if (this.carouselElement && typeof $ !== 'undefined') {
            $(this.carouselElement).trigger('to.owl.carousel', [index, 300]);
        }
        // Select the color group
        this.selectColorGroup(index);
    },

    /**
     * Select color group
     */
    selectColorGroup(index) {
        // Colors should be loaded since setupColorPanel is called after loading
        if (!app.state.colors) {
            return;
        }

        app.state.currentColorGroup = index;
        
        // Update selection
        document.querySelectorAll('.color-group-item').forEach((item, i) => {
            item.classList.toggle('selected', i === index);
        });

        // Display colors in group
        const colorGroups = app.state.colors;
        const groupNames = Object.keys(colorGroups);
        if (groupNames.length === 0 || index >= groupNames.length) return;
        
        const groupName = groupNames[index];
        const groupData = colorGroups[groupName];

        if (groupData && groupData.colors) {
            this.displayGroupColors(groupData.colors);
        }
    },

    /**
     * Display colors in group
     */
    displayGroupColors(colors) {
        const detailsContainer = document.getElementById('color-details');
        detailsContainer.innerHTML = '';

        colors.forEach((color, index) => {
            const colorItem = document.createElement('div');
            colorItem.className = 'color-detail-item color-display';
            colorItem.id = `color-detail-item-${index}`;
            colorItem.setAttribute('data-color-index', index);
            //colorItem.style.backgroundColor = color;

            // Add click handler
            colorItem.addEventListener('click', () => {
                app.state.currentColor = color;
                this.updateColorSelection();
            });

            detailsContainer.appendChild(colorItem);

            embedExternalSVG('assets/images/icon_color.svg', `color-detail-item-${index}`);

            // Wait for SVG to load before setting color
            setTimeout(() => {
                const colorDisplay = document.querySelector(`#color-detail-item-${index}.color-display svg g[data-name="Group 11"] > path:nth-child(2)`);
                if (colorDisplay) {
                    colorDisplay.setAttribute('fill', color);
                }
                
                // Check if this is the currently selected color
                const isSelected = color.toLowerCase() === app.state.currentColor.toLowerCase();
                const colorDisplayBg = document.querySelector(`#color-detail-item-${index}.color-display svg g[data-name="Group 11"] > path:nth-child(1)`);
                if (colorDisplayBg) {
                    colorDisplayBg.setAttribute('fill', isSelected ? '#FFFFFF' : 'transparent');
                }
            }, 10);
        });
    },

    /**
     * Update color selection indicator
     */
    updateColorSelection() {
        // Remove previous selection
        document.querySelectorAll('#color_icon_select').forEach(el => {
            el.style.stroke = 'none';
            el.style.fill = 'none';
        });

        // Add selection to current color
        const currentColor = app.state.currentColor;
        document.querySelectorAll('.color-detail-item').forEach(item => {
            const bgColor = item.style.backgroundColor;
            if (bgColor.toLowerCase() === currentColor.toLowerCase()) {
                const select = item.querySelector('#color_icon_select');
                if (select) {
                    select.style.stroke = '#FFFFFF';
                    select.style.fill = 'none';
                }
            }
        });

        // Update tutorial color display
        const tutorialColorFill = document.getElementById('color_icon_fill');
        if (tutorialColorFill) {
            tutorialColorFill.setAttribute('fill', currentColor);
        }
    },

    /**
     * Setup tutorial system
     */
    setupTutorial() {
        // Analyze colors used in pixel grid
        if (window.canvas && window.canvas.pixelGrid) {
            this.generateTutorialSteps();
        }

        // Tutorial button handlers
        document.getElementById('tut-first').addEventListener('click', () => {
            this.goToTutorialStep(0);
        });

        document.getElementById('tut-prev').addEventListener('click', () => {
            this.goToTutorialStep(Math.max(0, this.currentTutorialStep - 1));
        });

        document.getElementById('tut-next').addEventListener('click', () => {
            this.goToTutorialStep(Math.min(this.tutorialData.length - 1, this.currentTutorialStep + 1));
        });

        document.getElementById('tut-last').addEventListener('click', () => {
            this.goToTutorialStep(this.tutorialData.length - 1);
        });
    },

    /**
     * Generate tutorial steps based on colors used
     */
    generateTutorialSteps() {
        const colorCounts = {};
        const colorOrder = [];

        // Count color usage
        if (window.canvas && window.canvas.pixelGrid) {
            window.canvas.pixelGrid.forEach(row => {
                row.forEach(color => {
                    if (color !== '#FFFFFF') {
                        colorCounts[color] = (colorCounts[color] || 0) + 1;
                    }
                });
            });
        }

        // Sort by frequency (most used first)
        this.tutorialData = Object.entries(colorCounts)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);

        // Reset to first step (do not auto-show here)
        this.currentTutorialStep = 0;
    },

    /**
     * Go to tutorial step
     */
    goToTutorialStep(step) {
        this.currentTutorialStep = Math.max(0, Math.min(step, this.tutorialData.length - 1));
        this.showTutorialStep(this.currentTutorialStep);
    },

    /**
     * Show tutorial step
     */
    showTutorialStep(step) {
        if (step < 0 || step >= this.tutorialData.length) return;
        const color = this.tutorialData[step];

        // Persist last viewed step
        try { localStorage.setItem('tutorial_last_step', step); } catch (err) {}

        // Update step display
        document.getElementById('tut-step-num').textContent = step + 1;


        const colorDisplayBg = document.querySelector('#tut-color.color-display svg g[data-name="Group 11"] > path:nth-child(1)');
        if (colorDisplayBg) {
            colorDisplayBg.setAttribute('fill', '#FFFFFF');
        }
        // Update color display SVG path
        const colorDisplay = document.querySelector('#tut-color.color-display svg g[data-name="Group 11"] > path:nth-child(2)');
        if (colorDisplay) {
            colorDisplay.setAttribute('fill', color);
        }

        // Update current color and ensure the right color group is selected on the right panel
        app.state.currentColor = color;

        // Find which color group contains this color and navigate to it
        const colorGroups = app.state.colors || {};
        let foundGroupIndex = -1;
        Object.entries(colorGroups).forEach(([groupName, groupData], index) => {
            if (groupData.colors && groupData.colors.includes(color)) {
                foundGroupIndex = index;
            }
        });

        if (foundGroupIndex !== -1) {
            this.navigateToColorGroup(foundGroupIndex);
        }

        // Update selection UI (highlights the selected color)
        this.updateColorSelection();

        // Update navigation button disabled states and appearance
        const firstBtn = document.getElementById('tut-first');
        const prevBtn = document.getElementById('tut-prev');
        const nextBtn = document.getElementById('tut-next');
        const lastBtn = document.getElementById('tut-last');

        if (firstBtn) {
            firstBtn.disabled = (step === 0);
            firstBtn.style.opacity = (step === 0) ? '0.5' : '1';
        }
        if (prevBtn) {
            prevBtn.disabled = (step === 0);
            prevBtn.style.opacity = (step === 0) ? '0.5' : '1';
        }
        const lastIndex = this.tutorialData.length - 1;
        if (nextBtn) {
            nextBtn.disabled = (step === lastIndex);
            nextBtn.style.opacity = (step === lastIndex) ? '0.5' : '1';
        }
        if (lastBtn) {
            lastBtn.disabled = (step === lastIndex);
            lastBtn.style.opacity = (step === lastIndex) ? '0.5' : '1';
        }

        // Store current step and trigger canvas redraw in tutorial mode
        this.currentTutorialStep = step;
        if (window.canvas) window.canvas.draw();
    },

    /**
     * Initialize tutorial
     */
    initializeTutorial() {
        // Ensure steps exist
        if (!this.tutorialData || this.tutorialData.length === 0) {
            this.generateTutorialSteps();
        }

        if (this.tutorialData.length === 0) return;

        // Load last viewed step from localStorage if available
        const saved = localStorage.getItem('tutorial_last_step');
        let step = 0;
        if (saved !== null) {
            const idx = parseInt(saved, 10);
            if (!isNaN(idx) && idx >= 0 && idx < this.tutorialData.length) {
                step = idx;
            }
        }

        this.goToTutorialStep(step);
    },

    /**
     * Complete tutorial
     */
    completeTutorial() {
        // Clear tutorial highlight and redraw full image
        this.currentTutorialStep = 0;
        try { localStorage.setItem('tutorial_last_step', this.currentTutorialStep); } catch (err) {}
        if (window.canvas && window.canvas.pixelGrid) {
            window.canvas.draw();
        }
    }
};

// Make tools globally available
window.tools = tools;

// Listen for color picked event
document.addEventListener('colorPicked', (e) => {
    const pickedColor = e.detail.color;
    app.state.currentColor = pickedColor;
    
    // Find which color group contains this color
    const colorGroups = app.state.colors;
    let foundGroupIndex = -1;
    
    Object.entries(colorGroups).forEach(([groupName, groupData], index) => {
        if (groupData.colors && groupData.colors.includes(pickedColor)) {
            foundGroupIndex = index;
        }
    });
    
    // Navigate to the color group if found
    if (foundGroupIndex !== -1) {
        tools.navigateToColorGroup(foundGroupIndex);
    }
    
    tools.updateColorSelection();
});
