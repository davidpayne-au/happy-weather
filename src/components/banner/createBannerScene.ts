import * as THREE from "three";

export type BannerTheme = "light" | "dark";

export interface BannerScene {
	setTheme(theme: BannerTheme): void;
	dispose(): void;
}

type Weather = "rain" | "sun" | "cloudy";

const WEATHER_ORDER: Weather[] = ["rain", "sun", "cloudy"];
const SECONDS_PER_WEATHER = 6;
const BLEND_RATE = 2.2;
const PERSON_BASE_Y = -1.4;

interface Look {
	rain: number;
	clouds: number;
	sun: number;
	umbrella: number;
	hat: number;
	shades: number;
	skyTop: string;
	skyBottom: string;
	cloud: string;
	hill: string;
	sunTone: string;
}

const DAY: Record<Weather, Look> = {
	rain: { rain: 1, clouds: 1, sun: 0, umbrella: 1, hat: 0, shades: 0, skyTop: "#5b6b82", skyBottom: "#a9bbd0", cloud: "#8a94a6", hill: "#3f8f55", sunTone: "#fde047" },
	sun: { rain: 0, clouds: 0.08, sun: 1, umbrella: 0, hat: 1, shades: 1, skyTop: "#1e7fd8", skyBottom: "#b9e6ff", cloud: "#ffffff", hill: "#4ade80", sunTone: "#fde047" },
	cloudy: { rain: 0, clouds: 1, sun: 0.35, umbrella: 0, hat: 0, shades: 0, skyTop: "#7b8fa8", skyBottom: "#dde6f0", cloud: "#f8fafc", hill: "#5cbf74", sunTone: "#fef08a" },
};

// At night the "sun" state becomes a clear sky with a moon, so there is no sun hat or sunglasses.
const NIGHT: Record<Weather, Look> = {
	rain: { rain: 1, clouds: 1, sun: 0, umbrella: 1, hat: 0, shades: 0, skyTop: "#03060f", skyBottom: "#1b2740", cloud: "#2f3b4f", hill: "#12261c", sunTone: "#e2e8f0" },
	sun: { rain: 0, clouds: 0, sun: 1, umbrella: 0, hat: 0, shades: 0, skyTop: "#020617", skyBottom: "#1e1b4b", cloud: "#334155", hill: "#0f2219", sunTone: "#e2e8f0" },
	cloudy: { rain: 0, clouds: 1, sun: 0.3, umbrella: 0, hat: 0, shades: 0, skyTop: "#0b1224", skyBottom: "#2a3650", cloud: "#4b5a70", hill: "#132a20", sunTone: "#e2e8f0" },
};

const LOOK_NUMERIC_KEYS = ["rain", "clouds", "sun", "umbrella", "hat", "shades"] as const;
const NUMERIC_KEYS = [...LOOK_NUMERIC_KEYS, "night"] as const;
const COLOR_KEYS = ["skyTop", "skyBottom", "cloud", "hill", "sunTone"] as const;

type NumericKey = (typeof NUMERIC_KEYS)[number];
type ColorKey = (typeof COLOR_KEYS)[number];
type Frame = Record<NumericKey, number> & Record<ColorKey, THREE.Color>;
type Tones = Record<ColorKey, THREE.Color>;

function toTones(look: Look): Tones {
	return {
		skyTop: new THREE.Color(look.skyTop),
		skyBottom: new THREE.Color(look.skyBottom),
		cloud: new THREE.Color(look.cloud),
		hill: new THREE.Color(look.hill),
		sunTone: new THREE.Color(look.sunTone),
	};
}

function toneTable(table: Record<Weather, Look>): Record<Weather, Tones> {
	return { rain: toTones(table.rain), sun: toTones(table.sun), cloudy: toTones(table.cloudy) };
}

const DAY_TONES = toneTable(DAY);
const NIGHT_TONES = toneTable(NIGHT);

function fillTarget(out: Frame, weather: Weather, night: number): void {
	const day = DAY[weather];
	const dark = NIGHT[weather];
	for (const key of LOOK_NUMERIC_KEYS) {
		out[key] = day[key] + (dark[key] - day[key]) * night;
	}
	out.night = night;
	for (const key of COLOR_KEYS) {
		out[key].lerpColors(DAY_TONES[weather][key], NIGHT_TONES[weather][key], night);
	}
}

function createFrame(weather: Weather, night: number): Frame {
	const frame: Frame = {
		rain: 0,
		clouds: 0,
		sun: 0,
		umbrella: 0,
		hat: 0,
		shades: 0,
		night: 0,
		skyTop: new THREE.Color(),
		skyBottom: new THREE.Color(),
		cloud: new THREE.Color(),
		hill: new THREE.Color(),
		sunTone: new THREE.Color(),
	};
	fillTarget(frame, weather, night);
	return frame;
}

function approach(current: Frame, target: Frame, amount: number): void {
	for (const key of NUMERIC_KEYS) {
		current[key] += (target[key] - current[key]) * amount;
	}
	for (const key of COLOR_KEYS) {
		current[key].lerp(target[key], amount);
	}
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function lambert(color: string): THREE.MeshLambertMaterial {
	return new THREE.MeshLambertMaterial({ color });
}

interface PersonRig {
	person: THREE.Group;
	leftArm: THREE.Group;
	rightArm: THREE.Group;
	umbrella: THREE.Group;
	hat: THREE.Group;
	shades: THREE.Group;
}

function buildPerson(): PersonRig {
	const person = new THREE.Group();
	person.position.set(0, PERSON_BASE_Y, 0);

	const shirt = lambert("#f97316");
	const skin = lambert("#fcd9b6");
	const dark = lambert("#1f2937");

	for (const x of [-0.2, 0.2]) {
		const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 1.0, 12), lambert("#1e3a8a"));
		leg.position.set(x, 0.5, 0);
		person.add(leg);
	}

	const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.38, 1.2, 16), shirt);
	torso.position.set(0, 1.6, 0);
	person.add(torso);

	const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), skin);
	head.position.set(0, 2.62, 0);
	person.add(head);

	const hair = new THREE.Mesh(
		new THREE.SphereGeometry(0.44, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
		lambert("#5b3a1e"),
	);
	hair.position.set(0, 2.66, -0.02);
	person.add(hair);

	for (const x of [-0.15, 0.15]) {
		const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), dark);
		eye.position.set(x, 2.66, 0.38);
		person.add(eye);
	}

	for (const x of [-0.25, 0.25]) {
		const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), lambert("#fb7185"));
		cheek.position.set(x, 2.5, 0.33);
		person.add(cheek);
	}

	// Half a torus, flipped so the arc curls upward into a smile.
	const smile = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 8, 20, Math.PI), dark);
	smile.position.set(0, 2.5, 0.37);
	smile.rotation.z = Math.PI;
	person.add(smile);

	const shades = new THREE.Group();
	shades.position.set(0, 2.66, 0);
	for (const x of [-0.15, 0.15]) {
		const lens = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.05), dark);
		lens.position.set(x, 0, 0.4);
		shades.add(lens);
	}
	const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.04), dark);
	bridge.position.set(0, 0.02, 0.4);
	shades.add(bridge);
	shades.scale.setScalar(0.001);
	person.add(shades);

	const hat = new THREE.Group();
	hat.position.set(0, 3.0, 0);
	const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.05, 24), lambert("#facc15"));
	const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.32, 24), lambert("#facc15"));
	crown.position.y = 0.18;
	hat.add(brim, crown);
	hat.rotation.z = -0.12;
	hat.scale.setScalar(0.001);
	person.add(hat);

	// Arms pivot at the shoulder; a rotation of π raises the arm straight up.
	const leftArm = new THREE.Group();
	leftArm.position.set(-0.55, 2.0, 0);
	const leftLimb = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 10), shirt);
	leftLimb.position.y = -0.45;
	const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), skin);
	leftHand.position.y = -0.9;
	leftArm.add(leftLimb, leftHand);
	person.add(leftArm);

	const umbrella = new THREE.Group();
	umbrella.position.set(-0.55, 2.9, 0);
	const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8), lambert("#78350f"));
	shaft.position.y = 0.5;
	const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.5, 20), lambert("#ef4444"));
	canopy.position.y = 1.25;
	umbrella.add(shaft, canopy);
	umbrella.scale.setScalar(0.001);
	person.add(umbrella);

	const rightArm = new THREE.Group();
	rightArm.position.set(0.55, 2.0, 0);
	const rightLimb = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 10), shirt);
	rightLimb.position.y = -0.45;
	const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), skin);
	rightHand.position.y = -0.9;
	rightArm.add(rightLimb, rightHand);
	person.add(rightArm);

	return { person, leftArm, rightArm, umbrella, hat, shades };
}

function buildGarden(): THREE.Group {
	const garden = new THREE.Group();
	const colors = ["#f472b6", "#facc15", "#ffffff", "#a78bfa", "#fb923c"];
	for (let i = 0; i < 14; i++) {
		const flower = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), lambert(colors[i % colors.length]));
		const side = i % 2 === 0 ? -1 : 1;
		flower.position.set(side * rand(1.2, 6), PERSON_BASE_Y + 0.08, rand(0.6, 2.2));
		garden.add(flower);
	}
	return garden;
}

function createGlowTexture(): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = 128;
	canvas.height = 128;
	const ctx = canvas.getContext("2d")!;
	const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
	gradient.addColorStop(0, "rgba(255,255,255,1)");
	gradient.addColorStop(0.35, "rgba(255,255,255,0.35)");
	gradient.addColorStop(1, "rgba(255,255,255,0)");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, 128, 128);
	return new THREE.CanvasTexture(canvas);
}

/**
 * Creates a Three.js weather banner that cycles rain → sun → cloudy inside `container`.
 * Throws if WebGL is unavailable so the caller can keep its CSS fallback.
 */
export function createBannerScene(container: HTMLElement, initialTheme: BannerTheme): BannerScene {
	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	container.appendChild(renderer.domElement);

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
	camera.position.set(0, 1.2, 9);
	camera.lookAt(0, 1.2, 0);

	let targetNight = initialTheme === "dark" ? 1 : 0;
	const current = createFrame("rain", targetNight);
	const target = createFrame("rain", targetNight);

	// Full-screen gradient sky, drawn first.
	const sky = new THREE.Mesh(
		new THREE.PlaneGeometry(2, 2),
		new THREE.ShaderMaterial({
			uniforms: { skyTop: { value: current.skyTop }, skyBottom: { value: current.skyBottom } },
			vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
			fragmentShader: [
				"uniform vec3 skyTop;",
				"uniform vec3 skyBottom;",
				"varying vec2 vUv;",
				"void main() {",
				"\tgl_FragColor = vec4(mix(skyBottom, skyTop, vUv.y), 1.0);",
				"\t#include <colorspace_fragment>",
				"}",
			].join("\n"),
			depthWrite: false,
			depthTest: false,
		}),
	);
	sky.renderOrder = -1;
	sky.frustumCulled = false;
	scene.add(sky);

	const ambient = new THREE.AmbientLight("#ffffff", 0.9);
	const sunLight = new THREE.DirectionalLight("#ffffff", 1.1);
	sunLight.position.set(-4, 6, 6);
	scene.add(ambient, sunLight);

	// Ground and hills share one material so they change palette together.
	const groundMat = lambert("#000000");
	const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), groundMat);
	ground.rotation.x = -Math.PI / 2;
	ground.position.set(0, PERSON_BASE_Y, -20);
	scene.add(ground);
	for (const [x, z, r] of [
		[-9, -14, 6],
		[6, -16, 8],
		[-1, -22, 10],
	] as const) {
		const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), groundMat);
		hill.scale.y = 0.6;
		hill.position.set(x, PERSON_BASE_Y, z);
		scene.add(hill);
	}
	scene.add(buildGarden());

	const glowTexture = createGlowTexture();
	const celestialMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false });
	const celestial = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 20), celestialMat);
	celestial.position.set(-6.5, 2.7, -8);
	const glowMat = new THREE.SpriteMaterial({ map: glowTexture, color: "#ffffff", transparent: true, opacity: 0, depthWrite: false });
	const glow = new THREE.Sprite(glowMat);
	glow.position.copy(celestial.position);
	glow.scale.setScalar(4.5);
	scene.add(glow, celestial);

	const starCount = 260;
	const starPositions = new Float32Array(starCount * 3);
	for (let i = 0; i < starCount; i++) {
		starPositions[i * 3] = rand(-18, 18);
		starPositions[i * 3 + 1] = rand(0.2, 5.7);
		starPositions[i * 3 + 2] = -12;
	}
	const starGeo = new THREE.BufferGeometry();
	starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
	const starMat = new THREE.PointsMaterial({
		color: "#ffffff",
		size: 0.09,
		transparent: true,
		opacity: 0,
		depthWrite: false,
	});
	scene.add(new THREE.Points(starGeo, starMat));

	const cloudGeo = new THREE.SphereGeometry(1, 20, 14);
	const cloudMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false });
	const clouds: { group: THREE.Group; speed: number }[] = [];
	for (let i = 0; i < 7; i++) {
		const group = new THREE.Group();
		const puffs = 4 + Math.floor(rand(0, 2));
		for (let p = 0; p < puffs; p++) {
			const puff = new THREE.Mesh(cloudGeo, cloudMat);
			const r = rand(0.7, 1.3);
			puff.scale.set(r * 1.3, r, r);
			puff.position.set((p - puffs / 2) * 0.9 + rand(-0.2, 0.2), rand(-0.1, 0.3), rand(-0.3, 0.3));
			group.add(puff);
		}
		group.position.set(-19 + i * 5.4 + rand(-0.8, 0.8), rand(3.0, 3.6), -4 - rand(0, 1.5));
		scene.add(group);
		clouds.push({ group, speed: rand(0.2, 0.4) });
	}

	const dropCount = 280;
	const drops = Array.from({ length: dropCount }, () => ({
		x: rand(-16, 16),
		y: rand(-2, 4.6),
		z: rand(-2.2, -0.6),
		speed: rand(6, 9),
	}));
	const rainPositions = new Float32Array(dropCount * 6);
	const rainGeo = new THREE.BufferGeometry();
	rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
	const rainMat = new THREE.LineBasicMaterial({ color: "#cfe8ff", transparent: true, opacity: 0, depthWrite: false });
	scene.add(new THREE.LineSegments(rainGeo, rainMat));

	const rig = buildPerson();
	scene.add(rig.person);

	const resize = () => {
		const width = container.clientWidth || 1;
		const height = container.clientHeight || 1;
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	};
	const resizeObserver = new ResizeObserver(resize);
	resizeObserver.observe(container);
	resize();

	const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
	const speed = reduceMotion ? 0.35 : 1;

	let elapsed = 0;
	let last = performance.now();
	let frameId = 0;

	const render = (t: number, dt: number) => {
		ambient.intensity = 0.9 - 0.5 * current.night;
		sunLight.intensity = (1.1 - 0.8 * current.night) * (1 - 0.3 * current.rain);

		cloudMat.color.copy(current.cloud);
		cloudMat.opacity = current.clouds * 0.92;
		for (const cloud of clouds) {
			cloud.group.position.x += cloud.speed * dt;
			if (cloud.group.position.x > 19) cloud.group.position.x -= 38;
		}

		celestialMat.color.copy(current.sunTone);
		celestialMat.opacity = current.sun * 0.95;
		celestial.scale.setScalar(1 + 0.02 * Math.sin(t * 1.5));
		glowMat.color.copy(current.sunTone);
		glowMat.opacity = current.sun * 0.45;

		starMat.opacity = current.night * (1 - current.clouds * 0.85) * (0.75 + 0.25 * Math.sin(t * 2));

		rainMat.opacity = current.rain * 0.55;
		for (let i = 0; i < dropCount; i++) {
			const drop = drops[i];
			drop.y -= drop.speed * dt;
			if (drop.y < -1.6) {
				drop.y = 4.6;
				drop.x = rand(-16, 16);
			}
			const o = i * 6;
			rainPositions[o] = drop.x;
			rainPositions[o + 1] = drop.y;
			rainPositions[o + 2] = drop.z;
			rainPositions[o + 3] = drop.x - 0.1;
			rainPositions[o + 4] = drop.y + 0.3;
			rainPositions[o + 5] = drop.z;
		}
		rainGeo.attributes.position.needsUpdate = true;

		groundMat.color.copy(current.hill);

		// Cheerful bounce and sway, a little livelier in the sun.
		rig.person.position.y = PERSON_BASE_Y + Math.abs(Math.sin(t * 3.2)) * 0.05 * (0.5 + current.sun * 0.5);
		rig.person.rotation.z = Math.sin(t * 2.2) * 0.025;
		rig.rightArm.rotation.z = 2.3 + Math.sin(t * 7) * 0.35;
		rig.leftArm.rotation.z = -Math.PI * current.umbrella;

		rig.umbrella.visible = current.umbrella > 0.01;
		rig.umbrella.scale.setScalar(Math.max(current.umbrella, 0.001));
		rig.hat.visible = current.hat > 0.01;
		rig.hat.scale.setScalar(Math.max(current.hat, 0.001));
		rig.shades.visible = current.shades > 0.01;
		rig.shades.scale.setScalar(Math.max(current.shades, 0.001));
	};

	const tick = (now: number) => {
		const dt = Math.max(0, Math.min((now - last) / 1000, 0.1));
		last = now;
		elapsed += dt * speed;

		const weather = WEATHER_ORDER[Math.floor(elapsed / SECONDS_PER_WEATHER) % WEATHER_ORDER.length];
		fillTarget(target, weather, targetNight);
		approach(current, target, 1 - Math.exp(-dt * BLEND_RATE));

		render(elapsed, dt);
		renderer.render(scene, camera);
		frameId = requestAnimationFrame(tick);
	};
	frameId = requestAnimationFrame(tick);

	return {
		setTheme(theme) {
			targetNight = theme === "dark" ? 1 : 0;
		},
		dispose() {
			cancelAnimationFrame(frameId);
			resizeObserver.disconnect();
			scene.traverse((obj) => {
				const drawable = obj as THREE.Object3D & { geometry?: THREE.BufferGeometry; material?: THREE.Material };
				drawable.geometry?.dispose();
				drawable.material?.dispose();
			});
			glowTexture.dispose();
			renderer.dispose();
			renderer.forceContextLoss();
			renderer.domElement.remove();
		},
	};
}
