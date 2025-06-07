class VeganScanner {
    constructor() {
        this.video = document.getElementById('camera');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentStream = null;
        this.facingMode = 'environment';
        
        this.initializeElements();
        this.setupEventListeners();
        this.startCamera();
    }
    
    initializeElements() {
        this.captureBtn = document.getElementById('captureBtn');
        this.switchCameraBtn = document.getElementById('switchCameraBtn');
        this.resultsSection = document.getElementById('results');
        this.loading = document.getElementById('loading');
        this.analysisResults = document.getElementById('analysisResults');
        this.scanAgainBtn = document.getElementById('scanAgainBtn');
    }
    
    setupEventListeners() {
        this.captureBtn.addEventListener('click', () => this.captureAndAnalyze());
        this.switchCameraBtn.addEventListener('click', () => this.switchCamera());
        this.scanAgainBtn.addEventListener('click', () => this.resetToScanner());
    }
    
    async startCamera() {
        try {
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
            }
            
            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.currentStream;
            
            this.captureBtn.disabled = false;
            this.switchCameraBtn.disabled = false;
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Unable to access camera. Please ensure you have granted camera permissions.');
        }
    }
    
    switchCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        this.startCamera();
    }
    
    captureImage() {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.ctx.drawImage(this.video, 0, 0);
        return this.canvas.toDataURL('image/jpeg', 0.8);
    }
    
    async captureAndAnalyze() {
        const imageDataUrl = this.captureImage();
        
        // Show results section with loading
        this.resultsSection.style.display = 'block';
        this.loading.style.display = 'block';
        this.analysisResults.style.display = 'none';
        
        // Scroll to results
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        try {
            await this.analyzeProduct(imageDataUrl);
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('Failed to analyze product. Please try again.');
        }
    }
    
    async analyzeProduct(imageDataUrl) {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a vegan product analysis expert. Analyze the product image and provide detailed information about:
1. Whether the product is vegan (check ingredients, manufacturing processes, and certifications)
2. The parent company that owns this brand
3. Whether the parent company is 100% vegan or also sells non-vegan products
4. Key ingredients or factors that determine vegan status

Respond with JSON in this exact format:
{
    "productName": "Name of the product if visible",
    "isVegan": "vegan" | "not-vegan" | "uncertain",
    "veganReason": "Detailed explanation of why it is/isn't vegan",
    "parentCompany": "Name of the parent company",
    "companyIsVegan": true | false,
    "companyDetails": "Information about the parent company's vegan stance",
    "keyFindings": "Important ingredients, certifications, or concerns to highlight"
}`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Please analyze this product image for vegan compatibility and company information."
                        },
                        {
                            type: "image_url",
                            image_url: { url: imageDataUrl }
                        }
                    ]
                }
            ],
            json: true
        });
        
        const analysis = JSON.parse(completion.content);
        this.displayResults(analysis);
    }
    
    displayResults(analysis) {
        // Hide loading, show results
        this.loading.style.display = 'none';
        this.analysisResults.style.display = 'block';
        
        // Update product name
        document.getElementById('productName').textContent = 
            analysis.productName || 'Product Analysis';
        
        // Update vegan status
        const veganStatus = document.getElementById('veganStatus');
        veganStatus.className = `vegan-status ${analysis.isVegan}`;
        
        let statusIcon = '';
        let statusText = '';
        
        switch (analysis.isVegan) {
            case 'vegan':
                statusIcon = '✅';
                statusText = 'VEGAN FRIENDLY';
                break;
            case 'not-vegan':
                statusIcon = '❌';
                statusText = 'NOT VEGAN';
                break;
            case 'uncertain':
                statusIcon = '⚠️';
                statusText = 'UNCERTAIN - CHECK CAREFULLY';
                break;
        }
        
        veganStatus.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 10px;">${statusIcon}</div>
            <div style="font-size: 1.2rem; margin-bottom: 10px;">${statusText}</div>
            <div style="font-size: 0.9rem; font-weight: normal; line-height: 1.4;">
                ${analysis.veganReason}
            </div>
        `;
        
        // Update company details
        const companyVeganIcon = analysis.companyIsVegan ? '🌱' : '⚠️';
        const companyVeganText = analysis.companyIsVegan ? 'Fully Vegan Company' : 'Mixed Product Portfolio';
        
        document.getElementById('companyDetails').innerHTML = `
            <div style="margin-bottom: 15px;">
                <strong>Parent Company:</strong> ${analysis.parentCompany}
            </div>
            <div style="margin-bottom: 15px;">
                <span style="font-size: 1.2rem;">${companyVeganIcon}</span>
                <strong> ${companyVeganText}</strong>
            </div>
            <div style="line-height: 1.5; color: #666;">
                ${analysis.companyDetails}
            </div>
        `;
        
        // Update key findings
        document.getElementById('keyFindings').innerHTML = `
            <div style="line-height: 1.6; color: #555;">
                ${analysis.keyFindings}
            </div>
        `;
    }
    
    showError(message) {
        this.loading.style.display = 'none';
        this.analysisResults.style.display = 'block';
        
        document.getElementById('productName').textContent = 'Analysis Error';
        document.getElementById('veganStatus').innerHTML = `
            <div style="background: #f8d7da; color: #721c24; padding: 20px; border-radius: 10px;">
                ❌ ${message}
            </div>
        `;
        document.getElementById('companyDetails').innerHTML = '';
        document.getElementById('keyFindings').innerHTML = '';
    }
    
    resetToScanner() {
        this.resultsSection.style.display = 'none';
        document.querySelector('.scanner-section').scrollIntoView({ behavior: 'smooth' });
    }
}

// Initialize the scanner when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VeganScanner();
});

