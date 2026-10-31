import fs from "node:fs";
import path from "node:path";

/* Returns the public URL of /public/images/<name> if the file exists, else null.
   Lets sections opt into a background image the moment it's dropped in,
   and fall back to the plain lit backdrop until then. */
export function publicImage(name: string): string | null {
  const file = path.join(process.cwd(), "public", "images", name);
  return fs.existsSync(file) ? `/images/${name}` : null;
}
