gsap.registerPlugin(ScrollTrigger);
const canvas = document.getElementById('hero-canvas');
const ctx = canvas.getContext('2d');
const FRAME_COUNT = 240; // adaptez à votre nombre de frames
const isMobile = window.innerWidth < 768;
const folder = isMobile ? 'frames-mobile' : 'frames';
const images = [];
const state = { frame: 0 };
const src = i => `${folder}/frame_${String(i).padStart(4, '0')}.webp`;
// Préchargement
let loaded = 0;
for (let i = 0; i < FRAME_COUNT; i++) {
const img = new Image();
img.src = src(i);
img.onload = img.onerror = () => {
loaded++;
document.getElementById('loader-percent').textContent =
Math.round((loaded / FRAME_COUNT) * 100) + '%';
if (loaded === FRAME_COUNT) startSite();
};
images.push(img);
}
function resize() {
const dpr = window.devicePixelRatio || 1;
canvas.width = window.innerWidth * dpr;
canvas.height = window.innerHeight * dpr;
render();
}
function render() {
const img = images[Math.round(state.frame)];
if (!img || !img.complete) return;
const cw = canvas.width, ch = canvas.height;
const scale = Math.max(cw / img.width, ch / img.height); // mode cover
const w = img.width * scale, h = img.height * scale;
ctx.clearRect(0, 0, cw, ch);
ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
}
function startSite() {
document.getElementById('loader').classList.add('hidden');
resize();gsap.to(state, {
frame: FRAME_COUNT - 1,
ease: 'none',
scrollTrigger: {
trigger: '.scroll-container', // hauteur : 600vh
start: 'top top',
end: 'bottom bottom',
scrub: 0.5
},
onUpdate: render
});
}
window.addEventListener('resize', resize);