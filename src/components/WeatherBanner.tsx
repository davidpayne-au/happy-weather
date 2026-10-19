import { useEffect, useRef, useState } from "react";
import { createBannerScene, type BannerScene, type BannerTheme } from "./banner/createBannerScene";

interface WeatherBannerProps {
	theme: BannerTheme;
}

export default function WeatherBanner({ theme }: WeatherBannerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<BannerScene | null>(null);
	const [initialTheme] = useState(theme);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		try {
			sceneRef.current = createBannerScene(container, initialTheme);
		} catch {
			// WebGL is unavailable; the CSS gradient on the container stays visible.
			return;
		}
		return () => {
			sceneRef.current?.dispose();
			sceneRef.current = null;
		};
	}, [initialTheme]);

	useEffect(() => {
		sceneRef.current?.setTheme(theme);
	}, [theme]);

	return <div ref={containerRef} aria-hidden="true" className="weather-banner" />;
}
