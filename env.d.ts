/// <reference types="astro/client" />

declare namespace NodeJS {
	interface ProcessEnv {
		ASTRO_MADAO_FOLDER?: string;
		/** `"true"` | `"false"` — whether to append the markdown `Link` header. */
		ASTRO_MADAO_HTTP_HEADER?: string;
	}
}