import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'dat.gui';
import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { preloadImages } from './utils/preload';
import Smooth from './Smooth';
import Events from './Events/Events';

gsap.registerPlugin(ScrollTrigger);
/**
 * Base
 */
// Debug
const settings = {
    uNoiseFreq: 3.5,
    uNoiseAmp: 0.15,
    uNoiseSpeed: 1,
    uNoiseZ: 10.0,
};

const gui = new dat.GUI();

gui.add(settings, 'uNoiseFreq', 0, 10, 0.01).onChange((value) => {
    planes.forEach((plane) => {
        plane.material.uniforms.uNoiseFreq.value = value;
    });
});

gui.add(settings, 'uNoiseAmp', 0, 1, 0.01).onChange((value) => {
    planes.forEach((plane) => {
        plane.material.uniforms.uNoiseAmp.value = value;
    });
});

gui.add(settings, 'uNoiseSpeed', 0, 3, 0.1).onChange((value) => {
    planes.forEach((plane) => {
        plane.material.uniforms.uNoiseSpeed.value = value;
    });
});

gui.add(settings, 'uNoiseZ', 0, 40, 0.1).onChange((value) => {
    planes.forEach((plane) => {
        plane.material.uniforms.uNoiseZ.value = value;
    });
});

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

/**
 * Test mesh
 */
// Geometry
const geometry = new THREE.PlaneBufferGeometry(1, 1, 32, 32);

// Loader
const loader = new THREE.TextureLoader();

// Material
const material = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uTexture: { value: loader.load('img-01.jpg') },
        uNoiseFreq: { value: settings.uNoiseFreq },
        uNoiseAmp: { value: settings.uNoiseAmp },
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.DoubleSide,
});

// Mesh
const mesh = new THREE.Mesh(geometry, material);
// scene.add(mesh);

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Orthographic camera
// const camera = new THREE.OrthographicCamera(-1/2, 1/2, 1/2, -1/2, 0.1, 100)

// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100);
camera.position.set(0, 0, 50);
scene.add(camera);

// // Controls
// const controls = new OrbitControls(camera, canvas);
// controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x111111, 1);
/**
 * Animate
 */
const clock = new THREE.Clock();

class GlObject extends THREE.Object3D {
    init(el) {
        this.el = el;
        this.resize();
    }

    setBounds() {
        this.rect = this.el.getBoundingClientRect();

        this.bounds = {
            left: this.rect.left,
            top: this.rect.top + window.scrollY,
            width: this.rect.width,
            height: this.rect.height
        };

        this.updateSize();
        this.updatePosition();
    }

    resize() {
        if (!this.visible) return;
        this.setBounds();
    }

    calculateUnitSize(distance = this.position.z) {
        const vFov = camera.fov * Math.PI / 180;
        const height = 2 * Math.tan(vFov / 2) * distance;
        const width = height * camera.aspect;

        return { width, height };
    }

    updateSize() {
        this.camUnit = this.calculateUnitSize(camera.position.z - this.position.z);

        const x = this.bounds.width / window.innerWidth;
        const y = this.bounds.height / window.innerHeight;

        if (!x || !y) return;

        this.scale.x = this.camUnit.width * x;
        this.scale.y = this.camUnit.height * y;
    }

    updateY(y = 0) {
        const { top, height } = this.bounds;

        this.position.y = (this.camUnit.height / 2) - (this.scale.y / 2);
        this.position.y -= ((top - y) / window.innerHeight) * this.camUnit.height;

        this.progress = gsap.utils.clamp(0, 1, 1 - (-y + top + height) / (window.innerHeight + height));
    }

    updateX(x = 0) {
        const { left } = this.bounds;

        this.position.x = -(this.camUnit.width / 2) + (this.scale.x / 2);
        this.position.x += ((left + x) / window.innerWidth) * this.camUnit.width;
    }

    updatePosition(y) {
        this.updateY(y);
        this.updateX(0);
    }
}

class Plane extends GlObject {
    init(el, index) {
        super.init(el);

        this.geometry = geometry;
        this.material = material.clone();

        this.material.uniforms = {
            uTexture: { value: 0 },
            uTime: { value: 0 },
            uProg: { value: 0 },
            uNoiseAmp: { value: settings.uNoiseAmp },
            uNoiseFreq: { value: settings.uNoiseFreq },
            uNoiseSpeed: { value: settings.uNoiseSpeed },
            uNoiseZ: { value: settings.uNoiseZ },
            uIndex: { value: index },
        };

        this.img = this.el.querySelector('img');
        this.texture = loader.load(this.img.src, (texture) => {
            texture.minFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;

            this.material.uniforms.uTexture.value = texture;
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.add(this.mesh);

        scene.add(this);
        this.addEvents();
    }

    updateTime(time) {
        this.material.uniforms.uTime.value = time;
    }

    addEvents() {
        this.mouseEnter();
        this.mouseLeave();
    }

    mouseEnter() {

        this.el.addEventListener('mouseenter', () => {
            gsap.to(this.material.uniforms.uProg, {
                // duration: 1,
                value: 1,
                ease: 'power.inOut',
            });
        });
    }

    mouseLeave() {
        // this.el.addEventListener('mouseleave', () => {
        gsap.to(this.material.uniforms.uProg, {
            // duration: 1,
            value: 0,
            ease: 'power.inOut',
        });
        // });
    }
}
const planes = [];
preloadImages().then(() => {
    // document.body.classList.remove('loading');

    const elements = document.querySelectorAll('.js-plane');
    elements.forEach((el, index) => {
        const plane = new Plane();
        plane.init(el, index);
        planes.push(plane);
    });
    const smooth = new Smooth();
});

const currentMap = {
    current: 0
};

document.addEventListener('wheel', (e) => {

    const y = e.deltaY;

    gsap.to(currentMap, {
        duration: 0.4,
        current: currentMap.current + y,
        ease: 'power.inOut',
        onUpdate: () => {
            for (let i = 0; i < planes.length; i++) {
                const plane = planes[i];
                // clamp so currentMap.current doesn't go below 0

                currentMap.current = Math.max(0, currentMap.current);

                plane.updatePosition(currentMap.current);
            }
        }
    });

});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
window.addEventListener('pointermove', onPointerMove);

function onPointerMove(event) {

    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    // calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children);
    let recentPlane = null;
    if (intersects.length > 0) {
        const intersect = intersects[0];
        // console.log(intersect);
        recentPlane = intersect.object.parent;
        recentPlane.material.uniforms.uProg.value = 1;
        // plane.mouseEnter();

    } else {
        planes.forEach(plane => {
            plane.material.uniforms.uProg.value = 0;

        });
    }

    // Stop animation when mouse leaves plane

}

const tick = () => {
    // Get elapsedtime
    const elapsedTime = clock.getElapsedTime();

    for (let i = 0; i < planes.length; i++) {
        const plane = planes[i];
        plane.updateTime(elapsedTime);
    }

    // Update uniforms
    material.uniforms.uTime.value = elapsedTime;

    // Render
    renderer.render(scene, camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
};

tick();