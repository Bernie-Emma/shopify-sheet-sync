/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SUPABASE_URL: string;
	readonly VITE_SUPABASE_ANON_KEY: string;
	readonly VITE_APP_TITLE: string;
	readonly VITE_DEBUG_MODE?: string; // Optional if it might not always be set
	// Add other VITE_ prefixed variables here
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
