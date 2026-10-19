import { useEffect, useRef } from "react";
import type { BannerScene, BannerTheme } from "./banner/createBannerScene";

interface WeatherBannerProps {
	theme: BannerTheme;
}

export default function WeatherBanner({ theme }: WeatherBannerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<BannerScene | null>(null);
	const themeRef = useRef(theme);

	useEffect(() => {
		themeRef.current = theme;
		sceneRef.current?.setTheme(theme);
	}, [theme]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		let disposed = false;
		// Three.js is loaded on demand so it doesn't block the app's first render.
		import("./banner/createBannerScene")
			.then(({ createBannerScene }) => {
				if (disposed) return;
				try {
					sceneRef.current = createBannerScene(container, themeRef.current);
				} catch {
					// WebGL is unavailable; the CSS gradient on the container stays visible.
				}
			})
			.catch(() => {
				// Keep the CSS gradient fallback if the chunk fails to load.
			});

		return () => {
			disposed = true;
			sceneRef.current?.dispose();
			sceneRef.current = null;
		};
	}, []);

	return <div ref={containerRef} aria-hidden="true" className="weather-banner" />;
}
