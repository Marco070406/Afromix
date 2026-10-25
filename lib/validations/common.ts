import { z } from "zod";

/**
 * URL http(s) uniquement. z.url() seul accepte n'importe quel protocole,
 * dont « javascript: », dangereux une fois affiché dans un lien.
 */
export const httpUrl = () => z.url({ protocol: /^https?$/, error: "URL http(s) invalide" });
